import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { db } from "@/lib/db";

// Stripe requires the raw body for webhook verification
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    const event = verifyWebhookSignature(body, signature);
    if (!event) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const metadata = session.metadata || {};

        const organizationId = parseInt(metadata.organizationId || "0", 10);
        const creditAmount = parseInt(metadata.creditAmount || "0", 10);

        if (!organizationId || !creditAmount) {
          console.error("[STRIPE_WEBHOOK] Missing metadata:", metadata);
          break;
        }

        // ─── Atomic idempotency + credit grant ──────────────────────────
        // Use a transaction so all 3 operations (mark invoice paid,
        // increment credits, create transaction record) either all
        // succeed or all fail. Without this, a partial failure could
        // mark the invoice paid but never grant credits.
        //
        // IDEMPOTENCY FIX: The previous code looked up the invoice by
        // `pdf_url: "stripe_session:..."` but then changed pdf_url to
        // `"stripe_paid:..."`. A webhook retry would NOT find the
        // invoice (because pdf_url no longer matched) and would grant
        // credits AGAIN — a duplicate-credit bug.
        //
        // The fix: look up the invoice by EITHER marker. If found with
        // the "stripe_paid:" prefix, we've already processed it → skip.
        // If found with "stripe_session:" prefix, process it and update
        // the prefix. If not found, log and skip (invoice may have been
        // deleted).
        await db.$transaction(async (tx) => {
          const existingInvoice = await tx.invoice.findFirst({
            where: {
              OR: [
                { pdf_url: `stripe_session:${session.id}` },
                { pdf_url: `stripe_paid:${session.id}` },
              ],
            },
          });

          if (!existingInvoice) {
            console.warn(
              `[STRIPE_WEBHOOK] No matching invoice for session ${session.id} — skipping (may have been deleted)`
            );
            return;
          }

          // Already processed — idempotent skip
          if (existingInvoice.pdf_url?.startsWith("stripe_paid:")) {
            console.log(
              `[STRIPE_WEBHOOK] Session ${session.id} already processed — skipping`
            );
            return;
          }

          // Mark invoice as paid
          await tx.invoice.update({
            where: { id: existingInvoice.id },
            data: { pdf_url: `stripe_paid:${session.id}` },
          });

          // Increment credits
          await tx.organization.update({
            where: { id: organizationId },
            data: { credits_balance: { increment: creditAmount } },
          });

          // Create credit transaction record
          await tx.creditTransaction.create({
            data: {
              organization_id: organizationId,
              transaction_type: "purchase",
              credit_amount: creditAmount,
              description: `Purchased ${creditAmount} credits via Stripe (Session: ${session.id})`,
            },
          });

          console.log(
            `[STRIPE_WEBHOOK] Credits granted: ${creditAmount} to org ${organizationId} (session ${session.id})`
          );
        });
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        console.log(`[STRIPE_WEBHOOK] Checkout session expired: ${session.id}`);
        break;
      }

      default:
        console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[STRIPE_WEBHOOK] Error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

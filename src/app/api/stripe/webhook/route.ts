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

        // Check if we already processed this session (idempotency)
        const existingInvoice = await db.invoice.findFirst({
          where: { pdf_url: `stripe_session:${session.id}` },
        });

        if (existingInvoice) {
          // Update the existing invoice to mark as paid
          await db.invoice.update({
            where: { id: existingInvoice.id },
            data: { pdf_url: `stripe_paid:${session.id}` },
          });

          // Increment credits
          await db.organization.update({
            where: { id: organizationId },
            data: { credits_balance: { increment: creditAmount } },
          });

          // Create credit transaction
          await db.creditTransaction.create({
            data: {
              organization_id: organizationId,
              transaction_type: "purchase",
              credit_amount: creditAmount,
              description: `Purchased ${creditAmount} credits via Stripe (Session: ${session.id})`,
            },
          });

          console.log(`[STRIPE_WEBHOOK] Credits granted: ${creditAmount} to org ${organizationId}`);
        }
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

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

        // ── Determine payment type from metadata ──
        const paymentType = metadata.payment_type || "credit_purchase";

        // ── EMPLOYER PLACEMENT PAYMENT ─────────────────────────────────
        // When an employer pays the placement fee for a candidate they
        // marked as 'placed', we allocate payouts to the recruiter(s).
        if (paymentType === "employer_placement") {
          const submissionId = parseInt(metadata.submissionId || "0", 10);
          const employerOrgId = parseInt(metadata.organizationId || "0", 10);
          const recruiterUserId = parseInt(metadata.recruiterUserId || "0", 10) || null;
          const recruiterPayout = parseFloat(metadata.recruiterPayout || "0");
          const platformPayout = parseFloat(metadata.platformPayout || "0");
          const originalOwnerUserId = parseInt(metadata.originalOwnerUserId || "0", 10) || null;
          const originalOwnerResidual = parseFloat(metadata.originalOwnerResidual || "0");
          const payoutSplitPhase = metadata.payoutSplitPhase || "open";

          if (!submissionId || !employerOrgId) {
            console.error("[STRIPE_WEBHOOK] Placement payment missing required metadata:", metadata);
            break;
          }

          await db.$transaction(async (tx) => {
            // Idempotency: look up by either 'placement_session:' or 'placement_paid:' prefix
            const existingInvoice = await tx.invoice.findFirst({
              where: {
                OR: [
                  { pdf_url: `placement_session:${session.id}:${submissionId}` },
                  { pdf_url: `placement_paid:${session.id}:${submissionId}` },
                ],
              },
            });

            if (!existingInvoice) {
              console.warn(
                `[STRIPE_WEBHOOK] No matching invoice for placement session ${session.id} (submission ${submissionId}) — skipping`
              );
              return;
            }

            if (existingInvoice.pdf_url?.startsWith("placement_paid:")) {
              console.log(
                `[STRIPE_WEBHOOK] Placement session ${session.id} already processed — skipping`
              );
              return;
            }

            // Mark invoice as paid
            await tx.invoice.update({
              where: { id: existingInvoice.id },
              data: { pdf_url: `placement_paid:${session.id}:${submissionId}` },
            });

            // ── Allocate payouts ──
            // For now, payouts are tracked as CreditTransaction records
            // with transaction_type 'placement_payout' (and 'original_owner_residual'
            // for the residual case). The recruiter can cash these out via
            // a separate batch-payout flow (future Stripe Connect integration).

            // Recruiter payout (if there is a recruiter — skip for self_apply)
            if (recruiterUserId && recruiterPayout > 0) {
              try {
                // Find the recruiter's organization (or use the employer's org)
                const recruiter = await tx.user.findUnique({
                  where: { id: recruiterUserId },
                  select: { organization_id: true, first_name: true, last_name: true, email: true },
                });
                const recruiterOrgId = recruiter?.organization_id;
                if (recruiterOrgId) {
                  // Add to the recruiter's organization credit balance (treat as cash-equivalent credits)
                  await tx.organization.update({
                    where: { id: recruiterOrgId },
                    data: { credits_balance: { increment: Math.round(recruiterPayout) } },
                  });
                  await tx.creditTransaction.create({
                    data: {
                      organization_id: recruiterOrgId,
                      transaction_type: "placement_payout",
                      credit_amount: Math.round(recruiterPayout),
                      description: `Placement payout for submission #${submissionId} ($${recruiterPayout.toFixed(2)}, phase: ${payoutSplitPhase}) — paid by employer org #${employerOrgId}`,
                    },
                  });
                } else {
                  // No org — log the payout as a CreditTransaction under the employer's org with a note
                  await tx.creditTransaction.create({
                    data: {
                      organization_id: employerOrgId,
                      transaction_type: "placement_payout_unallocated",
                      credit_amount: 0,
                      description: `PAYOUT UNALLOCATED: Recruiter user #${recruiterUserId} (${recruiter?.email ?? "unknown"}) should receive $${recruiterPayout.toFixed(2)} for submission #${submissionId} but has no organization. Manual payout required.`,
                    },
                  });
                }
              } catch (payoutErr) {
                console.error("[STRIPE_WEBHOOK] Failed to allocate recruiter payout:", payoutErr);
              }
            }

            // Original owner residual (if residual phase)
            if (originalOwnerUserId && originalOwnerResidual > 0) {
              try {
                const originalOwner = await tx.user.findUnique({
                  where: { id: originalOwnerUserId },
                  select: { organization_id: true, email: true },
                });
                const originalOrgId = originalOwner?.organization_id;
                if (originalOrgId) {
                  await tx.organization.update({
                    where: { id: originalOrgId },
                    data: { credits_balance: { increment: Math.round(originalOwnerResidual) } },
                  });
                  await tx.creditTransaction.create({
                    data: {
                      organization_id: originalOrgId,
                      transaction_type: "original_owner_residual",
                      credit_amount: Math.round(originalOwnerResidual),
                      description: `Original-owner residual ($${originalOwnerResidual.toFixed(2)}) for submission #${submissionId} — candidate ownership was in ${payoutSplitPhase} phase at placement.`,
                    },
                  });
                }
              } catch (residualErr) {
                console.error("[STRIPE_WEBHOOK] Failed to allocate original owner residual:", residualErr);
              }
            }

            // Platform payout: no DB write needed — the platform just keeps the funds.
            // The Stripe charge itself is the platform's revenue. We record this in
            // the audit log below.

            // Append 'placement_paid' to the submission's status_history
            try {
              const submission = await tx.candidateSubmission.findUnique({
                where: { id: submissionId },
                select: { status_history: true },
              });
              if (submission) {
                const existingHistory = submission.status_history
                  ? JSON.parse(submission.status_history)
                  : [];
                existingHistory.push({
                  status: "placement_paid",
                  changed_at: new Date().toISOString(),
                  changed_by_user_id: null,
                  notes: `Placement fee of $${(recruiterPayout + platformPayout + originalOwnerResidual).toFixed(2)} paid via Stripe (session ${session.id}). Recruiter payout: $${recruiterPayout.toFixed(2)}. Platform: $${platformPayout.toFixed(2)}. Original owner residual: $${originalOwnerResidual.toFixed(2)}. Phase: ${payoutSplitPhase}.`,
                });
                await tx.candidateSubmission.update({
                  where: { id: submissionId },
                  data: { status_history: JSON.stringify(existingHistory) },
                });
              }
            } catch (histErr) {
              console.error("[STRIPE_WEBHOOK] Failed to update submission status_history:", histErr);
            }

            // Audit log
            try {
              await tx.auditLog.create({
                data: {
                  user_id: null,
                  role: "system",
                  action: "placement_payment_confirmed",
                  entity_type: "candidate_submission",
                  entity_id: submissionId,
                  details: `Stripe payment confirmed for submission #${submissionId}. Total: $${(recruiterPayout + platformPayout + originalOwnerResidual).toFixed(2)}. Recruiter payout: $${recruiterPayout.toFixed(2)} → user #${recruiterUserId ?? "n/a"}. Original owner residual: $${originalOwnerResidual.toFixed(2)} → user #${originalOwnerUserId ?? "n/a"}. Platform payout: $${platformPayout.toFixed(2)}. Phase: ${payoutSplitPhase}.`,
                },
              });
            } catch (auditErr) {
              console.error("[STRIPE_WEBHOOK] Failed to write audit log:", auditErr);
            }

            console.log(
              `[STRIPE_WEBHOOK] Placement payment processed: submission #${submissionId}, total $${(recruiterPayout + platformPayout + originalOwnerResidual).toFixed(2)} (session ${session.id})`
            );
          });
          break;
        }

        // ── CREDIT PURCHASE (existing flow) ────────────────────────────
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

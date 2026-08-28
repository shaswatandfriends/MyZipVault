import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCreditCheckoutSession, isStripeConfigured } from "@/lib/stripe";

/**
 * POST /api/employer/credits/purchase
 *
 * Initiates a Stripe Checkout session for the employer to buy credits.
 * Mirrors the recruiter flow at /api/recruiter/credits/purchase but
 * allows the 'employer' role.
 *
 * Body:
 *   - amount: positive integer (number of credits to buy)
 *
 * Returns:
 *   - success: true
 *   - requiresPayment: true
 *   - checkoutUrl: Stripe Checkout URL (client-side redirect)
 *   - sessionId: Stripe session ID
 *
 * The webhook at /api/stripe/webhook handles payment confirmation and
 * credits the organization's balance (the existing webhook is already
 * org-scoped — works for both recruiters and employers since both have
 * an organization_id).
 *
 * Auth: employer role only.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
    const userEmail = session.user.email || "";

    if (userRole !== "employer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      return NextResponse.json(
        { error: "Valid credit amount is required (must be a positive integer)" },
        { status: 400 }
      );
    }

    // Get credit cost per document from platform_settings
    const costSetting = await db.platformSetting.findUnique({
      where: { setting_key: "credit_cost_per_document" },
    });
    const costPerCredit = costSetting ? parseFloat(costSetting.setting_value) : 2.0;
    const totalPrice = costPerCredit * amount;

    // Get organization details
    let org: { name: string } | null = null;
    try {
      org = await db.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      });
    } catch (e) {
      console.error("[EMPLOYER_CREDITS_PURCHASE] org lookup failed:", e);
    }

    // Block purchases when Stripe is not configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Credit purchases are not available at this time. Please contact support." },
        { status: 503 }
      );
    }

    // Create Stripe Checkout Session (same helper as recruiter flow —
    // it's org-agnostic, just needs organizationId + organizationName)
    const checkoutSession = await createCreditCheckoutSession({
      organizationId,
      organizationName: org?.name || "Unknown Organization",
      creditAmount: amount,
      pricePerCredit: costPerCredit,
      customerEmail: userEmail,
      successUrl: `${process.env.NEXTAUTH_URL}/employer/billing?success=true`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/employer/billing?canceled=true`,
    });

    if (checkoutSession) {
      // Create a pending invoice (the webhook updates it to 'paid' on
      // successful payment)
      const invoice = await db.invoice.create({
        data: {
          organization_id: organizationId,
          credit_amount: amount,
          total_price: totalPrice,
          pdf_url: `stripe_session:${checkoutSession.sessionId}`,
        },
      });

      // Audit log
      try {
        const userId = Number((session.user as Record<string, unknown>).id);
        await db.auditLog.create({
          data: {
            user_id: userId,
            role: userRole,
            action: "employer_credit_purchase_initiated",
            entity_type: "invoice",
            entity_id: invoice.id,
            details: `Employer initiated purchase of ${amount} credits for $${totalPrice.toFixed(2)} (Stripe session ${checkoutSession.sessionId})`,
          },
        });
      } catch (auditErr) {
        console.error("[AUDIT_LOG] Failed to log employer credit purchase:", auditErr);
      }

      return NextResponse.json({
        success: true,
        requiresPayment: true,
        checkoutUrl: checkoutSession.sessionUrl,
        sessionId: checkoutSession.sessionId,
      });
    }

    return NextResponse.json(
      { error: "Failed to create payment session. Please try again." },
      { status: 500 }
    );
  } catch (error) {
    console.error("[EMPLOYER_CREDITS_PURCHASE]", error);
    return NextResponse.json({ error: "Failed to purchase credits" }, { status: 500 });
  }
}

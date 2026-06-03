import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCreditCheckoutSession, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
    const userEmail = session.user.email || "";

    // Verify recruiter/admin role
    if (!["client_admin", "client_recruiter"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      return NextResponse.json(
        { error: "Valid credit amount is required" },
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
    const org = await db.organization.findUnique({
      where: { id: organizationId },
    });

    // ─── If Stripe is configured, create a real Checkout Session ───
    if (isStripeConfigured()) {
      const checkoutSession = await createCreditCheckoutSession({
        organizationId,
        organizationName: org?.name || "Unknown Organization",
        creditAmount: amount,
        pricePerCredit: costPerCredit,
        customerEmail: userEmail,
        successUrl: `${process.env.NEXTAUTH_URL}/recruiter/credits?success=true`,
        cancelUrl: `${process.env.NEXTAUTH_URL}/recruiter/credits?canceled=true`,
      });

      if (checkoutSession) {
        // Create a pending invoice (marked as pending until webhook confirms payment)
        await db.invoice.create({
          data: {
            organization_id: organizationId,
            credit_amount: amount,
            total_price: totalPrice,
            pdf_url: `stripe_session:${checkoutSession.sessionId}`,
          },
        });

        return NextResponse.json({
          success: true,
          requiresPayment: true,
          checkoutUrl: checkoutSession.sessionUrl,
          sessionId: checkoutSession.sessionId,
        });
      }
    }

    // ─── Fallback: Direct credit grant (no real payment) ───
    console.warn(`[STRIPE] Not configured. Granting ${amount} credits without payment.`);

    const updatedOrg = await db.organization.update({
      where: { id: organizationId },
      data: { credits_balance: { increment: amount } },
    });

    await db.creditTransaction.create({
      data: {
        organization_id: organizationId,
        transaction_type: "purchase",
        credit_amount: amount,
        description: `Purchased ${amount} credits (no payment - Stripe not configured)`,
      },
    });

    await db.invoice.create({
      data: {
        organization_id: organizationId,
        credit_amount: amount,
        total_price: totalPrice,
      },
    });

    return NextResponse.json({
      success: true,
      requiresPayment: false,
      credits: updatedOrg.credits_balance,
      message: "Credits granted (Stripe not configured - no payment collected)",
    });
  } catch (error) {
    console.error("[RECRUITER_CREDITS_PURCHASE]", error);
    return NextResponse.json(
      { error: "Failed to purchase credits" },
      { status: 500 }
    );
  }
}

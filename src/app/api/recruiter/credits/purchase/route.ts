import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

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

    // Increment organization credits_balance
    const org = await db.organization.update({
      where: { id: organizationId },
      data: { credits_balance: { increment: amount } },
    });

    // Create credit_transaction record
    await db.creditTransaction.create({
      data: {
        organization_id: organizationId,
        transaction_type: "purchase",
        credit_amount: amount,
        description: `Purchased ${amount} credits`,
      },
    });

    // Create invoice record
    await db.invoice.create({
      data: {
        organization_id: organizationId,
        credit_amount: amount,
        total_price: totalPrice,
      },
    });

    return NextResponse.json({
      success: true,
      credits: org.credits_balance,
    });
  } catch (error) {
    console.error("[RECRUITER_CREDITS_PURCHASE]", error);
    return NextResponse.json(
      { error: "Failed to purchase credits" },
      { status: 500 }
    );
  }
}

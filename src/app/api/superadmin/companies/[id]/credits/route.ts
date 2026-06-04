import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const orgId = parseInt(id);
    const body = await request.json();
    const { amount, description, action } = body;

    if (!amount || !Number.isInteger(amount) || amount === 0) {
      return NextResponse.json(
        { error: "Valid non-zero credit amount is required" },
        { status: 400 }
      );
    }

    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Determine if adding or deducting
    const creditAmount = Math.abs(amount);
    const isAdd = action === "add" || amount > 0;

    // Update credits balance
    const updatedOrg = await db.organization.update({
      where: { id: orgId },
      data: {
        credits_balance: isAdd
          ? { increment: creditAmount }
          : { decrement: Math.min(creditAmount, org.credits_balance) },
      },
    });

    // Create credit transaction record
    await db.creditTransaction.create({
      data: {
        organization_id: orgId,
        transaction_type: isAdd ? "admin_adjustment_add" : "admin_adjustment_deduct",
        credit_amount: isAdd ? creditAmount : -creditAmount,
        description: description || (isAdd ? `Admin added ${creditAmount} credits` : `Admin deducted ${creditAmount} credits`),
      },
    });

    return NextResponse.json({ success: true, balance: updatedOrg.credits_balance });
  } catch (error) {
    console.error("[SUPERADMIN_COMPANY_CREDITS]", error);
    return NextResponse.json(
      { error: "Failed to adjust credits" },
      { status: 500 }
    );
  }
}

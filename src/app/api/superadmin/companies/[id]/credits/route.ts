import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody, superadminCreditsAdjustSchema } from "@/lib/validation-schemas";

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
    if (isNaN(orgId)) {
      return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
    }

    const body = await request.json();
    const result = validateBody(superadminCreditsAdjustSchema, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const { amount, description, action } = result.data;

    let org;
    try {
      org = await db.organization.findUnique({ where: { id: orgId } });
    } catch (e) {
      console.error("[SCHEMA_DRIFT] organization.findUnique failed:", e);
    }
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Determine if adding or deducting
    const creditAmount = Math.abs(amount);
    const isAdd = action === "add" || amount > 0;
    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);

    // ─── Transactional credit adjustment ─────────────────────────────
    // All three operations (balance update, transaction record, audit log)
    // must succeed atomically. Without this, a partial failure could
    // increment the balance without recording the transaction (or vice
    // versa), making the books not match.
    const updatedOrg = await db.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: orgId },
        data: {
          credits_balance: isAdd
            ? { increment: creditAmount }
            : { decrement: Math.min(creditAmount, org.credits_balance) },
        },
      });

      await tx.creditTransaction.create({
        data: {
          organization_id: orgId,
          transaction_type: isAdd ? "admin_adjustment_add" : "admin_adjustment_deduct",
          credit_amount: isAdd ? creditAmount : -creditAmount,
          description: description || (isAdd ? `Admin added ${creditAmount} credits` : `Admin deducted ${creditAmount} credits`),
        },
      });

      await tx.auditLog.create({
        data: {
          user_id: actionerId,
          role: "super_admin",
          action: isAdd ? "credits_add" : "credits_deduct",
          entity_type: "organization",
          entity_id: orgId,
          details: `${isAdd ? "Added" : "Deducted"} ${creditAmount} credits${description ? ` — ${description}` : ""}`,
        },
      });

      return updated;
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

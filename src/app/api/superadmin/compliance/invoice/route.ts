import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateBody, superadminComplianceInvoiceSchema } from "@/lib/validation-schemas";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const adminUserId = Number(session.user.id);

    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = validateBody(superadminComplianceInvoiceSchema, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const { organization_id, credit_amount, total_price, description } = result.data;

    let org;
    try {
      org = await db.organization.findUnique({
        where: { id: organization_id },
      });
    } catch (e) {
      console.error("[SCHEMA_DRIFT] organization.findUnique failed:", e);
    }

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // ─── Transactional invoice creation ──────────────────────────────
    // Invoice + audit log must be created atomically.
    const invoice = await db.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          organization_id,
          credit_amount,
          total_price: parseFloat(String(total_price)),
        },
      });

      await tx.auditLog.create({
        data: {
          user_id: adminUserId,
          role: "super_admin",
          action: "generate_compliance_invoice",
          entity_type: "invoice",
          entity_id: created.id,
          details: description || `Invoice for ${credit_amount} credits — $${total_price}`,
        },
      });

      return created;
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("[SUPERADMIN_COMPLIANCE_INVOICE]", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}

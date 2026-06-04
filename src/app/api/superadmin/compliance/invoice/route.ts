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
    const adminUserId = Number(session.user.id);

    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { organization_id, credit_amount, total_price, description } = body;

    if (!organization_id || !credit_amount || total_price === undefined) {
      return NextResponse.json(
        { error: "Organization ID, credit amount, and total price are required" },
        { status: 400 }
      );
    }

    const org = await db.organization.findUnique({
      where: { id: organization_id },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Create invoice record
    const invoice = await db.invoice.create({
      data: {
        organization_id,
        credit_amount,
        total_price: parseFloat(String(total_price)),
      },
    });

    // Log audit trail
    await db.auditLog.create({
      data: {
        user_id: adminUserId,
        role: "super_admin",
        action: "generate_compliance_invoice",
        entity_type: "invoice",
        entity_id: invoice.id,
      },
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

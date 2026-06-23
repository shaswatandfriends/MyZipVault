import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let org: any = null;
    try {
      org = await db.organization.findUnique({
        where: { id: orgId },
        include: {
          _count: { select: { users: true, credit_transactions: true, invoices: true } },
        },
      });
    } catch (e) { console.error("[SCHEMA_DRIFT] organization.findUnique failed:", e); }

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error("[SUPERADMIN_COMPANY_DETAIL_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let org: any = null;
    try {
      org = await db.organization.findUnique({ where: { id: orgId } });
    } catch (e) { console.error("[SCHEMA_DRIFT] organization.findUnique failed:", e); }
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.seat_limit !== undefined) updateData.seat_limit = body.seat_limit;
    if (body.baa_status !== undefined) updateData.baa_status = body.baa_status;
    if (body.custom_pricing_notes !== undefined) updateData.custom_pricing_notes = body.custom_pricing_notes;

    await db.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_COMPANY_DETAIL_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let org: any = null;
    try {
      org = await db.organization.findUnique({ where: { id: orgId } });
    } catch (e) { console.error("[SCHEMA_DRIFT] organization.findUnique failed:", e); }
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Delete related records first
    await db.creditTransaction.deleteMany({ where: { organization_id: orgId } });
    await db.invoice.deleteMany({ where: { organization_id: orgId } });
    await db.inviteToken.deleteMany({ where: { organization_id: orgId } });

    // Remove organization_id from users
    await db.user.updateMany({
      where: { organization_id: orgId },
      data: { organization_id: null },
    });

    await db.organization.delete({ where: { id: orgId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_COMPANY_DETAIL_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}

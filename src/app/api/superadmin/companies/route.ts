import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizations = await db.organization.findMany({
      orderBy: { created_at: "desc" },
      include: {
        users: {
          select: { id: true, role: true, account_status: true },
        },
        credit_transactions: {
          orderBy: { created_at: "desc" },
          take: 50,
        },
      },
    });

    return NextResponse.json({
      companies: organizations.map((org) => {
        const seatsUsed = org.users.filter(
          (u) => u.role === "client_recruiter" || u.role === "client_admin"
        ).length;
        return {
          id: org.id,
          name: org.name,
          creditsBalance: org.credits_balance,
          baaStatus: org.baa_status,
          baaSignedByName: org.baa_signed_by_name,
          baaSignedAt: org.baa_signed_at,
          seatLimit: org.seat_limit,
          seatsUsed,
          customPricingNotes: org.custom_pricing_notes,
          createdAt: org.created_at,
          transactions: org.credit_transactions.map((t) => ({
            id: t.id,
            transactionType: t.transaction_type,
            creditAmount: t.credit_amount,
            description: t.description,
            createdAt: t.created_at,
          })),
        };
      }),
    });
  } catch (error) {
    console.error("Superadmin Companies GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;
    const actionerId = parseInt(session.user.id as string, 10);

    switch (action) {
      case "create": {
        const { name, initialCredits, seatLimit, customPricingNotes } = body;
        if (!name) {
          return NextResponse.json({ error: "Company name is required" }, { status: 400 });
        }
        const org = await db.organization.create({
          data: {
            name,
            credits_balance: initialCredits ?? 0,
            seat_limit: seatLimit ?? 5,
            custom_pricing_notes: customPricingNotes ?? null,
          },
        });
        if (initialCredits && initialCredits > 0) {
          await db.creditTransaction.create({
            data: {
              organization_id: org.id,
              transaction_type: "purchase",
              credit_amount: initialCredits,
              description: "Initial credit allocation",
            },
          });
        }
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "create_company",
            entity_type: "organization",
            entity_id: org.id,
          },
        });
        return NextResponse.json({ success: true, organizationId: org.id });
      }
      case "edit": {
        const { organizationId, name, customPricingNotes } = body;
        if (!organizationId) {
          return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
        }
        const data: Record<string, unknown> = {};
        if (name) data.name = name;
        if (customPricingNotes !== undefined) data.custom_pricing_notes = customPricingNotes;
        await db.organization.update({
          where: { id: organizationId },
          data,
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "edit_company",
            entity_type: "organization",
            entity_id: organizationId,
          },
        });
        return NextResponse.json({ success: true });
      }
      case "set-credits": {
        const { organizationId, creditAmount, description } = body;
        if (!organizationId || creditAmount === undefined) {
          return NextResponse.json({ error: "Organization ID and credit amount are required" }, { status: 400 });
        }
        const org = await db.organization.findUnique({ where: { id: organizationId } });
        if (!org) {
          return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }
        const newBalance = Math.max(0, org.credits_balance + creditAmount);
        await db.organization.update({
          where: { id: organizationId },
          data: { credits_balance: newBalance },
        });
        await db.creditTransaction.create({
          data: {
            organization_id: organizationId,
            transaction_type: creditAmount >= 0 ? "purchase" : "deduction",
            credit_amount: Math.abs(creditAmount),
            description: description || (creditAmount >= 0 ? "Manual credit addition" : "Manual credit deduction"),
          },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "set_credits",
            entity_type: "organization",
            entity_id: organizationId,
          },
        });
        return NextResponse.json({ success: true, newBalance });
      }
      case "set-seat-limit": {
        const { organizationId, seatLimit } = body;
        if (!organizationId || seatLimit === undefined) {
          return NextResponse.json({ error: "Organization ID and seat limit are required" }, { status: 400 });
        }
        await db.organization.update({
          where: { id: organizationId },
          data: { seat_limit: seatLimit },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "set_seat_limit",
            entity_type: "organization",
            entity_id: organizationId,
          },
        });
        return NextResponse.json({ success: true });
      }
      case "set-baa-status": {
        const { organizationId, baaStatus, baaSignedByName, baaSignedByTitle } = body;
        if (!organizationId || !baaStatus) {
          return NextResponse.json({ error: "Organization ID and BAA status are required" }, { status: 400 });
        }
        const data: Record<string, unknown> = { baa_status: baaStatus };
        if (baaStatus === "signed") {
          if (baaSignedByName) data.baa_signed_by_name = baaSignedByName;
          if (baaSignedByTitle) data.baa_signed_by_title = baaSignedByTitle;
          data.baa_signed_at = new Date();
        }
        await db.organization.update({
          where: { id: organizationId },
          data,
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "set_baa_status",
            entity_type: "organization",
            entity_id: organizationId,
          },
        });
        return NextResponse.json({ success: true });
      }
      case "swap-email": {
        const { userId, newEmail } = body;
        if (!userId || !newEmail) {
          return NextResponse.json({ error: "User ID and new email are required" }, { status: 400 });
        }
        const existingUser = await db.user.findUnique({ where: { email: newEmail } });
        if (existingUser) {
          return NextResponse.json({ error: "Email already in use" }, { status: 400 });
        }
        await db.user.update({
          where: { id: userId },
          data: { email: newEmail },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "swap_email",
            entity_type: "user",
            entity_id: userId,
          },
        });
        return NextResponse.json({ success: true });
      }
      case "delete": {
        const { organizationId } = body;
        if (!organizationId) {
          return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
        }
        // Check for active users
        const activeUsers = await db.user.count({
          where: { organization_id: organizationId, account_status: "active" },
        });
        if (activeUsers > 0) {
          return NextResponse.json(
            { error: "Cannot delete organization with active users. Suspend or remove users first." },
            { status: 400 }
          );
        }
        await db.organization.delete({
          where: { id: organizationId },
        });
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "delete_company",
            entity_type: "organization",
            entity_id: organizationId,
          },
        });
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Superadmin Companies POST error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}

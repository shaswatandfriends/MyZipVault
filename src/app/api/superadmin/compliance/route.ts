import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") || "deletion_queue";

    switch (section) {
      case "deletion_queue": {
        // Users in deletion window (suspended_deleting status or with deletion_requested_at)
        const deletionUsers = await db.user.findMany({
          where: {
            deletion_requested_at: { not: null },
            account_status: { in: ["suspended_deleting", "active"] },
          },
          orderBy: { deletion_requested_at: "asc" },
        });

        const queue = deletionUsers.map((u) => {
          const requestedAt = u.deletion_requested_at ? new Date(u.deletion_requested_at) : null;
          const daysRemaining = requestedAt
            ? Math.max(0, 30 - Math.floor((Date.now() - requestedAt.getTime()) / (24 * 60 * 60 * 1000)))
            : 30;
          const isPastWindow = daysRemaining <= 0;

          return {
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            email: u.email,
            deletionRequestedAt: u.deletion_requested_at,
            daysRemaining,
            isPastWindow,
          };
        });

        return NextResponse.json({ deletionQueue: queue });
      }
      case "hipaa_export": {
        const email = searchParams.get("email");
        if (!email) {
          return NextResponse.json({ candidates: [] });
        }

        // Search for candidate by email
        const candidate = await db.user.findUnique({
          where: { email },
          include: {
            candidate_profile: true,
            credentials: true,
            candidate_checklist_responses: {
              include: { checklist_template: true, skill_ratings: true },
            },
            candidate_references: { include: { reference_responses: true } },
            consent_shares_as_candidate: true,
            audit_logs: { orderBy: { created_at: "desc" }, take: 50 },
            resumes: true,
          },
        });

        if (!candidate || candidate.role !== "candidate") {
          return NextResponse.json({ candidate: null });
        }

        return NextResponse.json({
          candidate: {
            id: candidate.id,
            email: candidate.email,
            firstName: candidate.first_name,
            lastName: candidate.last_name,
            profile: candidate.candidate_profile,
            credentials: candidate.credentials.map((c) => ({
              id: c.id,
              documentName: c.document_name,
              status: c.status,
              verificationStatus: c.verification_status,
              expirationDate: c.expiration_date,
              uploadedAt: c.uploaded_at,
            })),
            checklists: candidate.candidate_checklist_responses.map((cr) => ({
              id: cr.id,
              templateName: cr.checklist_template.name,
              status: cr.status,
              validUntil: cr.valid_until,
              submittedAt: cr.submitted_at,
            })),
            references: candidate.candidate_references.map((r) => ({
              id: r.id,
              managerEmail: r.manager_email,
              facilityName: r.facility_name,
              status: r.status,
            })),
            consentShares: candidate.consent_shares_as_candidate.map((cs) => ({
              id: cs.id,
              sharedAt: cs.shared_at,
              expiresAt: cs.expires_at,
            })),
            auditLogs: candidate.audit_logs.map((al) => ({
              id: al.id,
              action: al.action,
              createdAt: al.created_at,
            })),
            resumes: candidate.resumes.map((r) => ({
              id: r.id,
              createdAt: r.created_at,
            })),
          },
        });
      }
      case "invoices": {
        const invoices = await db.invoice.findMany({
          orderBy: { created_at: "desc" },
          include: { organization: true },
          take: 50,
        });

        return NextResponse.json({
          invoices: invoices.map((inv) => ({
            id: inv.id,
            organizationId: inv.organization_id,
            organizationName: inv.organization.name,
            creditAmount: inv.credit_amount,
            totalPrice: inv.total_price,
            pdfUrl: inv.pdf_url,
            createdAt: inv.created_at,
          })),
          organizations: (await (async () => {
            try {
              return await db.organization.findMany({ orderBy: { name: "asc" } });
            } catch (e) {
              console.error("[SCHEMA_DRIFT] organization.findMany failed:", e);
              return [];
            }
          })()).map((o) => ({
            id: o.id,
            name: o.name,
          })),
        });
      }
      default:
        return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }
  } catch (error) {
    console.error("Superadmin Compliance GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance data" },
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

    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "purge_account": {
        const { userId } = body;
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Hard delete user and all related data (cascade handles relations)
        await db.user.delete({ where: { id: userId } });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "purge_account",
            entity_type: "user",
            entity_id: userId,
          },
        });

        return NextResponse.json({ success: true, message: "Account purged permanently" });
      }
      case "cancel_deletion": {
        const { userId } = body;
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        await db.user.update({
          where: { id: userId },
          data: {
            account_status: "active",
            deletion_requested_at: null,
          },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "cancel_deletion",
            entity_type: "user",
            entity_id: userId,
          },
        });

        return NextResponse.json({ success: true, message: "Deletion cancelled, account restored" });
      }
      case "generate_hipaa_export": {
        const { userId } = body;
        if (!userId) {
          return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // In production, this would generate a ZIP file. For now, create an audit log entry.
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "generate_hipaa_export",
            entity_type: "user",
            entity_id: userId,
          },
        });

        return NextResponse.json({
          success: true,
          message: "HIPAA export generated",
          downloadUrl: `/api/superadmin/compliance?section=hipaa_export&id=${userId}`,
        });
      }
      case "generate_invoice": {
        const { organizationId, creditAmount, pricePerCredit } = body;
        if (!organizationId || !creditAmount || !pricePerCredit) {
          return NextResponse.json(
            { error: "Organization ID, credit amount, and price per credit are required" },
            { status: 400 }
          );
        }

        const totalPrice = creditAmount * pricePerCredit;

        const invoice = await db.invoice.create({
          data: {
            organization_id: organizationId,
            credit_amount: creditAmount,
            total_price: totalPrice,
            pdf_url: null,
          },
        });

        // Also add credits to org balance
        await db.organization.update({
          where: { id: organizationId },
          data: { credits_balance: { increment: creditAmount } },
        });

        // Record credit transaction
        await db.creditTransaction.create({
          data: {
            organization_id: organizationId,
            transaction_type: "purchase",
            credit_amount: creditAmount,
            description: `Invoice #${invoice.id} — ${creditAmount} credits at $${pricePerCredit}/credit`,
          },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "generate_invoice",
            entity_type: "invoice",
            entity_id: invoice.id,
          },
        });

        return NextResponse.json({
          success: true,
          invoiceId: invoice.id,
          totalPrice,
        });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Superadmin Compliance POST error:", error);
    return NextResponse.json(
      { error: "Failed to process compliance action" },
      { status: 500 }
    );
  }
}

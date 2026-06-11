import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get VaultSign audit logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const organization_id = searchParams.get("organization_id");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build where clause
    const where: any = {};
    if (organization_id) where.organization_id = parseInt(organization_id);
    if (search) {
      where.OR = [
        { document_name: { contains: search, mode: "insensitive" } },
        { signers: { some: { name: { contains: search, mode: "insensitive" } } } },
        { signers: { some: { email: { contains: search, mode: "insensitive" } } } },
      ];
    }

    // Get documents with their audit trails
    const [documents, total] = await Promise.all([
      db.vaultSignDocument.findMany({
        where,
        include: {
          signers: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              signed_at: true,
              declined_at: true,
              ip_address: true,
              device_info: true,
              signature_data: true,
            },
          },
          organization: {
            select: { id: true, name: true },
          },
          creator: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
        },
        orderBy: { updated_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.vaultSignDocument.count({ where }),
    ]);

    // Build audit log entries from documents
    const auditLogs = documents.flatMap((doc: any) => {
      const auditTrail = typeof doc.audit_trail === "string" ? JSON.parse(doc.audit_trail) : (doc.audit_trail || []);
      const logs = auditTrail.map((entry: any) => ({
        document_id: doc.id,
        document_name: doc.document_name,
        organization: doc.organization?.name,
        event: entry.event,
        user_name: entry.user_name,
        ip_address: entry.ip_address,
        timestamp: entry.timestamp,
        details: entry.details,
      }));

      // Add signer-level events
      for (const signer of doc.signers) {
        if (signer.status === "signed" && signer.signed_at) {
          logs.push({
            document_id: doc.id,
            document_name: doc.document_name,
            organization: doc.organization?.name,
            event: "signer_signed",
            user_name: signer.name,
            ip_address: signer.ip_address,
            timestamp: signer.signed_at.toISOString(),
            details: {
              signer_email: signer.email,
              signer_role: signer.role,
              device_info: signer.device_info,
            },
          });
        }
        if (signer.status === "declined" && signer.declined_at) {
          logs.push({
            document_id: doc.id,
            document_name: doc.document_name,
            organization: doc.organization?.name,
            event: "signer_declined",
            user_name: signer.name,
            ip_address: signer.ip_address,
            timestamp: signer.declined_at.toISOString(),
            details: {
              signer_email: signer.email,
              signer_role: signer.role,
            },
          });
        }
      }

      return logs;
    });

    // Sort by timestamp descending
    auditLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      logs: auditLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[VAULTSIGN] Audit logs error:", error);
    return NextResponse.json({ error: "Failed to get audit logs" }, { status: 500 });
  }
}

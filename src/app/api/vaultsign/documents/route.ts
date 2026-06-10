import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "client_recruiter" && userRole !== "client_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizationId = (session.user as Record<string, unknown>).organizationId as number;
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const candidateName = searchParams.get("candidate_name");
    const documentType = searchParams.get("document_type");
    const searchQuery = searchParams.get("search");

    const where: Prisma.VaultSignDocumentWhereInput = {
      organization_id: organizationId,
    };

    if (status) {
      where.status = status;
    }
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) (where.created_at as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo) (where.created_at as Prisma.DateTimeFilter).lte = new Date(dateTo);
    }
    if (documentType) {
      where.document_type = documentType;
    }
    // Support both "candidate_name" and "search" params for filtering by signer name
    const nameFilter = candidateName || searchQuery;
    if (nameFilter) {
      where.OR = [
        { signers: { some: { name: { contains: nameFilter, mode: "insensitive" } } } },
        { document_name: { contains: nameFilter, mode: "insensitive" } },
      ];
    }

    const documents = await db.vaultSignDocument.findMany({
      where,
      include: {
        signers: {
          orderBy: { signing_order_position: "asc" },
        },
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        template: {
          select: { id: true, name: true, document_type: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Compute stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000);

    const stats = {
      pending: documents.filter((d) => ["draft", "sent", "partially_signed"].includes(d.status)).length,
      completed_this_month: documents.filter((d) => d.status === "completed" && new Date(d.updated_at) >= startOfMonth).length,
      declined: documents.filter((d) => d.status === "declined").length,
      expiring_soon: documents.filter((d) => ["sent", "partially_signed"].includes(d.status) && new Date(d.expiry_date) <= sevenDaysFromNow && new Date(d.expiry_date) > now).length,
    };

    return NextResponse.json({ documents, stats });
  } catch (error) {
    console.error("[VAULTSIGN_DOCUMENTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
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
    if (userRole !== "client_recruiter" && userRole !== "client_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const organizationId = (session.user as Record<string, unknown>).organizationId as number;
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const {
      template_id,
      document_name,
      document_type,
      signing_order,
      expiry_date,
      personal_message,
      placeholder_values,
      signers,
    } = body;

    if (!document_name) {
      return NextResponse.json(
        { error: "Document name is required" },
        { status: 400 }
      );
    }

    if (!expiry_date) {
      return NextResponse.json(
        { error: "Expiry date is required" },
        { status: 400 }
      );
    }

    if (!signers || !Array.isArray(signers) || signers.length === 0) {
      return NextResponse.json(
        { error: "At least one signer is required" },
        { status: 400 }
      );
    }

    // Validate signers
    for (const signer of signers) {
      if (!signer.name || !signer.email) {
        return NextResponse.json(
          { error: "Each signer must have a name and email" },
          { status: 400 }
        );
      }
    }

    // If template_id provided, fetch the template to copy its PDF URL
    let templatePdfUrl: string | null = null;
    let templateSignFields: string = "[]";
    if (template_id) {
      const template = await db.vaultSignTemplate.findUnique({
        where: { id: template_id },
      });
      if (template) {
        templatePdfUrl = template.document_url;
        // Also copy template's predefined sign fields if they exist
        // Normalize field names: template uses "assigned_to_party" but documents
        // use "assigned_to_signer_id" — convert for consistency across the system
        if (template.predefined_sign_fields) {
          try {
            const predefined = JSON.parse(template.predefined_sign_fields);
            if (Array.isArray(predefined) && predefined.length > 0) {
              const normalized = predefined.map((f: Record<string, unknown>) => ({
                ...f,
                // Convert assigned_to_party → assigned_to_signer_id if present
                assigned_to_signer_id: f.assigned_to_signer_id || f.assigned_to_party || "party_2",
              }));
              templateSignFields = JSON.stringify(normalized);
            }
          } catch {}
        }
      }
    }

    // Sender info for Party 1 (the recruiter/creator)
    const senderName = `${(session.user as Record<string, unknown>).firstName || ""} ${(session.user as Record<string, unknown>).lastName || ""}`.trim();
    const senderEmail = (session.user as Record<string, unknown>).email as string;

    // Create the document with signers — includes Party 1 (sender) as an auto-signed signer
    // so that fields assigned to party_1 are properly tracked and the signing progress
    // includes the sender. The sender implicitly signs by creating and sending the document.
    const document = await db.vaultSignDocument.create({
      data: {
        organization_id: organizationId,
        created_by_user_id: userId,
        template_id: template_id || null,
        document_name,
        document_type: document_type || "custom",
        original_document_url: templatePdfUrl,
        signing_order: signing_order || "sequential",
        expiry_date: new Date(expiry_date),
        personal_message: personal_message || null,
        placeholder_values: placeholder_values ? JSON.stringify(placeholder_values) : "{}",
        sign_fields: templateSignFields,
        audit_trail: JSON.stringify([
          {
            event: "document_created",
            user_id: userId,
            name: senderName,
            timestamp: new Date().toISOString(),
          },
        ]),
        status: "draft",
        signers: {
          create: [
            // Party 1: Sender (auto-signed — they sign by creating & sending the document)
            {
              name: senderName,
              email: senderEmail,
              role: "Sender",
              party_number: 1,
              signing_order_position: 0,
              status: "signed",
              signed_at: new Date(),
              sign_token: randomUUID(),
              token_used: true,
              user_id: userId,
            },
            // Party 2+: Recipients who need to sign
            ...signers.map((s: { name: string; email: string; role: string; party_number: number; signing_order_position: number }) => ({
              name: s.name,
              email: s.email,
              role: s.role || "Signer",
              // party_number: identity (2 = first recipient, 3+ = additional recipients)
              // Used for field assignment (sign_fields.assigned_to_signer_id = "party_N")
              party_number: s.party_number || 2,
              // signing_order_position: determines signing order for sequential signing
              // Lower numbers sign first. For parallel signing, order doesn't matter.
              signing_order_position: s.signing_order_position || 1,
              status: "pending",
              sign_token: randomUUID(),
            })),
          ],
        },
      },
      include: {
        signers: true,
      },
    });

    await db.auditLog.create({
      data: {
        user_id: userId,
        role: "client_recruiter",
        action: "create_vaultsign_document",
        entity_type: "vaultsign_document",
        entity_id: document.id,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("[VAULTSIGN_DOCUMENTS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}

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
    if (candidateName) {
      where.signers = {
        some: {
          name: { contains: candidateName },
        },
      };
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

    return NextResponse.json({ documents });
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
    if (userRole !== "client_recruiter") {
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

    // Create the document with signers
    const document = await db.vaultSignDocument.create({
      data: {
        organization_id: organizationId,
        created_by_user_id: userId,
        template_id: template_id || null,
        document_name,
        document_type: document_type || "custom",
        signing_order: signing_order || "sequential",
        expiry_date: new Date(expiry_date),
        personal_message: personal_message || null,
        placeholder_values: placeholder_values ? JSON.stringify(placeholder_values) : "{}",
        sign_fields: "[]",
        audit_trail: JSON.stringify([
          {
            event: "document_created",
            user_id: userId,
            name: `${(session.user as Record<string, unknown>).firstName || ""} ${(session.user as Record<string, unknown>).lastName || ""}`.trim(),
            timestamp: new Date().toISOString(),
          },
        ]),
        status: "draft",
        signers: {
          create: signers.map((s: { name: string; email: string; role: string; party_number: number; signing_order_position: number }) => ({
            name: s.name,
            email: s.email,
            role: s.role || "Signer",
            party_number: s.party_number || 2,
            signing_order_position: s.signing_order_position || 1,
            status: "pending",
            sign_token: randomUUID(),
          })),
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

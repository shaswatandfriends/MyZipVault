import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const documentId = parseInt(id, 10);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const originalDoc = await db.vaultSignDocument.findUnique({
      where: { id: documentId },
      include: {
        signers: true,
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    if (!originalDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (originalDoc.created_by_user_id !== userId) {
      return NextResponse.json(
        { error: "Only the document creator can revise it" },
        { status: 403 }
      );
    }

    if (originalDoc.status !== "declined") {
      return NextResponse.json(
        { error: "Only declined documents can be revised" },
        { status: 400 }
      );
    }

    // Create a new document copying from the original
    const revisedDoc = await db.vaultSignDocument.create({
      data: {
        organization_id: originalDoc.organization_id,
        created_by_user_id: userId,
        template_id: originalDoc.template_id,
        document_name: `${originalDoc.document_name} (Revised)`,
        document_type: originalDoc.document_type,
        original_document_url: originalDoc.original_document_url,
        signing_order: originalDoc.signing_order,
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        personal_message: originalDoc.personal_message,
        placeholder_values: originalDoc.placeholder_values,
        sign_fields: originalDoc.sign_fields,
        audit_trail: JSON.stringify([
          {
            event: "document_revised",
            user_id: userId,
            name: `${(session.user as Record<string, unknown>).firstName || ""} ${(session.user as Record<string, unknown>).lastName || ""}`.trim(),
            timestamp: new Date().toISOString(),
            revised_from: documentId,
          },
        ]),
        status: "draft",
        revised_from_document_id: documentId,
        signers: {
          create: originalDoc.signers.map((s) => ({
            name: s.name,
            email: s.email,
            role: s.role,
            party_number: s.party_number,
            signing_order_position: s.signing_order_position,
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
        action: "revise_vaultsign_document",
        entity_type: "vaultsign_document",
        entity_id: revisedDoc.id,
      },
    });

    return NextResponse.json({ document: revisedDoc }, { status: 201 });
  } catch (error) {
    console.error("[VAULTSIGN_DOCUMENT_REVISE]", error);
    return NextResponse.json(
      { error: "Failed to revise document" },
      { status: 500 }
    );
  }
}

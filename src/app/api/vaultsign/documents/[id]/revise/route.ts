import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";
import type { AuditTrailEntry } from "@/lib/vaultsign/types";

// POST: Create a new document from a declined one
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const docId = parseInt(id);
    if (isNaN(docId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const originalDoc = await db.vaultSignDocument.findUnique({
      where: { id: docId },
      include: { signers: true },
    });

    if (!originalDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only declined documents can be revised
    if (originalDoc.status !== "declined") {
      return NextResponse.json({ error: "Only declined documents can be revised" }, { status: 400 });
    }

    // Check access
    const role = (session.user as Record<string, unknown>).role as string;
    const orgId = (session.user as Record<string, unknown>).organizationId as number;
    if (role !== "super_admin" && originalDoc.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create a new document based on the original
    const newDoc = await db.vaultSignDocument.create({
      data: {
        organization_id: originalDoc.organization_id,
        created_by_user_id: parseInt((session.user as Record<string, unknown>).id),
        template_id: originalDoc.template_id,
        document_name: `${originalDoc.document_name} (Revised)`,
        document_type: originalDoc.document_type,
        source_type: originalDoc.source_type,
        original_file_url: originalDoc.original_file_url,
        tiptap_content: originalDoc.tiptap_content,
        edited_pdf_url: originalDoc.edited_pdf_url,
        signing_order: originalDoc.signing_order,
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        personal_message: originalDoc.personal_message,
        status: "draft",
        placeholder_values: originalDoc.placeholder_values,
        sign_fields: originalDoc.sign_fields,
        audit_trail: JSON.stringify([
          {
            event: "document_created",
            user_name: `${(session.user as Record<string, unknown>).firstName || ""} ${(session.user as Record<string, unknown>).lastName || ""}`.trim() || session.user.email,
            ip_address: request.headers.get("x-forwarded-for") || "unknown",
            timestamp: new Date().toISOString(),
          },
          {
            event: "document_revised_from",
            user_name: `${(session.user as Record<string, unknown>).firstName || ""} ${(session.user as Record<string, unknown>).lastName || ""}`.trim() || session.user.email,
            ip_address: request.headers.get("x-forwarded-for") || "unknown",
            timestamp: new Date().toISOString(),
          },
        ] as AuditTrailEntry[]),
        revised_from_document_id: originalDoc.id,
      },
    });

    // Copy signers with new tokens
    const signerData = originalDoc.signers.map((signer, index) => ({
      document_id: newDoc.id,
      user_id: signer.user_id,
      name: signer.name,
      email: signer.email,
      role: signer.role,
      signer_index: signer.signer_index,
      signing_order_position: signer.signing_order_position,
      status: "pending",
      sign_token: crypto.randomBytes(32).toString("hex"),
    }));

    await db.vaultSignSigner.createMany({ data: signerData });

    // Return the new document with signers
    const fullDoc = await db.vaultSignDocument.findUnique({
      where: { id: newDoc.id },
      include: {
        signers: true,
        template: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      ...fullDoc,
      sign_fields: JSON.parse(fullDoc?.sign_fields || "[]"),
      placeholder_values: JSON.parse(fullDoc?.placeholder_values || "{}"),
      audit_trail: JSON.parse(fullDoc?.audit_trail || "[]"),
    }, { status: 201 });
  } catch (error) {
    console.error("[VAULTSIGN] Revise document error:", error);
    return NextResponse.json({ error: "Failed to revise document" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AuditTrailEntry } from "@/lib/vaultsign/types";

// GET: Get document with signers, template info
export async function GET(
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

    const document = await db.vaultSignDocument.findUnique({
      where: { id: docId },
      include: {
        signers: {
          orderBy: { signing_order_position: "asc" },
        },
        template: { select: { id: true, name: true } },
        creator: { select: { id: true, first_name: true, last_name: true, email: true } },
        revised_from_document: {
          select: { id: true, document_name: true, status: true },
        },
        revised_documents: {
          select: { id: true, document_name: true, status: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check access — only org members or super_admin
    const role = (session.user as Record<string, unknown>).role as string;
    const orgId = (session.user as Record<string, unknown>).organizationId as number;
    if (role !== "super_admin" && document.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      ...document,
      sign_fields: JSON.parse(document.sign_fields || "[]"),
      placeholder_values: JSON.parse(document.placeholder_values || "{}"),
      audit_trail: JSON.parse(document.audit_trail || "[]"),
    });
  } catch (error) {
    console.error("[VAULTSIGN] Get document error:", error);
    return NextResponse.json({ error: "Failed to get document" }, { status: 500 });
  }
}

// PATCH: Update draft document
export async function PATCH(
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

    const document = await db.vaultSignDocument.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only draft documents can be edited
    if (document.status !== "draft") {
      return NextResponse.json({ error: "Only draft documents can be edited" }, { status: 400 });
    }

    // Check access
    const role = (session.user as Record<string, unknown>).role as string;
    const orgId = (session.user as Record<string, unknown>).organizationId as number;
    if (role !== "super_admin" && document.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = [
      "document_name",
      "document_type",
      "tiptap_content",
      "sign_fields",
      "placeholder_values",
      "signing_order",
      "expiry_date",
      "personal_message",
      "original_file_url",
      "edited_pdf_url",
    ];

    const updateData: any = { updated_at: new Date() };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "sign_fields" || field === "placeholder_values" || field === "audit_trail") {
          updateData[field] = typeof body[field] === "string" ? body[field] : JSON.stringify(body[field]);
        } else if (field === "expiry_date" && body[field]) {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updatedDoc = await db.vaultSignDocument.update({
      where: { id: docId },
      data: updateData,
      include: {
        signers: { orderBy: { signing_order_position: "asc" } },
        template: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      ...updatedDoc,
      sign_fields: JSON.parse(updatedDoc.sign_fields || "[]"),
      placeholder_values: JSON.parse(updatedDoc.placeholder_values || "{}"),
      audit_trail: JSON.parse(updatedDoc.audit_trail || "[]"),
    });
  } catch (error) {
    console.error("[VAULTSIGN] Update document error:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

// DELETE: Delete a document (only draft, completed, expired, or voided)
export async function DELETE(
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

    const document = await db.vaultSignDocument.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only allow deleting documents that aren't actively being signed
    if (document.status === "sent" || document.status === "partially_signed") {
      return NextResponse.json({ error: "Cannot delete a document that is out for signature. Void it first." }, { status: 400 });
    }

    // Check access
    const role = (session.user as Record<string, unknown>).role as string;
    const orgId = (session.user as Record<string, unknown>).organizationId as number;
    if (role !== "super_admin" && document.organization_id !== orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Delete signers first (foreign key constraint)
    await db.vaultSignSigner.deleteMany({
      where: { document_id: docId },
    });

    // Delete the document
    await db.vaultSignDocument.delete({
      where: { id: docId },
    });

    return NextResponse.json({ success: true, message: "Document deleted" });
  } catch (error) {
    console.error("[VAULTSIGN] Delete document error:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentIdStr = formData.get("document_id") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 }
      );
    }

    if (!documentIdStr) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const documentId = parseInt(documentIdStr, 10);
    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const document = await db.vaultSignDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (document.created_by_user_id !== userId) {
      return NextResponse.json(
        { error: "Only the document creator can upload files" },
        { status: 403 }
      );
    }

    if (document.status !== "draft") {
      return NextResponse.json(
        { error: "Cannot upload file to a non-draft document" },
        { status: 400 }
      );
    }

    // Upload PDF to Supabase Storage
    const { url } = await uploadFile(
      "vaultsign-documents",
      `${documentId}`,
      file,
      file.name,
      "application/pdf"
    );

    // Update document with the URL
    await db.vaultSignDocument.update({
      where: { id: documentId },
      data: {
        original_document_url: url,
        updated_at: new Date(),
      },
    });

    // Add audit trail event
    const auditTrail = JSON.parse(document.audit_trail || "[]");
    auditTrail.push({
      event: "document_uploaded",
      user_id: userId,
      timestamp: new Date().toISOString(),
    });
    await db.vaultSignDocument.update({
      where: { id: documentId },
      data: { audit_trail: JSON.stringify(auditTrail) },
    });

    await db.auditLog.create({
      data: {
        user_id: userId,
        role: "client_recruiter",
        action: "upload_vaultsign_document",
        entity_type: "vaultsign_document",
        entity_id: documentId,
      },
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[VAULTSIGN_DOCUMENT_UPLOAD]", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

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
    if (userRole !== "client_recruiter" && userRole !== "client_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const organizationId = (session.user as Record<string, unknown>).organizationId as number;
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentIdStr = formData.get("document_id") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be under 25MB" },
        { status: 400 }
      );
    }

    // Upload PDF to Supabase Storage
    const folder = documentIdStr || `upload-${Date.now()}`;
    const { url, isLocalStorage } = await uploadFile(
      "vaultsign-documents",
      folder,
      file,
      file.name,
      "application/pdf"
    );

    // If document_id is provided, update the existing document with the PDF URL
    if (documentIdStr) {
      const documentId = parseInt(documentIdStr, 10);
      if (isNaN(documentId)) {
        return NextResponse.json(
          { error: "Invalid document ID" },
          { status: 400 }
        );
      }

      const document = await db.vaultSignDocument.findFirst({
        where: {
          id: documentId,
          created_by_user_id: userId,
          organization_id: organizationId,
        },
      });

      if (!document) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }

      if (document.status !== "draft") {
        return NextResponse.json(
          { error: "Cannot upload file to a non-draft document" },
          { status: 400 }
        );
      }

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

      return NextResponse.json({
        url,
        document_id: documentId,
        isLocalStorage,
      });
    }

    // If no document_id, just return the URL
    // The caller will use this URL when creating the document
    return NextResponse.json({
      url,
      isLocalStorage,
    });
  } catch (error) {
    console.error("[VAULTSIGN_DOCUMENT_UPLOAD]", error);
    return NextResponse.json(
      { error: "Failed to upload PDF" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

const BUCKET_VAULTSIGN = "vaultsign-documents";

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
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!documentIdStr) {
      return NextResponse.json(
        { error: "No document_id provided" },
        { status: 400 }
      );
    }

    const documentId = parseInt(documentIdStr, 10);
    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: "Invalid document_id" },
        { status: 400 }
      );
    }

    // Verify the document exists and belongs to this user
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

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be under 25MB" },
        { status: 400 }
      );
    }

    // Upload to storage
    const folder = `org-${organizationId}/doc-${documentId}`;
    const { url: fileUrl } = await uploadFile(
      BUCKET_VAULTSIGN,
      folder,
      file,
      file.name || "document.pdf",
      "application/pdf"
    );

    // Update the document with the file URL
    await db.vaultSignDocument.update({
      where: { id: documentId },
      data: {
        original_document_url: fileUrl,
        updated_at: new Date(),
      },
    });

    // Add audit trail event
    const auditTrail = JSON.parse(document.audit_trail || "[]");
    const senderName = `${(session.user as Record<string, unknown>).firstName || ""} ${(session.user as Record<string, unknown>).lastName || ""}`.trim();
    auditTrail.push({
      event: "document_uploaded",
      user_id: userId,
      name: senderName,
      timestamp: new Date().toISOString(),
      file_name: file.name,
      file_size: file.size,
    });
    await db.vaultSignDocument.update({
      where: { id: documentId },
      data: { audit_trail: JSON.stringify(auditTrail) },
    });

    await db.auditLog.create({
      data: {
        user_id: userId,
        role: userRole,
        action: "upload_vaultsign_document",
        entity_type: "vaultsign_document",
        entity_id: documentId,
      },
    });

    return NextResponse.json({
      success: true,
      url: fileUrl,
      document_id: documentId,
    });
  } catch (error) {
    console.error("[VAULTSIGN_DOCUMENT_UPLOAD]", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "client_recruiter" && userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const documentId = parseInt(id, 10);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const body = await request.json();
    const { sign_fields } = body;

    if (!Array.isArray(sign_fields)) {
      return NextResponse.json({ error: "sign_fields must be an array" }, { status: 400 });
    }

    // Verify document exists and user has access
    const document = await db.vaultSignDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify the user is the creator (admins can bypass)
    const userId = parseInt(String((session.user as Record<string, unknown>).id), 10);
    if (document.created_by_user_id !== userId && userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "You can only edit your own documents" }, { status: 403 });
    }

    // Add audit trail event and update sign_fields in a single atomic operation
    const auditTrail = JSON.parse(document.audit_trail || "[]");
    auditTrail.push({
      event: "sign_fields_saved",
      user_id: userId,
      timestamp: new Date().toISOString(),
    });
    await db.vaultSignDocument.update({
      where: { id: documentId },
      data: {
        sign_fields: JSON.stringify(sign_fields),
        audit_trail: JSON.stringify(auditTrail),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VAULTSIGN_DOCUMENT_FIELDS_PUT]", error);
    return NextResponse.json(
      { error: "Failed to save sign fields" },
      { status: 500 }
    );
  }
}

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
    if (userRole !== "client_recruiter") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const { id } = await params;
    const documentId = parseInt(id, 10);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const document = await db.vaultSignDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.created_by_user_id !== userId) {
      return NextResponse.json(
        { error: "Only the document creator can modify sign fields" },
        { status: 403 }
      );
    }

    if (document.status !== "draft") {
      return NextResponse.json(
        { error: "Can only modify sign fields on draft documents" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { sign_fields } = body;

    if (!sign_fields || !Array.isArray(sign_fields)) {
      return NextResponse.json(
        { error: "sign_fields must be an array" },
        { status: 400 }
      );
    }

    await db.vaultSignDocument.update({
      where: { id: documentId },
      data: {
        sign_fields: JSON.stringify(sign_fields),
        updated_at: new Date(),
      },
    });

    // Add audit trail event
    const auditTrail = JSON.parse(document.audit_trail || "[]");
    auditTrail.push({
      event: "sign_fields_saved",
      user_id: userId,
      timestamp: new Date().toISOString(),
    });
    await db.vaultSignDocument.update({
      where: { id: documentId },
      data: { audit_trail: JSON.stringify(auditTrail) },
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

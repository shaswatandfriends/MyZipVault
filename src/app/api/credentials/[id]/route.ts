import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFile, STORAGE_BUCKETS } from "@/lib/storage";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;

    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const credentialId = parseInt(id);

    if (isNaN(credentialId)) {
      return NextResponse.json({ error: "Invalid credential ID" }, { status: 400 });
    }

    // Find the credential and verify ownership
    const credential = await db.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    if (credential.candidate_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { document_name, expiration_date, reminder_enabled } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (document_name !== undefined) {
      if (!document_name.trim()) {
        return NextResponse.json(
          { error: "Document name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.document_name = document_name.trim();
    }
    if (expiration_date !== undefined) {
      updateData.expiration_date = expiration_date ? new Date(expiration_date) : null;
    }
    if (reminder_enabled !== undefined) {
      updateData.reminder_enabled = reminder_enabled;
    }

    const updated = await db.credential.update({
      where: { id: credentialId },
      data: updateData,
    });

    return NextResponse.json({ credential: updated });
  } catch (error) {
    console.error("[CREDENTIALS_PUT] Error:", error);
    return NextResponse.json(
      { error: "Failed to update credential" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;

    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const credentialId = parseInt(id);

    if (isNaN(credentialId)) {
      return NextResponse.json({ error: "Invalid credential ID" }, { status: 400 });
    }

    // Find the credential and verify ownership
    const credential = await db.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    if (credential.candidate_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete file from storage (best-effort — don't block on failure)
    try {
      await deleteFile(STORAGE_BUCKETS.CREDENTIALS, credential.file_url);
    } catch (storageError) {
      console.warn("[CREDENTIALS_DELETE] Storage file deletion failed:", storageError);
    }

    // Delete related records first
    await db.documentFlag.deleteMany({
      where: { credential_id: credentialId },
    });

    // Nullify consent shares referencing this credential
    await db.consentShare.updateMany({
      where: { credential_id: credentialId },
      data: { credential_id: null },
    });

    // Delete the credential record
    await db.credential.delete({
      where: { id: credentialId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CREDENTIALS_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete credential" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, STORAGE_BUCKETS } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    // ── Auth check ──
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;

    // ── Role check: only candidates can upload ──
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Parse FormData ──
    const formData = await request.formData();
    const documentName = formData.get("documentName") as string | null;
    const expirationDate = formData.get("expirationDate") as string | null;
    const reminderEnabledStr = formData.get("reminderEnabled") as string | null;
    const file = formData.get("file") as File | null;

    // ── Validate documentName ──
    if (!documentName || !documentName.trim()) {
      return NextResponse.json(
        { error: "Document name is required" },
        { status: 400 }
      );
    }

    // ── Upload file if provided ──
    let fileUrl = "";
    if (file && file.size > 0) {
      const folder = `user-${userId}`;
      const uploadResult = await uploadFile(
        STORAGE_BUCKETS.CREDENTIALS,
        folder,
        file,
        file.name,
        file.type
      );
      fileUrl = uploadResult.url;
    }

    // ── Parse optional fields ──
    const reminderEnabled = reminderEnabledStr === "true";
    const expirationDateValue = expirationDate ? new Date(expirationDate) : null;

    // ── Create credential record ──
    const credential = await db.credential.create({
      data: {
        candidate_user_id: userId,
        document_name: documentName.trim(),
        file_url: fileUrl,
        expiration_date: expirationDateValue,
        reminder_enabled: reminderEnabled,
        status: "active",
        verification_status: "pending_review",
      },
    });

    return NextResponse.json({ credential }, { status: 201 });
  } catch (error) {
    console.error("[CREDENTIALS_UPLOAD] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload credential" },
      { status: 500 }
    );
  }
}

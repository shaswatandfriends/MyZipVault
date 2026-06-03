import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, STORAGE_BUCKETS } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: Request) {
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentName = formData.get("documentName") as string;
    const expirationDate = formData.get("expirationDate") as string | null;
    const reminderEnabled = formData.get("reminderEnabled") === "true";

    if (!documentName) {
      return NextResponse.json(
        { error: "Document name is required" },
        { status: 400 }
      );
    }

    // Upload file to Supabase Storage (or fall back to base64)
    let fileUrl = "";
    let isLocalStorage = false;

    if (file) {
      const uploadResult = await uploadFile(
        STORAGE_BUCKETS.CREDENTIALS,
        `user-${userId}`,
        file,
        file.name,
        file.type || "application/octet-stream"
      );
      fileUrl = uploadResult.url;
      isLocalStorage = uploadResult.isLocalStorage;
    }

    // Determine status based on expiration
    let status = "active";
    if (expirationDate) {
      const expDate = new Date(expirationDate);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (expDate < now) {
        status = "expired";
      } else if (expDate <= thirtyDaysFromNow) {
        status = "expiring_soon";
      }
    }

    const credential = await db.credential.create({
      data: {
        candidate_user_id: userId,
        document_name: documentName,
        file_url: fileUrl,
        expiration_date: expirationDate ? new Date(expirationDate) : null,
        reminder_enabled: reminderEnabled,
        status,
        verification_status: "pending_review",
      },
    });

    // Update profile completion
    const profile = await db.candidateProfile.findUnique({
      where: { user_id: userId },
    });
    if (profile && profile.profile_completion_pct < 100) {
      const newPct = Math.min(profile.profile_completion_pct + 10, 100);
      await db.candidateProfile.update({
        where: { user_id: userId },
        data: { profile_completion_pct: newPct },
      });
    }

    return NextResponse.json(
      {
        message: "Credential uploaded successfully",
        credential,
        storageType: isLocalStorage ? "local_base64" : "supabase_storage",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Credential upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload credential" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedUrl, STORAGE_BUCKETS } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/storage/signed-url
 *   Generates a pre-signed URL for accessing a private file in Supabase Storage.
 *
 * Body: { fileUrl: string, bucket?: string }
 * Returns: { signedUrl: string, isLocal: boolean }
 *
 * SECURITY (Gap 3 fix):
 *   - Verifies the requesting user actually owns or has unlocked access to
 *     the file before generating a signed URL
 *   - Signed URLs expire in 15 minutes (was 1 hour — matches original spec)
 *   - Base64 data URLs are returned as-is (no check needed)
 *
 * Access rules by role:
 *   - Candidate: file must be in their own credentials, resumes, references,
 *     or BAA docs for their org
 *   - Recruiter (client_recruiter / client_admin): file must be in a
 *     credential/resume/reference they have an UnlockedDocument for
 *     (i.e., they paid to unlock it)
 *   - Platform Admin / Super Admin: full access (for document verification
 *     queue and audits)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>)
      .organizationId as number | null;

    const { fileUrl, bucket } = await request.json();

    if (!fileUrl || typeof fileUrl !== "string") {
      return NextResponse.json(
        { error: "fileUrl is required" },
        { status: 400 }
      );
    }

    // If it's a base64 data URL, return as-is (already accessible, no storage check needed)
    if (fileUrl.startsWith("data:")) {
      return NextResponse.json({ signedUrl: fileUrl, isLocal: true });
    }

    // ─── Ownership / Access Verification ──────────────────────────────
    const hasAccess = await verifyFileAccess(
      fileUrl,
      userId,
      userRole,
      organizationId
    );

    if (!hasAccess) {
      console.warn(
        `[SIGNED_URL] Access denied — userId: ${userId}, role: ${userRole}, fileUrl: ${fileUrl.substring(0, 80)}...`
      );

      // ─── Gap 14: audit log denied access attempts ───
      await logAudit({
        userId,
        role: userRole,
        action: "document_view_denied",
        entityType: "file",
        entityId: 0,
      }).catch((err) =>
        console.error("[SIGNED_URL] Failed to log denied access:", err)
      );

      return NextResponse.json(
        { error: "Access denied — you do not have permission to view this file" },
        { status: 403 }
      );
    }

    // Determine the bucket
    const storageBucket = bucket || STORAGE_BUCKETS.CREDENTIALS;

    // Generate a signed URL valid for 15 minutes (was 1 hour — reduced per Gap 3)
    const signedUrl = await getSignedUrl(storageBucket, fileUrl, 900);

    // ─── Gap 14: audit log every document view ───
    // This logs every time a recruiter (or admin) generates a signed URL
    // to view a document. Critical for HIPAA compliance — answers
    // "who viewed this credential and when?"
    await logAudit({
      userId,
      role: userRole,
      action: "document_viewed",
      entityType: storageBucket,
      entityId: 0, // We don't have the entity ID here, just the URL
    }).catch((err) =>
      console.error("[SIGNED_URL] Failed to log document view:", err)
    );

    return NextResponse.json({ signedUrl, isLocal: false });
  } catch (error) {
    console.error("[SIGNED_URL] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}

/**
 * Verify the user has access to the file at `fileUrl`.
 *
 * Checks (in order):
 *   1. Platform admin / super admin → always allowed (for verification queue)
 *   2. Candidate → file must be in their own credentials, resumes, references
 *   3. Recruiter / client admin → file must be in a doc they've unlocked
 *
 * Returns true if access allowed, false otherwise.
 */
async function verifyFileAccess(
  fileUrl: string,
  userId: number,
  userRole: string,
  organizationId: number | null
): Promise<boolean> {
  // Platform admins and super admins have full access (for document verification)
  if (userRole === "platform_admin" || userRole === "super_admin") {
    return true;
  }

  // ─── Candidate: check own credentials, resumes, references ────────
  if (userRole === "candidate") {
    // Check credentials
    const credential = await db.credential.findFirst({
      where: { file_url: fileUrl, candidate_user_id: userId },
      select: { id: true },
    });
    if (credential) return true;

    // Check resumes
    const resume = await db.resume.findFirst({
      where: { file_url: fileUrl, candidate_user_id: userId },
      select: { id: true },
    });
    if (resume) return true;

    // References don't have direct file URLs (they're form responses)
    // but check reference_responses just in case
    // Note: reference responses don't have file_url, so skip

    // BAA document for their org (candidates don't sign BAAs, but just in case)
    // Skip — candidates don't have BAA access

    return false;
  }

  // ─── Recruiter / Client Admin: check unlocked documents ───────────
  if (
    userRole === "client_recruiter" ||
    userRole === "client_admin"
  ) {
    // Build list of client_user_ids to check unlocked_documents for
    // - Individual recruiter: only their own unlocks
    // - Client admin: any recruiter's unlocks in their org
    let clientUserIds: number[] = [userId];

    if (userRole === "client_admin" && organizationId) {
      const orgUsers = await db.user.findMany({
        where: {
          organization_id: organizationId,
          role: { in: ["client_admin", "client_recruiter"] },
        },
        select: { id: true },
      });
      clientUserIds = orgUsers.map((u) => u.id);
    }

    // Check if any of these recruiters have unlocked this file via consent_share
    // The file_url is on the credential/resume/reference, and unlocked_documents
    // links to consent_share which links to the entity

    // Check unlocked credentials
    const unlockedCredential = await db.unlockedDocument.findFirst({
      where: {
        client_user_id: { in: clientUserIds },
        entity_type: "credential",
        consent_share: {
          credential: { file_url: fileUrl },
        },
      },
      select: { id: true },
    });
    if (unlockedCredential) return true;

    // Check unlocked resumes
    const unlockedResume = await db.unlockedDocument.findFirst({
      where: {
        client_user_id: { in: clientUserIds },
        entity_type: "resume",
        consent_share: {
          resume: { file_url: fileUrl },
        },
      },
      select: { id: true },
    });
    if (unlockedResume) return true;

    // BAA document for their org
    if (organizationId) {
      const orgBaa = await db.organization.findFirst({
        where: {
          id: organizationId,
          baa_document_url: fileUrl,
        },
        select: { id: true },
      });
      if (orgBaa) return true;
    }

    return false;
  }

  // Unknown role — deny by default
  return false;
}

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
    const adminUserId = Number(session.user.id);

    if (userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const credentialId = parseInt(id);

    const credential = await db.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    // Set verification_status = "verified", reviewed_by
    await db.credential.update({
      where: { id: credentialId },
      data: {
        verification_status: "verified",
        reviewed_by: adminUserId,
      },
    });

    // Recalculate profile_completion_pct for the candidate
    await recalculateProfileCompletion(credential.candidate_user_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_DOCUMENT_VERIFY]", error);
    return NextResponse.json(
      { error: "Failed to verify credential" },
      { status: 500 }
    );
  }
}

async function recalculateProfileCompletion(userId: number) {
  // Count verified credentials
  const verifiedCredentials = await db.credential.count({
    where: {
      candidate_user_id: userId,
      verification_status: "verified",
    },
  });

  // Check if profile has basic info
  const profile = await db.candidateProfile.findUnique({
    where: { user_id: userId },
  });

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  let pct = 0;

  // Basic profile info (20%)
  if (profile?.first_name) pct += 5;
  if (profile?.last_name) pct += 5;
  if (profile?.phone) pct += 5;
  if (user?.email) pct += 5;

  // At least one verified credential (30%)
  if (verifiedCredentials > 0) pct += 30;

  // Resume uploaded (20%)
  if (profile?.resume_id) pct += 20;

  // Has at least one reference (15%)
  const refCount = await db.candidateReference.count({
    where: { candidate_user_id: userId, status: "completed" },
  });
  if (refCount > 0) pct += 15;

  // Has completed checklist (15%)
  const checklistCount = await db.candidateChecklistResponse.count({
    where: { candidate_user_id: userId, status: "active" },
  });
  if (checklistCount > 0) pct += 15;

  // Cap at 100
  pct = Math.min(pct, 100);

  if (profile) {
    await db.candidateProfile.update({
      where: { user_id: userId },
      data: { profile_completion_pct: pct },
    });
  }
}

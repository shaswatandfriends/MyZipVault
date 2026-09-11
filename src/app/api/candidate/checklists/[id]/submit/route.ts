import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireEmailVerified } from "@/lib/email-verification";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Block submit for unverified email (per Gap 5 spec)
    const emailCheck = await requireEmailVerified(userId);
    if (!emailCheck.allowed) return emailCheck.errorResponse!;

    const { id } = await params;
    const requestId = Number(id);
    const body = await request.json();
    const { candidateNameSigned, signatureBase64, signature } = body;

    // Support both old (signature string) and new (candidateNameSigned + signatureBase64) format
    const finalSignature = signatureBase64 || signature || "";
    const finalNameSigned = candidateNameSigned || "";

    if (!finalSignature.trim() && !finalNameSigned.trim()) {
      return NextResponse.json(
        { error: "Digital signature and name are required" },
        { status: 400 }
      );
    }

    let checklistRequest: any = null;
    try {
      checklistRequest = await db.checklistRequest.findUnique({
        where: { id: requestId },
        include: {
          candidate_response: {
            include: { skill_ratings: true },
          },
        },
      });
    } catch (e) { console.error("[SCHEMA_DRIFT] query failed:", e); }

    if (!checklistRequest) {
      return NextResponse.json(
        { error: "Checklist not found" },
        { status: 404 }
      );
    }

    if (checklistRequest.candidate_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (checklistRequest.status === "completed") {
      return NextResponse.json(
        { error: "Checklist already submitted" },
        { status: 400 }
      );
    }

    if (checklistRequest.status === "expired") {
      return NextResponse.json(
        { error: "This checklist request has expired" },
        { status: 400 }
      );
    }

    if (!checklistRequest.candidate_response) {
      return NextResponse.json(
        { error: "No response found. Please rate at least one skill first." },
        { status: 400 }
      );
    }

    // Verify all skills are rated (also reject empty string ratings)
    const templateSkills = await db.skill.findMany({
      where: { checklist_template_id: checklistRequest.checklist_template_id },
    });

    const unrated = templateSkills.filter((s) => {
      const r = checklistRequest.candidate_response!.skill_ratings.find(
        (rt) => rt.skill_id === s.id
      );
      return !r || (r.rating_value === null && !r.is_na) || (r.rating_value === "" && !r.is_na);
    });

    if (unrated.length > 0) {
      return NextResponse.json(
        {
          error: `${unrated.length} skill(s) still need ratings`,
          unratedCount: unrated.length,
        },
        { status: 400 }
      );
    }

    // Update the response with signature data
    await db.candidateChecklistResponse.update({
      where: { id: checklistRequest.candidate_response.id },
      data: {
        status: "submitted",
        submitted_at: new Date(),
        digital_signature: finalSignature.trim(),
        candidate_name_signed: finalNameSigned.trim() || null,
        signature_date: new Date(),
      },
    });

    // Update the checklist request
    await db.checklistRequest.update({
      where: { id: requestId },
      data: {
        status: "completed",
        completion_pct: 100,
      },
    });

    // FIX #4: Notify recruiter that candidate submitted
    try {
      const { createNotification } = await import("@/lib/notifications/create");
      const tmpl = await db.checklistTemplate.findUnique({ where: { id: checklistRequest.checklist_template_id }, select: { name: true } }).catch(() => null);
      await createNotification({ userId: checklistRequest.client_user_id, category: "checklist", priority: "high", title: `Checklist completed: ${tmpl?.name || "Skills Checklist"}`, message: "A candidate has submitted their skills checklist.", actionUrl: "/recruiter/requests", actionLabel: "View", relatedEntityId: requestId, relatedEntityType: "checklist_request" });
    } catch {}

    // PHASE 1.2: Auto-share checklist with the requesting recruiter (30-day default expiry).
    // Only auto-share if the checklist was REQUESTED by a recruiter (client_user_id set).
    if (checklistRequest.client_user_id && checklistRequest.candidate_response) {
      try {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await db.consentShare.create({
          data: {
            candidate_user_id: userId,
            client_user_id: checklistRequest.client_user_id,
            checklist_response_id: checklistRequest.candidate_response.id,
            shared_at: now,
            expires_at: expiresAt,
          },
        });
        // Notify candidate it was auto-shared (they can revoke from /sharing)
        try {
          const { createNotification } = await import("@/lib/notifications/create");
          await createNotification({
            userId,
            category: "checklist",
            priority: "info",
            title: "Checklist auto-shared with recruiter",
            message: "Your submitted checklist was automatically shared with the requesting recruiter. You can revoke this from the Sharing page.",
            actionUrl: "/sharing",
            actionLabel: "Manage sharing",
            relatedEntityId: requestId,
            relatedEntityType: "checklist_request",
          });
        } catch {}
      } catch (shareErr) {
        console.error("[SUBMIT_AUTOSHARE] failed:", shareErr);
        // Non-fatal — submit still succeeds, just no auto-share
      }
    }

    // FIX #6: Recalc profile completion
    try { const { recalcProfileCompletion } = await import("@/lib/profile-completion"); await recalcProfileCompletion(userId); } catch {}

    return NextResponse.json({ message: "Checklist submitted successfully", completionPct: 100 });
  } catch (error) {
    console.error("Submit checklist error:", error);
    return NextResponse.json(
      { error: "Failed to submit checklist" },
      { status: 500 }
    );
  }
}

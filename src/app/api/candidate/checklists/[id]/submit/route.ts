import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
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

    return NextResponse.json({
      message: "Checklist submitted successfully",
      completionPct: 100,
    });
  } catch (error) {
    console.error("Submit checklist error:", error);
    return NextResponse.json(
      { error: "Failed to submit checklist" },
      { status: 500 }
    );
  }
}

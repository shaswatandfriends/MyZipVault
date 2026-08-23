import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/references/delete-request — Candidate requests deletion of a reference
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role;

    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Only candidates can request reference deletion" }, { status: 403 });
    }

    const body = await request.json();
    const { referenceId, reason } = body;

    if (!referenceId || !reason?.trim()) {
      return NextResponse.json({ error: "Reference ID and reason are required" }, { status: 400 });
    }

    // Verify the reference belongs to this candidate
    const reference = await db.candidateReference.findFirst({
      where: { id: Number(referenceId), candidate_user_id: userId },
    });

    if (!reference) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    // Check if there's already a pending deletion request for this reference
    const existingRequest = await db.referenceDeletionRequest.findFirst({
      where: { reference_id: Number(referenceId), status: "pending" },
    });

    if (existingRequest) {
      return NextResponse.json({ error: "A deletion request for this reference is already pending" }, { status: 409 });
    }

    const deletionRequest = await db.referenceDeletionRequest.create({
      data: {
        candidate_user_id: userId,
        reference_id: Number(referenceId),
        reason: reason.trim(),
        status: "pending",
      },
    });

    // Create notification for superadmins
    const superAdmins = await db.user.findMany({
      where: { role: "super_admin", account_status: "active" },
      select: { id: true },
    });

    const { createNotification } = await import("@/lib/notifications/create");
    for (const admin of superAdmins) {
      await createNotification({
        userId: admin.id,
        category: "compliance",
        priority: "important",
        title: "Reference Deletion Request",
        message: `A candidate has requested deletion of a reference (ID: ${referenceId}). Reason: ${reason.trim().substring(0, 100)}`,
        relatedEntityId: deletionRequest.id,
        relatedEntityType: "reference_deletion_request",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Deletion request submitted. A super admin will review your request.",
      request: deletionRequest,
    });
  } catch (error) {
    console.error("Reference delete request error:", error);
    return NextResponse.json({ error: "Failed to submit deletion request" }, { status: 500 });
  }
}

// GET /api/references/delete-request — Candidate views their deletion requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role;

    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Only candidates can view deletion requests" }, { status: 403 });
    }

    const requests = await db.referenceDeletionRequest.findMany({
      where: { candidate_user_id: userId },
      include: {
        reference: {
          select: {
            id: true,
            manager_email: true,
            facility_name: true,
            manager_user: {
              select: { first_name: true, last_name: true },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Reference delete request GET error:", error);
    return NextResponse.json({ error: "Failed to fetch deletion requests" }, { status: 500 });
  }
}

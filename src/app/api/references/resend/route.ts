import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

    const body = await request.json();
    const { referenceId } = body;

    if (!referenceId) {
      return NextResponse.json(
        { error: "Reference ID is required" },
        { status: 400 }
      );
    }

    // Find the reference and verify ownership
    const reference = await db.candidateReference.findFirst({
      where: {
        id: referenceId,
        candidate_user_id: userId,
      },
    });

    if (!reference) {
      return NextResponse.json(
        { error: "Reference not found" },
        { status: 404 }
      );
    }

    if (reference.status !== "pending_request") {
      return NextResponse.json(
        { error: "Only pending references can be resent" },
        { status: 400 }
      );
    }

    // Update the requested_at timestamp to now
    const updated = await db.candidateReference.update({
      where: { id: referenceId },
      data: { requested_at: new Date() },
    });

    // Create notification about the resend
    await db.notification.create({
      data: {
        user_id: userId,
        message: `Reference request resent to ${reference.manager_email} at ${reference.facility_name}`,
        type: "reference_resent",
        related_entity_id: referenceId,
      },
    });

    return NextResponse.json({
      message: "Reference request resent successfully",
      reference: updated,
    });
  } catch (error) {
    console.error("[REFERENCES_RESEND] Error:", error);
    return NextResponse.json(
      { error: "Failed to resend reference request" },
      { status: 500 }
    );
  }
}

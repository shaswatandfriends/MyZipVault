import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(request: Request) {
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
    const { consentShareId, newExpiresAt } = body;

    if (!consentShareId || !newExpiresAt) {
      return NextResponse.json(
        { error: "consentShareId and newExpiresAt are required" },
        { status: 400 }
      );
    }

    // Find the consent share and verify ownership
    const consentShare = await db.consentShare.findFirst({
      where: {
        id: consentShareId,
        candidate_user_id: userId,
        is_deleted: false,
      },
    });

    if (!consentShare) {
      return NextResponse.json(
        { error: "Active consent share not found" },
        { status: 404 }
      );
    }

    // Validate the new expiry date is in the future
    const newExpiry = new Date(newExpiresAt);
    if (newExpiry <= new Date()) {
      return NextResponse.json(
        { error: "New expiry date must be in the future" },
        { status: 400 }
      );
    }

    const updated = await db.consentShare.update({
      where: { id: consentShareId },
      data: { expires_at: newExpiry },
    });

    return NextResponse.json({
      message: "Share expiry updated successfully",
      consentShare: updated,
    });
  } catch (error) {
    console.error("[SHARING_MODIFY_EXPIRY] Error:", error);
    return NextResponse.json(
      { error: "Failed to modify share expiry" },
      { status: 500 }
    );
  }
}

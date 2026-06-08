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
    const { consentShareId } = body;

    if (!consentShareId) {
      return NextResponse.json(
        { error: "Consent share ID is required" },
        { status: 400 }
      );
    }

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

    await db.consentShare.update({
      where: { id: consentShareId },
      data: { is_deleted: true },
    });

    await db.notification.create({
      data: {
        user_id: userId,
        message: "You revoked a consent share",
        type: "share_revoked",
        related_entity_id: consentShareId,
      },
    });

    return NextResponse.json({
      message: "Consent share revoked successfully",
    });
  } catch (error) {
    console.error("Share revoke error:", error);
    return NextResponse.json(
      { error: "Failed to revoke sharing" },
      { status: 500 }
    );
  }
}

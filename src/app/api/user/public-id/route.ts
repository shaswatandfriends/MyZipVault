import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/user/public-id
 *
 * Returns the current user's public_id (UUID).
 * Used by the sidebar "View Public Profile" button to link to
 * /recruiter/[publicId].
 *
 * Response: { public_id: string }
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { public_id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ public_id: user.public_id }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[USER_PUBLIC_ID]", error);
    return NextResponse.json({ error: "Failed to fetch public_id" }, { status: 500 });
  }
}

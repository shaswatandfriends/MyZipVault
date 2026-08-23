import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/auth/verification-status
 *   Returns whether the logged-in user's email is verified.
 *
 * Returns: { emailVerified: boolean }
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
      select: { email_verified_at: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Super admins use OTP — always "verified"
    if (user.role === "super_admin") {
      return NextResponse.json({ emailVerified: true });
    }

    return NextResponse.json({
      emailVerified: !!user.email_verified_at,
    });
  } catch (error) {
    console.error("[VERIFICATION_STATUS]", error);
    return NextResponse.json(
      { error: "Failed to check verification status" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/auth/signout
 *
 * Server-side signout handler that:
 * 1. Logs the signout event for audit purposes
 * 2. Updates the user's last_activity_at
 * 3. Returns the appropriate redirect URL based on role
 *
 * The actual NextAuth session clearing is handled client-side
 * via signOut() from next-auth/react, but this route provides
 * server-side audit logging and determines the correct post-signout
 * redirect URL based on the user's role.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user) {
      const userId = Number(session.user.id);
      const role = (session.user as Record<string, unknown>).role as string;
      const email = session.user.email;

      // Update last activity timestamp
      await db.user.update({
        where: { id: userId },
        data: { last_activity_at: new Date() },
      }).catch(() => {
        // Non-critical — don't block signout if this fails
      });

      // Determine the correct redirect URL based on role
      let redirectUrl = "/login";
      if (role === "super_admin") {
        redirectUrl = "/superadmin-login";
      } else if (role === "platform_admin" || role === "client_admin" || role === "client_recruiter") {
        redirectUrl = "/admin-login";
      }

      // Log the signout event for audit trail
      console.log(`[AUDIT] User signed out — id: ${userId}, email: ${email}, role: ${role}, timestamp: ${new Date().toISOString()}`);

      return NextResponse.json({
        success: true,
        redirectUrl,
      });
    }

    // No active session — default redirect
    return NextResponse.json({
      success: true,
      redirectUrl: "/login",
    });
  } catch (error) {
    console.error("[SIGNOUT] Error during signout audit:", error);
    // Still return success — don't block the client from signing out
    return NextResponse.json({
      success: true,
      redirectUrl: "/login",
    });
  }
}

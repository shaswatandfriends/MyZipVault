import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { encode } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logProxyLogin } from "@/lib/audit";

/** Extract a named cookie value from a cookie header string. */
function extractCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=").slice(1).join("="));
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    const superadminUserId = Number((session.user as Record<string, unknown>).id);

    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Target user ID is required" },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Prevent proxy login as another super_admin
    if (targetUser.role === "super_admin") {
      return NextResponse.json(
        { error: "Cannot proxy login as another super admin" },
        { status: 403 }
      );
    }

    // Log audit trail
    await logProxyLogin(superadminUserId, "super_admin", targetUserId);

    // ── Read the current session JWT from cookies ────────────────────
    const cookieHeader = request.headers.get("cookie") || "";
    const currentSessionToken =
      extractCookie(cookieHeader, "next-auth.session-token") ||
      extractCookie(cookieHeader, "__Secure-next-auth.session-token");

    if (!currentSessionToken) {
      return NextResponse.json(
        { error: "No session token found" },
        { status: 401 }
      );
    }

    // ── Create a new JWT for the target user ─────────────────────────
    const proxyToken = await encode({
      token: {
        id: String(targetUser.id),
        email: targetUser.email,
        role: targetUser.role,
        organizationId: targetUser.organization_id,
        isApproved: targetUser.is_approved,
        firstName: targetUser.first_name,
        lastName: targetUser.last_name,
        name: [targetUser.first_name, targetUser.last_name]
          .filter(Boolean)
          .join(" "),
      },
      secret: process.env.NEXTAUTH_SECRET!,
    });

    const isSecure = process.env.NODE_ENV === "production";
    const sessionCookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const targetName = [targetUser.first_name, targetUser.last_name]
      .filter(Boolean)
      .join(" ");

    const response = NextResponse.json({
      success: true,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        organizationId: targetUser.organization_id,
        isApproved: targetUser.is_approved,
        firstName: targetUser.first_name,
        lastName: targetUser.last_name,
      },
    });

    // ── Store the original session token for later restoration ───────
    response.cookies.set("proxy_original_session", currentSessionToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour max for proxy sessions
    });

    // ── Set the new session token (proxy user) ──────────────────────
    response.cookies.set(sessionCookieName, proxyToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    // ── Non-httpOnly proxy-mode indicator for the client banner ─────
    response.cookies.set(
      "proxy_mode",
      JSON.stringify({
        userId: targetUser.id,
        name: targetName,
        role: targetUser.role,
      }),
      {
        httpOnly: false,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      }
    );

    return response;
  } catch (error) {
    console.error("[SUPERADMIN_PROXY_LOGIN]", error);
    return NextResponse.json(
      { error: "Failed to create proxy session" },
      { status: 500 }
    );
  }
}

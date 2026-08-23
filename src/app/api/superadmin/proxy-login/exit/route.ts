import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logProxyExit } from "@/lib/audit";

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
    // ── Read the original session token from the backup cookie ───────
    const cookieHeader = request.headers.get("cookie") || "";
    const originalToken = extractCookie(cookieHeader, "proxy_original_session");

    if (!originalToken) {
      return NextResponse.json(
        { error: "No proxy session found — already exited or expired" },
        { status: 400 }
      );
    }

    // ── Log audit trail for exiting proxy ────────────────────────────
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const userId = Number((session.user as Record<string, unknown>).id);
      const userRole = (session.user as Record<string, unknown>).role as string;
      await logProxyExit(userId, userRole);
    }

    const isSecure = process.env.NODE_ENV === "production";
    const sessionCookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const response = NextResponse.json({ success: true });

    // ── Restore the original session token ───────────────────────────
    response.cookies.set(sessionCookieName, originalToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    // ── Clear proxy cookies ──────────────────────────────────────────
    response.cookies.set("proxy_original_session", "", {
      maxAge: 0,
      path: "/",
    });
    response.cookies.set("proxy_mode", "", {
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[SUPERADMIN_PROXY_LOGIN_EXIT]", error);
    return NextResponse.json(
      { error: "Failed to exit proxy session" },
      { status: 500 }
    );
  }
}

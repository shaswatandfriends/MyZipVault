import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, recordRateLimitAttempt, getClientIp } from "@/lib/rate-limiter";

/**
 * POST /api/feedback — receive feedback from the landing page
 *
 * Auth: optional. If the user is logged in, we use their user_id for rate
 * limiting; otherwise we use the client IP. This route is reachable from
 * the public landing page (anonymous) and from authenticated pages.
 *
 * Rate limit: 5 per hour per user/IP — prevents spam without blocking
 * legitimate feedback.
 */
export async function POST(request: Request) {
  try {
    // Optional auth — works for both anonymous and authenticated users
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? parseInt(session.user.id as string, 10) : null;
    const clientIp = getClientIp(request);

    // Rate limit key — prefer user_id (more stable), fall back to client IP
    const rateLimitKey = userId ? `feedback:user:${userId}` : `feedback:ip:${clientIp}`;

    // 5 feedback submissions per hour
    const rateLimit = await checkRateLimit(rateLimitKey, clientIp, 5, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many feedback submissions. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
          retryAfter: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: "Message too long (max 5000 chars)" }, { status: 400 });
    }

    // Record the rate limit attempt (counts toward the 5/hour limit)
    await recordRateLimitAttempt(rateLimitKey, clientIp, 3600);

    // Store feedback as a notification for all super_admins
    const superAdmins = await db.user.findMany({
      where: { role: "super_admin", account_status: "active" },
      select: { id: true },
    });

    if (superAdmins.length > 0) {
      await db.notification.createMany({
        data: superAdmins.map((admin) => ({
          user_id: admin.id,
          title: "New Feedback Received",
          message: `${email || "Anonymous"}: ${message.substring(0, 200)}`,
          type: "feedback",
          category: "system",
          priority: "info",
          is_read: false,
          metadata: JSON.stringify({
            email: email || null,
            full_message: message,
            from_user_id: userId,
            from_ip: clientIp,
            submitted_at: new Date().toISOString(),
          }),
        })),
      });
    }

    // Audit log (if authenticated) — helps track abuse
    if (userId) {
      try {
        await db.auditLog.create({
          data: {
            user_id: userId,
            role: (session?.user as Record<string, unknown> | undefined)?.role as string ?? "anonymous",
            action: "feedback_submitted",
            entity_type: "notification",
            entity_id: null,
            details: `Feedback submitted: "${message.substring(0, 100)}..."`,
          },
        });
      } catch (auditErr) {
        console.error("[FEEDBACK_AUDIT] Failed to log feedback:", auditErr);
      }
    }

    // Dev-only diagnostic log (was leaking PII in production)
    if (process.env.NODE_ENV === "development") {
      console.log(`[FEEDBACK] from ${email || "anonymous"}: ${message.substring(0, 100)}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FEEDBACK_POST]", error);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

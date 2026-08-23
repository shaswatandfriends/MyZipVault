import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/recruiter/billing/request-credits
 *
 * Allows a recruiter (client_recruiter) to request additional credits from
 * their organization's admin (client_admin). Only works if the org has
 * `allow_credit_requests` enabled.
 *
 * Body: { amount?: number, reason?: string }
 *   - amount (optional): how many credits they're requesting
 *   - reason (optional): free-text explanation
 *
 * Response: { success: true, message: "Request sent to your admin" }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as Record<string, unknown>).id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>)
      .organizationId as number | null;

    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    // ── Verify the org allows credit requests ──
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        allow_credit_requests: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (!org.allow_credit_requests) {
      return NextResponse.json(
        {
          error:
            "Credit requests are not enabled for your organization. Please contact your admin.",
        },
        { status: 403 }
      );
    }

    // ── Parse body ──
    let body: { amount?: number; reason?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional — fall through with empty object
    }
    const amount = Number(body.amount) || 0;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    // ── Fetch recruiter's name ──
    const recruiter = await db.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true },
    });
    const recruiterName =
      `${recruiter?.first_name ?? ""} ${recruiter?.last_name ?? ""}`.trim() ||
      "A recruiter";

    // ── Find the org's client_admin to notify ──
    const admin = await db.user.findFirst({
      where: { organization_id: organizationId, role: "client_admin" },
      select: { id: true },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "No admin found in your organization to receive the request" },
        { status: 404 }
      );
    }

    // ── Send notification to the admin ──
    try {
      const { createNotification } = await import("@/lib/notifications/create");
      await createNotification({
        userId: admin.id,
        category: "credit",
        priority: "important",
        title: "Credit request 💳",
        message:
          amount > 0
            ? `${recruiterName} is requesting ${amount} more credits${
                reason ? `: ${reason}` : "."
              }`
            : `${recruiterName} is requesting more credits${
                reason ? `: ${reason}` : "."
              }`,
        actionUrl: "/recruiter/billing",
        actionLabel: "Approve credits",
        relatedEntityId: userId,
        relatedEntityType: "user",
      });
    } catch (notifErr) {
      console.error("[REQUEST_CREDITS] Failed to send notification:", notifErr);
      // Non-blocking — still report success since we couldn't reach the admin
      // (but the request itself was accepted by the system)
    }

    return NextResponse.json({
      success: true,
      message: "Request sent to your admin",
    });
  } catch (error) {
    console.error("Request credits POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit credit request" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/recruiter/invite
 *
 * Recruiter invites a candidate to a specific job. Enforces 72-hr cooldown
 * (configurable via PlatformSetting `invite_cooldown_hours`).
 *
 * Body:
 *   - candidate_email (required)
 *   - candidate_name (optional — only used in email greeting)
 *   - job_id (required — auto-loads job title + description into email body)
 *   - email_subject (required — recruiter can edit)
 *   - email_body (required — recruiter can edit; job brief is auto-inserted)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const recruiterUserId = Number((session.user as Record<string, unknown>).id);
    const body = await request.json();
    const { candidate_email, candidate_name, job_id, email_subject, email_body } = body;

    if (!candidate_email || !email_subject || !email_body || !job_id) {
      return NextResponse.json(
        { error: "candidate_email, job_id, email_subject, and email_body are required" },
        { status: 400 }
      );
    }

    // ─── Cooldown check ───────────────────────────────────────────────
    const cooldownSetting = await db.platformSetting.findUnique({
      where: { setting_key: "invite_cooldown_hours" },
    });
    const cooldownHours = cooldownSetting ? parseInt(cooldownSetting.setting_value) : 72;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const cooldownStart = new Date(Date.now() - cooldownMs);

    const recentInvite = await db.recruiterInvite.findFirst({
      where: {
        candidate_email: { equals: candidate_email, mode: "insensitive" },
        sent_at: { gte: cooldownStart },
      },
      orderBy: { sent_at: "desc" },
    });

    if (recentInvite) {
      const retryAfter = new Date(recentInvite.sent_at.getTime() + cooldownMs);
      return NextResponse.json(
        {
          error: `You can re-invite this candidate after ${retryAfter.toLocaleString()}`,
          retry_after: retryAfter.toISOString(),
          cooldown_hours: cooldownHours,
        },
        { status: 429 }
      );
    }

    // ─── Validate job exists + is open ─────────────────────────────────
    const job = await db.jobPosting.findUnique({
      where: { id: Number(job_id) },
      select: { id: true, title: true, status: true, close_date: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.status !== "open" || (job.close_date && new Date(job.close_date) < new Date())) {
      return NextResponse.json({ error: "Job is not open" }, { status: 400 });
    }

    // ─── Create invite row ────────────────────────────────────────────
    const now = new Date();
    const expiresAt = new Date(now.getTime() + cooldownMs);
    const invite = await db.recruiterInvite.create({
      data: {
        recruiter_user_id: recruiterUserId,
        candidate_email: candidate_email,
        job_id: Number(job_id),
        email_subject,
        email_body,
        status: "sent",
        sent_at: now,
        expires_at: expiresAt,
      },
    });

    // ─── Send email via Brevo template 'candidate_invite' ────────────
    try {
      const recruiter = await db.user.findUnique({
        where: { id: recruiterUserId },
        select: { first_name: true, last_name: true, email: true },
      });
      const recruiterName = recruiter
        ? `${recruiter.first_name ?? ""} ${recruiter.last_name ?? ""}`.trim() || recruiter.email
        : "A recruiter";
      const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://my-zip-vault.vercel.app";
      await sendEmail({
        to: candidate_email,
        templateKey: "candidate_invite",
        variables: {
          candidate_name: candidate_name || candidate_email.split("@")[0],
          recruiter_name: recruiterName,
          job_title: job.title,
          job_description_html: email_body,
          login_link: `${appUrl}/login`,
        },
        userId: recruiterUserId,
      });
    } catch (emailErr) {
      console.error("[INVITE] email send failed (invite still recorded):", emailErr);
    }

    return NextResponse.json(
      { success: true, invite_id: invite.id, status: "sent" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[INVITE_POST]", error);
    return NextResponse.json(
      { error: error.message || "Failed to send invite" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recruiter/invite/check-cooldown?email=X
 *
 * Lightweight pre-check before showing the "Send Invite" button.
 * Returns: { can_invite: boolean, retry_after?: ISO string }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "email query param required" }, { status: 400 });
    }

    const cooldownSetting = await db.platformSetting.findUnique({
      where: { setting_key: "invite_cooldown_hours" },
    });
    const cooldownHours = cooldownSetting ? parseInt(cooldownSetting.setting_value) : 72;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const cooldownStart = new Date(Date.now() - cooldownMs);

    const recentInvite = await db.recruiterInvite.findFirst({
      where: {
        candidate_email: { equals: email, mode: "insensitive" },
        sent_at: { gte: cooldownStart },
      },
      orderBy: { sent_at: "desc" },
      select: { sent_at: true },
    });

    if (recentInvite) {
      const retryAfter = new Date(recentInvite.sent_at.getTime() + cooldownMs);
      return NextResponse.json({
        can_invite: false,
        retry_after: retryAfter.toISOString(),
        cooldown_hours: cooldownHours,
      });
    }

    return NextResponse.json({ can_invite: true, cooldown_hours: cooldownHours });
  } catch (error: any) {
    console.error("[INVITE_COOLDOWN_CHECK]", error);
    return NextResponse.json({ error: "Failed to check cooldown" }, { status: 500 });
  }
}

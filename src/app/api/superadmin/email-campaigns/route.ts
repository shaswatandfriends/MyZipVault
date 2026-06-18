import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailCampaignCreateSchema, validateBody } from "@/lib/validation-schemas";
import { sanitizeHtml } from "@/lib/sanitize";

/**
 * GET /api/superadmin/email-campaigns
 *   Returns a list of all email campaigns, ordered by created_at desc.
 *   Only super_admin can access.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const campaigns = await db.emailCampaign.findMany({
      orderBy: { created_at: "desc" },
      include: {
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        _count: {
          select: { recipients: true },
        },
      },
      take: 100,
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("[EMAIL CAMPAIGNS] List error:", error);
    return NextResponse.json(
      { error: "Failed to list email campaigns" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/email-campaigns
 *   Creates a new draft email campaign.
 *   Body: { name, subject, body, targetRole, targetFilter? }
 *
 *   After creation, the campaign is in 'draft' status. To actually send
 *   emails, call POST /api/superadmin/email-campaigns/[id]/send.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // ─── Zod validation ───
    const validation = validateBody(emailCampaignCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { name, subject, body: rawBody, targetRole: finalTargetRole, targetFilter } = validation.data;

    // ─── HTML sanitization (XSS prevention) ───
    // Strip dangerous tags, event handlers, and javascript: URLs from
    // the email body before storing it.
    const emailBody = sanitizeHtml(rawBody);

    const userId = Number((session.user as Record<string, unknown>).id);
    const campaign = await db.emailCampaign.create({
      data: {
        name: name.trim(),
        subject: subject.trim(),
        body: emailBody,
        target_role: finalTargetRole,
        target_filter: targetFilter ? JSON.stringify(targetFilter) : null,
        status: "draft",
        created_by: userId,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("[EMAIL CAMPAIGNS] Create error:", error);
    return NextResponse.json(
      { error: "Failed to create email campaign" },
      { status: 500 }
    );
  }
}

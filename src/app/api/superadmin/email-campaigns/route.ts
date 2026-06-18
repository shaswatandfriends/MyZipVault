import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
    const { name, subject, body: emailBody, targetRole, targetFilter } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
    }
    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return NextResponse.json({ error: "Email subject is required" }, { status: 400 });
    }
    if (!emailBody || typeof emailBody !== "string" || emailBody.trim().length === 0) {
      return NextResponse.json({ error: "Email body is required" }, { status: 400 });
    }

    const validRoles = [
      "all",
      "candidate",
      "client_recruiter",
      "client_admin",
      "platform_admin",
      "super_admin",
    ];
    const finalTargetRole = validRoles.includes(targetRole) ? targetRole : "all";

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

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/email-campaigns/[id]
 *   Returns a single email campaign with its recipients.
 *   Supports `?recipientStatus=pending|sent|failed` to filter recipients.
 *   Only super_admin can access.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const campaignId = parseInt(id);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const recipientStatus = searchParams.get("recipientStatus");
    const recipientLimit = Math.min(
      parseInt(searchParams.get("recipientLimit") || "100"),
      500
    );

    const campaign = await db.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        recipients: {
          where: recipientStatus
            ? { status: recipientStatus }
            : undefined,
          orderBy: { queued_at: "desc" },
          take: recipientLimit,
        },
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("[EMAIL CAMPAIGNS] Get error:", error);
    return NextResponse.json(
      { error: "Failed to get email campaign" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/superadmin/email-campaigns/[id]
 *   Deletes a draft campaign. Cannot delete a campaign that has been sent
 *   (for audit trail). Only super_admin can access.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const campaignId = parseInt(id);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const campaign = await db.emailCampaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Only draft campaigns can be deleted. Once sent, we keep them for audit.
    if (campaign.status !== "draft") {
      return NextResponse.json(
        { error: "Cannot delete a campaign that has been sent. Audit trail preserved." },
        { status: 400 }
      );
    }

    // Recipients will be cascade-deleted due to onDelete: Cascade in schema.
    // Capture audit log BEFORE deletion (so we have the campaign name).
    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const campaignDetails = await db.emailCampaign.findUnique({
      where: { id: campaignId },
      select: { name: true, subject: true, target_role: true },
    });

    await db.$transaction(async (tx) => {
      await tx.emailCampaign.delete({ where: { id: campaignId } });

      await tx.auditLog.create({
        data: {
          user_id: actionerId,
          role: "super_admin",
          action: "delete_email_campaign",
          entity_type: "email_campaign",
          entity_id: campaignId,
          details: `Deleted draft campaign "${campaignDetails?.name ?? "unknown"}"`,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EMAIL CAMPAIGNS] Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete email campaign" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/superadmin/email-campaigns/[id]
 *   Updates a DRAFT campaign's fields. Cannot edit a campaign that has
 *   been sent (for audit trail). Only super_admin can access.
 *
 * Body (all optional — only provided fields are updated):
 *   name, subject, body, target_role, target_filter,
 *   from_name, reply_to, logo_url, accent_color
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const campaignId = parseInt(id);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const campaign = await db.emailCampaign.findUnique({
      where: { id: campaignId },
      select: { status: true, name: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "draft") {
      return NextResponse.json(
        { error: "Cannot edit a campaign that has been sent. Audit trail preserved." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Only update provided fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.body !== undefined) updateData.body = body.body;
    if (body.target_role !== undefined) updateData.target_role = body.target_role;
    if (body.target_filter !== undefined) updateData.target_filter = body.target_filter || null;
    if (body.from_name !== undefined) updateData.from_name = body.from_name || null;
    if (body.reply_to !== undefined) updateData.reply_to = body.reply_to || null;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url || null;
    if (body.accent_color !== undefined) updateData.accent_color = body.accent_color || null;

    await db.emailCampaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    // Audit log
    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    try {
      await db.auditLog.create({
        data: {
          user_id: actionerId,
          role: "super_admin",
          action: "edit_email_campaign",
          entity_type: "email_campaign",
          entity_id: campaignId,
          details: `Updated draft campaign "${campaign.name}"`,
        },
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EMAIL CAMPAIGNS] Patch error:", error);
    return NextResponse.json(
      { error: "Failed to update email campaign" },
      { status: 500 }
    );
  }
}

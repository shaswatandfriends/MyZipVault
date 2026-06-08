import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const announcements = await db.announcement.findMany({
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      announcements: announcements.map((a) => ({
        id: a.id,
        message: a.message,
        targetRole: a.target_role,
        isActive: a.is_active,
        createdAt: a.created_at,
      })),
    });
  } catch (error) {
    console.error("Superadmin Announcements GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actionerId = parseInt(session.user.id as string, 10);
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const { message, targetRole, isActive } = body;
        if (!message || !targetRole) {
          return NextResponse.json(
            { error: "Message and target role are required" },
            { status: 400 }
          );
        }

        const announcement = await db.announcement.create({
          data: {
            message,
            target_role: targetRole,
            is_active: isActive ?? false,
          },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "create_announcement",
            entity_type: "announcement",
            entity_id: announcement.id,
          },
        });

        return NextResponse.json({ success: true, id: announcement.id });
      }
      case "update": {
        const { id, message, targetRole, isActive } = body;
        if (!id) {
          return NextResponse.json(
            { error: "Announcement ID is required" },
            { status: 400 }
          );
        }

        const updateData: Record<string, unknown> = {};
        if (message !== undefined) updateData.message = message;
        if (targetRole !== undefined) updateData.target_role = targetRole;
        if (isActive !== undefined) updateData.is_active = isActive;

        await db.announcement.update({
          where: { id },
          data: updateData,
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "update_announcement",
            entity_type: "announcement",
            entity_id: id,
          },
        });

        return NextResponse.json({ success: true });
      }
      case "toggle": {
        const { id, isActive } = body;
        if (!id || isActive === undefined) {
          return NextResponse.json(
            { error: "Announcement ID and active status are required" },
            { status: 400 }
          );
        }

        await db.announcement.update({
          where: { id },
          data: { is_active: isActive },
        });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "toggle_announcement",
            entity_type: "announcement",
            entity_id: id,
          },
        });

        return NextResponse.json({ success: true });
      }
      case "delete": {
        const { id } = body;
        if (!id) {
          return NextResponse.json(
            { error: "Announcement ID is required" },
            { status: 400 }
          );
        }

        await db.announcement.delete({ where: { id } });

        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "delete_announcement",
            entity_type: "announcement",
            entity_id: id,
          },
        });

        return NextResponse.json({ success: true });
      }
      case "send_campaign": {
        const { announcementId, targetRoles, sendEmail: shouldSendEmail, emailTemplate } = body;

        if (!targetRoles || !Array.isArray(targetRoles) || targetRoles.length === 0) {
          return NextResponse.json(
            { error: "targetRoles array is required" },
            { status: 400 }
          );
        }

        // Build where clause for finding target users
        const where: Record<string, unknown> = {
          account_status: "active",
        };

        // Handle special segment types
        if (targetRoles.includes("all")) {
          // All active users
        } else if (targetRoles.includes("all_candidates")) {
          where.role = "candidate";
        } else if (targetRoles.includes("all_recruiters")) {
          where.role = { in: ["client_recruiter", "client_admin"] };
        } else if (targetRoles.includes("expiring_credentials")) {
          where.role = "candidate";
          where.credentials = {
            some: {
              expiration_date: {
                gte: new Date(),
                lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              },
            },
          };
        } else if (targetRoles.includes("inactive_users")) {
          where.last_activity_at = {
            lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          };
        } else {
          where.role = { in: targetRoles };
        }

        const targetUsers = await db.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
          },
        });

        if (targetUsers.length === 0) {
          return NextResponse.json({
            success: true,
            sentCount: 0,
            failedCount: 0,
            message: "No matching users found",
          });
        }

        // Get announcement message if provided
        let announcementMessage = "";
        if (announcementId) {
          const announcement = await db.announcement.findUnique({
            where: { id: announcementId },
          });
          if (announcement) {
            announcementMessage = announcement.message;
          }
        }

        // Determine email template to use
        const templateKey = emailTemplate || "new_features";

        let sentCount = 0;
        let failedCount = 0;

        if (shouldSendEmail) {
          // Send emails in batches (limit concurrency to avoid overwhelming the email API)
          const batchSize = 10;
          for (let i = 0; i < targetUsers.length; i += batchSize) {
            const batch = targetUsers.slice(i, i + batchSize);
            const results = await Promise.allSettled(
              batch.map((user) =>
                sendEmail({
                  to: user.email,
                  templateKey,
                  variables: {
                    candidate_name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email.split("@")[0],
                    announcement_message: announcementMessage || "You have a new update from MyZipVault.",
                    platform_name: "MyZipVault",
                    login_link: process.env.NEXTAUTH_URL || "https://myzipvault.com",
                  },
                  phone: user.phone || undefined,
                })
              )
            );

            for (const result of results) {
              if (result.status === "fulfilled") {
                sentCount++;
              } else {
                failedCount++;
                console.error("[CAMPAIGN] Failed to send email:", result.reason);
              }
            }
          }
        }

        // Also create in-app notifications for target users
        const notificationData = targetUsers.map((user) => ({
          user_id: user.id,
          title: "Platform Announcement",
          message: announcementMessage || `You have a new update from MyZipVault.`,
          type: "announcement",
        }));

        // Insert notifications in batches
        const notifBatchSize = 50;
        for (let i = 0; i < notificationData.length; i += notifBatchSize) {
          const batch = notificationData.slice(i, i + notifBatchSize);
          await db.notification.createMany({ data: batch });
        }

        // Log the campaign
        await db.auditLog.create({
          data: {
            user_id: actionerId,
            role: "super_admin",
            action: "send_email_campaign",
            entity_type: "announcement",
            entity_id: announcementId || null,
          },
        });

        return NextResponse.json({
          success: true,
          sentCount,
          failedCount,
          totalTargets: targetUsers.length,
          notificationsCreated: notificationData.length,
        });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Superadmin Announcements POST error:", error);
    return NextResponse.json(
      { error: "Failed to process announcement action" },
      { status: 500 }
    );
  }
}

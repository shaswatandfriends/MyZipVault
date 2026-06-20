/**
 * Central notification creation system.
 *
 * This is the ONE function all routes should call to create notifications.
 * It handles:
 *   1. Creating the in-app notification with proper category + priority
 *   2. Checking super admin defaults to decide if email should be sent
 *   3. Sending email via Brevo (if enabled for this category)
 *   4. SMS architecture (not implemented yet — placeholder for future)
 *
 * Usage:
 *   import { createNotification } from "@/lib/notifications/create";
 *
 *   await createNotification({
 *     userId: 123,
 *     category: "rtr",
 *     priority: "urgent",
 *     title: "RTR signed! 🎉",
 *     message: "Jordan Reyes signed the RTR",
 *     actionUrl: "/recruiter/candidates/5",
 *     actionLabel: "View profile",
 *     relatedEntityId: 5,
 *     relatedEntityType: "lead",
 *   });
 *
 * Rules:
 *   - Urgent notifications ALWAYS send email, regardless of defaults
 *   - Important + Info check NotificationDefault for the category
 *   - SMS is architecture-only (not wired to any provider yet)
 */

import { db } from "@/lib/db";

export type NotificationCategory =
  | "rtr"
  | "document"
  | "status"
  | "calendar"
  | "credit"
  | "compliance"
  | "system";

export type NotificationPriority = "urgent" | "important" | "info";

export interface CreateNotificationParams {
  userId: number;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  relatedEntityId?: number;
  relatedEntityType?: string;
  metadata?: Record<string, unknown>;
  /** Override the default email behavior (default: follows NotificationDefault settings) */
  forceEmail?: boolean;
  /** Skip email entirely (default: false) */
  skipEmail?: boolean;
}

/**
 * Cache for NotificationDefault — avoids a DB query on every notification.
 * Refreshed every 5 minutes.
 */
let defaultsCache: Record<string, { email_enabled: boolean; in_app_enabled: boolean; sms_enabled: boolean }> | null = null;
let defaultsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getDefaults(): Promise<Record<string, { email_enabled: boolean; in_app_enabled: boolean; sms_enabled: boolean }>> {
  const now = Date.now();
  if (defaultsCache && now - defaultsCacheTime < CACHE_TTL) {
    return defaultsCache;
  }

  try {
    const rows = await db.notificationDefault.findMany();
    const map: Record<string, any> = {};
    for (const row of rows) {
      map[row.category] = {
        email_enabled: row.email_enabled,
        in_app_enabled: row.in_app_enabled,
        sms_enabled: row.sms_enabled,
      };
    }
    defaultsCache = map;
    defaultsCacheTime = now;
    return map;
  } catch {
    // If we can't fetch defaults, assume everything is enabled
    return {
      rtr: { email_enabled: true, in_app_enabled: true, sms_enabled: false },
      document: { email_enabled: true, in_app_enabled: true, sms_enabled: false },
      status: { email_enabled: false, in_app_enabled: true, sms_enabled: false },
      calendar: { email_enabled: false, in_app_enabled: true, sms_enabled: false },
      credit: { email_enabled: true, in_app_enabled: true, sms_enabled: false },
      compliance: { email_enabled: true, in_app_enabled: true, sms_enabled: false },
      system: { email_enabled: true, in_app_enabled: true, sms_enabled: false },
    };
  }
}

/**
 * Create a notification — in-app + optional email.
 *
 * This is the single entry point for ALL notification creation across the platform.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    // 1. Check if in-app is enabled for this category
    const defaults = await getDefaults();
    const categoryDefault = defaults[params.category] || { email_enabled: true, in_app_enabled: true, sms_enabled: false };

    // 2. Create the in-app notification (if enabled)
    let notificationId: number | null = null;
    if (categoryDefault.in_app_enabled) {
      const notification = await db.notification.create({
        data: {
          user_id: params.userId,
          title: params.title,
          message: params.message,
          type: params.category, // use category as the type (backwards compat)
          priority: params.priority,
          category: params.category,
          is_read: false,
          is_emailed: false,
          action_url: params.actionUrl || null,
          action_label: params.actionLabel || null,
          related_entity_id: params.relatedEntityId || null,
          related_entity_type: params.relatedEntityType || null,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        },
      });
      notificationId = notification.id;
    }

    // 3. Determine if we should send an email
    // Rules:
    //   - Urgent → ALWAYS email (regardless of defaults)
    //   - Important → email if category default has email_enabled = true
    //   - Info → email if category default has email_enabled = true
    //   - forceEmail → always email
    //   - skipEmail → never email
    let shouldEmail = false;
    if (params.skipEmail) {
      shouldEmail = false;
    } else if (params.forceEmail) {
      shouldEmail = true;
    } else if (params.priority === "urgent") {
      shouldEmail = true; // Urgent always emails
    } else {
      shouldEmail = categoryDefault.email_enabled;
    }

    if (shouldEmail && notificationId) {
      // Mark as emailed
      await db.notification.update({
        where: { id: notificationId },
        data: { is_emailed: true },
      }).catch(() => {});

      // Send email via Brevo (fire-and-forget)
      sendNotificationEmail(params).catch((err) => {
        console.error("[NOTIFICATION] Failed to send email:", err);
      });
    }

    // 4. SMS — architecture only, not implemented
    // When we add Twilio, this is where the SMS call would go:
    // if (categoryDefault.sms_enabled || params.priority === 'urgent') {
    //   sendSMS(params).catch(...)
    // }

  } catch (err) {
    console.error("[NOTIFICATION] Failed to create notification:", err);
    // Non-blocking — don't crash the calling code
  }
}

/**
 * Send a notification email via Brevo.
 * Fire-and-forget — called from createNotification, doesn't block.
 */
async function sendNotificationEmail(params: CreateNotificationParams): Promise<void> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoSender = process.env.BREVO_SENDER_EMAIL || "noreply@myzipvault.com";
  const appUrl = process.env.NEXTAUTH_URL || "https://my-zip-vault.vercel.app";

  if (!brevoApiKey) return;

  // Fetch the user's email
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { email: true, first_name: true, last_name: true },
  });

  if (!user?.email) return;

  const userName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "there";
  const actionUrl = params.actionUrl ? `${appUrl}${params.actionUrl}` : null;

  // Priority-based accent colors
  const accentColor = params.priority === "urgent" ? "#DC2626"
    : params.priority === "important" ? "#F59E0B"
    : "#3B82F6";
  const accentBg = params.priority === "urgent" ? "#FEE2E2"
    : params.priority === "important" ? "#FEF3C7"
    : "#DBEAFE";

  const htmlContent = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #0B1F3A; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: #C9A961; font-weight: 600;">MyZipVault</span>
        <span style="color: #fff; margin-left: 8px;">${params.category.toUpperCase()}</span>
      </div>
      <div style="background: ${accentBg}; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid ${accentColor}40;">
        <h2 style="color: ${accentColor}; margin: 0 0 12px;">${params.title}</h2>
        <p style="color: #1A1A1A; font-size: 15px; line-height: 1.6;">Hi ${userName},</p>
        <p style="color: #5B5A56; font-size: 15px; line-height: 1.6;">${params.message}</p>
        ${actionUrl ? `
          <p style="margin: 24px 0;">
            <a href="${actionUrl}" style="background: ${accentColor}; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              ${params.actionLabel || "View"}
            </a>
          </p>
        ` : ""}
        <p style="color: #8C8A83; font-size: 12px; margin-top: 24px;">
          You received this because you have notifications enabled for ${params.category} on MyZipVault.
        </p>
      </div>
    </div>
  `;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: brevoSender, name: "MyZipVault" },
      to: [{ email: user.email }],
      subject: params.title,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[NOTIFICATION] Brevo API error:", response.status, errText);
  }
}

/**
 * Create multiple notifications at once (for bulk operations).
 * Each notification is created independently — if one fails, others still succeed.
 */
export async function createNotifications(notifications: CreateNotificationParams[]): Promise<void> {
  for (const n of notifications) {
    await createNotification(n);
  }
}

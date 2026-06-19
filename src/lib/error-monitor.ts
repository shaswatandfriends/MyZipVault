import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/**
 * Lightweight error monitoring system.
 *
 * Captures errors to the system_error_logs table and sends email alerts
 * to the Super Admin when critical errors occur.
 *
 * This is a free, self-hosted alternative to Sentry. It uses:
 * - system_error_logs table (already exists in schema)
 * - Brevo email (already configured) for alerts
 * - Super Admin email (SUPERADMIN_EMAIL env var) as the alert recipient
 *
 * Future upgrade path: replace this with @sentry/nextjs when you need
 * more advanced features (stack traces, source maps, release tracking).
 */

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "";
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between alerts for the same error

type ErrorSeverity = "info" | "warning" | "critical";

interface CaptureErrorParams {
  severity?: ErrorSeverity;
  service: string;
  message: string;
  error?: unknown;
  requestId?: string;
  userId?: number;
  additionalData?: Record<string, unknown>;
}

/**
 * Capture an error to the database and optionally send an email alert.
 *
 * Usage:
 *   import { captureError } from "@/lib/error-monitor";
 *
 *   try {
 *     // ... some operation
 *   } catch (error) {
 *     await captureError({
 *       severity: "critical",
 *       service: "credential-upload",
 *       message: "Failed to upload credential",
 *       error,
 *       userId: session.user.id,
 *     });
 *   }
 */
export async function captureError({
  severity = "warning",
  service,
  message,
  error,
  requestId,
  userId,
  additionalData,
}: CaptureErrorParams): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Format the full error message
  const fullMessage = additionalData
    ? `${message}: ${errorMessage} | Data: ${JSON.stringify(additionalData)}`
    : `${message}: ${errorMessage}`;

  // Log to console (visible in Vercel function logs)
  if (severity === "critical") {
    console.error(`[CRITICAL][${service}] ${fullMessage}`, stack);
  } else if (severity === "warning") {
    console.warn(`[WARNING][${service}] ${fullMessage}`);
  } else {
    console.log(`[INFO][${service}] ${fullMessage}`);
  }

  // Store in database
  try {
    await db.systemErrorLog.create({
      data: {
        severity,
        service,
        error_message: stack
          ? `${fullMessage}\n\nStack:\n${stack}`
          : fullMessage,
      },
    });
  } catch (dbError) {
    // If we can't even log to the DB, just console.error
    console.error("[ERROR_MONITOR] Failed to store error in DB:", dbError);
  }

  // Send email alert for critical errors (with cooldown to avoid spam)
  if (severity === "critical" && SUPERADMIN_EMAIL) {
    try {
      await sendCriticalAlertEmail(service, fullMessage, stack);
    } catch (emailError) {
      console.error("[ERROR_MONITOR] Failed to send alert email:", emailError);
    }
  }
}

/**
 * Send a critical error alert email to the Super Admin.
 * Includes a 5-minute cooldown per service to prevent email spam.
 */
async function sendCriticalAlertEmail(
  service: string,
  message: string,
  stack?: string
): Promise<void> {
  const cooldownKey = `error_alert_cooldown_${service}`;
  const now = new Date();

  // Check if we're in cooldown
  const cooldownRecord = await db.platformSetting.findUnique({
    where: { setting_key: cooldownKey },
  });

  if (cooldownRecord?.setting_value) {
    const lastAlertAt = new Date(cooldownRecord.setting_value);
    if (now.getTime() - lastAlertAt.getTime() < ALERT_COOLDOWN_MS) {
      // Still in cooldown — skip this alert
      return;
    }
  }

  // Update cooldown timestamp
  await db.platformSetting.upsert({
    where: { setting_key: cooldownKey },
    update: { setting_value: now.toISOString() },
    create: {
      setting_key: cooldownKey,
      setting_value: now.toISOString(),
    },
  });

  // Send the alert email
  const subject = `🚨 CRITICAL ERROR: ${service} — MyZipVault`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 18px;">🚨 Critical Error Alert</h1>
      </div>
      <div style="background: #fef2f2; padding: 20px 24px; border: 1px solid #fecaca; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 12px;"><strong>Service:</strong> ${service}</p>
        <p style="margin: 0 0 12px;"><strong>Time:</strong> ${now.toISOString()}</p>
        <p style="margin: 0 0 12px;"><strong>Error:</strong></p>
        <pre style="background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb; font-size: 13px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;">${message}</pre>
        ${stack ? `<p style="margin: 12px 0 4px;"><strong>Stack Trace:</strong></p><pre style="background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb; font-size: 11px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; max-height: 300px; overflow-y: auto;">${stack}</pre>` : ''}
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">
          View all errors at: https://my-zip-vault.vercel.app/superadmin/errors<br>
          This alert has a 5-minute cooldown to prevent spam.
        </p>
      </div>
    </div>
  `;

  // Use Brevo API directly (bypass sendEmail's notification preference check —
  // critical alerts should always be sent)
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@myzipvault.com";

  if (BREVO_API_KEY) {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: "MyZipVault Alerts" },
        to: [{ email: SUPERADMIN_EMAIL }],
        subject,
        htmlContent,
      }),
    });
  }
}

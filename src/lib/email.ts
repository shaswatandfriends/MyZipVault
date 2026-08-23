import { db } from "@/lib/db";
import { sendSMS, isTwilioConfigured } from "./twilio";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@myzipvault.com";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface SendEmailParams {
  to: string;
  templateKey: string;
  variables: Record<string, string>;
  phone?: string; // Optional phone for SMS
  userId?: number; // Optional user ID for notification preference lookup (Gap 8)
  /**
   * Set to true to bypass notification preference checks.
   * Use ONLY for critical account emails (password reset, account suspension,
   * BAA signing, etc.) where the user MUST receive the email regardless of
   * their preferences. Defaults to false.
   */
  bypassPreferences?: boolean;
}

/**
 * Default notification preferences (when user has not customized them).
 * Per Gap 8 fix: these are honored by sendEmail() before sending.
 */
const DEFAULT_NOTIFICATION_PREFERENCES = {
  email_notifications: true,
  sms_notifications: true,
  reminder_notifications: true,
};

/**
 * Fetch a user's notification preferences from their candidate_profile.
 * Returns defaults if user has no profile or preferences not set.
 * Returns null if user not found (caller should treat as "use defaults").
 *
 * Note: only candidates have notification_preferences. Recruiters/admins
 * always receive emails (they don't have a profile to customize).
 */
async function getUserNotificationPreferences(
  email: string
): Promise<typeof DEFAULT_NOTIFICATION_PREFERENCES> {
  try {
    const user = await db.user.findUnique({
      where: { email },
      select: {
        role: true,
        candidate_profile: {
          select: { notification_preferences: true },
        },
      },
    });

    // Recruiters/admins/super_admins always get emails (no preference system)
    if (!user || user.role !== "candidate") {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    // Use defaults if no profile or no preferences set
    if (!user.candidate_profile?.notification_preferences) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    // Parse stored preferences, falling back to defaults for missing keys
    try {
      const parsed = JSON.parse(user.candidate_profile.notification_preferences);
      return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...parsed,
      };
    } catch {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  } catch (error) {
    console.error("[EMAIL] Failed to fetch notification preferences:", error);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/**
 * Categorize a template key into a notification type for preference checking.
 *
 * Categories:
 *   - 'reminder' → respects reminder_notifications preference
 *   - 'email' → respects email_notifications preference
 *   - 'critical' → always sent (bypassPreferences=true passed by caller)
 */
function categorizeTemplate(templateKey: string): "reminder" | "email" | "critical" {
  // Reminder templates (credential expiry, reference reminders, etc.)
  const reminderKeys = [
    "credential_expiry_reminder",
    "reference_reminder",
    "low_credit_alert",
    "checklist_reminder",
    "monthly_digest",
  ];
  if (reminderKeys.includes(templateKey)) return "reminder";

  // All other templates are regular emails
  return "email";
}

export async function sendEmail({
  to,
  templateKey,
  variables,
  phone,
  userId,
  bypassPreferences = false,
}: SendEmailParams) {
  // ─── Gap 8: Honor notification preferences ──────────────────────
  // Check user's preferences before sending. Skip if user has opted out
  // of this category of notification. Critical emails (password reset,
  // account suspension, BAA) bypass this check.
  if (!bypassPreferences) {
    const prefs = await getUserNotificationPreferences(to);
    const category = categorizeTemplate(templateKey);

    if (category === "reminder" && !prefs.reminder_notifications) {
      console.log(
        `[EMAIL] Skipped ${templateKey} to ${to} — user opted out of reminder notifications`
      );
      return;
    }

    if (category === "email" && !prefs.email_notifications) {
      console.log(
        `[EMAIL] Skipped ${templateKey} to ${to} — user opted out of email notifications`
      );
      return;
    }
  }

  // Fetch the email template from database
  const template = await db.emailTemplate.findUnique({
    where: { template_key: templateKey },
  });

  if (!template) {
    console.error(`Email template not found: ${templateKey}`);
    return;
  }

  // Replace variables in subject and body
  let subject = template.subject;
  let htmlContent = template.body;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    subject = subject.replace(regex, value);
    htmlContent = htmlContent.replace(regex, value);
  }

  // Convert plain text to basic HTML if no HTML tags present
  if (!htmlContent.includes("<")) {
    htmlContent = htmlContent
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("");
  }

  // Check if SMS should be sent (feature flag check + user preference)
  const smsFlag = await db.featureFlag.findUnique({ where: { flag_name: "sms_notifications" } });

  // For SMS, also check the user's SMS notification preference (unless bypassing)
  let smsAllowed = true;
  if (!bypassPreferences && smsFlag?.is_enabled) {
    const prefs = await getUserNotificationPreferences(to);
    smsAllowed = prefs.sms_notifications;
  }

  if (smsFlag?.is_enabled && smsAllowed && phone && isTwilioConfigured()) {
    // Strip HTML for SMS - create a plain text version
    const plainText = htmlContent
      .replace(/<p>/g, "")
      .replace(/<\/p>/g, "\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const smsMessage = `${subject}\n\n${plainText.substring(0, 300)}${plainText.length > 300 ? "..." : ""}`;

    const smsResult = await sendSMS(phone, smsMessage);
    if (smsResult.success) {
      console.log(`[NOTIFICATION] SMS sent to ${phone} for template ${templateKey}`);
    }
  } else if (smsFlag?.is_enabled && !smsAllowed) {
    console.log(
      `[SMS] Skipped ${templateKey} to ${to} — user opted out of SMS notifications`
    );
  } else if (smsFlag?.is_enabled) {
    console.log(`[SMS] Feature enabled but Twilio not configured or no phone provided. Would send SMS.`);
  }

  // Try Brevo API if key is configured
  if (BREVO_API_KEY) {
    try {
      const response = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: BREVO_SENDER_EMAIL, name: "MyZipVault" },
          to: [{ email: to }],
          subject,
          htmlContent,
        }),
      });

      if (response.ok) {
        console.log(`[EMAIL] Sent ${templateKey} to ${to} via Brevo`);
        return;
      } else {
        const error = await response.text();
        console.error(`[EMAIL] Brevo API error: ${error}`);
      }
    } catch (error) {
      console.error("[EMAIL] Brevo API call failed:", error);
    }
  }

  // Fallback: log to console (development only — never log email contents in production)
  if (process.env.NODE_ENV === "development") {
    console.log(`[EMAIL] Template: ${templateKey}`);
    console.log(`[EMAIL] To: ${to}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    console.log(`[EMAIL] Body: ${htmlContent.substring(0, 200)}...`);
  }
}

// Convenience functions for common email types
export async function sendCandidateInviteEmail(email: string, organizationName: string, inviteLink: string) {
  return sendEmail({
    to: email,
    templateKey: "candidate_invite",
    variables: {
      candidate_name: email.split("@")[0],
      organization_name: organizationName,
      invite_link: inviteLink,
    },
  });
}

export async function sendExistingCandidateChecklistEmail(email: string, agencyName: string, checklistName: string, loginLink: string) {
  return sendEmail({
    to: email,
    templateKey: "existing_candidate_checklist",
    variables: {
      candidate_name: email.split("@")[0],
      agency_name: agencyName,
      checklist_name: checklistName,
      login_link: loginLink,
    },
  });
}

export async function sendManagerInviteEmail(email: string, nurseName: string, facilityName: string, inviteLink: string) {
  return sendEmail({
    to: email,
    templateKey: "manager_invite",
    variables: {
      manager_name: email.split("@")[0],
      nurse_name: nurseName,
      facility_name: facilityName,
      invite_link: inviteLink,
    },
  });
}

export async function sendCredentialExpiryEmail(email: string, documentName: string, daysRemaining: string, loginLink: string, phone?: string) {
  return sendEmail({
    to: email,
    templateKey: "credential_expiry",
    variables: {
      candidate_name: email.split("@")[0],
      document_name: documentName,
      days_remaining: daysRemaining,
      login_link: loginLink,
    },
    phone,
  });
}

export async function sendCredentialRejectedEmail(email: string, documentName: string, reviewNotes: string, phone?: string) {
  return sendEmail({
    to: email,
    templateKey: "credential_rejected",
    variables: {
      candidate_name: email.split("@")[0],
      document_name: documentName,
      review_notes: reviewNotes,
    },
    phone,
  });
}

export async function sendLowCreditAlertEmail(email: string, organizationName: string, creditsRemaining: string, purchaseLink: string) {
  return sendEmail({
    to: email,
    templateKey: "low_credit_alert",
    variables: {
      organization_name: organizationName,
      credits_remaining: creditsRemaining,
      purchase_link: purchaseLink,
    },
  });
}

export async function sendVerificationEmail(email: string, verificationLink: string) {
  return sendEmail({
    to: email,
    templateKey: "email_verification",
    variables: {
      candidate_name: email.split("@")[0],
      verification_link: verificationLink,
    },
    bypassPreferences: true, // Critical — user must verify email
  });
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  return sendEmail({
    to: email,
    templateKey: "password_reset",
    variables: {
      reset_link: resetLink,
    },
    bypassPreferences: true, // Critical — user requested password reset
  });
}

export async function sendAccountSuspensionEmail(email: string, deletionDate: string, phone?: string) {
  return sendEmail({
    to: email,
    templateKey: "account_suspension_confirmation",
    variables: {
      candidate_name: email.split("@")[0],
      deletion_date: deletionDate,
    },
    phone,
    bypassPreferences: true, // Critical — account deletion notice (legal requirement)
  });
}

export async function sendChecklistExpiryReminderEmail(
  email: string,
  candidateName: string,
  checklistName: string,
  recruiterName: string,
  daysRemaining: string,
  loginLink: string,
  phone?: string
) {
  return sendEmail({
    to: email,
    templateKey: "checklist_expiry_reminder",
    variables: {
      candidate_name: candidateName,
      checklist_name: checklistName,
      recruiter_name: recruiterName,
      days_remaining: daysRemaining,
      login_link: loginLink,
    },
    phone,
  });
}

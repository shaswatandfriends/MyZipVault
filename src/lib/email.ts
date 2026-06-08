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
}

export async function sendEmail({ to, templateKey, variables, phone }: SendEmailParams) {
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

  // Check if SMS should be sent (feature flag check)
  const smsFlag = await db.featureFlag.findUnique({ where: { flag_name: "sms_notifications" } });
  if (smsFlag?.is_enabled && phone && isTwilioConfigured()) {
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

  // Fallback: log to console
  console.log(`[EMAIL] Template: ${templateKey}`);
  console.log(`[EMAIL] To: ${to}`);
  console.log(`[EMAIL] Subject: ${subject}`);
  console.log(`[EMAIL] Body: ${htmlContent.substring(0, 200)}...`);
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
  });
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  return sendEmail({
    to: email,
    templateKey: "password_reset",
    variables: {
      reset_link: resetLink,
    },
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
  });
}

import { db } from "@/lib/db";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@myzipvault.com";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const APP_URL = process.env.NEXTAUTH_URL || "https://myzipvault.com";

interface VaultSignEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}

/**
 * Send a VaultSign email directly (bypassing the template system for VaultSign-specific emails).
 */
async function sendVaultSignEmail({ to, toName, subject, htmlContent }: VaultSignEmailParams): Promise<boolean> {
  if (BREVO_API_KEY) {
    try {
      const response = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: BREVO_SENDER_EMAIL, name: "VaultSign by MyZipVault" },
          to: [{ email: to, name: toName || to.split("@")[0] }],
          subject,
          htmlContent,
        }),
      });

      if (response.ok) {
        console.log(`[VAULTSIGN-EMAIL] Sent to ${to}: ${subject}`);
        return true;
      } else {
        const error = await response.text();
        console.error(`[VAULTSIGN-EMAIL] Brevo API error: ${error}`);
      }
    } catch (error) {
      console.error("[VAULTSIGN-EMAIL] Brevo API call failed:", error);
    }
  }

  // Fallback: log to console
  console.log(`[VAULTSIGN-EMAIL] To: ${to}`);
  console.log(`[VAULTSIGN-EMAIL] Subject: ${subject}`);
  console.log(`[VAULTSIGN-EMAIL] Body: ${htmlContent.substring(0, 300)}...`);
  return true;
}

/**
 * Send email notification when a document is sent for signature.
 */
export async function sendDocumentSentEmail(params: {
  signerName: string;
  signerEmail: string;
  documentName: string;
  senderName: string;
  organizationName: string;
  signingLink: string;
  personalMessage?: string;
  expiryDate?: string;
}): Promise<boolean> {
  const messageSection = params.personalMessage
    ? `<div style="margin: 16px 0; padding: 12px; background: #F0FDF4; border-left: 3px solid #166534; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Message from ${params.senderName}:</strong></p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #374151;">${params.personalMessage}</p>
      </div>`
    : "";

  const expirySection = params.expiryDate
    ? `<p style="font-size: 12px; color: #6B7280;">This document expires on ${params.expiryDate}.</p>`
    : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; color: #166534; margin: 0;">VaultSign</h1>
        <p style="font-size: 12px; color: #6B7280; margin: 4px 0 0;">by MyZipVault</p>
      </div>

      <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px;">
        <p style="font-size: 16px; color: #111827; margin: 0;">Hello ${params.signerName},</p>
        <p style="font-size: 14px; color: #374151; margin: 12px 0;">
          <strong>${params.senderName}</strong> from <strong>${params.organizationName}</strong> has sent you a document to sign:
        </p>

        <div style="background: #F8F7F4; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-size: 16px; font-weight: 600; color: #166534; margin: 0;">${params.documentName}</p>
        </div>

        ${messageSection}
        ${expirySection}

        <div style="text-align: center; margin: 24px 0;">
          <a href="${params.signingLink}"
             style="background: #166534; color: #FFFFFF; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
            Review & Sign Document
          </a>
        </div>

        <p style="font-size: 12px; color: #6B7280; margin-top: 16px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${params.signingLink}" style="color: #0D9488; word-break: break-all;">${params.signingLink}</a>
        </p>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <p style="font-size: 11px; color: #9CA3AF;">
          This email was sent by VaultSign, a product of MyZipVault.<br>
          Electronic signatures are legally binding under the ESIGN Act and UETA.
        </p>
      </div>
    </div>
  `;

  return sendVaultSignEmail({
    to: params.signerEmail,
    toName: params.signerName,
    subject: `${params.senderName} sent you a document to sign — ${params.documentName}`,
    htmlContent: html,
  });
}

/**
 * Send a reminder email to a signer.
 */
export async function sendReminderEmail(params: {
  signerName: string;
  signerEmail: string;
  documentName: string;
  senderName: string;
  organizationName: string;
  signingLink: string;
  reminderType: "auto" | "manual";
  expiryDate?: string;
}): Promise<boolean> {
  const urgencyText = params.reminderType === "auto"
    ? "This is an automated reminder"
    : `${params.senderName} has sent you a reminder`;

  const expirySection = params.expiryDate
    ? `<p style="font-size: 12px; color: #DC2626; margin-top: 8px;">⚠️ This document expires on ${params.expiryDate}. Please sign before it expires.</p>`
    : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; color: #166534; margin: 0;">VaultSign</h1>
        <p style="font-size: 12px; color: #6B7280; margin: 4px 0 0;">Reminder</p>
      </div>

      <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px;">
        <p style="font-size: 16px; color: #111827; margin: 0;">Hello ${params.signerName},</p>
        <p style="font-size: 14px; color: #374151; margin: 12px 0;">
          ${urgencyText} — you still have a document waiting for your signature:
        </p>

        <div style="background: #F8F7F4; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="font-size: 16px; font-weight: 600; color: #166534; margin: 0;">${params.documentName}</p>
        </div>

        ${expirySection}

        <div style="text-align: center; margin: 24px 0;">
          <a href="${params.signingLink}"
             style="background: #166534; color: #FFFFFF; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
            Sign Document Now
          </a>
        </div>

        <p style="font-size: 12px; color: #6B7280; margin-top: 16px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${params.signingLink}" style="color: #0D9488; word-break: break-all;">${params.signingLink}</a>
        </p>
      </div>
    </div>
  `;

  return sendVaultSignEmail({
    to: params.signerEmail,
    toName: params.signerName,
    subject: `Reminder: ${params.documentName} is waiting for your signature`,
    htmlContent: html,
  });
}

/**
 * Send email notification when a document is fully signed/completed.
 */
export async function sendDocumentCompletedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  documentName: string;
  organizationName: string;
  downloadLink?: string;
}): Promise<boolean> {
  const downloadSection = params.downloadLink
    ? `<div style="text-align: center; margin: 24px 0;">
        <a href="${params.downloadLink}"
           style="background: #166534; color: #FFFFFF; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
          Download Signed Document
        </a>
      </div>`
    : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; color: #166534; margin: 0;">VaultSign</h1>
        <p style="font-size: 12px; color: #6B7280; margin: 4px 0 0;">Document Completed</p>
      </div>

      <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="width: 48px; height: 48px; background: #DCFCE7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 24px;">✓</span>
          </div>
        </div>

        <p style="font-size: 16px; color: #111827; margin: 0; text-align: center;">
          Hello ${params.recipientName},
        </p>
        <p style="font-size: 14px; color: #374151; margin: 12px 0; text-align: center;">
          The document <strong>${params.documentName}</strong> has been fully signed by all parties.
        </p>

        ${downloadSection}

        <p style="font-size: 12px; color: #6B7280; margin-top: 16px; text-align: center;">
          This document was completed on ${new Date().toLocaleDateString()} and is legally binding.
        </p>
      </div>
    </div>
  `;

  return sendVaultSignEmail({
    to: params.recipientEmail,
    toName: params.recipientName,
    subject: `Document completed: ${params.documentName}`,
    htmlContent: html,
  });
}

/**
 * Send email when a signer declines to sign.
 */
export async function sendDocumentDeclinedEmail(params: {
  senderEmail: string;
  senderName: string;
  documentName: string;
  signerName: string;
  declineReason?: string;
}): Promise<boolean> {
  const reasonSection = params.declineReason
    ? `<div style="background: #FEF2F2; border-left: 3px solid #DC2626; padding: 12px; border-radius: 4px; margin: 12px 0;">
        <p style="margin: 0; font-size: 13px; color: #374151;"><strong>Reason:</strong> ${params.declineReason}</p>
      </div>`
    : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px;">
        <p style="font-size: 16px; color: #111827; margin: 0;">Hello ${params.senderName},</p>
        <p style="font-size: 14px; color: #374151; margin: 12px 0;">
          <strong>${params.signerName}</strong> has declined to sign the document <strong>${params.documentName}</strong>.
        </p>
        ${reasonSection}
        <p style="font-size: 13px; color: #6B7280; margin-top: 16px;">
          You can revise and resend the document from your VaultSign dashboard.
        </p>
      </div>
    </div>
  `;

  return sendVaultSignEmail({
    to: params.senderEmail,
    toName: params.senderName,
    subject: `${params.signerName} declined to sign: ${params.documentName}`,
    htmlContent: html,
  });
}

/**
 * Send email when a document is voided.
 */
export async function sendDocumentVoidedEmail(params: {
  signerEmail: string;
  signerName: string;
  documentName: string;
  voidedByName: string;
}): Promise<boolean> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px;">
        <p style="font-size: 16px; color: #111827; margin: 0;">Hello ${params.signerName},</p>
        <p style="font-size: 14px; color: #374151; margin: 12px 0;">
          The document <strong>${params.documentName}</strong> has been voided by <strong>${params.voidedByName}</strong>.
        </p>
        <p style="font-size: 13px; color: #6B7280; margin-top: 16px;">
          No further action is required from you. If you have questions, please contact the sender.
        </p>
      </div>
    </div>
  `;

  return sendVaultSignEmail({
    to: params.signerEmail,
    toName: params.signerName,
    subject: `Document voided: ${params.documentName}`,
    htmlContent: html,
  });
}

/**
 * Generate the signing link for a signer.
 */
export function generateSigningLink(signToken: string): string {
  return `${APP_URL}/sign/${signToken}`;
}

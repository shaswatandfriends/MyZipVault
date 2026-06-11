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

// ─── Common Template Wrapper ─────────────────────────────────────────────────

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/**
 * Build a polished HTML email wrapper with consistent branding.
 * @param bodyContent  The inner HTML for the email body card.
 * @param accentColor  The top-bar / accent color (default green).
 * @param footerVariant  Optional variant: "default" | "signer" — signer footers omit dashboard links.
 */
function buildEmailHtml(bodyContent: string, accentColor = "#166534", footerVariant: "default" | "signer" = "default"): string {
  const contactLink = footerVariant === "signer"
    ? `<a href="mailto:support@myzipvault.com" style="color: #0D9488; text-decoration: underline;">contact the sender</a>`
    : `<a href="mailto:support@myzipvault.com" style="color: #0D9488; text-decoration: underline;">contact support</a>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0; padding:0; background-color:#F3F4F6; font-family:${FONT_STACK};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F3F4F6; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; width:100%;">

          <!-- Gradient Top Bar -->
          <tr>
            <td style="background:linear-gradient(135deg, #166534 0%, #0D9488 100%); border-radius:12px 12px 0 0; height:6px; font-size:0; line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color:#FFFFFF; padding:28px 40px 20px 40px; text-align:center; border-bottom:1px solid #E5E7EB;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <span style="font-size:26px; font-weight:800; color:${accentColor}; letter-spacing:-0.5px;">&#x1F510; VaultSign</span>
                    <br>
                    <span style="font-size:11px; color:#6B7280; letter-spacing:1px; text-transform:uppercase;">by MyZipVault</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Card -->
          <tr>
            <td style="background-color:#FFFFFF; padding:36px 40px 32px 40px; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
              ${bodyContent}
            </td>
          </tr>

          <!-- Accent stripe before footer -->
          <tr>
            <td style="background-color:#FFFFFF; padding:0 40px;">
              <div style="height:1px; background:linear-gradient(90deg, ${accentColor}, #0D9488); border-radius:1px;">&nbsp;</div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#FFFFFF; padding:24px 40px 32px 40px; border-radius:0 0 12px 12px; text-align:center;">
              <p style="margin:0 0 8px 0; font-size:12px; color:#6B7280; line-height:1.5;">
                This email was sent by <strong style="color:#374151;">VaultSign</strong>, a product of <strong style="color:#374151;">MyZipVault</strong>.
              </p>
              <p style="margin:0 0 8px 0; font-size:11px; color:#9CA3AF; line-height:1.5;">
                Electronic signatures are legally binding under the ESIGN Act and UETA.
              </p>
              <p style="margin:0; font-size:11px; color:#9CA3AF; line-height:1.5;">
                Questions? ${contactLink}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── VML Button Helper (Outlook Fallback) ────────────────────────────────────

function vmlButton(href: string, label: string, bgColor: string): string {
  return `
  <!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" strokecolor="${bgColor}" fillcolor="${bgColor}">
    <w:anchorlock/>
    <center style="color:#ffffff;font-family:${FONT_STACK};font-size:16px;font-weight:bold;">${label}</center>
  </v:roundrect>
  <![endif]-->
  <!--[if !mso]><!-->
  <a href="${href}" style="display:inline-block; background-color:${bgColor}; color:#FFFFFF; padding:12px 36px; border-radius:8px; text-decoration:none; font-size:16px; font-weight:600; font-family:${FONT_STACK}; border:2px solid ${bgColor}; mso-hide:all;">${label}</a>
  <!--<![endif]-->`;
}

// ─── Expiry Urgency Helper ───────────────────────────────────────────────────

function expiryBlock(expiryDate?: string): string {
  if (!expiryDate) return "";

  let daysLeft = Infinity;
  try {
    const expiry = new Date(expiryDate);
    const now = new Date();
    daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    // keep Infinity
  }

  const isUrgent = daysLeft <= 3;
  const isWarning = daysLeft <= 7 && daysLeft > 3;

  const bg = isUrgent ? "#FEF2F2" : isWarning ? "#FFFBEB" : "#F8F7F4";
  const border = isUrgent ? "#DC2626" : isWarning ? "#D97706" : "#E5E7EB";
  const color = isUrgent ? "#DC2626" : isWarning ? "#D97706" : "#6B7280";
  const icon = isUrgent ? "&#x26A0;&#xFE0F;" : isWarning ? "&#x23F0;" : "&#x1F4C5;";
  const label = isUrgent
    ? `Expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} — Action required!`
    : isWarning
      ? `Expires in ${daysLeft} days`
      : `Expires on ${expiryDate}`;

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;">
    <tr>
      <td style="background-color:${bg}; border:1px solid ${border}; border-radius:8px; padding:12px 16px; text-align:center;">
        <span style="font-size:13px; color:${color}; font-family:${FONT_STACK};">${icon} ${label}</span>
      </td>
    </tr>
  </table>`;
}

// ─── 1. Document Sent Email ──────────────────────────────────────────────────

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
    ? `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:#F0FDF4; border-left:4px solid #166534; border-radius:0 8px 8px 0; padding:16px 20px;">
        <p style="margin:0 0 6px 0; font-size:13px; color:#166534; font-weight:600; font-family:${FONT_STACK};">Message from ${params.senderName}:</p>
        <p style="margin:0; font-size:14px; color:#374151; line-height:1.6; font-family:${FONT_STACK}; font-style:italic;">"${params.personalMessage}"</p>
      </td>
    </tr>
  </table>`
    : "";

  const body = `
  <!-- Green document icon header -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding-bottom:8px;">
        <div style="width:56px; height:56px; background-color:#DCFCE7; border-radius:50%; display:inline-flex; align-items:center; justify-content:center;">
          <span style="font-size:28px; line-height:1;">&#x1F4C4;</span>
        </div>
      </td>
    </tr>
  </table>

  <h2 style="margin:0 0 4px 0; font-size:22px; font-weight:700; color:#111827; text-align:center; font-family:${FONT_STACK};">You've been asked to sign</h2>
  <p style="margin:0 0 20px 0; font-size:14px; color:#6B7280; text-align:center; font-family:${FONT_STACK};">Review and sign your document securely</p>

  <p style="margin:0 0 12px 0; font-size:15px; color:#111827; font-family:${FONT_STACK};">Hello ${params.signerName},</p>
  <p style="margin:0 0 20px 0; font-size:14px; color:#374151; line-height:1.6; font-family:${FONT_STACK};"><strong style="color:#111827;">${params.senderName}</strong> from <strong style="color:#111827;">${params.organizationName}</strong> has sent you a document that requires your signature.</p>

  <!-- Document info card -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:#F8F7F4; border:1px solid #E5E7EB; border-radius:10px; padding:16px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td width="36" style="vertical-align:middle;">
              <span style="font-size:22px;">&#x1F4C4;</span>
            </td>
            <td style="vertical-align:middle; padding-left:12px;">
              <p style="margin:0; font-size:16px; font-weight:600; color:#166534; font-family:${FONT_STACK};">${params.documentName}</p>
              <p style="margin:4px 0 0 0; font-size:12px; color:#6B7280; font-family:${FONT_STACK};">Signature requested</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  ${messageSection}
  ${expiryBlock(params.expiryDate)}

  <!-- CTA Button -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;">
    <tr>
      <td align="center">
        ${vmlButton(params.signingLink, "Review &amp; Sign Document", "#166534")}
      </td>
    </tr>
  </table>

  <p style="margin:16px 0 0 0; font-size:12px; color:#6B7280; text-align:center; line-height:1.5; font-family:${FONT_STACK};">
    If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${params.signingLink}" style="color:#0D9488; word-break:break-all; text-decoration:underline;">${params.signingLink}</a>
  </p>`;

  const html = buildEmailHtml(body, "#166534", "signer");

  return sendVaultSignEmail({
    to: params.signerEmail,
    toName: params.signerName,
    subject: `${params.senderName} sent you a document to sign — ${params.documentName}`,
    htmlContent: html,
  });
}

// ─── 2. Reminder Email ───────────────────────────────────────────────────────

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
  const isAuto = params.reminderType === "auto";

  const badgeLabel = isAuto ? "AUTOMATED REMINDER" : "MANUAL REMINDER";
  const badgeBg = isAuto ? "#FEF3C7" : "#FFEDD5";
  const badgeColor = isAuto ? "#92400E" : "#9A3412";
  const badgeBorder = isAuto ? "#F59E0B" : "#FB923C";
  const introText = isAuto
    ? `This is an automated reminder that you still have a document waiting for your signature.`
    : `<strong style="color:#111827;">${params.senderName}</strong> has asked us to remind you about a document that still needs your signature.`;

  const body = `
  <!-- Clock icon header -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding-bottom:8px;">
        <div style="width:56px; height:56px; background-color:#FEF3C7; border-radius:50%; display:inline-flex; align-items:center; justify-content:center;">
          <span style="font-size:28px; line-height:1;">&#x23F0;</span>
        </div>
      </td>
    </tr>
  </table>

  <!-- Reminder badge -->
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 12px auto;">
    <tr>
      <td style="background-color:${badgeBg}; border:1px solid ${badgeBorder}; border-radius:20px; padding:4px 16px; text-align:center;">
        <span style="font-size:11px; font-weight:700; color:${badgeColor}; letter-spacing:0.5px; font-family:${FONT_STACK};">${badgeLabel}</span>
      </td>
    </tr>
  </table>

  <h2 style="margin:0 0 4px 0; font-size:22px; font-weight:700; color:#111827; text-align:center; font-family:${FONT_STACK};">Don't forget to sign</h2>
  <p style="margin:0 0 20px 0; font-size:14px; color:#6B7280; text-align:center; font-family:${FONT_STACK};">Your signature is still needed</p>

  <p style="margin:0 0 12px 0; font-size:15px; color:#111827; font-family:${FONT_STACK};">Hello ${params.signerName},</p>
  <p style="margin:0 0 20px 0; font-size:14px; color:#374151; line-height:1.6; font-family:${FONT_STACK};">${introText}</p>

  <!-- Document info card -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:#F8F7F4; border:1px solid #E5E7EB; border-radius:10px; padding:16px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td width="36" style="vertical-align:middle;">
              <span style="font-size:22px;">&#x1F4C4;</span>
            </td>
            <td style="vertical-align:middle; padding-left:12px;">
              <p style="margin:0; font-size:16px; font-weight:600; color:#166534; font-family:${FONT_STACK};">${params.documentName}</p>
              <p style="margin:4px 0 0 0; font-size:12px; color:#6B7280; font-family:${FONT_STACK};">Awaiting your signature</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  ${expiryBlock(params.expiryDate)}

  <!-- CTA Button — slightly different shade for reminders -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;">
    <tr>
      <td align="center">
        ${vmlButton(params.signingLink, "Sign Now", "#15803D")}
      </td>
    </tr>
  </table>

  <p style="margin:16px 0 0 0; font-size:12px; color:#6B7280; text-align:center; line-height:1.5; font-family:${FONT_STACK};">
    If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${params.signingLink}" style="color:#0D9488; word-break:break-all; text-decoration:underline;">${params.signingLink}</a>
  </p>`;

  const html = buildEmailHtml(body, "#D97706", "signer");

  return sendVaultSignEmail({
    to: params.signerEmail,
    toName: params.signerName,
    subject: `Reminder: ${params.documentName} is waiting for your signature`,
    htmlContent: html,
  });
}

// ─── 3. Document Completed Email ─────────────────────────────────────────────

export async function sendDocumentCompletedEmail(params: {
  recipientEmail: string;
  recipientName: string;
  documentName: string;
  organizationName: string;
  downloadLink?: string;
}): Promise<boolean> {
  const completionDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const completionTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const hashRef = `VS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const downloadSection = params.downloadLink
    ? `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;">
    <tr>
      <td align="center">
        ${vmlButton(params.downloadLink, "Download Signed Document", "#166534")}
      </td>
    </tr>
  </table>`
    : "";

  const body = `
  <!-- Celebration checkmark header -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding-bottom:8px;">
        <div style="width:64px; height:64px; background-color:#DCFCE7; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; border:3px solid #166534;">
          <span style="font-size:32px; line-height:1;">&#x2705;</span>
        </div>
      </td>
    </tr>
  </table>

  <!-- Green success banner -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0;">
    <tr>
      <td style="background-color:#DCFCE7; border:1px solid #BBF7D0; border-radius:10px; padding:16px 20px; text-align:center;">
        <p style="margin:0; font-size:16px; font-weight:700; color:#166534; font-family:${FONT_STACK};">All parties have signed</p>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 12px 0; font-size:15px; color:#111827; font-family:${FONT_STACK};">Hello ${params.recipientName},</p>
  <p style="margin:0 0 20px 0; font-size:14px; color:#374151; line-height:1.6; font-family:${FONT_STACK};">Great news! The document <strong style="color:#111827;">${params.documentName}</strong> has been fully signed by all parties and is now complete.</p>

  <!-- Completion timestamp -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;">
    <tr>
      <td style="background-color:#F8F7F4; border-radius:10px; padding:16px 20px; text-align:center;">
        <p style="margin:0 0 4px 0; font-size:13px; color:#6B7280; font-family:${FONT_STACK};">Completed on</p>
        <p style="margin:0; font-size:15px; font-weight:600; color:#111827; font-family:${FONT_STACK};">${completionDate} at ${completionTime}</p>
      </td>
    </tr>
  </table>

  ${downloadSection}

  <!-- Certificate-style completion notice -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:#F0FDF4; border:2px solid #BBF7D0; border-radius:10px; padding:16px 20px; text-align:center;">
        <p style="margin:0 0 6px 0; font-size:12px; color:#166534; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; font-family:${FONT_STACK};">Completion Certificate</p>
        <p style="margin:0 0 4px 0; font-size:11px; color:#6B7280; font-family:${FONT_STACK};">Reference: <strong style="color:#374151;">${hashRef}</strong></p>
        <p style="margin:0; font-size:11px; color:#9CA3AF; font-family:${FONT_STACK};">This document is legally binding under the ESIGN Act and UETA.</p>
      </td>
    </tr>
  </table>`;

  const html = buildEmailHtml(body, "#166534", "default");

  return sendVaultSignEmail({
    to: params.recipientEmail,
    toName: params.recipientName,
    subject: `Document completed: ${params.documentName}`,
    htmlContent: html,
  });
}

// ─── 4. Document Declined Email ──────────────────────────────────────────────

export async function sendDocumentDeclinedEmail(params: {
  senderEmail: string;
  senderName: string;
  documentName: string;
  signerName: string;
  declineReason?: string;
}): Promise<boolean> {
  const reasonSection = params.declineReason
    ? `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:#FEF2F2; border-left:4px solid #DC2626; border-radius:0 8px 8px 0; padding:16px 20px;">
        <p style="margin:0 0 6px 0; font-size:12px; color:#DC2626; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; font-family:${FONT_STACK};">Reason for declining</p>
        <p style="margin:0; font-size:14px; color:#374151; line-height:1.6; font-family:${FONT_STACK};">"${params.declineReason}"</p>
      </td>
    </tr>
  </table>`
    : "";

  const body = `
  <!-- Decline icon header -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding-bottom:8px;">
        <div style="width:56px; height:56px; background-color:#FEF2F2; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; border:2px solid #FECACA;">
          <span style="font-size:28px; line-height:1;">&#x274C;</span>
        </div>
      </td>
    </tr>
  </table>

  <h2 style="margin:0 0 4px 0; font-size:22px; font-weight:700; color:#111827; text-align:center; font-family:${FONT_STACK};">Document Declined</h2>
  <p style="margin:0 0 20px 0; font-size:14px; color:#6B7280; text-align:center; font-family:${FONT_STACK};">A signer has chosen not to sign</p>

  <p style="margin:0 0 12px 0; font-size:15px; color:#111827; font-family:${FONT_STACK};">Hello ${params.senderName},</p>
  <p style="margin:0 0 20px 0; font-size:14px; color:#374151; line-height:1.6; font-family:${FONT_STACK};"><strong style="color:#111827;">${params.signerName}</strong> has declined to sign the document <strong style="color:#111827;">${params.documentName}</strong>.</p>

  ${reasonSection}

  <!-- Revise & Resend suggestion -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;">
    <tr>
      <td style="background-color:#F8F7F4; border:1px solid #E5E7EB; border-radius:10px; padding:16px 20px; text-align:center;">
        <p style="margin:0 0 8px 0; font-size:13px; color:#6B7280; font-family:${FONT_STACK};">What would you like to do?</p>
        <p style="margin:0; font-size:14px; color:#111827; font-family:${FONT_STACK};">You can <strong>revise and resend</strong> the document from your VaultSign dashboard, or create a new document.</p>
      </td>
    </tr>
  </table>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td align="center">
        ${vmlButton(`${APP_URL}/recruiter/vaultsign`, "Go to Dashboard", "#166534")}
      </td>
    </tr>
  </table>`;

  const html = buildEmailHtml(body, "#DC2626", "default");

  return sendVaultSignEmail({
    to: params.senderEmail,
    toName: params.senderName,
    subject: `${params.signerName} declined to sign: ${params.documentName}`,
    htmlContent: html,
  });
}

// ─── 5. Document Voided Email ────────────────────────────────────────────────

export async function sendDocumentVoidedEmail(params: {
  signerEmail: string;
  signerName: string;
  documentName: string;
  voidedByName: string;
}): Promise<boolean> {
  const body = `
  <!-- Voided stamp-style header -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding-bottom:8px;">
        <div style="width:64px; height:64px; background-color:#F3F4F6; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; border:2px dashed #9CA3AF;">
          <span style="font-size:26px; line-height:1; color:#6B7280;">&#x1F6AB;</span>
        </div>
      </td>
    </tr>
  </table>

  <!-- VOIDED stamp visual -->
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 16px auto;">
    <tr>
      <td style="border:3px solid #6B7280; border-radius:8px; padding:6px 24px; transform:rotate(-3deg); text-align:center;">
        <span style="font-size:20px; font-weight:900; color:#6B7280; letter-spacing:4px; font-family:${FONT_STACK};">VOIDED</span>
      </td>
    </tr>
  </table>

  <h2 style="margin:0 0 4px 0; font-size:22px; font-weight:700; color:#111827; text-align:center; font-family:${FONT_STACK};">Document Voided</h2>
  <p style="margin:0 0 20px 0; font-size:14px; color:#6B7280; text-align:center; font-family:${FONT_STACK};">No further action is needed</p>

  <p style="margin:0 0 12px 0; font-size:15px; color:#111827; font-family:${FONT_STACK};">Hello ${params.signerName},</p>
  <p style="margin:0 0 20px 0; font-size:14px; color:#374151; line-height:1.6; font-family:${FONT_STACK};">The document <strong style="color:#111827;">${params.documentName}</strong> has been voided by <strong style="color:#111827;">${params.voidedByName}</strong>.</p>

  <!-- Explanation card -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:#F8F7F4; border:1px solid #E5E7EB; border-radius:10px; padding:20px 24px;">
        <p style="margin:0 0 8px 0; font-size:14px; font-weight:600; color:#374151; font-family:${FONT_STACK};">What does this mean?</p>
        <p style="margin:0 0 12px 0; font-size:13px; color:#6B7280; line-height:1.6; font-family:${FONT_STACK};">When a document is voided, the signing process is cancelled. The document can no longer be signed and any pending signatures are invalidated.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color:#DCFCE7; border-radius:8px; padding:12px 16px; text-align:center;">
              <p style="margin:0; font-size:14px; font-weight:600; color:#166534; font-family:${FONT_STACK};">&#x2705; No further action needed from you</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <p style="margin:16px 0 0 0; font-size:13px; color:#6B7280; text-align:center; line-height:1.5; font-family:${FONT_STACK};">
    If you believe this was done in error or have any questions, please <a href="mailto:support@myzipvault.com" style="color:#0D9488; text-decoration:underline;">contact the sender</a>.
  </p>`;

  const html = buildEmailHtml(body, "#6B7280", "signer");

  return sendVaultSignEmail({
    to: params.signerEmail,
    toName: params.signerName,
    subject: `Document voided: ${params.documentName}`,
    htmlContent: html,
  });
}

// ─── Signing Link Generator ──────────────────────────────────────────────────

export function generateSigningLink(signToken: string): string {
  return `${APP_URL}/sign/${signToken}`;
}

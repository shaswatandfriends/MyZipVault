/**
 * Campaign Email HTML Wrapper
 *
 * Builds a branded HTML email with the MyZipVault logo at top, the
 * campaign body in the center, and a footer with unsubscribe link.
 *
 * This is the generalized version of the VaultSign email wrapper
 * (lib/vaultsign/email.ts → buildEmailHtml) — adapted for marketing
 * campaigns instead of e-signature notifications.
 *
 * Key differences from the VaultSign wrapper:
 *   - Uses platform blue (#0A66C2) instead of VaultSign green
 *   - Shows "MyZipVault" branding (not "VaultSign")
 *   - Includes an unsubscribe link in the footer (CAN-SPAM compliance)
 *   - Supports custom accent color per campaign
 *   - Supports custom logo URL (falls back to text logo)
 */

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

interface CampaignEmailOptions {
  /** Accent color for the top gradient bar (default: platform blue) */
  accentColor?: string;
  /** Logo image URL (if provided, shows <img> instead of text logo) */
  logoUrl?: string;
  /** Unsubscribe URL — the tracking-redirect-wrapped unsubscribe link */
  unsubscribeUrl?: string;
  /** Campaign name — shown in footer "You received this because..." */
  campaignName?: string;
}

/**
 * Build a branded HTML email wrapper for campaign emails.
 *
 * Structure:
 *   ┌─────────────────────────────┐
 *   │  Gradient top bar           │
 *   ├─────────────────────────────┤
 *   │  Logo: "M MyZipVault"        │
 *   │  (or <img> if logoUrl set)  │
 *   ├─────────────────────────────┤
 *   │                             │
 *   │  Campaign body content      │
 *   │  (already personalized +    │
 *   │   tracking pixels injected) │
 *   │                             │
 *   ├─────────────────────────────┤
 *   │  Footer:                     │
 *   │  "You received this email    │
 *   │   because..."                │
 *   │  Unsubscribe link            │
 *   └─────────────────────────────┘
 */
export function buildCampaignEmailHtml(
  bodyContent: string,
  options: CampaignEmailOptions = {}
): string {
  const {
    accentColor = "#0A66C2",
    logoUrl,
    unsubscribeUrl,
    campaignName,
  } = options;

  const accentGradient = `linear-gradient(135deg, ${accentColor} 0%, #004182 100%)`;

  // Logo: if logoUrl provided, use <img>. Otherwise use text logo.
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="MyZipVault" style="max-height:40px; max-width:180px; display:block; margin:0 auto;">`
    : `<div style="display:inline-block; vertical-align:middle;">
         <span style="display:inline-block; width:36px; height:36px; border-radius:8px; background:${accentGradient}; color:#fff; font-size:20px; font-weight:800; line-height:36px; text-align:center; vertical-align:middle; margin-right:8px;">M</span>
         <span style="font-size:22px; font-weight:800; color:${accentColor}; letter-spacing:-0.5px; vertical-align:middle;">MyZipVault</span>
       </div>`;

  // Footer with unsubscribe link
  const footerHtml = `
    <p style="margin:0 0 8px 0; font-size:12px; color:#6B7280; line-height:1.5;">
      This email was sent by <strong style="color:#374151;">MyZipVault</strong>${campaignName ? ` — ${campaignName}` : ""}.
    </p>
    <p style="margin:0 0 8px 0; font-size:11px; color:#9CA3AF; line-height:1.5;">
      You received this email because you have an account on MyZipVault.
    </p>
    ${unsubscribeUrl ? `<p style="margin:0 0 8px 0; font-size:11px; color:#9CA3AF; line-height:1.5;">
      <a href="${unsubscribeUrl}" style="color:#6B7280; text-decoration:underline;">Unsubscribe</a> &middot;
      <a href="https://myzipvault.com/privacy" style="color:#6B7280; text-decoration:underline;">Privacy Policy</a>
    </p>` : ""}
    <p style="margin:0; font-size:11px; color:#9CA3AF; line-height:1.5;">
      &copy; ${new Date().getFullYear()} MyZipVault. All rights reserved.
    </p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0; padding:0; background-color:#F3F4F6; font-family:${FONT_STACK};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F3F4F6; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; width:100%;">

          <!-- Gradient Top Bar -->
          <tr>
            <td style="background:${accentGradient}; border-radius:12px 12px 0 0; height:6px; font-size:0; line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header with Logo -->
          <tr>
            <td style="background-color:#FFFFFF; padding:28px 40px 20px 40px; text-align:center; border-bottom:1px solid #E5E7EB;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    ${logoHtml}
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
              <div style="height:1px; background:linear-gradient(90deg, ${accentColor}, #004182); border-radius:1px;">&nbsp;</div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#FFFFFF; padding:24px 40px 32px 40px; border-radius:0 0 12px 12px; text-align:center;">
              ${footerHtml}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

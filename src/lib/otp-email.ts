const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@myzipvault.com";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Send a 6-digit OTP code to the superadmin email for login verification.
 */
export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean> {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #9f1239, #be123c); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">MyZipVault</h1>
        <p style="color: #fecdd3; margin: 4px 0 0 0; font-size: 13px;">Super Admin Verification</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #1f2937; font-size: 15px; margin: 0 0 20px 0;">Your verification code is:</p>
        <div style="background: #fef2f2; border: 2px dashed #dc2626; border-radius: 8px; padding: 16px; text-align: center; margin: 0 0 20px 0;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #991b1b; font-family: 'Courier New', monospace;">${otpCode}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0;">This code expires in <strong>5 minutes</strong>.</p>
        <p style="color: #6b7280; font-size: 13px; margin: 0;">If you did not request this code, please ignore this email and ensure your account is secure.</p>
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">This is an automated message from MyZipVault. Do not reply to this email.</p>
      </div>
    </div>
  `;

  if (!BREVO_API_KEY) {
    console.log("[OTP EMAIL] No BREVO_API_KEY — would send OTP:", otpCode, "to", toEmail);
    return true;
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: "MyZipVault Security" },
        to: [{ email: toEmail }],
        subject: `Your MyZipVault Verification Code: ${otpCode}`,
        htmlContent,
      }),
    });

    if (response.ok) {
      console.log(`[OTP EMAIL] Sent OTP to ${toEmail}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`[OTP EMAIL] Brevo error (${response.status}): ${errorText}`);

      // If Brevo returns IP authorization error, log a helpful message
      if (errorText.includes("unrecognised IP") || errorText.includes("authorised_ips")) {
        console.error("[OTP EMAIL] Brevo IP restriction detected. Add the server IP to Brevo authorized IPs at: https://app.brevo.com/security/authorised_ips");
      }

      return false;
    }
  } catch (error) {
    console.error("[OTP EMAIL] Failed:", error);
    return false;
  }
}

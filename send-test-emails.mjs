const BREVO_API_KEY = "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";
const BREVO_SENDER = "shaswatpandey0047@gmail.com";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const recipients = [
  { name: "Tejas", email: "tejasyakatiyar1234@gmail.com" },
  { name: "Nirbhey", email: "nirbheyspathhak@gmail.com" },
  { name: "Nirbhay", email: "nirbhay2051@gmail.com" },
  { name: "Nirbhay", email: "pathak.nirbhay@yahoo.com" },
  { name: "Nirbhay", email: "nirbhay.pathak@outlook.com" },
  { name: "Nirbhay", email: "nirbhaypathak1430@gmail.com" },
];

async function sendEmail(recipient) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc; border-radius: 12px;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">MyZipVault</h1>
        <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 16px;">Healthcare Credential Verification</p>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
        <p style="font-size: 18px; color: #1e293b;">Hey ${recipient.name}! 👋</p>
        <p style="color: #475569; line-height: 1.6;">This is a test email from <strong>MyZipVault</strong> — the secure healthcare credential verification platform. If you're seeing this, our email system is working perfectly!</p>
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #166534; font-weight: 600;">✅ Email Delivery Test: SUCCESSFUL</p>
          <p style="margin: 4px 0 0 0; color: #15803d; font-size: 14px;">Brevo API integration is active and sending emails.</p>
        </div>
        <p style="color: #475569; line-height: 1.6;">MyZipVault helps healthcare professionals store credentials, skill checklists, and references in a secure vault — while staffing agencies can request and verify compliance packets seamlessly.</p>
        <a href="https://myzipvault.com" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 10px;">Learn More About MyZipVault</a>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">This is a test email sent from the MyZipVault platform.<br>You received this because someone added your email for testing purposes.</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER, name: "MyZipVault" },
        to: [{ email: recipient.email, name: recipient.name }],
        subject: `Hey ${recipient.name}! MyZipVault Email Test ✅`,
        htmlContent,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ SENT to ${recipient.email} — Message ID: ${data.messageId}`);
    } else {
      const error = await response.text();
      console.error(`❌ FAILED to ${recipient.email} — ${response.status}: ${error}`);
    }
  } catch (err) {
    console.error(`❌ ERROR sending to ${recipient.email}:`, err.message);
  }
}

async function main() {
  console.log("📧 Sending test emails to 6 recipients via Brevo API...\n");
  
  for (const recipient of recipients) {
    await sendEmail(recipient);
    // Small delay between sends to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log("\n📬 All emails processed!");
}

main();

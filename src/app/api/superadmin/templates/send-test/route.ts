import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@myzipvault.com";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const SAMPLE_DATA: Record<string, string> = {
  candidate_name: "Jane Nurse",
  organization_name: "Acme Staffing",
  agency_name: "Acme Staffing",
  client_name: "Sarah Recruiter",
  recruiter_name: "Sarah Recruiter",
  facility_name: "Sunrise Medical Center",
  checklist_name: "ICU Nurse Skills Checklist",
  document_name: "BLS Certification",
  expiry_date: "Apr 15, 2026",
  days_remaining: "14",
  verification_status: "Verified",
  invite_link: "https://myzipvault.com/onboard?token=abc123",
  share_link: "https://myzipvault.com/share/abc123",
  login_link: "https://myzipvault.com/login",
  reset_link: "https://myzipvault.com/reset?token=xyz789",
  purchase_link: "https://myzipvault.com/credits",
  manager_name: "Dr. Robert Chen",
  nurse_name: "Jane Nurse",
  review_notes: "Document appears to be expired. Please upload a current certification.",
  credits_remaining: "12",
  deletion_date: "Mar 20, 2026",
  platform_name: "MyZipVault",
};

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}

function replaceWithSampleData(text: string): string {
  let result = text;
  const variables = extractVariables(text);
  for (const v of variables) {
    if (SAMPLE_DATA[v]) {
      result = result.replaceAll(`{{${v}}}`, SAMPLE_DATA[v]);
    }
  }
  // Replace any remaining unknown variables with a placeholder
  result = result.replace(/\{\{(\w+)\}\}/g, "[$1]");
  return result;
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

    const body = await request.json();
    const { templateKey, subject, body: templateBody, toEmail } = body;

    if (!templateKey || !subject || !templateBody || !toEmail) {
      return NextResponse.json(
        { error: "Template key, subject, body, and recipient email are required" },
        { status: 400 }
      );
    }

    // Replace variables with sample data
    const previewSubject = `[TEST] ${replaceWithSampleData(subject)}`;
    let htmlContent = replaceWithSampleData(templateBody);

    // Convert plain text to basic HTML if no HTML tags present
    if (!htmlContent.includes("<")) {
      htmlContent = htmlContent
        .split("\n")
        .map((line: string) => `<p>${line}</p>`)
        .join("");
    }

    // Add a test email banner at the top
    const testBanner = `
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-family:sans-serif;">
        <p style="margin:0;color:#92400e;font-size:13px;">
          <strong>🧪 Test Email</strong> — This is a preview of the <code>${templateKey}</code> template with sample data.
        </p>
      </div>
    `;
    htmlContent = testBanner + htmlContent;

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
            sender: { email: BREVO_SENDER_EMAIL, name: "MyZipVault (Test)" },
            to: [{ email: toEmail }],
            subject: previewSubject,
            htmlContent,
          }),
        });

        if (response.ok) {
          // Log the test email action
          const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
          await db.auditLog.create({
            data: {
              user_id: actionerId,
              role: "super_admin",
              action: "send_test_email",
              entity_type: "email_template",
              entity_id: null,
            },
          });

          return NextResponse.json({
            success: true,
            message: `Test email sent to ${toEmail}`,
          });
        } else {
          const error = await response.text();
          console.error(`[TEST EMAIL] Brevo API error: ${error}`);
          return NextResponse.json(
            { error: "Failed to send test email via Brevo. Check your Brevo API key configuration." },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error("[TEST EMAIL] Brevo API call failed:", error);
        return NextResponse.json(
          { error: "Failed to send test email. Email service unavailable." },
          { status: 500 }
        );
      }
    }

    // No Brevo key - log to console and return success with warning
    console.log(`[TEST EMAIL] No Brevo API key configured`);
    console.log(`[TEST EMAIL] To: ${toEmail}`);
    console.log(`[TEST EMAIL] Subject: ${previewSubject}`);
    console.log(`[TEST EMAIL] Body: ${htmlContent.substring(0, 500)}...`);

    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    await db.auditLog.create({
      data: {
        user_id: actionerId,
        role: "super_admin",
        action: "send_test_email",
        entity_type: "email_template",
        entity_id: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Test email logged to console (Brevo API key not configured). Would send to: ${toEmail}`,
      loggedOnly: true,
    });
  } catch (error) {
    console.error("Send test email error:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

const SETTING_KEY = "landing_page_content";

export async function GET() {
  try {
    const setting = await db.platformSetting.findUnique({
      where: { setting_key: SETTING_KEY },
    });

    if (!setting) {
      // Return default content with no-cache headers
      return NextResponse.json({
        hero: {
          candidateHeadline: "Stop Filling Out the Same Checklists.",
          candidateGradientText: "Own Your Career",
          candidateSubheadline:
            "The secure, candidate-controlled vault for healthcare professionals. Complete your skills checklists once, store your credentials, collect references, and share with recruiters on your terms.",
          candidateCtaText: "Create Your Free Vault",
          recruiterHeadline: "Stop Chasing Nurses for",
          recruiterGradientText: "Checklists and References.",
          recruiterSubheadline:
            "MyZipVault automates the healthcare compliance packet. Request a checklist, credentials, and references — and watch them complete in real time. No more endless email threads.",
          recruiterCtaText: "Get Started",
          trustLine1: "HIPAA-Aligned Security",
          trustLine2: "You Control Access",
          trustLine3: "100% Free for Nurses",
        },
        colors: {
          primary: "#166534",
          accent: "#0D9488",
          background: "#F8F7F4",
          textPrimary: "#111827",
          textSecondary: "#6B7280",
        },
        featureCards: [
          {
            icon: "ClipboardCheck",
            heading: "Complete Once, Reuse for 30 Days",
            body: "Receive a checklist request from an agency. Rate yourself on our industry-standard lists. Once submitted, it's saved in your vault. If another agency asks for the same list within 30 days, just click Share. No retakes. No redundancy.",
          },
          {
            icon: "FileText",
            heading: "Never Start From Scratch",
            body: "Upload your current resume and our builder auto-fills your profile. Next time you need to add a new assignment, click Add Experience. Edit, update, and export a formatted resume in seconds.",
          },
          {
            icon: "Bell",
            heading: "Never Let a Cert Expire Unnoticed",
            body: "Upload your BLS, ACLS, RN License, and Immunizations. Turn on expiration reminders and we'll alert you 30 days before it's time to renew.",
          },
          {
            icon: "Users",
            heading: "Build Your Verified Reference Network",
            body: "Connect with your managers and request an evaluation. They get a free vault too. Store their verified signed reference in your vault, ready to share the second a recruiter asks.",
          },
        ],
        privacySection: [
          {
            icon: "Lock",
            heading: "Explicit Consent",
            body: "A recruiter only sees what you share. Nothing is ever visible by default.",
          },
          {
            icon: "Timer",
            heading: "Expiring Access",
            body: "You set the timer — 7, 14, or 30 days. Access ends automatically.",
          },
          {
            icon: "Trash2",
            heading: "No Data Hoarding",
            body: "If you delete your account, all recruiter access is killed instantly.",
          },
        ],
        howItWorks: [
          {
            title: "Create Your Vault",
            description:
              "Sign up free. Upload your resume and our builder auto-fills your profile. Add your BLS, ACLS, RN License, and immunizations in minutes.",
          },
          {
            title: "Complete Your Checklists",
            description:
              "When an agency requests a skills checklist, fill it out once. It stays in your vault for 30 days. Next agency asks? Click Share. No retakes.",
          },
          {
            title: "Share On Your Terms",
            description:
              "Grant expiring access to any recruiter — 7, 14, or 30 days. Revoke anytime. They see only what you allow. Nothing more.",
          },
        ],
        footer: {
          copyrightText: "\u00A9 2025 MyZipVault. All rights reserved.",
          hipaaBadgeText: "HIPAA-Aligned Security",
        },
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      });
    }

    const content = JSON.parse(setting.setting_value);
    return NextResponse.json(content, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    console.error("Landing page GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch landing page content" },
      { status: 500 }
    );
  }
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

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const actionerId = parseInt(session.user.id as string, 10);
    const jsonValue = JSON.stringify(body);

    // Upsert the platform setting
    await db.platformSetting.upsert({
      where: { setting_key: SETTING_KEY },
      update: {
        setting_value: jsonValue,
        updated_by: actionerId,
        updated_at: new Date(),
      },
      create: {
        setting_key: SETTING_KEY,
        setting_value: jsonValue,
        updated_by: actionerId,
      },
    });

    await db.auditLog.create({
      data: {
        user_id: actionerId,
        role: "super_admin",
        action: "update_landing_page",
        entity_type: "platform_setting",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Landing page content saved successfully",
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Landing page POST error:", error);
    return NextResponse.json(
      { error: "Failed to save landing page content" },
      { status: 500 }
    );
  }
}

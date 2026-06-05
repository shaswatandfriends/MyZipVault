import { NextRequest, NextResponse } from "next/server";

// ─── In-memory store for landing page content ───────────────────────
// In production, this would persist to the database.
let landingPageContent: Record<string, unknown> | null = null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Store the landing page content
    landingPageContent = body;

    return NextResponse.json({
      success: true,
      message: "Landing page content saved successfully",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to save landing page content" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!landingPageContent) {
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
            body: "Receive a checklist request from an agency. Rate yourself on our industry-standard lists. Once submitted, it's saved in your vault.",
          },
          {
            icon: "FileText",
            heading: "Never Start From Scratch",
            body: "Upload your current resume and our builder auto-fills your profile.",
          },
          {
            icon: "Bell",
            heading: "Never Let a Cert Expire Unnoticed",
            body: "Upload your BLS, ACLS, RN License, and Immunizations. Turn on expiration reminders.",
          },
          {
            icon: "Users",
            heading: "Build Your Verified Reference Network",
            body: "Connect with your managers and request an evaluation.",
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
              "Sign up free. Upload your resume and our builder auto-fills your profile.",
          },
          {
            title: "Complete Your Checklists",
            description:
              "When an agency requests a skills checklist, fill it out once. It stays in your vault for 30 days.",
          },
          {
            title: "Share On Your Terms",
            description:
              "Grant expiring access to any recruiter — 7, 14, or 30 days. Revoke anytime.",
          },
        ],
        footer: {
          copyrightText: "\u00A9 2025 MyZipVault. All rights reserved.",
          hipaaBadgeText: "HIPAA-Aligned Security",
        },
      });
    }

    return NextResponse.json(landingPageContent);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch landing page content" },
      { status: 500 }
    );
  }
}

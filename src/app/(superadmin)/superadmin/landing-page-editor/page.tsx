"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Monitor,
  Smartphone,
  Save,
  RotateCcw,
  ChevronDown,
  Paintbrush,
  Type,
  LayoutGrid,
  Shield,
  ListOrdered,
  Footer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ──────────────────────────────────────────────────────────
interface HeroContent {
  candidateHeadline: string;
  candidateGradientText: string;
  candidateSubheadline: string;
  candidateCtaText: string;
  recruiterHeadline: string;
  recruiterGradientText: string;
  recruiterSubheadline: string;
  recruiterCtaText: string;
  trustLine1: string;
  trustLine2: string;
  trustLine3: string;
}

interface ColorSettings {
  primary: string;
  accent: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
}

interface FeatureCard {
  icon: string;
  heading: string;
  body: string;
}

interface PrivacyItem {
  icon: string;
  heading: string;
  body: string;
}

interface HowItWorksStep {
  title: string;
  description: string;
}

interface FooterContent {
  copyrightText: string;
  hipaaBadgeText: string;
}

interface LandingPageData {
  hero: HeroContent;
  colors: ColorSettings;
  featureCards: FeatureCard[];
  privacySection: PrivacyItem[];
  howItWorks: HowItWorksStep[];
  footer: FooterContent;
}

// ─── Icon Options ───────────────────────────────────────────────────
const iconOptions = [
  "ClipboardCheck",
  "FileText",
  "Bell",
  "Users",
  "Lock",
  "Shield",
  "Eye",
  "FolderOpen",
  "BadgeCheck",
  "Handshake",
  "Timer",
  "Trash2",
  "Zap",
  "Upload",
  "CheckCircle2",
  "Stethoscope",
  "Briefcase",
  "Clock",
  "ShieldCheck",
  "ArrowRight",
  "Heart",
  "Star",
  "Award",
  "Globe",
  "Search",
  "Settings",
  "Link2",
  "Database",
  "Server",
  "Code",
];

// ─── Default Values ─────────────────────────────────────────────────
const defaultData: LandingPageData = {
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
};

// ─── Color Picker Field ─────────────────────────────────────────────
function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 cursor-pointer rounded-lg border border-[#E5E7EB] p-0.5"
        />
      </div>
      <div className="flex-1">
        <Label className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
          {label}
        </Label>
        <div className="flex items-center gap-2 mt-1">
          <div
            className="size-5 rounded border border-[#E5E7EB]"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm text-[#9CA3AF] font-mono">{value}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Live Preview Panel ─────────────────────────────────────────────
function LivePreview({
  data,
  previewMode,
}: {
  data: LandingPageData;
  previewMode: "desktop" | "mobile";
}) {
  const previewWidth = previewMode === "mobile" ? "375px" : "100%";

  return (
    <div
      className="mx-auto bg-[#F8F7F4] overflow-y-auto overflow-x-hidden custom-scrollbar"
      style={{
        width: previewWidth,
        maxHeight: "calc(100vh - 220px)",
        minHeight: 500,
      }}
    >
      {/* Mini Header */}
      <div
        className="border-b border-[#E5E7EB] px-4 py-2 flex items-center justify-between"
        style={{ backgroundColor: data.colors.background + "CC" }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="size-5 rounded-md flex items-center justify-center text-white text-[8px] font-bold"
            style={{ backgroundColor: data.colors.primary }}
          >
            ZV
          </div>
          <span
            className="text-[10px] font-semibold"
            style={{
              color: data.colors.textPrimary,
              fontFamily: "'Clash Display', sans-serif",
            }}
          >
            MyZipVault
          </span>
        </div>
        <div className="flex gap-1">
          <div
            className="rounded-md px-2 py-0.5 text-[8px] font-medium border"
            style={{ borderColor: "#D1D5DB", color: data.colors.textSecondary }}
          >
            Log In
          </div>
          <div
            className="rounded-md px-2 py-0.5 text-[8px] font-medium text-white"
            style={{ backgroundColor: data.colors.primary }}
          >
            Sign Up
          </div>
        </div>
      </div>

      {/* Hero Section Preview */}
      <div
        className="px-4 py-8 text-center"
        style={{
          background: `linear-gradient(to bottom, ${data.colors.primary}15, ${data.colors.background})`,
        }}
      >
        <div
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-medium"
          style={{
            backgroundColor: data.colors.primary + "20",
            color: data.colors.primary,
          }}
        >
          ✦ Trusted by Healthcare Professionals
        </div>
        <h2
          className="mt-2 text-sm font-bold leading-tight"
          style={{
            color: data.colors.textPrimary,
            fontFamily: "'Clash Display', sans-serif",
          }}
        >
          {data.hero.candidateHeadline}{" "}
          <span
            style={{
              background: `linear-gradient(to right, ${data.colors.primary}, ${data.colors.accent})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {data.hero.candidateGradientText}
          </span>{" "}
          with MyZipVault.
        </h2>
        <p
          className="mt-1.5 text-[8px] leading-relaxed max-w-[200px] mx-auto"
          style={{ color: data.colors.textSecondary }}
        >
          {data.hero.candidateSubheadline.slice(0, 100)}...
        </p>
        <div
          className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[9px] font-semibold text-white"
          style={{ backgroundColor: data.colors.primary }}
        >
          {data.hero.candidateCtaText}
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {[data.hero.trustLine1, data.hero.trustLine2, data.hero.trustLine3].map(
            (line, i) => (
              <span
                key={i}
                className="text-[7px]"
                style={{ color: "#9CA3AF" }}
              >
                {line}
              </span>
            )
          )}
        </div>
      </div>

      {/* Feature Cards Preview */}
      <div className="px-3 py-4" style={{ backgroundColor: "#F3F4F6" }}>
        <p
          className="text-center text-[7px] font-medium tracking-widest uppercase"
          style={{ color: data.colors.accent }}
        >
          Features
        </p>
        <p
          className="text-center text-[10px] font-bold mt-0.5"
          style={{
            color: data.colors.textPrimary,
            fontFamily: "'Clash Display', sans-serif",
          }}
        >
          Everything You Need
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {data.featureCards.map((card, i) => (
            <div
              key={i}
              className="bg-white border border-[#E5E7EB] rounded-lg p-2"
            >
              <p
                className="text-[8px] font-semibold"
                style={{
                  color: data.colors.textPrimary,
                  fontFamily: "'Clash Display', sans-serif",
                }}
              >
                {card.heading}
              </p>
              <p
                className="mt-0.5 text-[6px] leading-relaxed"
                style={{ color: data.colors.textSecondary }}
              >
                {card.body.slice(0, 60)}...
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Section Preview */}
      <div className="px-4 py-5 text-white" style={{ backgroundColor: data.colors.primary }}>
        <p
          className="text-center text-[10px] font-bold"
          style={{ fontFamily: "'Clash Display', sans-serif" }}
        >
          Your Vault. Your Rules.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {data.privacySection.map((item, i) => (
            <div key={i} className="text-center">
              <div className="size-5 rounded-full bg-white/10 mx-auto flex items-center justify-center text-[7px]">
                {item.icon.slice(0, 2)}
              </div>
              <p className="mt-1 text-[7px] font-semibold">{item.heading}</p>
              <p className="text-[6px] text-white/70 mt-0.5">
                {item.body.slice(0, 30)}...
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Preview */}
      <div className="px-4 py-5" style={{ backgroundColor: data.colors.background }}>
        <p
          className="text-center text-[7px] font-medium tracking-widest uppercase"
          style={{ color: data.colors.accent }}
        >
          How It Works
        </p>
        <p
          className="text-center text-[10px] font-bold mt-0.5"
          style={{
            color: data.colors.textPrimary,
            fontFamily: "'Clash Display', sans-serif",
          }}
        >
          From Request to Hired in Minutes
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {data.howItWorks.map((step, i) => (
            <div key={i} className="text-center">
              <div
                className="size-6 rounded-full mx-auto flex items-center justify-center text-[9px] font-bold"
                style={{
                  backgroundColor: data.colors.primary + "20",
                  color: data.colors.primary,
                  fontFamily: "'Clash Display', sans-serif",
                }}
              >
                {i + 1}
              </div>
              <p
                className="mt-1 text-[7px] font-semibold"
                style={{ color: data.colors.textPrimary }}
              >
                {step.title}
              </p>
              <p
                className="mt-0.5 text-[6px] leading-relaxed"
                style={{ color: data.colors.textSecondary }}
              >
                {step.description.slice(0, 40)}...
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Preview */}
      <div className="bg-[#111827] px-4 py-3 text-center">
        <p className="text-[7px] text-white/40">{data.footer.copyrightText}</p>
        <span className="inline-flex items-center gap-0.5 mt-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[7px] text-white/80">
          {data.footer.hipaaBadgeText}
        </span>
      </div>
    </div>
  );
}

// ─── Section Wrapper ────────────────────────────────────────────────
function EditorSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="size-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center">
          <Icon className="size-4 text-[#166534]" />
        </div>
        <h2
          className="text-lg font-semibold text-[#111827]"
          style={{ fontFamily: "'Clash Display', sans-serif" }}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ─── Form Field ─────────────────────────────────────────────────────
function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function LandingPageEditorPage() {
  const [data, setData] = useState<LandingPageData>(defaultData);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop"
  );
  const [saving, setSaving] = useState(false);

  // ── Hero helpers ──
  const updateHero = (key: keyof HeroContent, value: string) => {
    setData((prev) => ({ ...prev, hero: { ...prev.hero, [key]: value } }));
  };

  // ── Color helpers ──
  const updateColor = (key: keyof ColorSettings, value: string) => {
    setData((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  // ── Feature card helpers ──
  const updateFeatureCard = (
    index: number,
    key: keyof FeatureCard,
    value: string
  ) => {
    setData((prev) => {
      const cards = [...prev.featureCards];
      cards[index] = { ...cards[index], [key]: value };
      return { ...prev, featureCards: cards };
    });
  };

  // ── Privacy item helpers ──
  const updatePrivacyItem = (
    index: number,
    key: keyof PrivacyItem,
    value: string
  ) => {
    setData((prev) => {
      const items = [...prev.privacySection];
      items[index] = { ...items[index], [key]: value };
      return { ...prev, privacySection: items };
    });
  };

  // ── How It Works helpers ──
  const updateHowItWorksStep = (
    index: number,
    key: keyof HowItWorksStep,
    value: string
  ) => {
    setData((prev) => {
      const steps = [...prev.howItWorks];
      steps[index] = { ...steps[index], [key]: value };
      return { ...prev, howItWorks: steps };
    });
  };

  // ── Footer helpers ──
  const updateFooter = (key: keyof FooterContent, value: string) => {
    setData((prev) => ({ ...prev, footer: { ...prev.footer, [key]: value } }));
  };

  // ── Save & Publish ──
  const handleSavePublish = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/superadmin/landing-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save");
      }
      toast.success("Landing page published successfully!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to publish", { description: message });
    } finally {
      setSaving(false);
    }
  };

  // ── Discard Changes ──
  const handleDiscard = () => {
    setData(defaultData);
    toast.info("Changes discarded");
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-[#111827]"
            style={{ fontFamily: "'Clash Display', sans-serif" }}
          >
            Landing Page Editor
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Edit and preview your landing page content in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDiscard}
            className="border-[#D1D5DB] text-[#6B7280] rounded-xl hover:text-[#111827]"
          >
            <RotateCcw className="size-4 mr-1.5" />
            Discard Changes
          </Button>
          <Button
            onClick={handleSavePublish}
            disabled={saving}
            className="bg-[#166534] text-white rounded-xl hover:bg-[#14532D]"
          >
            <Save className="size-4 mr-1.5" />
            {saving ? "Publishing..." : "Save & Publish"}
          </Button>
        </div>
      </div>

      {/* Split View */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Editor Form (60%) */}
        <div className="w-full lg:w-[60%] space-y-6">
          {/* Section 1: Hero Content */}
          <EditorSection icon={Type} title="Hero Content">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Candidate Headline">
                  <Input
                    value={data.hero.candidateHeadline}
                    onChange={(e) =>
                      updateHero("candidateHeadline", e.target.value)
                    }
                    className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                  />
                </FormField>
                <FormField label="Candidate Gradient Text">
                  <Input
                    value={data.hero.candidateGradientText}
                    onChange={(e) =>
                      updateHero("candidateGradientText", e.target.value)
                    }
                    className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                  />
                </FormField>
              </div>
              <FormField label="Candidate Subheadline">
                <Textarea
                  value={data.hero.candidateSubheadline}
                  onChange={(e) =>
                    updateHero("candidateSubheadline", e.target.value)
                  }
                  rows={3}
                  className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488] resize-none"
                />
              </FormField>
              <FormField label="Candidate CTA Button Text">
                <Input
                  value={data.hero.candidateCtaText}
                  onChange={(e) =>
                    updateHero("candidateCtaText", e.target.value)
                  }
                  className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                />
              </FormField>

              <div className="border-t border-[#E5E7EB] pt-4 mt-4" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Recruiter Headline">
                  <Input
                    value={data.hero.recruiterHeadline}
                    onChange={(e) =>
                      updateHero("recruiterHeadline", e.target.value)
                    }
                    className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                  />
                </FormField>
                <FormField label="Recruiter Gradient Text">
                  <Input
                    value={data.hero.recruiterGradientText}
                    onChange={(e) =>
                      updateHero("recruiterGradientText", e.target.value)
                    }
                    className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                  />
                </FormField>
              </div>
              <FormField label="Recruiter Subheadline">
                <Textarea
                  value={data.hero.recruiterSubheadline}
                  onChange={(e) =>
                    updateHero("recruiterSubheadline", e.target.value)
                  }
                  rows={3}
                  className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488] resize-none"
                />
              </FormField>
              <FormField label="Recruiter CTA Button Text">
                <Input
                  value={data.hero.recruiterCtaText}
                  onChange={(e) =>
                    updateHero("recruiterCtaText", e.target.value)
                  }
                  className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                />
              </FormField>

              <div className="border-t border-[#E5E7EB] pt-4 mt-4" />

              <p className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
                Trust Line Items
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Line 1">
                  <Input
                    value={data.hero.trustLine1}
                    onChange={(e) => updateHero("trustLine1", e.target.value)}
                    className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                  />
                </FormField>
                <FormField label="Line 2">
                  <Input
                    value={data.hero.trustLine2}
                    onChange={(e) => updateHero("trustLine2", e.target.value)}
                    className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                  />
                </FormField>
                <FormField label="Line 3">
                  <Input
                    value={data.hero.trustLine3}
                    onChange={(e) => updateHero("trustLine3", e.target.value)}
                    className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                  />
                </FormField>
              </div>
            </div>
          </EditorSection>

          {/* Section 2: Colors */}
          <EditorSection icon={Paintbrush} title="Colors">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorPickerField
                label="Primary"
                value={data.colors.primary}
                onChange={(val) => updateColor("primary", val)}
              />
              <ColorPickerField
                label="Accent"
                value={data.colors.accent}
                onChange={(val) => updateColor("accent", val)}
              />
              <ColorPickerField
                label="Background"
                value={data.colors.background}
                onChange={(val) => updateColor("background", val)}
              />
              <ColorPickerField
                label="Text Primary"
                value={data.colors.textPrimary}
                onChange={(val) => updateColor("textPrimary", val)}
              />
              <ColorPickerField
                label="Text Secondary"
                value={data.colors.textSecondary}
                onChange={(val) => updateColor("textSecondary", val)}
              />
            </div>
          </EditorSection>

          {/* Section 3: Feature Cards */}
          <EditorSection icon={LayoutGrid} title="Feature Cards">
            <div className="space-y-6">
              {data.featureCards.map((card, i) => (
                <div key={i}>
                  <p
                    className="text-xs font-semibold text-[#111827] mb-3"
                    style={{ fontFamily: "'Clash Display', sans-serif" }}
                  >
                    Card {i + 1}
                  </p>
                  <div className="space-y-3">
                    <FormField label="Icon">
                      <Select
                        value={card.icon}
                        onValueChange={(val) =>
                          updateFeatureCard(i, "icon", val)
                        }
                      >
                        <SelectTrigger className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-[#E5E7EB] max-h-48 overflow-y-auto">
                          {iconOptions.map((icon) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Heading">
                      <Input
                        value={card.heading}
                        onChange={(e) =>
                          updateFeatureCard(i, "heading", e.target.value)
                        }
                        className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                      />
                    </FormField>
                    <FormField label="Body Text">
                      <Textarea
                        value={card.body}
                        onChange={(e) =>
                          updateFeatureCard(i, "body", e.target.value)
                        }
                        rows={3}
                        className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488] resize-none"
                      />
                    </FormField>
                  </div>
                  {i < data.featureCards.length - 1 && (
                    <div className="border-t border-[#E5E7EB] mt-6" />
                  )}
                </div>
              ))}
            </div>
          </EditorSection>

          {/* Section 4: Privacy Section */}
          <EditorSection icon={Shield} title="Privacy Section">
            <div className="space-y-6">
              {data.privacySection.map((item, i) => (
                <div key={i}>
                  <p
                    className="text-xs font-semibold text-[#111827] mb-3"
                    style={{ fontFamily: "'Clash Display', sans-serif" }}
                  >
                    Item {i + 1}
                  </p>
                  <div className="space-y-3">
                    <FormField label="Icon">
                      <Select
                        value={item.icon}
                        onValueChange={(val) =>
                          updatePrivacyItem(i, "icon", val)
                        }
                      >
                        <SelectTrigger className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-[#E5E7EB] max-h-48 overflow-y-auto">
                          {iconOptions.map((icon) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Heading">
                      <Input
                        value={item.heading}
                        onChange={(e) =>
                          updatePrivacyItem(i, "heading", e.target.value)
                        }
                        className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                      />
                    </FormField>
                    <FormField label="Body Text">
                      <Textarea
                        value={item.body}
                        onChange={(e) =>
                          updatePrivacyItem(i, "body", e.target.value)
                        }
                        rows={2}
                        className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488] resize-none"
                      />
                    </FormField>
                  </div>
                  {i < data.privacySection.length - 1 && (
                    <div className="border-t border-[#E5E7EB] mt-6" />
                  )}
                </div>
              ))}
            </div>
          </EditorSection>

          {/* Section 5: How It Works */}
          <EditorSection icon={ListOrdered} title="How It Works">
            <div className="space-y-6">
              {data.howItWorks.map((step, i) => (
                <div key={i}>
                  <p
                    className="text-xs font-semibold text-[#111827] mb-3"
                    style={{ fontFamily: "'Clash Display', sans-serif" }}
                  >
                    Step {i + 1}
                  </p>
                  <div className="space-y-3">
                    <FormField label="Title">
                      <Input
                        value={step.title}
                        onChange={(e) =>
                          updateHowItWorksStep(i, "title", e.target.value)
                        }
                        className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                      />
                    </FormField>
                    <FormField label="Description">
                      <Textarea
                        value={step.description}
                        onChange={(e) =>
                          updateHowItWorksStep(i, "description", e.target.value)
                        }
                        rows={3}
                        className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488] resize-none"
                      />
                    </FormField>
                  </div>
                  {i < data.howItWorks.length - 1 && (
                    <div className="border-t border-[#E5E7EB] mt-6" />
                  )}
                </div>
              ))}
            </div>
          </EditorSection>

          {/* Section 6: Footer */}
          <EditorSection icon={Footer} title="Footer">
            <div className="space-y-4">
              <FormField label="Copyright Text">
                <Input
                  value={data.footer.copyrightText}
                  onChange={(e) => updateFooter("copyrightText", e.target.value)}
                  className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                />
              </FormField>
              <FormField label="HIPAA Badge Text">
                <Input
                  value={data.footer.hipaaBadgeText}
                  onChange={(e) => updateFooter("hipaaBadgeText", e.target.value)}
                  className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
                />
              </FormField>
            </div>
          </EditorSection>
        </div>

        {/* Right: Live Preview (40%) */}
        <div className="w-full lg:w-[40%]">
          <div className="sticky top-24">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-sm font-semibold text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Live Preview
                </h3>
                <div className="flex items-center rounded-lg border border-[#E5E7EB] p-0.5">
                  <button
                    onClick={() => setPreviewMode("desktop")}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                      previewMode === "desktop"
                        ? "bg-[#DCFCE7] text-[#166534]"
                        : "text-[#6B7280] hover:text-[#111827]"
                    }`}
                  >
                    <Monitor className="size-3.5" />
                    Desktop
                  </button>
                  <button
                    onClick={() => setPreviewMode("mobile")}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                      previewMode === "mobile"
                        ? "bg-[#DCFCE7] text-[#166534]"
                        : "text-[#6B7280] hover:text-[#111827]"
                    }`}
                  >
                    <Smartphone className="size-3.5" />
                    Mobile
                  </button>
                </div>
              </div>

              {/* Preview Container */}
              <div
                className="rounded-xl border border-[#E5E7EB] overflow-hidden flex justify-center"
                style={{
                  backgroundColor: "#F3F4F6",
                  transition: "all 0.3s ease",
                }}
              >
                <LivePreview data={data} previewMode={previewMode} />
              </div>

              <p className="mt-3 text-[10px] text-[#9CA3AF] text-center">
                Preview updates in real-time as you edit
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

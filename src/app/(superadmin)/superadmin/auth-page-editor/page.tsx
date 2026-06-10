"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  ImagePlus,
  Trash2,
  Plus,
  GripVertical,
  Type,
  Palette,
  ImageIcon,
  LogIn,
  UserPlus,
  Building2,
  UserCheck,
} from "@/lib/icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type {
  AuthPageConfig,
  PageContent,
  BrandingConfig,
  StatItem,
  QuoteCard,
} from "@/lib/auth-page-config";
import { DEFAULT_AUTH_PAGE_CONFIG } from "@/lib/auth-page-config";

// ─── Section Wrapper ────────────────────────────────────────────────
function EditorSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
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
      {description && (
        <p className="text-sm text-[#6B7280] mb-5 ml-10">{description}</p>
      )}
      {!description && <div className="mb-4" />}
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

// ─── Trust Points Editor ────────────────────────────────────────────
function TrustPointsEditor({
  points,
  onChange,
}: {
  points: string[];
  onChange: (points: string[]) => void;
}) {
  const update = (i: number, val: string) => {
    const next = [...points];
    next[i] = val;
    onChange(next);
  };
  const remove = (i: number) => {
    onChange(points.filter((_, idx) => idx !== i));
  };
  const add = () => {
    onChange([...points, ""]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
        Trust Points
      </Label>
      {points.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <GripVertical className="size-4 text-[#D1D5DB] shrink-0" />
          <Input
            value={p}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Trust point ${i + 1}`}
            className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 p-1.5 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="border-dashed border-[#D1D5DB] text-[#6B7280] rounded-xl hover:text-[#166534] hover:border-[#166534]"
      >
        <Plus className="size-3.5 mr-1" />
        Add Trust Point
      </Button>
    </div>
  );
}

// ─── Quote Card Editor ──────────────────────────────────────────────
function QuoteCardEditor({
  card,
  onChange,
}: {
  card: QuoteCard;
  onChange: (card: QuoteCard) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
        Testimonial Quote Card
      </Label>
      <FormField label="Quote Text">
        <Textarea
          value={card.text}
          onChange={(e) => onChange({ ...card, text: e.target.value })}
          rows={3}
          className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488] resize-none"
        />
      </FormField>
      <FormField label="Attribution">
        <Input
          value={card.attribution}
          onChange={(e) => onChange({ ...card, attribution: e.target.value })}
          placeholder="Name, Role"
          className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
        />
      </FormField>
    </div>
  );
}

// ─── Stats Card Editor ──────────────────────────────────────────────
function StatsCardEditor({
  stats,
  onChange,
}: {
  stats: StatItem[];
  onChange: (stats: StatItem[]) => void;
}) {
  const update = (i: number, key: keyof StatItem, val: string) => {
    const next = [...stats];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  const remove = (i: number) => {
    onChange(stats.filter((_, idx) => idx !== i));
  };
  const add = () => {
    onChange([...stats, { value: "", label: "" }]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
        Stats Card
      </Label>
      {stats.map((s, i) => (
        <div key={i} className="flex items-start gap-2">
          <GripVertical className="size-4 text-[#D1D5DB] shrink-0 mt-2.5" />
          <div className="flex-1 grid grid-cols-2 gap-2">
            <Input
              value={s.value}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder="Value (e.g. 500+)"
              className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
            />
            <Input
              value={s.label}
              onChange={(e) => update(i, "label", e.target.value)}
              placeholder="Label (e.g. Professionals)"
              className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 p-1.5 mt-1.5 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="border-dashed border-[#D1D5DB] text-[#6B7280] rounded-xl hover:text-[#166534] hover:border-[#166534]"
      >
        <Plus className="size-3.5 mr-1" />
        Add Stat
      </Button>
    </div>
  );
}

// ─── Slideshow Images Editor ────────────────────────────────────────
function SlideshowImagesEditor({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const update = (i: number, val: string) => {
    const next = [...images];
    next[i] = val;
    onChange(next);
  };
  const remove = (i: number) => {
    onChange(images.filter((_, idx) => idx !== i));
  };
  const add = () => {
    onChange([...images, ""]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium tracking-wide uppercase text-[#6B7280]">
        Slideshow Images
      </Label>
      <p className="text-xs text-[#9CA3AF]">
        Add image URLs (Unsplash, Supabase, or any CDN). Images auto-rotate every 5 seconds with crossfade.
      </p>
      {images.map((url, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-[#9CA3AF] font-mono w-5 text-center shrink-0">
            {i + 1}
          </span>
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={`Slide ${i + 1}`}
              className="size-10 rounded-lg object-cover shrink-0 border border-[#E5E7EB]"
            />
          )}
          {!url && (
            <div className="size-10 rounded-lg shrink-0 border border-dashed border-[#D1D5DB] flex items-center justify-center">
              <ImageIcon className="size-4 text-[#D1D5DB]" />
            </div>
          )}
          <Input
            value={url}
            onChange={(e) => update(i, e.target.value)}
            placeholder="https://images.unsplash.com/photo-..."
            className="flex-1 border-[#E5E7EB] rounded-xl focus:border-[#0D9488] text-sm"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 p-1.5 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="border-dashed border-[#D1D5DB] text-[#6B7280] rounded-xl hover:text-[#166534] hover:border-[#166534]"
      >
        <ImagePlus className="size-3.5 mr-1" />
        Add Image
      </Button>
    </div>
  );
}

// ─── Page Content Editor ────────────────────────────────────────────
function PageContentEditor({
  icon: Icon,
  title,
  page,
  onChange,
}: {
  icon: React.ElementType;
  title: string;
  page: PageContent;
  onChange: (page: PageContent) => void;
}) {
  return (
    <EditorSection icon={Icon} title={title}>
      <div className="space-y-5">
        <FormField label="Tagline">
          <Input
            value={page.tagline}
            onChange={(e) => onChange({ ...page, tagline: e.target.value })}
            className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
          />
        </FormField>
        <TrustPointsEditor
          points={page.trustPoints}
          onChange={(trustPoints) => onChange({ ...page, trustPoints })}
        />
        {page.quoteCard && (
          <QuoteCardEditor
            card={page.quoteCard}
            onChange={(quoteCard) => onChange({ ...page, quoteCard })}
          />
        )}
        {page.statsCard && (
          <StatsCardEditor
            stats={page.statsCard}
            onChange={(statsCard) => onChange({ ...page, statsCard })}
          />
        )}
      </div>
    </EditorSection>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AuthPageEditorPage() {
  const [config, setConfig] = useState<AuthPageConfig>(DEFAULT_AUTH_PAGE_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/auth-pages")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load auth page config");
        setLoading(false);
      });
  }, []);

  // ── Branding helpers ──
  const updateBranding = (key: keyof BrandingConfig, value: string) => {
    setConfig((prev) => ({
      ...prev,
      branding: { ...prev.branding, [key]: value },
    }));
  };

  // ── Page helpers ──
  const updatePage = (
    pageKey: keyof AuthPageConfig["pages"],
    page: PageContent
  ) => {
    setConfig((prev) => ({
      ...prev,
      pages: { ...prev.pages, [pageKey]: page },
    }));
  };

  // ── Save ──
  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/superadmin/auth-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save");
      }
      toast.success("Auth page content saved successfully!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to save", { description: message });
    } finally {
      setSaving(false);
    }
  };

  // ── Discard ──
  const handleDiscard = () => {
    setConfig(DEFAULT_AUTH_PAGE_CONFIG);
    toast.info("Changes discarded — defaults restored");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-[#F3F4F6] rounded-xl animate-pulse" />
        <div className="h-96 bg-[#F3F4F6] rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-[#111827]"
            style={{ fontFamily: "'Clash Display', sans-serif" }}
          >
            Auth Page Editor
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Edit branding, slideshow images, and content for all authentication pages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDiscard}
            className="border-[#D1D5DB] text-[#6B7280] rounded-xl hover:text-[#111827]"
          >
            <RotateCcw className="size-4 mr-1.5" />
            Restore Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#166534] text-white rounded-xl hover:bg-[#14532D]"
          >
            <Save className="size-4 mr-1.5" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Section 1: Branding */}
      <EditorSection
        icon={Palette}
        title="Branding"
        description="Platform name and logo — shown on auth pages, sidebar, and throughout the app."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Platform Name">
              <Input
                value={config.branding.platformName}
                onChange={(e) => updateBranding("platformName", e.target.value)}
                placeholder="MyZipVault"
                className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
              />
            </FormField>
            <FormField label="Logo Text (shown when no logo image)">
              <Input
                value={config.branding.logoText}
                onChange={(e) => updateBranding("logoText", e.target.value)}
                placeholder="ZV"
                className="border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
              />
            </FormField>
          </div>
          <FormField label="Logo Image URL (overrides text logo)">
            <div className="flex items-center gap-3">
              {config.branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.branding.logoUrl}
                  alt="Logo preview"
                  className="size-12 rounded-xl object-contain border border-[#E5E7EB] p-1"
                />
              ) : (
                <div className="size-12 rounded-xl bg-[#166534] flex items-center justify-center text-white text-lg font-bold shrink-0">
                  {config.branding.logoText || "ZV"}
                </div>
              )}
              <Input
                value={config.branding.logoUrl}
                onChange={(e) => updateBranding("logoUrl", e.target.value)}
                placeholder="https://your-cdn.com/logo.svg (leave empty to use text)"
                className="flex-1 border-[#E5E7EB] rounded-xl focus:border-[#0D9488]"
              />
              {config.branding.logoUrl && (
                <button
                  type="button"
                  onClick={() => updateBranding("logoUrl", "")}
                  className="shrink-0 p-1.5 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </FormField>
        </div>
      </EditorSection>

      {/* Section 2: Slideshow Images */}
      <EditorSection
        icon={ImageIcon}
        title="Slideshow Images"
        description="Background photos on auth page left panels. Auto-rotate every 5 seconds with a gradient overlay."
      >
        <SlideshowImagesEditor
          images={config.slideshowImages}
          onChange={(slideshowImages) =>
            setConfig((prev) => ({ ...prev, slideshowImages }))
          }
        />
      </EditorSection>

      {/* Section 3-6: Per-page content */}
      <PageContentEditor
        icon={LogIn}
        title="Login Page"
        page={config.pages.login}
        onChange={(page) => updatePage("login", page)}
      />
      <PageContentEditor
        icon={UserPlus}
        title="Signup Page"
        page={config.pages.signup}
        onChange={(page) => updatePage("signup", page)}
      />
      <PageContentEditor
        icon={Building2}
        title="Agency Signup Page"
        page={config.pages.agencySignup}
        onChange={(page) => updatePage("agencySignup", page)}
      />
      <PageContentEditor
        icon={UserCheck}
        title="Onboard Page"
        page={config.pages.onboard}
        onChange={(page) => updatePage("onboard", page)}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lock,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  ClipboardCheck,
  ArrowLeft,
  Info,
  Save,
  Pencil,
  Upload,
  Type,
  PenLine,
  Trash2,
  FileDown,
  Eye,
  Download,
  Sparkles,
  Check,
  ChevronLeft,
} from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/motion";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface SkillItem {
  id: number;
  skillName: string;
  category: string;
  questionType: string;
  sortOrder: number;
  hasNaOption: boolean;
}

interface RatingItem {
  id: number;
  ratingValue: string | null;
  isNa: boolean;
}

interface ChecklistData {
  checklistRequest: {
    id: number;
    status: string;
    completionPct: number;
    createdAt: string;
  };
  template: {
    id: number;
    name: string;
    profession: string;
    specialty: string;
  };
  client: {
    firstName: string | null;
    lastName: string | null;
    organizationName: string | null;
  };
  candidateResponse: {
    id: number;
    status: string;
    submittedAt: string | null;
    digitalSignature: string | null;
    candidateNameSigned: string | null;
    validUntil: string | null;
  } | null;
  skills: SkillItem[];
  ratings: Record<number, RatingItem>;
  ratedSkills: number;
  totalSkills: number;
  completionPct: number;
}

interface SignaturePadInstance {
  clear(): void;
  isEmpty(): boolean;
  toDataURL(type?: string): string;
  toData(): unknown[];
  fromData(data: unknown[]): void;
  off(): void;
  addEventListener(type: string, listener: () => void): void;
}

type SignatureType = "draw" | "type" | "upload";

interface SignatureData {
  type: SignatureType;
  font?: string;
  text?: string;
  image_base64?: string;
}

/* ─── Rating Config (1-4 scale) ─────────────────────────────────────── */
const RATING_LABELS: Record<string, string> = {
  "1": "No Experience",
  "2": "Limited",
  "3": "Experienced",
  "4": "Proficient",
};

const RATING_SHORT_LABELS: Record<string, string> = {
  "1": "None",
  "2": "Low",
  "3": "Good",
  "4": "Pro",
};

/* ─── Signature Fonts ───────────────────────────────────────────────── */
const SIGNATURE_FONTS = [
  { name: "Dancing Script", value: "'Dancing Script', cursive" },
  { name: "Great Vibes", value: "'Great Vibes', cursive" },
  { name: "Pacifico", value: "'Pacifico', cursive" },
  { name: "Sacramento", value: "'Sacramento', cursive" },
];

/* ─── Helper ────────────────────────────────────────────────────────── */
function isRatingDone(rating: RatingItem | undefined): boolean {
  if (!rating) return false;
  if (rating.isNa) return true;
  return rating.ratingValue !== null && rating.ratingValue !== "";
}

/* ─── Component ─────────────────────────────────────────────────────── */
export default function ChecklistAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [id, setId] = useState<string>("");
  const [data, setData] = useState<ChecklistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<number, RatingItem>>({});
  const [candidateNameSigned, setCandidateNameSigned] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [activeCategory, setActiveCategory] = useState<string>("");

  // Signature state — multi-method
  const [signatureMethod, setSignatureMethod] = useState<SignatureType>("draw");
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [drawnSignatureBase64, setDrawnSignatureBase64] = useState("");
  const [typedSignatureText, setTypedSignatureText] = useState("");
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].value);
  const [uploadedSignatureBase64, setUploadedSignatureBase64] = useState("");

  // Refs for scroll tracking
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Signature pad
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadRef = useRef<SignaturePadInstance | null>(null);
  const sigPadInitialized = useRef(false);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  // Fetch checklist data
  const fetchChecklist = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/candidate/checklists/${id}`);
      if (!res.ok) throw new Error("Failed to fetch checklist");
      const checklistData = await res.json();
      setData(checklistData);
      setRatings(checklistData.ratings || {});

      if (checklistData.candidateResponse?.candidateNameSigned) {
        setCandidateNameSigned(checklistData.candidateResponse.candidateNameSigned);
      }
    } catch {
      toast.error("Failed to load checklist. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // Security: redirect if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      toast.error("Please sign in to access this checklist.");
      router.push("/dashboard");
    }
  }, [sessionStatus, router]);

  /* ─── Derived ────────────────────────────────────────────────────── */
  const allSkillsRated =
    (data?.skills.length ?? 0) > 0 &&
    data!.skills.every((s) => isRatingDone(ratings[s.id]));

  const groupedSkills =
    data?.skills.reduce<Record<string, SkillItem[]>>((acc, skill) => {
      const cat = skill.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(skill);
      return acc;
    }, {}) ?? {};

  const categoryList = Object.keys(groupedSkills);
  const totalSkills = data?.totalSkills ?? 0;
  const ratedSkills = data?.ratedSkills ?? 0;
  const completionPct = data?.completionPct ?? 0;

  // Has a valid signature been provided?
  const hasValidSignature =
    !!signatureData &&
    ((signatureData.type === "draw" && !!signatureData.image_base64) ||
      (signatureData.type === "type" && !!signatureData.text?.trim()) ||
      (signatureData.type === "upload" && !!signatureData.image_base64));

  // Set initial active category
  useEffect(() => {
    if (categoryList.length > 0 && !activeCategory) {
      setActiveCategory(categoryList[0]);
    }
  }, [categoryList, activeCategory]);

  // Scroll spy: detect which category is in view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || categoryList.length === 0) return;

    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      let currentCat = categoryList[0];

      for (const cat of categoryList) {
        const el = categoryRefs.current[cat];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top - containerTop <= 120) {
            currentCat = cat;
          }
        }
      }
      setActiveCategory(currentCat);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [categoryList]);

  // Initialize signature pad
  useEffect(() => {
    if (!allSkillsRated) return;
    if (sigPadInitialized.current) return;

    let destroyed = false;

    import("signature_pad").then(({ default: SignaturePad }) => {
      if (destroyed) return;
      requestAnimationFrame(() => {
        if (destroyed) return;
        const canvas = sigCanvasRef.current;
        if (!canvas) return;
        if (data?.candidateResponse?.status === "submitted") return;

        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.scale(ratio, ratio);

        sigPadRef.current = new SignaturePad(canvas, {
          backgroundColor: "rgb(255,255,255)",
          penColor: "rgb(5,150,105)",
        });
        // signature_pad v5+ uses addEventListener instead of the onEnd option
        sigPadRef.current.addEventListener("endStroke", () => {
          const pad = sigPadRef.current;
          if (pad && !pad.isEmpty()) {
            const base64 = pad.toDataURL("image/png");
            setDrawnSignatureBase64(base64);
            setSignatureData({ type: "draw", image_base64: base64 });
          }
        });
        sigPadInitialized.current = true;

        const handleResize = () => {
          if (!sigPadRef.current) return;
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          const dataUrl = sigPadRef.current.toData();
          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.scale(ratio, ratio);
          if (dataUrl) sigPadRef.current.fromData(dataUrl);
        };

        window.addEventListener("resize", handleResize);
        (sigPadRef as unknown as Record<string, unknown>)._cleanup = () => {
          window.removeEventListener("resize", handleResize);
          sigPadRef.current?.off();
        };
      });
    }).catch((err) => {
      console.error("Failed to load SignaturePad:", err);
    });

    return () => {
      destroyed = true;
      const cleanup = (sigPadRef as unknown as Record<string, unknown>)._cleanup as (() => void) | undefined;
      if (cleanup) {
        cleanup();
        delete (sigPadRef as unknown as Record<string, unknown>)._cleanup;
      }
      sigPadInitialized.current = false;
    };
  }, [allSkillsRated]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Signature: Upload handler ───────────────────────────────────── */
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedSignatureBase64(base64);
      setSignatureData({ type: "upload", image_base64: base64 });
    };
    reader.readAsDataURL(file);
  };

  /* ─── Signature: Typed handler ────────────────────────────────────── */
  const handleTypedSignatureChange = (text: string) => {
    setTypedSignatureText(text);
    if (text.trim()) {
      setSignatureData({ type: "type", font: selectedFont, text: text.trim() });
    } else {
      if (signatureData?.type === "type") {
        setSignatureData(null);
      }
    }
  };

  const handleFontChange = (font: string) => {
    setSelectedFont(font);
    if (typedSignatureText.trim()) {
      setSignatureData({ type: "type", font, text: typedSignatureText.trim() });
    }
  };

  /* ─── Signature: Clear ────────────────────────────────────────────── */
  const clearSignature = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
    }
    setDrawnSignatureBase64("");
    setTypedSignatureText("");
    setUploadedSignatureBase64("");
    setSignatureData(null);
  };

  /* ─── Save rating ────────────────────────────────────────────────── */
  const saveRating = async (
    skillId: number,
    ratingValue: string | null,
    isNa: boolean
  ) => {
    if (!id) return;
    setAutoSaveStatus("saving");
    try {
      const res = await fetch(`/api/candidate/checklists/${id}/rate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, ratingValue, isNa }),
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData.rating) {
          setRatings((prev) => ({
            ...prev,
            [skillId]: {
              id: resData.rating.id,
              ratingValue: resData.rating.ratingValue,
              isNa: resData.rating.isNa,
            },
          }));
        }
        if (data) {
          setData({
            ...data,
            completionPct: resData.completionPct ?? data.completionPct,
            ratedSkills: resData.ratedSkills ?? data.ratedSkills,
          });
        }
      }
    } catch {
      // Silent auto-save failure
    } finally {
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    }
  };

  // Debounced save for text inputs
  const debouncedSave = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (skillId: number, value: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => saveRating(skillId, value, false), 300);
      };
    })(),
    [id, ratings] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ─── Scroll to category ────────────────────────────────────────── */
  const scrollToCategory = (category: string) => {
    const el = categoryRefs.current[category];
    if (el && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const containerTop = container.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      container.scrollTo({
        top: container.scrollTop + (elTop - containerTop) - 16,
        behavior: "smooth",
      });
    }
    setActiveCategory(category);
  };

  /* ─── Navigate between categories ────────────────────────────────── */
  const goToNextCategory = () => {
    const currentIdx = categoryList.indexOf(activeCategory);
    if (currentIdx < categoryList.length - 1) {
      scrollToCategory(categoryList[currentIdx + 1]);
    } else if (allSkillsRated) {
      setTimeout(() => {
        const sigEl = document.getElementById("signature-section");
        if (sigEl && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const containerTop = container.getBoundingClientRect().top;
          const elTop = sigEl.getBoundingClientRect().top;
          container.scrollTo({
            top: container.scrollTop + (elTop - containerTop) - 16,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  };

  const goToPrevCategory = () => {
    const currentIdx = categoryList.indexOf(activeCategory);
    if (currentIdx > 0) {
      scrollToCategory(categoryList[currentIdx - 1]);
    }
  };

  /* ─── Submit handler ─────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!id || !data) return;

    const unrated = data.skills.filter((s) => !isRatingDone(ratings[s.id]));

    if (unrated.length > 0) {
      toast.error("Please rate all skills before submitting", {
        description: `${unrated.length} skill${unrated.length > 1 ? "s" : ""} still need ratings`,
      });
      return;
    }

    if (!candidateNameSigned.trim()) {
      toast.error("Please type your full legal name.");
      return;
    }

    if (!hasValidSignature) {
      toast.error("Please provide your signature (draw, type, or upload).");
      return;
    }

    // Build signature base64 for API
    let signatureBase64 = "";

    if (signatureData?.type === "draw" && signatureData.image_base64) {
      signatureBase64 = signatureData.image_base64;
    } else if (signatureData?.type === "upload" && signatureData.image_base64) {
      signatureBase64 = signatureData.image_base64;
    } else if (signatureData?.type === "type" && signatureData.text) {
      const canvas = document.createElement("canvas");
      canvas.width = 460;
      canvas.height = 160;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgb(5,150,105)";
        ctx.font = `36px ${signatureData.font || "'Dancing Script', cursive"}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(signatureData.text, canvas.width / 2, canvas.height / 2);
        signatureBase64 = canvas.toDataURL("image/png");
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/candidate/checklists/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateNameSigned: candidateNameSigned.trim(),
          signatureBase64,
        }),
      });

      if (!res.ok) {
        const resData = await res.json();
        toast.error("Submit failed", { description: resData.error });
        return;
      }

      router.push(`/checklists/${id}/thank-you`);
    } catch {
      toast.error("Failed to submit checklist");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── Loading ─────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto">
            <Loader2 className="size-10 text-primary animate-spin" />
            <div className="absolute inset-0 size-10 mx-auto rounded-full animate-pulse-glow" />
          </div>
          <p className="text-sm text-text-secondary font-medium">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Already submitted — show preview & download
  if (
    data.candidateResponse?.status === "submitted" ||
    data.checklistRequest.status === "completed"
  ) {
    const pdfPreviewUrl = `/api/candidate/checklists/${id}/pdf?mode=preview`;
    const pdfDownloadUrl = `/api/candidate/checklists/${id}/pdf?mode=download`;
    const submittedDate = data.candidateResponse?.submittedAt
      ? new Date(data.candidateResponse.submittedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : null;

    return (
      <FadeIn className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Success header */}
        <div className="premium-card p-6">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-badge-green-bg flex items-center justify-center shrink-0 animate-glow-pulse">
                <CheckCircle2 className="size-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground font-heading tracking-tight">Checklist Submitted</h3>
                <p className="text-sm text-text-secondary">
                  {data.template.name} — {data.template.profession}
                  {data.template.specialty ? ` — ${data.template.specialty}` : ""}
                </p>
                {submittedDate && (
                  <p className="text-xs text-text-muted mt-0.5">
                    Submitted on {submittedDate}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                className="btn-outline-premium gap-2 rounded-xl h-10"
                onClick={() => window.open(pdfPreviewUrl, '_blank')}
              >
                <Eye className="size-4" /> Preview PDF
              </Button>
              <Button
                className="btn-gradient gap-2 rounded-xl h-10 font-semibold"
                onClick={() => window.open(pdfDownloadUrl, '_blank')}
              >
                <Download className="size-4" /> Download PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Inline PDF preview */}
        <div className="glass-card-static overflow-hidden">
          <div className="relative z-10">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-surface-2/50">
              <div className="flex items-center gap-2">
                <FileDown className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Checklist PDF</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-badge-green-bg text-badge-green border-badge-green/20 text-xs font-semibold px-2.5 rounded-lg">
                  Completed
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-primary hover:bg-primary-light rounded-lg h-7 px-2"
                  onClick={() => window.open(pdfPreviewUrl, '_blank')}
                >
                  <Eye className="size-3.5" /> Open in new tab
                </Button>
              </div>
            </div>
            <object
              data={pdfPreviewUrl}
              type="application/pdf"
              className="w-full border-0"
              style={{ height: '70vh' }}
            >
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <FileDown className="size-12 text-text-muted mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">PDF preview not available</p>
                <p className="text-xs text-text-secondary mb-4">Your browser may not support embedded PDFs.</p>
                <Button
                  className="btn-gradient gap-2 rounded-xl h-10 font-semibold"
                  onClick={() => window.open(pdfDownloadUrl, '_blank')}
                >
                  <Download className="size-4" /> Download PDF
                </Button>
              </div>
            </object>
          </div>
        </div>

        {/* Back button */}
        <div className="flex justify-center">
          <Link href="/checklists">
            <Button variant="ghost" className="gap-2 text-text-secondary hover:text-foreground">
              <ArrowLeft className="size-4" /> Back to Checklists
            </Button>
          </Link>
        </div>
      </FadeIn>
    );
  }

  if (data.skills.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="glass-card-static p-8 max-w-md w-full mx-4 text-center">
          <Lock className="size-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground font-heading">No skills found</h3>
          <p className="text-sm text-text-secondary mt-1">
            This checklist template has no skills configured yet.
          </p>
          <Link href="/checklists">
            <Button variant="outline" className="btn-outline-premium mt-4 gap-2 rounded-xl">
              <ArrowLeft className="size-4" /> Back to Checklists
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Sticky Top Bar ──────────────────────────────────────────── */}
      <div className="shrink-0 glass-header z-50">
        {/* Progress bar (very top) */}
        <div className="h-1 bg-surface-2">
          <div
            className="h-full transition-all duration-500 ease-out rounded-r-full"
            style={{
              width: `${completionPct}%`,
              background: completionPct === 100
                ? 'var(--gradient-primary-gloss)'
                : 'var(--gradient-primary)',
            }}
          />
        </div>

        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/checklists">
              <Button variant="ghost" size="sm" className="gap-1.5 shrink-0 px-2 text-text-secondary hover:text-foreground rounded-xl">
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate text-foreground font-heading tracking-tight">{data.template.name}</h1>
              <p className="text-xs text-text-secondary truncate">
                {data.template.profession}
                {data.template.specialty ? ` — ${data.template.specialty}` : ""}
                {data.client.organizationName ? ` · ${data.client.organizationName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {autoSaveStatus === "saving" && (
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> Saving...
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="text-xs text-primary font-medium flex items-center gap-1">
                <Save className="size-3" /> Saved
              </span>
            )}
            <Badge
              className={cn(
                "text-xs tabular-nums font-semibold rounded-lg px-2.5",
                completionPct === 100
                  ? "bg-badge-green-bg text-badge-green border-badge-green/20"
                  : "bg-surface-2 text-text-secondary border-border"
              )}
            >
              {completionPct}%
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Main Body: Sidebar Scroller + Content ──────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Left Sidebar: Category Navigation ────────────────────── */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border glass-sidebar">
          {/* Checklist info card */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="size-9 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                <ClipboardCheck className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate font-heading tracking-tight">{data.template.name}</p>
                <p className="text-[10px] text-text-muted">
                  {ratedSkills} of {totalSkills} skills
                </p>
              </div>
            </div>
            <Progress
              value={completionPct}
              className="h-2 rounded-full bg-surface-3 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent-teal [&>div]:rounded-full"
            />
          </div>

          {/* Rating legend */}
          <div className="p-4 border-b border-border">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2.5">
              Rating Scale
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {(["1", "2", "3", "4"] as const).map((val) => (
                <div key={val} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rating-btn selected w-7 h-7 text-[10px]",
                      `[data-rating="${val}"]`
                    )}
                    data-rating={val}
                  >
                    {val}
                  </span>
                  <span className="text-[10px] text-text-secondary leading-tight">
                    {RATING_SHORT_LABELS[val]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Category list */}
          <nav className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-2 mb-1.5">
              Categories
            </p>
            <div className="space-y-0.5">
              {categoryList.map((cat) => {
                const catSkills = groupedSkills[cat];
                const ratedInCat = catSkills.filter((s) => isRatingDone(ratings[s.id])).length;
                const catComplete = ratedInCat === catSkills.length;
                const isActive = activeCategory === cat;

                return (
                  <button
                    key={cat}
                    onClick={() => scrollToCategory(cat)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-sm",
                      isActive
                        ? "bg-primary-light text-primary font-semibold"
                        : "text-text-secondary hover:bg-surface-2 hover:text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold border-2 transition-all",
                        catComplete
                          ? "bg-primary border-primary text-primary-foreground"
                          : isActive
                          ? "border-primary text-primary"
                          : "border-border text-text-muted"
                      )}
                    >
                      {catComplete ? <Check className="size-3" /> : ratedInCat}
                    </div>
                    <span className="flex-1 truncate text-xs">{cat}</span>
                    <span className="text-[10px] text-text-muted tabular-nums">
                      {ratedInCat}/{catSkills.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Signature section nav item */}
            {allSkillsRated && (
              <button
                onClick={() => {
                  setTimeout(() => {
                    const sigEl = document.getElementById("signature-section");
                    if (sigEl && scrollContainerRef.current) {
                      const container = scrollContainerRef.current;
                      const containerTop = container.getBoundingClientRect().top;
                      const elTop = sigEl.getBoundingClientRect().top;
                      container.scrollTo({
                        top: container.scrollTop + (elTop - containerTop) - 16,
                        behavior: "smooth",
                      });
                    }
                  }, 100);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-sm mt-2",
                  hasValidSignature
                    ? "bg-primary-light text-primary font-semibold"
                    : "bg-primary/5 text-primary hover:bg-primary-light"
                )}
              >
                <div className={cn(
                  "size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold border-2 transition-all",
                  hasValidSignature
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-primary text-primary"
                )}>
                  {hasValidSignature ? <Check className="size-3" /> : <Pencil className="size-2.5" />}
                </div>
                <span className="flex-1 truncate text-xs font-medium">Sign & Submit</span>
              </button>
            )}
          </nav>

          {/* Bottom info */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <Info className="size-3" />
              Your progress is auto-saved
            </div>
          </div>
        </aside>

        {/* ── Right: Scrollable Content Area ─────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile category chips */}
          <div className="lg:hidden shrink-0 border-b border-border glass-header">
            <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
              {categoryList.map((cat) => {
                const catSkills = groupedSkills[cat];
                const ratedInCat = catSkills.filter((s) => isRatingDone(ratings[s.id])).length;
                const catComplete = ratedInCat === catSkills.length;
                const isActive = activeCategory === cat;

                return (
                  <button
                    key={cat}
                    onClick={() => scrollToCategory(cat)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all shrink-0",
                      isActive
                        ? "btn-gradient text-primary-foreground border-transparent"
                        : catComplete
                        ? "bg-badge-green-bg text-badge-green border-badge-green/20"
                        : "bg-surface text-text-secondary border-border hover:border-primary"
                    )}
                  >
                    {catComplete && <CheckCircle2 className="size-3" />}
                    {cat}
                    <span className="opacity-70">({ratedInCat}/{catSkills.length})</span>
                  </button>
                );
              })}
              {allSkillsRated && (
                <button
                  onClick={() => {
                    setTimeout(() => {
                      const sigEl = document.getElementById("signature-section");
                      if (sigEl && scrollContainerRef.current) {
                        const container = scrollContainerRef.current;
                        const containerTop = container.getBoundingClientRect().top;
                        const elTop = sigEl.getBoundingClientRect().top;
                        container.scrollTo({
                          top: container.scrollTop + (elTop - containerTop) - 16,
                          behavior: "smooth",
                        });
                      }
                    }, 100);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap bg-primary/10 text-primary border-primary/30 shrink-0"
                >
                  <Pencil className="size-3" />
                  Sign & Submit
                </button>
              )}
            </div>
          </div>

          {/* Scrollable content */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto custom-scrollbar"
          >
            <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 pb-32">
              {/* Info banner */}
              <FadeIn>
                <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
                  <div className="size-8 rounded-lg bg-primary-light flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">
                      <span className="font-bold">{data.client.organizationName || "A recruiter"}</span> has requested your skills self-assessment.
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Complete this once and it saves to your vault. Rate each skill honestly based on your experience level.
                    </p>
                  </div>
                </div>
              </FadeIn>

              {/* Skills by Category */}
              {categoryList.map((category, catIndex) => {
                const categorySkills = groupedSkills[category];
                const ratedInCat = categorySkills.filter((s) => isRatingDone(ratings[s.id])).length;
                const catComplete = ratedInCat === categorySkills.length;

                return (
                  <div
                    key={category}
                    ref={(el) => { categoryRefs.current[category] = el; }}
                    className="scroll-mt-4"
                  >
                    {/* Category header */}
                    <div className={cn(
                      "rounded-xl py-3 px-4 flex items-center justify-between mb-3 border transition-all",
                      catComplete
                        ? "bg-badge-green-bg border-primary/20"
                        : "border-l-4 border-l-primary bg-surface border-border"
                    )}>
                      <div className="flex items-center gap-2.5">
                        {catComplete && <CheckCircle2 className="size-4 text-primary animate-success-check" />}
                        <span className={cn(
                          "font-bold text-sm font-heading tracking-tight",
                          catComplete ? "text-primary" : "text-foreground"
                        )}>
                          {category}
                        </span>
                      </div>
                      <span className={cn(
                        "text-xs tabular-nums font-medium",
                        catComplete ? "text-primary" : "text-text-muted"
                      )}>
                        {ratedInCat}/{categorySkills.length} rated
                      </span>
                    </div>

                    {/* Skills in this category */}
                    <StaggerChildren staggerDelay={0.03} className="space-y-2.5">
                      {categorySkills.map((skill, skillIdx) => {
                        const rating = ratings[skill.id];
                        const currentValue = rating?.ratingValue ?? null;
                        const isNa = rating?.isNa ?? false;
                        const isRated = isRatingDone(rating);

                        return (
                          <StaggerItem key={skill.id}>
                            <div
                              className={cn(
                                "rounded-xl p-4 transition-all border",
                                isRated
                                  ? "border-primary/20 bg-primary/[0.02] shadow-sm"
                                  : "border-border bg-surface hover:border-border-strong"
                              )}
                            >
                              <div className="flex flex-col gap-3">
                                {/* Skill name + N/A toggle */}
                                <div className="flex items-start gap-3">
                                  <span className="text-xs text-text-muted mt-0.5 shrink-0 tabular-nums font-medium">
                                    {skillIdx + 1}.
                                  </span>
                                  <p className={cn(
                                    "text-sm font-medium flex-1",
                                    isNa && "text-text-muted line-through"
                                  )}>
                                    {skill.skillName}
                                  </p>
                                  {skill.hasNaOption && (
                                    <button
                                      type="button"
                                      onClick={() => saveRating(skill.id, null, !isNa)}
                                      className={cn(
                                        "text-xs px-3 py-1 rounded-full border transition-all shrink-0 font-medium",
                                        isNa
                                          ? "bg-accent-teal/10 border-accent-teal text-accent-teal"
                                          : "border-border text-text-muted hover:border-accent-teal hover:text-accent-teal"
                                      )}
                                    >
                                      N/A
                                    </button>
                                  )}
                                </div>

                                {/* Rating 1-4 */}
                                {(skill.questionType === "rating_1_4" || skill.questionType === "rating_1_5") && !isNa && (
                                  <div className="flex flex-wrap gap-2 pl-5">
                                    {(["1", "2", "3", "4"] as const).map((val) => {
                                      const isSelected = currentValue === val;
                                      return (
                                        <button
                                          key={val}
                                          type="button"
                                          onClick={() => saveRating(skill.id, val, false)}
                                          data-rating={val}
                                          className={cn(
                                            "rating-btn",
                                            isSelected && "selected animate-rating-pop"
                                          )}
                                        >
                                          {val}
                                        </button>
                                      );
                                    })}
                                    <div className="flex items-center ml-1">
                                      <span className="text-[11px] text-text-muted">
                                        {currentValue ? RATING_LABELS[currentValue] : "Select rating"}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Yes/No */}
                                {skill.questionType === "yes_no" && !isNa && (
                                  <div className="flex gap-2.5 pl-5">
                                    <button
                                      type="button"
                                      onClick={() => saveRating(skill.id, "yes", false)}
                                      className={cn(
                                        "px-5 py-2 rounded-xl border-2 text-sm font-semibold transition-all",
                                        currentValue === "yes"
                                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                          : "border-border hover:border-primary text-text-secondary"
                                      )}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => saveRating(skill.id, "no", false)}
                                      className={cn(
                                        "px-5 py-2 rounded-xl border-2 text-sm font-semibold transition-all",
                                        currentValue === "no"
                                          ? "bg-badge-red text-white border-badge-red shadow-sm"
                                          : "border-border hover:border-badge-red text-text-secondary"
                                      )}
                                    >
                                      No
                                    </button>
                                  </div>
                                )}

                                {/* Text */}
                                {skill.questionType === "text" && !isNa && (
                                  <div className="pl-5">
                                    <Textarea
                                      placeholder="Enter your response..."
                                      defaultValue={currentValue || ""}
                                      className="max-w-lg rounded-xl border-border focus:border-primary resize-none"
                                      onChange={(e) => debouncedSave(skill.id, e.target.value)}
                                      onBlur={(e) => saveRating(skill.id, e.target.value, false)}
                                    />
                                  </div>
                                )}

                                {/* Rated indicator */}
                                {isRated && !isNa && (
                                  <div className="flex items-center gap-1.5 pl-5 mt-0.5">
                                    <CheckCircle2 className="size-3.5 text-primary" />
                                    <span className="text-xs text-primary font-medium">
                                      {(skill.questionType === "rating_1_4" || skill.questionType === "rating_1_5")
                                        ? RATING_LABELS[currentValue as string] || `Rated ${currentValue}`
                                        : skill.questionType === "yes_no"
                                        ? currentValue === "yes" ? "Yes" : "No"
                                        : "Response saved"}
                                    </span>
                                  </div>
                                )}

                                {/* N/A indicator */}
                                {isNa && (
                                  <div className="flex items-center gap-1.5 pl-5 mt-0.5">
                                    <span className="text-xs text-accent-teal font-medium">
                                      Marked as N/A
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </StaggerItem>
                        );
                      })}
                    </StaggerChildren>
                  </div>
                );
              })}

              {/* ── Signature Section ────────────────────────────────── */}
              {allSkillsRated && (
                <FadeIn id="signature-section" className="scroll-mt-4">
                  <div className="premium-card overflow-hidden">
                    <div className="relative z-10 p-6 sm:p-8 space-y-6">
                      {/* Header with gradient accent */}
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'var(--gradient-primary-gloss)' }}
                        >
                          <ShieldCheck className="size-5 text-white" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold tracking-widest text-primary uppercase">
                            Final Step
                          </p>
                          <h3 className="text-lg font-bold text-foreground font-heading tracking-tight">Attestation & Signature</h3>
                        </div>
                      </div>

                      {/* Attestation text */}
                      <div className="rounded-xl bg-surface-2 p-4 border border-border">
                        <p className="text-sm leading-relaxed text-text-secondary">
                          I hereby certify that the skills self-assessment provided above
                          is true and accurate to the best of my knowledge. I understand
                          that this information will be shared with requesting healthcare
                          agencies for employment verification purposes and may be
                          subject to verification. I authorize the release of this
                          checklist information to authorized personnel.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="legalName" className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Full Legal Name</Label>
                          <Input
                            id="legalName"
                            placeholder="Type your full legal name"
                            value={candidateNameSigned}
                            onChange={(e) => setCandidateNameSigned(e.target.value)}
                            className="rounded-xl border-border focus:border-primary h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Date</Label>
                          <Input
                            value={new Date().toLocaleDateString()}
                            disabled
                            className="rounded-xl bg-surface-2 border-border h-11"
                          />
                        </div>
                      </div>

                      {/* ── Signature Method Tabs ─────────────────────────── */}
                      <div className="space-y-3">
                        <Label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Your Signature</Label>
                        <Tabs
                          value={signatureMethod}
                          onValueChange={(v) => setSignatureMethod(v as SignatureType)}
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-3 rounded-xl h-11">
                            <TabsTrigger value="draw" className="gap-1.5 rounded-lg text-xs font-medium">
                              <Pencil className="size-3.5" />
                              Draw
                            </TabsTrigger>
                            <TabsTrigger value="type" className="gap-1.5 rounded-lg text-xs font-medium">
                              <Type className="size-3.5" />
                              Type
                            </TabsTrigger>
                            <TabsTrigger value="upload" className="gap-1.5 rounded-lg text-xs font-medium">
                              <Upload className="size-3.5" />
                              Upload
                            </TabsTrigger>
                          </TabsList>

                          {/* ── Draw Tab ─────────────────────────────────── */}
                          <TabsContent value="draw" className="mt-3">
                            <div className="space-y-2">
                              <div className="relative">
                                <canvas
                                  ref={sigCanvasRef}
                                  className="w-full border-2 border-border rounded-xl bg-white cursor-crosshair touch-none"
                                  style={{ height: "160px" }}
                                />
                                {!drawnSignatureBase64 && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-text-muted text-sm select-none font-medium">
                                      Sign here
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-text-muted text-xs gap-1 rounded-lg"
                                  onClick={() => {
                                    if (sigPadRef.current) {
                                      sigPadRef.current.clear();
                                    }
                                    setDrawnSignatureBase64("");
                                    if (signatureData?.type === "draw") {
                                      setSignatureData(null);
                                    }
                                  }}
                                >
                                  <Trash2 className="size-3" /> Clear
                                </Button>
                                {drawnSignatureBase64 && (
                                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                                    <CheckCircle2 className="size-3" /> Signature captured
                                  </span>
                                )}
                              </div>
                            </div>
                          </TabsContent>

                          {/* ── Type Tab ─────────────────────────────────── */}
                          <TabsContent value="type" className="mt-3">
                            <div className="space-y-3">
                              <Input
                                value={typedSignatureText}
                                onChange={(e) => handleTypedSignatureChange(e.target.value)}
                                placeholder="Type your name"
                                className="text-base rounded-xl h-11 border-border focus:border-primary"
                              />
                              <p className="text-xs text-text-secondary">Choose a font style:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {SIGNATURE_FONTS.map((font) => (
                                  <button
                                    key={font.value}
                                    type="button"
                                    className={cn(
                                      "p-3 rounded-xl border text-center transition-all",
                                      selectedFont === font.value
                                        ? "border-primary bg-primary-light ring-1 ring-primary"
                                        : "border-border hover:border-primary/50"
                                    )}
                                    onClick={() => handleFontChange(font.value)}
                                  >
                                    <span
                                      style={{ fontFamily: font.value, fontSize: "18px" }}
                                      className="block truncate"
                                    >
                                      {typedSignatureText || "Preview"}
                                    </span>
                                    <p className="text-[10px] text-text-muted mt-1">{font.name}</p>
                                  </button>
                                ))}
                              </div>
                              {typedSignatureText.trim() && (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="size-3.5 text-primary" />
                                  <span className="text-xs text-primary font-medium">Typed signature ready</span>
                                </div>
                              )}
                            </div>
                          </TabsContent>

                          {/* ── Upload Tab ────────────────────────────────── */}
                          <TabsContent value="upload" className="mt-3">
                            <div className="space-y-3">
                              {uploadedSignatureBase64 ? (
                                <div className="space-y-3">
                                  <div className="border rounded-xl bg-white p-3 flex items-center justify-center border-primary/20">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={uploadedSignatureBase64}
                                      alt="Uploaded signature"
                                      className="max-h-28 max-w-full object-contain"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-text-muted text-xs gap-1 rounded-lg"
                                      onClick={() => {
                                        setUploadedSignatureBase64("");
                                        if (signatureData?.type === "upload") {
                                          setSignatureData(null);
                                        }
                                      }}
                                    >
                                      <Trash2 className="size-3" /> Remove
                                    </Button>
                                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                                      <CheckCircle2 className="size-3" /> Signature uploaded
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                                  <Upload className="size-8 text-text-muted mx-auto mb-2" />
                                  <p className="text-sm text-text-secondary mb-2">
                                    Upload an image of your signature
                                  </p>
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSignatureUpload}
                                    className="max-w-xs mx-auto"
                                  />
                                  <p className="text-[10px] text-text-muted mt-2">
                                    PNG, JPG, or SVG — max 5MB
                                  </p>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>

                        {/* Current signature preview */}
                        {hasValidSignature && signatureData?.type !== "draw" && (
                          <div className="mt-2 p-3 border border-primary/20 bg-primary/5 rounded-xl">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5">
                              Signature Preview
                            </p>
                            {signatureData.type === "type" && signatureData.text && (
                              <p
                                className="text-2xl text-primary"
                                style={{ fontFamily: signatureData.font || "'Dancing Script', cursive" }}
                              >
                                {signatureData.text}
                              </p>
                            )}
                            {signatureData.type === "upload" && signatureData.image_base64 && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={signatureData.image_base64}
                                alt="Signature preview"
                                className="max-h-16 object-contain"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <Button
                        className="btn-gradient w-full gap-2 rounded-xl font-bold text-base"
                        size="lg"
                        style={{ padding: "16px" }}
                        disabled={
                          !allSkillsRated ||
                          !candidateNameSigned.trim() ||
                          !hasValidSignature ||
                          isSubmitting
                        }
                        onClick={handleSubmit}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" /> Submitting...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="size-4" /> Submit Checklist
                          </>
                        )}
                      </Button>
                      {(!allSkillsRated ||
                        !candidateNameSigned.trim() ||
                        !hasValidSignature) &&
                        !isSubmitting && (
                        <p className="text-xs text-text-muted text-center">
                          {!allSkillsRated
                            ? "Please rate all skills before submitting"
                            : !candidateNameSigned.trim()
                              ? "Please type your full legal name"
                              : "Please provide your signature (draw, type, or upload)"}
                        </p>
                      )}
                    </div>
                  </div>
                </FadeIn>
              )}
            </div>
          </div>

          {/* ── Floating Bottom Bar ──────────────────────────────────────── */}
          <div className="shrink-0 border-t border-border glass-header px-4 sm:px-6 py-3">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-xl text-text-secondary hover:text-foreground"
                disabled={categoryList.indexOf(activeCategory) <= 0}
                onClick={goToPrevCategory}
              >
                <ChevronLeft className="size-4" /> Prev
              </Button>

              <div className="flex items-center gap-2.5 flex-1 justify-center">
                <span className="text-xs text-text-secondary hidden sm:inline font-medium">
                  {ratedSkills} of {totalSkills} skills
                </span>
                <Progress
                  value={completionPct}
                  className="w-[120px] h-2 hidden sm:block rounded-full bg-surface-3 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent-teal [&>div]:rounded-full"
                />
                <Badge
                  className={cn(
                    "text-xs tabular-nums font-semibold rounded-lg px-2.5",
                    completionPct === 100
                      ? "bg-badge-green-bg text-badge-green border-badge-green/20"
                      : "bg-surface-2 text-text-secondary border-border"
                  )}
                >
                  {completionPct}%
                </Badge>
              </div>

              <Button
                size="sm"
                className="btn-gradient gap-1.5 rounded-xl font-semibold"
                onClick={goToNextCategory}
                disabled={
                  categoryList.indexOf(activeCategory) === categoryList.length - 1 &&
                  !allSkillsRated
                }
              >
                {categoryList.indexOf(activeCategory) === categoryList.length - 1 && allSkillsRated
                  ? "Sign & Submit"
                  : "Next"}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

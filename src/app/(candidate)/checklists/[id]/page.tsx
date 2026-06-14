"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
} from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  "2": "Limited Experience",
  "3": "Experienced",
  "4": "Proficient",
};

const ratingBtnStyles: Record<string, { selected: string; unselected: string }> = {
  "1": {
    selected: "bg-[#FEE2E2] border-[#DC2626] text-[#DC2626] shadow-sm",
    unselected: "border-gray-200 text-gray-400 hover:border-[#DC2626] hover:text-[#DC2626]",
  },
  "2": {
    selected: "bg-[#FEF9C3] border-[#CA8A04] text-[#CA8A04] shadow-sm",
    unselected: "border-gray-200 text-gray-400 hover:border-[#CA8A04] hover:text-[#CA8A04]",
  },
  "3": {
    selected: "bg-[#DBEAFE] border-[#2563EB] text-[#2563EB] shadow-sm",
    unselected: "border-gray-200 text-gray-400 hover:border-[#2563EB] hover:text-[#2563EB]",
  },
  "4": {
    selected: "bg-[#166534] border-[#166534] text-white shadow-sm",
    unselected: "border-gray-200 text-gray-400 hover:border-[#166534] hover:text-[#166534]",
  },
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

  // Initialize signature pad — depends on allSkillsRated (canvas must be in DOM)
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
          penColor: "rgb(22,101,52)",
          onEnd: () => {
            const pad = sigPadRef.current;
            if (pad && !pad.isEmpty()) {
              const base64 = pad.toDataURL("image/png");
              setDrawnSignatureBase64(base64);
              setSignatureData({ type: "draw", image_base64: base64 });
            }
          },
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
        (sigPadRef as Record<string, unknown>)._cleanup = () => {
          window.removeEventListener("resize", handleResize);
          sigPadRef.current?.off();
        };
      });
    }).catch((err) => {
      console.error("Failed to load SignaturePad:", err);
    });

    return () => {
      destroyed = true;
      const cleanup = (sigPadRef as Record<string, unknown>)._cleanup as (() => void) | undefined;
      if (cleanup) {
        cleanup();
        delete (sigPadRef as Record<string, unknown>)._cleanup;
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
      // If typed text is cleared, remove the signature
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
      // Last category and all rated — scroll to signature section
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
      // For typed signatures, generate a canvas-based image
      const canvas = document.createElement("canvas");
      canvas.width = 460;
      canvas.height = 160;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgb(22,101,52)";
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
          <Loader2 className="size-10 text-[#166534] animate-spin mx-auto" />
          <p className="text-sm text-[#6B7280]">Loading assessment...</p>
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
      <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Success header */}
        <Card className="border-[#BBF7D0]">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-6 text-[#166534]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#111827]">Checklist Submitted</h3>
                  <p className="text-sm text-[#6B7280]">
                    {data.template.name} — {data.template.profession}
                    {data.template.specialty ? ` — ${data.template.specialty}` : ""}
                  </p>
                  {submittedDate && (
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      Submitted on {submittedDate}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  className="gap-2 border-[#166534]/30 text-[#166534] hover:bg-[#DCFCE7]"
                  onClick={() => window.open(pdfPreviewUrl, '_blank')}
                >
                  <Eye className="size-4" /> Preview PDF
                </Button>
                <Button
                  className="gap-2 bg-[#166534] hover:bg-[#14532D]"
                  onClick={() => window.open(pdfDownloadUrl, '_blank')}
                >
                  <Download className="size-4" /> Download PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inline PDF preview */}
        <Card className="border-[#E5E7EB] overflow-hidden">
          <CardHeader className="px-5 py-3 border-b border-[#E5E7EB] bg-[#FAFAF8]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileDown className="size-4 text-[#166534]" />
                <span className="text-sm font-semibold text-[#111827]">Checklist PDF</span>
              </div>
              <Badge variant="outline" className="text-xs text-[#166534] border-[#166534]/30">
                Completed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              src={pdfPreviewUrl}
              className="w-full border-0"
              style={{ height: '70vh' }}
              title="Checklist PDF Preview"
            />
          </CardContent>
        </Card>

        {/* Back button */}
        <div className="flex justify-center">
          <Link href="/checklists">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="size-4" /> Back to Checklists
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (data.skills.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Lock className="size-12 text-[#9CA3AF] mx-auto mb-4" />
            <h3 className="text-lg font-medium">No skills found</h3>
            <p className="text-sm text-[#6B7280] mt-1">
              This checklist template has no skills configured yet.
            </p>
            <Link href="/checklists">
              <Button variant="outline" className="mt-4 gap-2">
                <ArrowLeft className="size-4" /> Back to Checklists
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Sticky Top Bar ──────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-[#E5E7EB] z-50">
        {/* Progress bar (very top) */}
        <div className="h-[4px] bg-[#F3F4F6]">
          <div
            className="h-full bg-[#166534] transition-all duration-500 ease-out"
            style={{ width: `${completionPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/checklists">
              <Button variant="ghost" size="sm" className="gap-1 shrink-0 px-2">
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">{data.template.name}</h1>
              <p className="text-xs text-[#6B7280] truncate">
                {data.template.profession}
                {data.template.specialty ? ` — ${data.template.specialty}` : ""}
                {data.client.organizationName ? ` · ${data.client.organizationName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {autoSaveStatus === "saving" && (
              <span className="text-xs text-[#6B7280] flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> Saving...
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="text-xs text-[#166534] font-medium flex items-center gap-1">
                <Save className="size-3" /> Saved
              </span>
            )}
            <Badge
              variant={completionPct === 100 ? "default" : "secondary"}
              className={cn(
                "text-xs tabular-nums",
                completionPct === 100 && "bg-[#166534] text-white"
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
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-[#E5E7EB] bg-[#FAFAF8]">
          {/* Checklist info card */}
          <div className="p-4 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center shrink-0">
                <ClipboardCheck className="size-4 text-[#166534]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#111827] truncate">{data.template.name}</p>
                <p className="text-[10px] text-[#9CA3AF]">
                  {ratedSkills} of {totalSkills} skills
                </p>
              </div>
            </div>
            <Progress value={completionPct} className="h-1.5" />
          </div>

          {/* Rating legend */}
          <div className="p-4 border-b border-[#E5E7EB]">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">
              Rating Scale
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {(["1", "2", "3", "4"] as const).map((val) => (
                <div key={val} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-md border-2 px-1.5 py-0.5 text-[10px] font-bold",
                      ratingBtnStyles[val].selected
                    )}
                  >
                    {val}
                  </span>
                  <span className="text-[10px] text-[#6B7280] leading-tight">
                    {RATING_LABELS[val]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Category list */}
          <nav className="flex-1 overflow-y-auto p-2">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-2 mb-1.5">
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
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-sm",
                      isActive
                        ? "bg-[#DCFCE7] text-[#166534] font-semibold"
                        : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                    )}
                  >
                    <div
                      className={cn(
                        "size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold border-2",
                        catComplete
                          ? "bg-[#166534] border-[#166534] text-white"
                          : isActive
                          ? "border-[#166534] text-[#166534]"
                          : "border-[#D1D5DB] text-[#9CA3AF]"
                      )}
                    >
                      {catComplete ? "✓" : ratedInCat}
                    </div>
                    <span className="flex-1 truncate text-xs">{cat}</span>
                    <span className="text-[10px] text-[#9CA3AF] tabular-nums">
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
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-sm mt-2",
                  hasValidSignature
                    ? "bg-[#DCFCE7] text-[#166534] font-semibold"
                    : "bg-[#166534]/5 text-[#166534] hover:bg-[#DCFCE7]"
                )}
              >
                <div className={cn(
                  "size-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold border-2",
                  hasValidSignature
                    ? "bg-[#166534] border-[#166534] text-white"
                    : "border-[#166534] text-[#166534]"
                )}>
                  {hasValidSignature ? "✓" : <Pencil className="size-2.5" />}
                </div>
                <span className="flex-1 truncate text-xs font-medium">Sign & Submit</span>
              </button>
            )}
          </nav>

          {/* Bottom info */}
          <div className="p-3 border-t border-[#E5E7EB]">
            <div className="flex items-center gap-1.5 text-[10px] text-[#9CA3AF]">
              <Info className="size-3" />
              Your progress is auto-saved
            </div>
          </div>
        </aside>

        {/* ── Right: Scrollable Content Area ─────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile category chips */}
          <div className="lg:hidden shrink-0 border-b border-[#E5E7EB] bg-white">
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
                        ? "bg-[#166534] text-white border-[#166534]"
                        : catComplete
                        ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
                        : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#166534]"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap bg-[#166534]/10 text-[#166534] border-[#166534]/30 shrink-0"
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
            className="flex-1 overflow-y-auto"
          >
            <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 pb-32">
              {/* Info banner */}
              <div className="flex items-start gap-3 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-3">
                <Info className="size-4 text-[#166534] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[#166534]">
                    <span className="font-semibold">{data.client.organizationName || "A recruiter"}</span> has requested your skills self-assessment.
                  </p>
                  <p className="text-xs text-[#166534]/70 mt-0.5">
                    Complete this once and it saves to your vault. Rate each skill honestly based on your experience level.
                  </p>
                </div>
              </div>

              {/* Skills by Category */}
              {categoryList.map((category) => {
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
                      "rounded-xl py-3 px-4 flex items-center justify-between mb-3 border",
                      catComplete
                        ? "bg-[#DCFCE7] border-[#BBF7D0]"
                        : "bg-white border-[#E5E7EB] border-l-4 border-l-[#166534]"
                    )}>
                      <div className="flex items-center gap-2">
                        {catComplete && <CheckCircle2 className="size-4 text-[#166534]" />}
                        <span className={cn(
                          "font-semibold text-sm",
                          catComplete ? "text-[#166534]" : "text-[#111827]"
                        )}>
                          {category}
                        </span>
                      </div>
                      <span className={cn(
                        "text-xs tabular-nums",
                        catComplete ? "text-[#166534] font-medium" : "text-[#9CA3AF]"
                      )}>
                        {ratedInCat}/{categorySkills.length} rated
                      </span>
                    </div>

                    {/* Skills in this category */}
                    <div className="space-y-2">
                      {categorySkills.map((skill, skillIdx) => {
                        const rating = ratings[skill.id];
                        const currentValue = rating?.ratingValue ?? null;
                        const isNa = rating?.isNa ?? false;
                        const isRated = isRatingDone(rating);

                        return (
                          <div
                            key={skill.id}
                            className={cn(
                              "bg-white border rounded-xl p-4 transition-all",
                              isRated
                                ? "border-[#166534]/20 shadow-sm"
                                : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                            )}
                          >
                            <div className="flex flex-col gap-3">
                              {/* Skill name + N/A toggle */}
                              <div className="flex items-start gap-3">
                                <span className="text-xs text-[#9CA3AF] mt-0.5 shrink-0 tabular-nums">
                                  {skillIdx + 1}.
                                </span>
                                <p className={cn(
                                  "text-sm font-medium flex-1",
                                  isNa && "text-[#9CA3AF] line-through"
                                )}>
                                  {skill.skillName}
                                </p>
                                {skill.hasNaOption && (
                                  <button
                                    type="button"
                                    onClick={() => saveRating(skill.id, null, !isNa)}
                                    className={cn(
                                      "text-xs px-2.5 py-1 rounded-full border transition-all shrink-0",
                                      isNa
                                        ? "bg-[#0D9488]/10 border-[#0D9488] text-[#0D9488] font-medium"
                                        : "border-[#E5E7EB] text-[#9CA3AF] hover:border-[#0D9488]"
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
                                    const style = ratingBtnStyles[val];
                                    return (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => saveRating(skill.id, val, false)}
                                        className={cn(
                                          "flex flex-col items-center px-3 py-2 rounded-lg border-2 text-sm transition-all min-w-[56px]",
                                          isSelected
                                            ? cn(style.selected, "scale-105")
                                            : style.unselected
                                        )}
                                      >
                                        <span className="text-base font-bold">{val}</span>
                                        <span className="text-[9px] opacity-70 mt-0.5 leading-tight text-center">
                                          {RATING_LABELS[val]}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Yes/No */}
                              {skill.questionType === "yes_no" && !isNa && (
                                <div className="flex gap-2 pl-5">
                                  <button
                                    type="button"
                                    onClick={() => saveRating(skill.id, "yes", false)}
                                    className={cn(
                                      "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                                      currentValue === "yes"
                                        ? "bg-[#166534] text-white border-[#166534]"
                                        : "border-[#E5E7EB] hover:border-[#166534] text-[#6B7280]"
                                    )}
                                  >
                                    ✓ Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => saveRating(skill.id, "no", false)}
                                    className={cn(
                                      "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                                      currentValue === "no"
                                        ? "bg-[#DC2626] text-white border-[#DC2626]"
                                        : "border-[#E5E7EB] hover:border-[#DC2626] text-[#6B7280]"
                                    )}
                                  >
                                    ✕ No
                                  </button>
                                </div>
                              )}

                              {/* Text */}
                              {skill.questionType === "text" && !isNa && (
                                <div className="pl-5">
                                  <Textarea
                                    placeholder="Enter your response..."
                                    defaultValue={currentValue || ""}
                                    className="max-w-lg"
                                    onChange={(e) => debouncedSave(skill.id, e.target.value)}
                                    onBlur={(e) => saveRating(skill.id, e.target.value, false)}
                                  />
                                </div>
                              )}

                              {/* Rated indicator */}
                              {isRated && !isNa && (
                                <div className="flex items-center gap-1.5 pl-5 mt-1">
                                  <CheckCircle2 className="size-3.5 text-[#166534]" />
                                  <span className="text-xs text-[#166534] font-medium">
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
                                <div className="flex items-center gap-1.5 pl-5 mt-1">
                                  <span className="text-xs text-[#0D9488] font-medium">
                                    Marked as N/A
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* ── Signature Section ────────────────────────────────── */}
              {allSkillsRated && (
                <div id="signature-section" className="scroll-mt-4">
                  <Card className="border-[#BBF7D0] overflow-hidden">
                    <CardContent className="p-6 sm:p-8 space-y-5">
                      <div>
                        <p className="text-xs font-semibold tracking-wider text-[#166534] uppercase mb-1">
                          Final Step
                        </p>
                        <h3 className="text-lg font-semibold">Attestation & Signature</h3>
                      </div>

                      <div className="bg-[#F8F7F4] rounded-lg p-4">
                        <p className="text-sm leading-relaxed text-[#374151]">
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
                          <Label htmlFor="legalName">Full Legal Name</Label>
                          <Input
                            id="legalName"
                            placeholder="Type your full legal name"
                            value={candidateNameSigned}
                            onChange={(e) => setCandidateNameSigned(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input
                            value={new Date().toLocaleDateString()}
                            disabled
                            className="bg-[#F8F7F4]"
                          />
                        </div>
                      </div>

                      {/* ── Signature Method Tabs ─────────────────────────── */}
                      <div className="space-y-3">
                        <Label>Your Signature</Label>
                        <Tabs
                          value={signatureMethod}
                          onValueChange={(v) => setSignatureMethod(v as SignatureType)}
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="draw" className="gap-1.5">
                              <Pencil className="size-3.5" />
                              Draw
                            </TabsTrigger>
                            <TabsTrigger value="type" className="gap-1.5">
                              <Type className="size-3.5" />
                              Type
                            </TabsTrigger>
                            <TabsTrigger value="upload" className="gap-1.5">
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
                                  className="w-full border-[1.5px] border-[#E5E7EB] rounded-lg bg-white cursor-crosshair touch-none"
                                  style={{ height: "160px" }}
                                />
                                {!drawnSignatureBase64 && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-[#9CA3AF] text-sm select-none">
                                      Sign here
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#9CA3AF] text-xs gap-1"
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
                                  <span className="text-xs text-[#166534] font-medium flex items-center gap-1">
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
                                className="text-base"
                              />
                              <p className="text-xs text-[#6B7280]">Choose a font style:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {SIGNATURE_FONTS.map((font) => (
                                  <button
                                    key={font.value}
                                    type="button"
                                    className={cn(
                                      "p-3 rounded-lg border text-center transition-all",
                                      selectedFont === font.value
                                        ? "border-[#166534] bg-[#F0FDF4] ring-1 ring-[#166534]"
                                        : "border-[#E5E7EB] hover:border-[#166534]/50"
                                    )}
                                    onClick={() => handleFontChange(font.value)}
                                  >
                                    <span
                                      style={{ fontFamily: font.value, fontSize: "18px" }}
                                      className="block truncate"
                                    >
                                      {typedSignatureText || "Preview"}
                                    </span>
                                    <p className="text-[10px] text-[#6B7280] mt-1">{font.name}</p>
                                  </button>
                                ))}
                              </div>
                              {typedSignatureText.trim() && (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="size-3.5 text-[#166534]" />
                                  <span className="text-xs text-[#166534] font-medium">Typed signature ready</span>
                                </div>
                              )}
                            </div>
                          </TabsContent>

                          {/* ── Upload Tab ────────────────────────────────── */}
                          <TabsContent value="upload" className="mt-3">
                            <div className="space-y-3">
                              {uploadedSignatureBase64 ? (
                                <div className="space-y-3">
                                  <div className="border rounded-lg bg-white p-3 flex items-center justify-center">
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
                                      className="text-[#9CA3AF] text-xs gap-1"
                                      onClick={() => {
                                        setUploadedSignatureBase64("");
                                        if (signatureData?.type === "upload") {
                                          setSignatureData(null);
                                        }
                                      }}
                                    >
                                      <Trash2 className="size-3" /> Remove
                                    </Button>
                                    <span className="text-xs text-[#166534] font-medium flex items-center gap-1">
                                      <CheckCircle2 className="size-3" /> Signature uploaded
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-6 text-center hover:border-[#166534]/50 transition-colors">
                                  <Upload className="size-8 text-[#9CA3AF] mx-auto mb-2" />
                                  <p className="text-sm text-[#6B7280] mb-2">
                                    Upload an image of your signature
                                  </p>
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSignatureUpload}
                                    className="max-w-xs mx-auto"
                                  />
                                  <p className="text-[10px] text-[#9CA3AF] mt-2">
                                    PNG, JPG, or SVG — max 5MB
                                  </p>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>

                        {/* Current signature preview */}
                        {hasValidSignature && signatureData?.type !== "draw" && (
                          <div className="mt-2 p-3 border border-[#BBF7D0] bg-[#F0FDF4] rounded-lg">
                            <p className="text-[10px] font-semibold text-[#166534] uppercase tracking-wider mb-1.5">
                              Signature Preview
                            </p>
                            {signatureData.type === "type" && signatureData.text && (
                              <p
                                className="text-2xl text-[#166534]"
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
                        className="w-full gap-2 bg-[#166534] hover:bg-[#14532D]"
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
                        <p className="text-xs text-[#9CA3AF] text-center">
                          {!allSkillsRated
                            ? "Please rate all skills before submitting"
                            : !candidateNameSigned.trim()
                              ? "Please type your full legal name"
                              : "Please provide your signature (draw, type, or upload)"}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* ── Floating Bottom Bar ──────────────────────────────────────── */}
          <div className="shrink-0 border-t border-[#E5E7EB] bg-white px-4 sm:px-6 py-3">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                disabled={categoryList.indexOf(activeCategory) <= 0}
                onClick={goToPrevCategory}
              >
                <ArrowLeft className="size-4" /> Prev
              </Button>

              <div className="flex items-center gap-2 flex-1 justify-center">
                <span className="text-xs text-[#6B7280] hidden sm:inline">
                  {ratedSkills} of {totalSkills} skills
                </span>
                <Progress
                  value={completionPct}
                  className="w-[120px] h-1.5 hidden sm:block"
                />
                <Badge
                  variant="outline"
                  className="text-xs tabular-nums"
                >
                  {completionPct}%
                </Badge>
              </div>

              <Button
                size="sm"
                className="gap-1"
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

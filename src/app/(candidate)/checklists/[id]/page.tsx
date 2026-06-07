"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lock,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Save,
} from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";

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
    personalInfoCollected: boolean;
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

/* ─── Rating color map ──────────────────────────────────────────────── */
const RATING_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "#FEE2E2", text: "#DC2626", border: "#DC2626" },
  2: { bg: "#FEF9C3", text: "#CA8A04", border: "#CA8A04" },
  3: { bg: "#DBEAFE", text: "#2563EB", border: "#2563EB" },
  4: { bg: "#DCFCE7", text: "#166534", border: "#166534" },
  5: { bg: "#166534", text: "#FFFFFF", border: "#166534" },
};

const RATING_LABELS: Record<number, string> = {
  1: "No Experience",
  2: "Beginner",
  3: "Competent",
  4: "Proficient",
  5: "Expert",
};

/* ─── Component ─────────────────────────────────────────────────────── */
export default function ChecklistDetailPage({
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

  // Personal info state
  const [personalInfoCollected, setPersonalInfoCollected] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(true);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [isSavingPersonalInfo, setIsSavingPersonalInfo] = useState(false);

  // Signature pad
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadRef = useRef<SignaturePadInstance | null>(null);
  const [hasSigned, setHasSigned] = useState(false);
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

      const pic = checklistData.candidateResponse?.personalInfoCollected ?? false;
      setPersonalInfoCollected(pic);
      setShowPersonalInfo(!pic);
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

  // Initialize signature pad – only once when canvas becomes available
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
            setHasSigned(pad ? !pad.isEmpty() : false);
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

  /* ─── Save personal info ─────────────────────────────────────────── */
  const handleSavePersonalInfo = async () => {
    if (!dateOfBirth || !ssnLast4 || !phoneNumber || !addressLine1 || !city || !state || !zipCode) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (ssnLast4.length !== 4 || !/^\d{4}$/.test(ssnLast4)) {
      toast.error("SSN last 4 digits must be exactly 4 numbers.");
      return;
    }

    setIsSavingPersonalInfo(true);
    try {
      const res = await fetch(`/api/checklists/personal-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistRequestId: id,
          dateOfBirth,
          ssnLastFour: ssnLast4,
          phone: phoneNumber,
          addressLine1,
          addressLine2,
          city,
          state,
          zipCode,
        }),
      });
      if (!res.ok) throw new Error("Failed to save personal info");

      setPersonalInfoCollected(true);
      setShowPersonalInfo(false);
      toast.success("Personal information saved");
    } catch {
      toast.error("Failed to save personal information");
    } finally {
      setIsSavingPersonalInfo(false);
    }
  };

  /* ─── Submit handler ─────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!id || !data) return;

    const unrated = data.skills.filter((s) => {
      const rating = ratings[s.id];
      return !rating || ((rating.ratingValue === null || rating.ratingValue === "") && !rating.isNa);
    });

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

    if (!hasSigned || sigPadRef.current?.isEmpty()) {
      toast.error("Please draw your signature.");
      return;
    }

    const signatureBase64 = sigPadRef.current?.toDataURL("image/png") || "";

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

  /* ─── Group skills by category ──────────────────────────────────── */
  const groupedSkills =
    data?.skills.reduce<Record<string, SkillItem[]>>((acc, skill) => {
      const cat = skill.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(skill);
      return acc;
    }, {}) ?? {};

  const allSkillsRated =
    (data?.skills.length ?? 0) > 0 &&
    data!.skills.every((s) => {
      const rating = ratings[s.id];
      return rating && ((rating.ratingValue !== null && rating.ratingValue !== "") || rating.isNa);
    });

  const totalSkills = data?.totalSkills ?? 0;
  const ratedSkills = data?.ratedSkills ?? 0;
  const completionPct = data?.completionPct ?? 0;

  /* ─── Loading ─────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="max-w-[820px] mx-auto space-y-6 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  // Already submitted
  if (
    data.candidateResponse?.status === "submitted" ||
    data.checklistRequest.status === "completed"
  ) {
    return (
      <div className="max-w-[820px] mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-[var(--primary-light)] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-7 text-[var(--primary)]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Checklist Already Submitted</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              You have already completed this checklist. Thank you!
            </p>
            <Link href="/checklists">
              <Button variant="outline" className="mt-4 gap-2">
                ← Back to Checklists
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[820px] mx-auto pb-28">
      {/* ── Sticky Top Bar ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-[var(--surface)] border-b border-[var(--border)]">
        {/* Progress bar (very top) */}
        <div className="h-[5px] bg-[var(--surface-2)]">
          <div
            className="h-full bg-[var(--primary)] transition-all duration-500 ease-out"
            style={{ width: `${completionPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/checklists">
              <Button variant="ghost" size="sm" className="gap-1 shrink-0">
                ← Back
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">{data.template.name}</h1>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {data.template.profession}
                {data.template.specialty ? ` — ${data.template.specialty}` : ""}
                {data.client.organizationName ? ` · ${data.client.organizationName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {autoSaveStatus === "saving" && (
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> Saving...
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="text-xs text-[var(--primary)] font-medium">Saved ✓</span>
            )}
            <Badge
              variant={completionPct === 100 ? "default" : "secondary"}
              className="text-xs"
            >
              {completionPct}% Complete
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ── Step Indicator ──────────────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <div className={`flex items-center gap-1.5 ${showPersonalInfo ? "text-[var(--primary)]" : personalInfoCollected ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}>
            <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${personalInfoCollected ? "bg-[var(--primary)] text-white" : "border-2 border-[var(--primary)] text-[var(--primary)]"}`}>
              {personalInfoCollected ? "✓" : "1"}
            </div>
            Personal Info
          </div>
          <ChevronRight className="size-3 text-[var(--text-muted)]" />
          <div className={`flex items-center gap-1.5 ${!personalInfoCollected ? "text-[var(--text-muted)]" : allSkillsRated ? "text-[var(--primary)]" : "text-[var(--primary)]"}`}>
            <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${allSkillsRated ? "bg-[var(--primary)] text-white" : personalInfoCollected ? "border-2 border-[var(--primary)] text-[var(--primary)]" : "border-2 border-[var(--border)] text-[var(--text-muted)]"}`}>
              {allSkillsRated ? "✓" : "2"}
            </div>
            Skills Assessment
          </div>
          <ChevronRight className="size-3 text-[var(--text-muted)]" />
          <div className={`flex items-center gap-1.5 ${allSkillsRated ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}>
            <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${allSkillsRated ? "border-2 border-[var(--primary)] text-[var(--primary)]" : "border-2 border-[var(--border)] text-[var(--text-muted)]"}`}>
              3
            </div>
            Sign & Submit
          </div>
        </div>

        {/* ── Section 1: Personal Info ────────────────────────────── */}
        {showPersonalInfo && !personalInfoCollected && (
          <Card className="border-[var(--border)] mb-6 overflow-hidden animate-fade-up">
            <CardContent className="p-8 space-y-5">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[var(--accent-teal)] uppercase mb-1">
                  Step 1 of 3
                </p>
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  This information is used for credential verification and will be kept confidential.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssn">SSN (Last 4 Digits) *</Label>
                  <Input
                    id="ssn"
                    placeholder="e.g. 1234"
                    maxLength={4}
                    value={ssnLast4}
                    onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="(555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addr1">Address Line 1 *</Label>
                  <Input
                    id="addr1"
                    placeholder="123 Main St"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addr2">Address Line 2</Label>
                  <Input
                    id="addr2"
                    placeholder="Apt, Suite, etc."
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">Zip Code *</Label>
                  <Input
                    id="zip"
                    placeholder="12345"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleSavePersonalInfo}
                disabled={isSavingPersonalInfo}
              >
                {isSavingPersonalInfo ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4" /> Save & Continue to Skills Assessment
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Section 2: Skills Assessment ────────────────────────── */}
        {data.skills.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Lock className="size-12 text-[var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium">No skills found</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                This checklist template has no skills configured yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSkills).map(([category, categorySkills]) => {
              const ratedInCat = categorySkills.filter((s) => {
                const rating = ratings[s.id];
                return rating && ((rating.ratingValue !== null && rating.ratingValue !== "") || rating.isNa);
              }).length;

              return (
                <div key={category}>
                  {/* Category header */}
                  <div className="bg-[var(--surface)] border border-[var(--border)] border-l-4 border-l-[var(--primary)] rounded-r-xl py-3.5 px-5 flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm">{category}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {ratedInCat}/{categorySkills.length} rated
                    </span>
                  </div>

                  {/* Skills in this category */}
                  <div className="space-y-3">
                    {categorySkills.map((skill) => {
                      const rating = ratings[skill.id];
                      const currentValue = rating?.ratingValue ?? null;
                      const isNa = rating?.isNa ?? false;
                      const isRated =
                        rating &&
                        ((rating.ratingValue !== null && rating.ratingValue !== "") || rating.isNa);

                      return (
                        <div
                          key={skill.id}
                          className={`bg-[var(--surface)] border rounded-xl p-4 sm:p-5 transition-all ${
                            isRated
                              ? "border-[var(--primary)]/20 shadow-sm"
                              : "border-[var(--border)] hover:border-[var(--border-strong)]"
                          }`}
                        >
                          <div className="flex flex-col gap-3">
                            {/* Skill name + N/A toggle */}
                            <div className="flex items-start gap-3">
                              <p className="text-sm font-medium flex-1">{skill.skillName}</p>
                              {skill.hasNaOption && (
                                <button
                                  type="button"
                                  onClick={() => saveRating(skill.id, null, !isNa)}
                                  className={`text-xs px-2.5 py-1 rounded-full border transition-all shrink-0 ${
                                    isNa
                                      ? "bg-[var(--accent-teal)]/10 border-[var(--accent-teal)] text-[var(--accent-teal)] font-medium"
                                      : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-teal)]"
                                  }`}
                                >
                                  N/A
                                </button>
                              )}
                            </div>

                            {/* Rating 1-5 */}
                            {skill.questionType === "rating_1_5" && !isNa && (
                              <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5].map((val) => {
                                  const isSelected = currentValue === String(val);
                                  const color = RATING_COLORS[val];
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => saveRating(skill.id, String(val), false)}
                                      className={`flex flex-col items-center px-3 py-2 rounded-lg border text-sm transition-all ${
                                        isSelected
                                          ? "border-2 font-semibold scale-105"
                                          : "border-[var(--border)] hover:border-[var(--border-strong)]"
                                      }`}
                                      style={
                                        isSelected
                                          ? { borderColor: color.border, backgroundColor: color.bg, color: color.text }
                                          : undefined
                                      }
                                    >
                                      <span className="text-base font-bold">{val}</span>
                                      <span className="text-[10px] opacity-70 mt-0.5">{RATING_LABELS[val]}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Yes/No */}
                            {skill.questionType === "yes_no" && !isNa && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveRating(skill.id, "yes", false)}
                                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                                    currentValue === "yes"
                                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                                      : "border-[var(--border)] hover:border-[var(--primary)]"
                                  }`}
                                >
                                  ✓ Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveRating(skill.id, "no", false)}
                                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                                    currentValue === "no"
                                      ? "bg-[var(--badge-red)] text-white border-[var(--badge-red)]"
                                      : "border-[var(--border)] hover:border-[var(--badge-red)]"
                                  }`}
                                >
                                  ✕ No
                                </button>
                              </div>
                            )}

                            {/* Text */}
                            {skill.questionType === "text" && !isNa && (
                              <Textarea
                                placeholder="Enter your response..."
                                defaultValue={currentValue || ""}
                                className="max-w-lg"
                                onChange={(e) => debouncedSave(skill.id, e.target.value)}
                                onBlur={(e) => saveRating(skill.id, e.target.value, false)}
                              />
                            )}

                            {/* Rated indicator */}
                            {isRated && !isNa && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <CheckCircle2 className="size-3.5 text-[var(--primary)]" />
                                <span className="text-xs text-[var(--primary)] font-medium">
                                  {skill.questionType === "rating_1_5"
                                    ? RATING_LABELS[Number(currentValue) as keyof typeof RATING_LABELS]
                                    : skill.questionType === "yes_no"
                                    ? currentValue === "yes" ? "Yes" : "No"
                                    : "Response saved"}
                                </span>
                              </div>
                            )}

                            {/* N/A indicator */}
                            {isNa && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs text-[var(--accent-teal)] font-medium">
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
          </div>
        )}

        {/* ── Section 3: Signature ──────────────────────────────────── */}
        {allSkillsRated && (
          <Card className="border-[var(--border)] mb-6 overflow-hidden animate-fade-up">
            <CardContent className="p-8 space-y-5">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[var(--accent-teal)] uppercase mb-1">
                  Step 3 of 3
                </p>
                <h3 className="text-lg font-semibold">Attestation & Signature</h3>
              </div>

              <div className="bg-[var(--surface-2)] rounded-lg p-4">
                <p className="text-sm leading-relaxed">
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
                    className="bg-[var(--surface-2)]"
                  />
                </div>
              </div>

              {/* Signature Pad */}
              <div className="space-y-2">
                <Label>Signature</Label>
                <div className="relative">
                  <canvas
                    ref={sigCanvasRef}
                    className="w-full border-[1.5px] border-[var(--border)] rounded-lg bg-white cursor-crosshair"
                    style={{ height: "180px" }}
                  />
                  {!hasSigned && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[var(--text-muted)] text-sm select-none">
                        Sign here
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--text-muted)] text-xs"
                  onClick={() => {
                    sigPadRef.current?.clear();
                    setHasSigned(false);
                  }}
                >
                  Clear Signature
                </Button>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                style={{ padding: "16px" }}
                disabled={
                  !allSkillsRated ||
                  !candidateNameSigned.trim() ||
                  !hasSigned ||
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
                    <ShieldCheck className="size-4" /> Submit Checklist ✓
                  </>
                )}
              </Button>
              {(!allSkillsRated ||
                !candidateNameSigned.trim() ||
                !hasSigned) &&
                !isSubmitting && (
                  <p className="text-xs text-[var(--text-muted)] text-center">
                    {!allSkillsRated
                      ? "Please rate all skills before submitting"
                      : !candidateNameSigned.trim()
                        ? "Please type your full legal name"
                        : "Please draw your signature"}
                  </p>
                )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Floating Bottom Bar ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] border-t border-[var(--border)] px-6 py-3">
        <div className="max-w-[820px] mx-auto flex items-center justify-between gap-4">
          <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
            {ratedSkills} of {totalSkills} skills rated
          </span>
          <Progress
            value={completionPct}
            className="w-[180px] h-1 shrink-0 hidden sm:block"
          />
          <Button
            size="sm"
            className="gap-1 whitespace-nowrap"
            disabled={!allSkillsRated}
            onClick={() => {
              window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "smooth",
              });
            }}
            style={{
              opacity: allSkillsRated ? 1 : 0.4,
              cursor: allSkillsRated ? "pointer" : "not-allowed",
            }}
          >
            Continue to Signature →
          </Button>
        </div>
      </div>
    </div>
  );
}

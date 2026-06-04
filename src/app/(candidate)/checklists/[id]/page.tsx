"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Send,
  Loader2,
  ChevronLeft,
  ClipboardCheck,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
  } | null;
  skills: SkillItem[];
  ratings: Record<number, RatingItem>;
  ratedSkills: number;
  totalSkills: number;
  completionPct: number;
}

const RATING_LABELS: Record<number, string> = {
  1: "Novice",
  2: "Beginner",
  3: "Competent",
  4: "Proficient",
  5: "Expert",
};

export default function ChecklistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [data, setData] = useState<ChecklistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratings, setRatings] = useState<Record<number, RatingItem>>({});
  const [signature, setSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const fetchChecklist = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/candidate/checklists/${id}`);
      if (!res.ok) throw new Error("Failed to fetch checklist");
      const checklistData = await res.json();
      setData(checklistData);
      setRatings(checklistData.ratings || {});
    } catch {
      setError("Failed to load checklist. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const saveRating = async (
    skillId: number,
    ratingValue: string | null,
    isNa: boolean
  ) => {
    if (!id) return;
    setAutoSaving(true);
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
        // Update completion in data
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
      setAutoSaving(false);
    }
  };

  // Debounced save for text inputs
  const debouncedSave = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (skillId: number, value: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => saveRating(skillId, value, false), 800);
      };
    })(),
    [id, ratings]
  );

  const handleSubmit = async () => {
    if (!id || !data) return;

    const unrated = data.skills.filter((s) => {
      const rating = ratings[s.id];
      return !rating || (rating.ratingValue === null && !rating.isNa);
    });

    if (unrated.length > 0) {
      toast.error("Please rate all skills before submitting", {
        description: `${unrated.length} skill${unrated.length > 1 ? "s" : ""} still need ratings`,
      });
      return;
    }

    if (!signature.trim()) {
      toast.error("Please provide your digital signature");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/candidate/checklists/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: signature.trim() }),
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

  const handleSaveAndExit = () => {
    router.push("/checklists");
  };

  // Group skills by category
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
      return rating && (rating.ratingValue !== null || rating.isNa);
    });

  // Loading
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-16 w-full" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchChecklist} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  // Already submitted
  if (data.candidateResponse?.status === "submitted" || data.checklistRequest.status === "completed") {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold">Checklist Already Submitted</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You have already completed this checklist.
            </p>
            <Link href="/checklists">
              <Button variant="outline" className="mt-4 gap-2">
                <ChevronLeft className="size-4" />
                Back to Checklists
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/checklists">
          <Button variant="ghost" size="sm" className="gap-1 mb-2">
            <ChevronLeft className="size-4" />
            Back to Checklists
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{data.template.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data.template.profession}
          {data.template.specialty ? ` — ${data.template.specialty}` : ""}
          {data.client.organizationName ? ` · ${data.client.organizationName}` : ""}
        </p>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {data.ratedSkills} of {data.totalSkills} skills rated ({data.completionPct}%)
            </span>
            {autoSaving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> Saving...
              </span>
            )}
          </div>
          <Progress value={data.completionPct} className="h-2" />
        </CardContent>
      </Card>

      {/* Empty Skills */}
      {data.skills.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardCheck className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No skills found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This checklist template has no skills configured yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Skills grouped by category */}
          <div className="space-y-6">
            {Object.entries(groupedSkills).map(([category, categorySkills]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider">
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  {categorySkills.map((skill, idx) => {
                    const rating = ratings[skill.id];
                    const currentValue = rating?.ratingValue ?? null;
                    const isNa = rating?.isNa ?? false;

                    return (
                      <div key={skill.id}>
                        {idx > 0 && <Separator className="my-3" />}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-medium flex-1">
                              {skill.skillName}
                            </p>
                            {skill.hasNaOption && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Checkbox
                                  id={`na-${skill.id}`}
                                  checked={isNa}
                                  onCheckedChange={(checked) =>
                                    saveRating(skill.id, null, checked === true)
                                  }
                                />
                                <Label
                                  htmlFor={`na-${skill.id}`}
                                  className="text-xs text-muted-foreground whitespace-nowrap"
                                >
                                  N/A
                                </Label>
                              </div>
                            )}
                          </div>

                          {/* Rating 1-5 */}
                          {skill.questionType === "rating_1_5" && (
                            <div className="flex flex-wrap gap-1.5">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <Button
                                  key={val}
                                  type="button"
                                  size="sm"
                                  variant={
                                    currentValue === String(val)
                                      ? "default"
                                      : "outline"
                                  }
                                  className="min-w-[56px] gap-0.5"
                                  disabled={isNa}
                                  onClick={() =>
                                    saveRating(skill.id, String(val), false)
                                  }
                                >
                                  <span className="font-medium">{val}</span>
                                  <span className="text-[10px] opacity-70 hidden sm:inline">
                                    {RATING_LABELS[val]}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          )}

                          {/* Yes/No */}
                          {skill.questionType === "yes_no" && (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  currentValue === "yes" ? "default" : "outline"
                                }
                                className="gap-1.5"
                                disabled={isNa}
                                onClick={() =>
                                  saveRating(skill.id, "yes", false)
                                }
                              >
                                <CheckCircle2 className="size-3.5" /> Yes
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  currentValue === "no" ? "default" : "outline"
                                }
                                className="gap-1.5"
                                disabled={isNa}
                                onClick={() => saveRating(skill.id, "no", false)}
                              >
                                No
                              </Button>
                            </div>
                          )}

                          {/* Text */}
                          {skill.questionType === "text" && (
                            <Input
                              type="text"
                              placeholder="Enter response..."
                              defaultValue={currentValue || ""}
                              disabled={isNa}
                              className="max-w-md"
                              onChange={(e) =>
                                debouncedSave(skill.id, e.target.value)
                              }
                              onBlur={(e) => {
                                // Auto-save on blur
                                saveRating(skill.id, e.target.value, false);
                              }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Attestation Card */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Attestation & Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm">
                  I certify that the ratings above are an accurate self-assessment
                  of my current clinical skills.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signature">Digital Signature (Full Legal Name)</Label>
                  <Input
                    id="signature"
                    placeholder="Type your full legal name"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    value={new Date().toLocaleDateString()}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1 gap-2"
                  size="lg"
                  disabled={
                    !allSkillsRated || !signature.trim() || isSubmitting
                  }
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Submit Checklist
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  onClick={handleSaveAndExit}
                >
                  <Save className="size-4" />
                  Save & Exit
                </Button>
              </div>
              {(!allSkillsRated || !signature.trim()) && !isSubmitting && (
                <p className="text-xs text-muted-foreground text-center">
                  {!allSkillsRated
                    ? "Please rate all skills before submitting"
                    : "Please sign with your full legal name"}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

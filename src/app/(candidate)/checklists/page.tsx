"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardCheck,
  ChevronLeft,
  Check,
  X,
  Send,
  Loader2,
} from "@/lib/icons";
import { toast } from "sonner";

interface ChecklistRequestItem {
  id: number;
  status: string;
  completion_pct: number;
  created_at: string;
  checklist_template: {
    id: number;
    name: string;
    profession: string;
    specialty: string;
  };
  client_user: {
    first_name: string | null;
    last_name: string | null;
    organization: { name: string } | null;
  };
  candidate_response: {
    id: number;
    status: string;
    submitted_at: string | null;
    digital_signature: string | null;
  } | null;
}

interface SkillItem {
  id: number;
  skill_name: string;
  category: string;
  question_type: string;
  sort_order: number;
  has_na_option: boolean;
}

interface SkillRatingItem {
  id: number;
  skill_id: number;
  rating_value: string | null;
  is_na: boolean;
}

export default function CandidateChecklistsPage() {
  const router = useRouter();
  const [checklists, setChecklists] = useState<ChecklistRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Checklist form state
  const [activeChecklistId, setActiveChecklistId] = useState<number | null>(null);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [ratings, setRatings] = useState<Map<number, SkillRatingItem>>(new Map());
  const [completionPct, setCompletionPct] = useState(0);
  const [signature, setSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  const fetchChecklists = useCallback(async () => {
    try {
      const res = await fetch("/api/checklists");
      if (!res.ok) throw new Error("Failed to fetch checklists");
      const data = await res.json();
      setChecklists(data.checklists || []);
    } catch {
      setError("Failed to load checklists. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  const openChecklist = async (requestId: number) => {
    setIsLoadingChecklist(true);
    setActiveChecklistId(requestId);
    setSkills([]);
    setRatings(new Map());
    setSignature("");
    setCompletionPct(0);

    try {
      // Fetch skills for this checklist template
      const checklistReq = checklists.find((c) => c.id === requestId);
      if (!checklistReq) return;

      const templateId = checklistReq.checklist_template.id;

      // Get skills from the template
      const skillsRes = await fetch(`/api/checklists?templateId=${templateId}`);
      const skillsData = await skillsRes.json();

      if (skillsData.skills && skillsData.skills.length > 0) {
        setSkills(skillsData.skills);
      } else {
        // Create some sample skills if none exist
        setSkills([]);
      }

      // Load existing ratings if response exists
      if (checklistReq.candidate_response) {
        const ratingsRes = await fetch(`/api/checklists?responseId=${checklistReq.candidate_response.id}`);
        const ratingsData = await ratingsRes.json();
        if (ratingsData.ratings) {
          const ratingsMap = new Map<number, SkillRatingItem>();
          ratingsData.ratings.forEach((r: SkillRatingItem) => {
            ratingsMap.set(r.skill_id, r);
          });
          setRatings(ratingsMap);
        }
      }

      setCompletionPct(checklistReq.completion_pct);
    } catch {
      toast.error("Failed to load checklist details");
    } finally {
      setIsLoadingChecklist(false);
    }
  };

  const closeChecklist = () => {
    setActiveChecklistId(null);
    setSkills([]);
    setRatings(new Map());
    setSignature("");
    setCompletionPct(0);
  };

  const saveRating = async (skillId: number, ratingValue: string | null, isNa: boolean) => {
    if (!activeChecklistId) return;

    setAutoSaving(true);
    try {
      const res = await fetch("/api/checklists/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistRequestId: activeChecklistId,
          skillId,
          ratingValue,
          isNa,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCompletionPct(data.completionPct);

        // Update local ratings
        const newRatings = new Map(ratings);
        if (data.rating) {
          newRatings.set(skillId, data.rating);
          setRatings(newRatings);
        }
      }
    } catch {
      // Silently fail auto-save
    } finally {
      setAutoSaving(false);
    }
  };

  // Debounced save for text inputs
  const debouncedSave = useCallback(
    (() => {
      let timer: NodeJS.Timeout;
      return (skillId: number, value: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => saveRating(skillId, value, false), 800);
      };
    })(),
    [activeChecklistId, ratings]
  );

  const handleSubmit = async () => {
    if (!activeChecklistId) return;

    // Verify all skills rated
    const unrated = skills.filter((s) => {
      const rating = ratings.get(s.id);
      return !rating || (rating.rating_value === null && !rating.is_na);
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
      const res = await fetch("/api/checklists/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistRequestId: activeChecklistId,
          signature: signature.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("Submit failed", { description: data.error });
        return;
      }

      toast.success("Checklist submitted successfully!");
      router.push("/dashboard?submitted=true");
    } catch {
      toast.error("Failed to submit checklist");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group skills by category
  const groupedSkills = skills.reduce<Record<string, SkillItem[]>>((acc, skill) => {
    const cat = skill.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const allSkillsRated =
    skills.length > 0 &&
    skills.every((s) => {
      const rating = ratings.get(s.id);
      return rating && (rating.rating_value !== null || rating.is_na);
    });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Checklists" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Checklists" />
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchChecklists} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active Checklist Form View
  if (activeChecklistId) {
    const activeChecklist = checklists.find((c) => c.id === activeChecklistId);

    if (isLoadingChecklist) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={closeChecklist}>
              <ChevronLeft className="size-4" />
              Back
            </Button>
          </div>
          <Skeleton className="h-8 w-full" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={closeChecklist} className="gap-1">
            <ChevronLeft className="size-4" />
            Back
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {activeChecklist?.checklist_template.name || "Skills Checklist"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {activeChecklist?.checklist_template.profession} — {activeChecklist?.checklist_template.specialty}
            </p>
          </div>
          {autoSaving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              Saving...
            </span>
          )}
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm font-semibold text-primary">{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-2" />
          </CardContent>
        </Card>

        {/* Empty skills state */}
        {skills.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardCheck className="size-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No skills found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This checklist template has no skills configured yet. Please contact support.
              </p>
              <Button variant="outline" onClick={closeChecklist} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Skills by category */}
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
                      const rating = ratings.get(skill.id);
                      const currentValue = rating?.rating_value ?? null;
                      const isNa = rating?.is_na ?? false;

                      return (
                        <div key={skill.id}>
                          {idx > 0 && <Separator className="my-3" />}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{skill.skill_name}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Rating input based on question_type */}
                              {skill.question_type === "rating_1_5" && (
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((val) => (
                                    <Button
                                      key={val}
                                      type="button"
                                      size="sm"
                                      variant={currentValue === String(val) ? "default" : "outline"}
                                      className="size-9 p-0 text-xs font-medium"
                                      disabled={isNa}
                                      onClick={() => saveRating(skill.id, String(val), false)}
                                    >
                                      {val}
                                    </Button>
                                  ))}
                                </div>
                              )}

                              {skill.question_type === "yes_no" && (
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={currentValue === "yes" ? "default" : "outline"}
                                    className="gap-1"
                                    disabled={isNa}
                                    onClick={() => saveRating(skill.id, "yes", false)}
                                  >
                                    <Check className="size-3" /> Yes
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={currentValue === "no" ? "default" : "outline"}
                                    className="gap-1"
                                    disabled={isNa}
                                    onClick={() => saveRating(skill.id, "no", false)}
                                  >
                                    <X className="size-3" /> No
                                  </Button>
                                </div>
                              )}

                              {skill.question_type === "text" && (
                                <Input
                                  type="text"
                                  placeholder="Enter response..."
                                  defaultValue={currentValue || ""}
                                  disabled={isNa}
                                  className="w-48 h-9 text-sm"
                                  onChange={(e) => debouncedSave(skill.id, e.target.value)}
                                />
                              )}

                              {/* N/A checkbox */}
                              {skill.has_na_option && (
                                <div className="flex items-center gap-1.5 ml-2">
                                  <Checkbox
                                    id={`na-${skill.id}`}
                                    checked={isNa}
                                    onCheckedChange={(checked) =>
                                      saveRating(skill.id, null, checked === true)
                                    }
                                  />
                                  <Label htmlFor={`na-${skill.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                    N/A
                                  </Label>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Attestation & Signature */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-base">Attestation & Signature</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm">
                    I certify that the ratings above are an accurate self-assessment of my current clinical skills.
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
                <Button
                  className="w-full gap-2"
                  size="lg"
                  disabled={!allSkillsRated || !signature.trim() || isSubmitting}
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
                {(!allSkillsRated || !signature.trim()) && (
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

  // Checklist List View
  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklists"
        description="Complete your profession-specific skills checklists as requested by employers."
      />

      {checklists.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="size-7 text-primary" />
            </div>
            <h3 className="text-lg font-medium">No checklists yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              When a recruiter sends you a checklist request, it will appear here.
              Complete it to share your verified skills with employers.
            </p>
            <Button variant="outline" className="mt-4" disabled>
              Waiting for requests
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {checklists.map((checklist) => {
            const orgName =
              checklist.client_user?.organization?.name || "Unknown Agency";
            const isPending = checklist.status === "sent";
            const isCompleted = checklist.status === "completed";

            return (
              <Card
                key={checklist.id}
                className={`group transition-all ${
                  isPending ? "hover:shadow-md cursor-pointer border-primary/20" : ""
                }`}
                onClick={() => isPending && openChecklist(checklist.id)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : "bg-primary/10"
                    }`}
                  >
                    <ClipboardCheck
                      className={`size-5 ${
                        isCompleted
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-primary"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {checklist.checklist_template.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      From {orgName} · {new Date(checklist.created_at).toLocaleDateString()}
                    </p>
                    {isPending && checklist.completion_pct > 0 && (
                      <div className="mt-2">
                        <Progress value={checklist.completion_pct} className="h-1.5" />
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {checklist.completion_pct}% complete
                        </p>
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={
                      isCompleted
                        ? "default"
                        : isPending
                          ? "secondary"
                          : "outline"
                    }
                    className="shrink-0"
                  >
                    {isCompleted
                      ? "Completed"
                      : isPending
                        ? "Pending"
                        : checklist.status}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

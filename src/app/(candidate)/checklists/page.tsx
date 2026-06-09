"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Loader2,
  Eye,
  Check,
  X,
  ChevronRight,
  Save,
  Send,
  Clock,
  CheckCircle2,
  Info,
} from "@/lib/icons";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────

interface Skill {
  id: number;
  skillName: string;
  category: string;
  questionType: "rating_1_4" | "yes_no" | "text";
  sortOrder: number;
  hasNaOption: boolean;
}

interface Template {
  id: number;
  profession: string;
  specialty: string;
  name: string;
  jobTitle: string;
  isActive: boolean;
  skills: Skill[];
}

interface Recruiter {
  id: number;
  name: string;
  organization: string;
}

interface ExistingRating {
  skillId: number;
  ratingValue: string | null;
  isNa: boolean;
  textValue?: string;
}

interface ChecklistItem {
  id: number;
  status: "sent" | "opened" | "completed";
  completionPct: number;
  openedAt: string | null;
  createdAt: string;
  candidateResponseId: number | null;
  template: Template;
  recruiter: Recruiter;
  existingRatings: ExistingRating[];
  responseStatus: "active" | "submitted" | null;
  submittedAt: string | null;
}

interface RatingState {
  [skillId: number]: {
    ratingValue: string | null;
    isNa: boolean;
    textValue?: string;
  };
}

// ─── Status Helpers ───────────────────────────────────────────────────────

type DisplayStatus = "pending" | "in_progress" | "completed";

function getDisplayStatus(item: ChecklistItem): DisplayStatus {
  if (item.status === "completed") return "completed";
  if (item.status === "opened" || item.responseStatus === "active")
    return "in_progress";
  return "pending";
}

function getStatusBadge(status: DisplayStatus) {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100">
          <Clock className="size-3 mr-1" />
          Pending
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
          <Loader2 className="size-3 mr-1" />
          In Progress
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
          <CheckCircle2 className="size-3 mr-1" />
          Completed
        </Badge>
      );
  }
}

function getStatusColor(status: DisplayStatus) {
  switch (status) {
    case "pending":
      return "text-amber-600";
    case "in_progress":
      return "text-blue-600";
    case "completed":
      return "text-green-600";
  }
}

// ─── Rating Button Config ─────────────────────────────────────────────────

const ratingLabels: Record<string, string> = {
  "1": "No theory/experience",
  "2": "Limited Experience",
  "3": "Experienced",
  "4": "Proficient",
};

interface RatingBtnStyle {
  selected: string;
  unselected: string;
}

const ratingBtnStyles: Record<string, RatingBtnStyle> = {
  "1": {
    selected:
      "bg-[#FEE2E2] border-[#DC2626] text-[#DC2626] shadow-sm",
    unselected:
      "border-gray-200 text-gray-400 hover:border-[#DC2626] hover:text-[#DC2626]",
  },
  "2": {
    selected:
      "bg-[#FEF9C3] border-[#CA8A04] text-[#CA8A04] shadow-sm",
    unselected:
      "border-gray-200 text-gray-400 hover:border-[#CA8A04] hover:text-[#CA8A04]",
  },
  "3": {
    selected:
      "bg-[#DBEAFE] border-[#2563EB] text-[#2563EB] shadow-sm",
    unselected:
      "border-gray-200 text-gray-400 hover:border-[#2563EB] hover:text-[#2563EB]",
  },
  "4": {
    selected:
      "bg-[#166534] border-[#166534] text-white shadow-sm",
    unselected:
      "border-gray-200 text-gray-400 hover:border-[#166534] hover:text-[#166534]",
  },
};

// ─── Rating Button Component ──────────────────────────────────────────────

function RatingButton({
  value,
  label,
  isSelected,
  onClick,
  disabled,
}: {
  value: string;
  label: string;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const style = ratingBtnStyles[value];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg border-2 px-3 py-1.5 text-sm font-semibold transition-all duration-150 min-w-[44px] ${
        isSelected ? style.selected : style.unselected
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      title={label}
    >
      {value}
    </button>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────

export default function CandidateChecklistsPage() {
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] =
    useState<ChecklistItem | null>(null);

  // Form state
  const [ratings, setRatings] = useState<RatingState>({});
  const [signatureName, setSignatureName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Fetch Checklists ─────────────────────────────────────────────────

  const fetchChecklists = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/checklists");
      if (!res.ok) throw new Error("Failed to fetch checklists");
      const data = await res.json();
      setChecklists(data.checklists || []);
    } catch {
      setError("Failed to load checklists. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  // ─── Stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const pending = checklists.filter(
      (c) => getDisplayStatus(c) === "pending"
    ).length;
    const inProgress = checklists.filter(
      (c) => getDisplayStatus(c) === "in_progress"
    ).length;
    const completed = checklists.filter(
      (c) => getDisplayStatus(c) === "completed"
    ).length;
    return { pending, inProgress, completed };
  }, [checklists]);

  // ─── Auto-Save ────────────────────────────────────────────────────────

  const autoSave = useCallback(
    async (
      requestId: number,
      updatedRatings: RatingState,
      skills: Skill[]
    ) => {
      try {
        const ratingPayload = skills.map((skill) => ({
          skillId: skill.id,
          ratingValue:
            skill.questionType === "text"
              ? updatedRatings[skill.id]?.textValue || null
              : updatedRatings[skill.id]?.ratingValue || null,
          isNa: updatedRatings[skill.id]?.isNa || false,
        }));

        const res = await fetch("/api/candidate/checklists/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            ratings: ratingPayload,
          }),
        });

        if (res.ok) {
          const result = await res.json();
          // Update the checklist's completion percentage locally
          setChecklists((prev) =>
            prev.map((c) =>
              c.id === requestId
                ? { ...c, completionPct: result.completionPct }
                : c
            )
          );
        }
      } catch {
        // Silent fail for auto-save
      }
    },
    []
  );

  const debouncedAutoSave = useCallback(
    (requestId: number, updatedRatings: RatingState, skills: Skill[]) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        autoSave(requestId, updatedRatings, skills);
      }, 800);
    },
    [autoSave]
  );

  // ─── Rating Change Handler ────────────────────────────────────────────

  const handleRatingChange = useCallback(
    (
      skillId: number,
      value: string | null,
      isNa: boolean,
      textValue?: string
    ) => {
      if (!selectedChecklist) return;

      setRatings((prev) => {
        const updated = {
          ...prev,
          [skillId]: { ratingValue: value, isNa, textValue },
        };

        // Trigger auto-save
        debouncedAutoSave(
          selectedChecklist.id,
          updated,
          selectedChecklist.template.skills
        );

        return updated;
      });
    },
    [selectedChecklist, debouncedAutoSave]
  );

  // ─── Open Checklist Dialog ────────────────────────────────────────────

  const handleOpenChecklist = useCallback((checklist: ChecklistItem) => {
    setSelectedChecklist(checklist);

    // Initialize ratings from existing ratings
    const initialRatings: RatingState = {};
    checklist.existingRatings.forEach((r) => {
      initialRatings[r.skillId] = {
        ratingValue: r.ratingValue,
        isNa: r.isNa,
        textValue: r.ratingValue || "",
      };
    });
    setRatings(initialRatings);
    setSignatureName("");
    setFormOpen(true);
  }, []);

  // ─── View Submission Dialog ───────────────────────────────────────────

  const handleViewSubmission = useCallback((checklist: ChecklistItem) => {
    setSelectedChecklist(checklist);

    const initialRatings: RatingState = {};
    checklist.existingRatings.forEach((r) => {
      initialRatings[r.skillId] = {
        ratingValue: r.ratingValue,
        isNa: r.isNa,
        textValue: r.ratingValue || "",
      };
    });
    setRatings(initialRatings);
    setViewOpen(true);
  }, []);

  // ─── Calculate Completion ─────────────────────────────────────────────

  const calculateCompletion = useCallback(
    (checklist: ChecklistItem, currentRatings?: RatingState) => {
      const skills = checklist.template.skills;
      if (skills.length === 0) return 0;

      const ratedCount = skills.filter((skill) => {
        const rating =
          currentRatings?.[skill.id] ??
          checklist.existingRatings.find((r) => r.skillId === skill.id);
        if (!rating) return false;
        if (rating.isNa) return true;
        if (skill.questionType === "text") return !!rating.textValue?.trim();
        return !!rating.ratingValue;
      }).length;

      return Math.round((ratedCount / skills.length) * 100);
    },
    []
  );

  const isAllSkillsRated = useMemo(() => {
    if (!selectedChecklist) return false;
    return calculateCompletion(selectedChecklist, ratings) === 100;
  }, [selectedChecklist, ratings, calculateCompletion]);

  // ─── Final Submit ─────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!selectedChecklist || !signatureName.trim()) return;

    setIsSubmitting(true);
    try {
      const skills = selectedChecklist.template.skills;
      const ratingPayload = skills.map((skill) => ({
        skillId: skill.id,
        ratingValue:
          skill.questionType === "text"
            ? ratings[skill.id]?.textValue || null
            : ratings[skill.id]?.ratingValue || null,
        isNa: ratings[skill.id]?.isNa || false,
      }));

      const res = await fetch("/api/candidate/checklists/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedChecklist.id,
          ratings: ratingPayload,
          digitalSignature: signatureName.trim(),
          candidateNameSigned: signatureName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit checklist");
      }

      toast.success("Checklist submitted successfully!", {
        description: "Your skills checklist has been saved and submitted.",
      });

      setFormOpen(false);
      setSelectedChecklist(null);
      fetchChecklists();
    } catch (err) {
      toast.error("Failed to submit checklist", {
        description:
          err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedChecklist, signatureName, ratings, fetchChecklists]);

  // ─── Group Skills by Category ─────────────────────────────────────────

  const groupSkillsByCategory = (skills: Skill[]) => {
    const groups: Record<string, Skill[]> = {};
    skills.forEach((skill) => {
      if (!groups[skill.category]) {
        groups[skill.category] = [];
      }
      groups[skill.category].push(skill);
    });
    return groups;
  };

  // ─── Rating Legend Component ──────────────────────────────────────────

  const RatingLegend = () => (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Rating Scale
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["1", "2", "3", "4"] as const).map((val) => {
          const style = ratingBtnStyles[val];
          return (
            <div key={val} className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center rounded-lg border-2 px-2 py-1 text-xs font-bold ${style.selected}`}
              >
                {val}
              </span>
              <span className="text-xs text-gray-600">
                {ratingLabels[val]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Skill Row Component ──────────────────────────────────────────────

  const SkillRow = ({
    skill,
    disabled,
  }: {
    skill: Skill;
    disabled: boolean;
  }) => {
    const currentRating = ratings[skill.id];

    if (skill.questionType === "yes_no") {
      const currentVal = currentRating?.ratingValue;
      const isNa = currentRating?.isNa ?? false;

      return (
        <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-b-0">
          <span
            className={`text-sm font-medium flex-1 ${
              isNa ? "text-gray-400 line-through" : "text-gray-700"
            }`}
          >
            {skill.skillName}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                handleRatingChange(skill.id, "yes", false)
              }
              className={`inline-flex items-center justify-center rounded-lg border-2 px-4 py-1.5 text-sm font-semibold transition-all duration-150 min-w-[52px] ${
                currentVal === "yes" && !isNa
                  ? "bg-[#166534] border-[#166534] text-white shadow-sm"
                  : "border-gray-200 text-gray-400 hover:border-[#166534] hover:text-[#166534]"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              Yes
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                handleRatingChange(skill.id, "no", false)
              }
              className={`inline-flex items-center justify-center rounded-lg border-2 px-4 py-1.5 text-sm font-semibold transition-all duration-150 min-w-[52px] ${
                currentVal === "no" && !isNa
                  ? "bg-[#DC2626] border-[#DC2626] text-white shadow-sm"
                  : "border-gray-200 text-gray-400 hover:border-[#DC2626] hover:text-[#DC2626]"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              No
            </button>
            {skill.hasNaOption && (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  handleRatingChange(
                    skill.id,
                    isNa ? null : currentVal,
                    !isNa
                  )
                }
                className={`inline-flex items-center justify-center rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all duration-150 min-w-[44px] ${
                  isNa
                    ? "bg-gray-600 border-gray-600 text-white shadow-sm"
                    : "border-gray-200 text-gray-400 hover:border-gray-500 hover:text-gray-600"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                N/A
              </button>
            )}
          </div>
        </div>
      );
    }

    if (skill.questionType === "text") {
      const textVal = currentRating?.textValue || "";
      const isNa = currentRating?.isNa ?? false;

      return (
        <div className="py-3 border-b border-gray-100 last:border-b-0">
          <Label
            className={`text-sm font-medium mb-2 block ${
              isNa ? "text-gray-400 line-through" : "text-gray-700"
            }`}
          >
            {skill.skillName}
          </Label>
          <div className="flex items-start gap-2">
            <Textarea
              value={isNa ? "" : textVal}
              onChange={(e) =>
                handleRatingChange(skill.id, null, false, e.target.value)
              }
              disabled={disabled || isNa}
              placeholder="Enter your response..."
              className="min-h-[60px] resize-none"
            />
            {skill.hasNaOption && (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  handleRatingChange(skill.id, null, !isNa, textVal)
                }
                className={`inline-flex items-center justify-center rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all duration-150 min-w-[44px] shrink-0 ${
                  isNa
                    ? "bg-gray-600 border-gray-600 text-white shadow-sm"
                    : "border-gray-200 text-gray-400 hover:border-gray-500 hover:text-gray-600"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                N/A
              </button>
            )}
          </div>
        </div>
      );
    }

    // Default: rating_1_4
    const currentVal = currentRating?.ratingValue ?? null;
    const isNa = currentRating?.isNa ?? false;

    return (
      <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-b-0">
        <span
          className={`text-sm font-medium flex-1 ${
            isNa ? "text-gray-400 line-through" : "text-gray-700"
          }`}
        >
          {skill.skillName}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {(["1", "2", "3", "4"] as const).map((val) => (
            <RatingButton
              key={val}
              value={val}
              label={ratingLabels[val]}
              isSelected={currentVal === val && !isNa}
              onClick={() => handleRatingChange(skill.id, val, false)}
              disabled={disabled || isNa}
            />
          ))}
          {skill.hasNaOption && (
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                handleRatingChange(
                  skill.id,
                  isNa ? null : currentVal,
                  !isNa
                )
              }
              className={`inline-flex items-center justify-center rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all duration-150 min-w-[44px] ${
                isNa
                  ? "bg-gray-600 border-gray-600 text-white shadow-sm"
                  : "border-gray-200 text-gray-400 hover:border-gray-500 hover:text-gray-600"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              N/A
            </button>
          )}
        </div>
      </div>
    );
  };

  // ─── Checklist Form Content (shared between form and view) ────────────

  const ChecklistContent = ({
    checklist,
    readOnly,
  }: {
    checklist: ChecklistItem;
    readOnly: boolean;
  }) => {
    const skills = checklist.template.skills;
    const grouped = groupSkillsByCategory(skills);
    const categoryCount = Object.keys(grouped).length;
    const completion = readOnly
      ? checklist.completionPct
      : calculateCompletion(checklist, ratings);

    return (
      <div className="flex flex-col h-full">
        {/* Progress Bar */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-500">
              Completion
            </span>
            <span className="text-xs font-bold text-gray-700">
              {completion}%
            </span>
          </div>
          <Progress value={completion} className="h-2" />
        </div>

        {/* Sticky Bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {checklist.template.name}
            </span>
            <Badge className="bg-[#DCFCE7] text-[#166534] border-[#BBF7D0] text-xs hover:bg-[#DCFCE7]">
              {checklist.template.profession}
            </Badge>
            <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
              {checklist.template.specialty}
            </Badge>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Intro Card */}
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-lg bg-[#DCFCE7] flex items-center justify-center shrink-0">
                  <ClipboardCheck className="size-5 text-[#166534]" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">
                      {checklist.recruiter.organization}
                    </span>{" "}
                    requests your:
                  </p>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {checklist.template.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-[#DCFCE7] text-[#166534] border-[#BBF7D0] text-xs hover:bg-[#DCFCE7]">
                      {checklist.template.specialty}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                      {checklist.template.profession}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Box */}
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <Info className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Complete this once and it saves to your vault for 30 days.
            </p>
          </div>

          {/* Rating Legend */}
          <RatingLegend />

          {/* Skills by Category */}
          {Object.entries(grouped).map(([category, categorySkills]) => (
            <div key={category} className="space-y-0">
              <div className="flex items-center gap-2 border-l-4 border-[#166534] pl-3 py-1 mb-2">
                <h3 className="text-sm font-bold text-gray-800">
                  {category}
                </h3>
                <span className="text-xs text-gray-400">
                  ({categorySkills.length}{" "}
                  {categorySkills.length === 1 ? "skill" : "skills"})
                </span>
              </div>
              <Card className="border-gray-200">
                <CardContent className="p-4">
                  {categorySkills.map((skill) => (
                    <SkillRow
                      key={skill.id}
                      skill={skill}
                      disabled={readOnly}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Signature Section (only in form mode when all rated) */}
          {!readOnly && isAllSkillsRated && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-[#166534]" />
                  <h3 className="text-sm font-bold text-gray-800">
                    Attestation & Signature
                  </h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  I attest that the information provided in this skills checklist
                  is accurate and reflects my true level of experience.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label
                      htmlFor="signature-name"
                      className="text-sm font-medium text-gray-700"
                    >
                      Type your full legal name
                    </Label>
                    <Input
                      id="signature-name"
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      placeholder="Full legal name"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Date
                    </Label>
                    <Input
                      value={new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      readOnly
                      className="mt-1.5 bg-gray-50"
                    />
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={!signatureName.trim() || isSubmitting}
                    className="w-full bg-[#166534] hover:bg-[#14532D] text-white gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Submit Checklist
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Read-only: Submitted Info */}
          {readOnly && checklist.submittedAt && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-[#166534]" />
                  <h3 className="text-sm font-bold text-gray-800">
                    Submitted
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  This checklist was submitted on{" "}
                  <span className="font-semibold">
                    {new Date(checklist.submittedAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </span>
                  .
                </p>
                {checklist.existingRatings.some((r) => r.isNa === false && r.ratingValue) && (
                  <p className="text-xs text-gray-500 mt-1">
                    Signed and attested by the candidate.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {categoryCount} {categoryCount === 1 ? "category" : "categories"} —{" "}
            {skills.length} total skills
          </span>
          {!readOnly && (
            <span className="flex items-center gap-1 text-xs text-[#166534]">
              <Save className="size-3" />
              Your progress is auto-saved
            </span>
          )}
        </div>
      </div>
    );
  };

  // ─── Loading State ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Checklists"
          description="View and complete your skills checklists requested by recruiters."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-10 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Checklists"
          description="View and complete your skills checklists requested by recruiters."
        />
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

  // ─── Main Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Checklists"
        description="View and complete your skills checklists requested by recruiters."
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  Pending
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.pending}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="size-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Awaiting your response
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  In Progress
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.inProgress}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Loader2 className="size-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Partially completed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">
                  Completed
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.completed}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="size-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Submitted & verified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Checklist List */}
      {checklists.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="size-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">
              No checklists yet
            </h3>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              When a recruiter sends you a skills checklist, it will appear
              here. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {checklists.map((checklist) => {
            const displayStatus = getDisplayStatus(checklist);
            const completionPct = checklist.completionPct;

            return (
              <Card
                key={checklist.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900 truncate">
                          {checklist.template.name}
                        </h3>
                        {getStatusBadge(displayStatus)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-[#DCFCE7] text-[#166534] border-[#BBF7D0] text-xs hover:bg-[#DCFCE7]">
                          {checklist.template.profession}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs border-gray-300 text-gray-600"
                        >
                          {checklist.template.specialty}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        From{" "}
                        <span className="font-medium text-gray-700">
                          {checklist.recruiter.name}
                        </span>
                        {checklist.recruiter.organization && (
                          <>
                            {" "}
                            at{" "}
                            <span className="font-medium text-gray-700">
                              {checklist.recruiter.organization}
                            </span>
                          </>
                        )}
                      </p>
                      {/* Completion bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Progress
                          </span>
                          <span
                            className={`text-xs font-semibold ${getStatusColor(
                              displayStatus
                            )}`}
                          >
                            {completionPct}%
                          </span>
                        </div>
                        <Progress value={completionPct} className="h-1.5" />
                      </div>
                      <p className="text-xs text-gray-400">
                        Sent{" "}
                        {new Date(checklist.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>

                    {/* Right: Action Button */}
                    <div className="shrink-0">
                      {displayStatus === "completed" ? (
                        <Button
                          variant="outline"
                          className="gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                          onClick={() => handleViewSubmission(checklist)}
                        >
                          <Eye className="size-4" />
                          View Submission
                        </Button>
                      ) : (
                        <Button
                          className="gap-2 bg-[#166534] hover:bg-[#14532D] text-white"
                          onClick={() => handleOpenChecklist(checklist)}
                        >
                          <ChevronRight className="size-4" />
                          Open Checklist
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Checklist Form Dialog ────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(open) => {
        if (!open) {
          // Flush any pending auto-save
          if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = null;
          }
          if (selectedChecklist) {
            autoSave(selectedChecklist.id, ratings, selectedChecklist.template.skills);
          }
        }
        setFormOpen(open);
      }}>
        <DialogContent
          className="max-w-[860px] max-h-[90vh] p-0 gap-0 overflow-hidden"
          showCloseButton={false}
        >
          <DialogHeader className="px-6 pt-4 pb-3 border-b border-gray-200 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-[#DCFCE7] flex items-center justify-center">
                <ClipboardCheck className="size-5 text-[#166534]" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900">
                  {selectedChecklist?.template.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  {selectedChecklist?.template.profession} •{" "}
                  {selectedChecklist?.template.specialty}
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={() => setFormOpen(false)}
              className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            >
              <X className="size-4" />
            </button>
          </DialogHeader>

          {selectedChecklist && (
            <ChecklistContent
              checklist={selectedChecklist}
              readOnly={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ─── View Submission Dialog ───────────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent
          className="max-w-[860px] max-h-[90vh] p-0 gap-0 overflow-hidden"
          showCloseButton={false}
        >
          <DialogHeader className="px-6 pt-4 pb-3 border-b border-gray-200 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="size-5 text-green-700" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900">
                  {selectedChecklist?.template.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  {selectedChecklist?.template.profession} •{" "}
                  {selectedChecklist?.template.specialty} — Submitted
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={() => setViewOpen(false)}
              className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            >
              <X className="size-4" />
            </button>
          </DialogHeader>

          {selectedChecklist && (
            <ChecklistContent
              checklist={selectedChecklist}
              readOnly={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

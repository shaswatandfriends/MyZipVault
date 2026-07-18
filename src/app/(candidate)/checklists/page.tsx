"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck,
  Loader2,
  Eye,
  ChevronRight,
  Clock,
  CheckCircle2,
  Download,
  Sparkles,
  TrendingUp,
  ShieldCheck,
} from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerChildren, StaggerItem, CountUp } from "@/components/motion";

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
  status: "sent" | "opened" | "completed" | "in_progress" | "reuse_pending" | "expired" | "declined" | "cancelled";
  completionPct: number;
  openedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  candidateResponseId: number | null;
  template: Template;
  recruiter: Recruiter;
  existingRatings: ExistingRating[];
  responseStatus: "active" | "submitted" | "expired" | null;
  submittedAt: string | null;
  reusePending: boolean;
  reuseExistingResponseId: number | null;
}

// ─── Status Helpers ───────────────────────────────────────────────────────

type DisplayStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "reuse_pending"
  | "expired";

function getDisplayStatus(item: ChecklistItem): DisplayStatus {
  if (item.status === "completed") return "completed";
  if (item.status === "expired") return "expired";
  if (item.status === "reuse_pending") return "reuse_pending";
  // In Progress = request opened, OR candidate has started (responseStatus active/submitted)
  if (item.status === "opened" || item.status === "in_progress" || item.responseStatus === "active" || item.responseStatus === "submitted")
    return "in_progress";
  return "pending";
}

function getStatusConfig(status: DisplayStatus) {
  switch (status) {
    case "pending":
      return {
        label: "Pending",
        icon: Clock,
        badgeClass: "bg-badge-yellow-bg text-badge-yellow border-badge-yellow/20",
        dotClass: "bg-badge-yellow",
        ringClass: "ring-badge-yellow/30",
      };
    case "in_progress":
      return {
        label: "In Progress",
        icon: Loader2,
        badgeClass: "bg-badge-blue-bg text-badge-blue border-badge-blue/20",
        dotClass: "bg-badge-blue",
        ringClass: "ring-badge-blue/30",
      };
    case "completed":
      return {
        label: "Completed",
        icon: CheckCircle2,
        badgeClass: "bg-badge-green-bg text-badge-green border-badge-green/20",
        dotClass: "bg-badge-green",
        ringClass: "ring-badge-green/30",
      };
    case "reuse_pending":
      return {
        label: "Share Request",
        icon: Sparkles,
        badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
        dotClass: "bg-purple-500",
        ringClass: "ring-purple-200",
      };
    case "expired":
      return {
        label: "Expired",
        icon: Clock,
        badgeClass: "bg-gray-100 text-gray-500 border-gray-200",
        dotClass: "bg-gray-400",
        ringClass: "ring-gray-200",
      };
  }
}

// ─── Stat Card Component ──────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  isActive,
  onClick,
  delay = 0,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "amber" | "blue" | "green";
  isActive: boolean;
  onClick: () => void;
  delay?: number;
}) {
  const colorMap = {
    amber: {
      iconBg: "bg-badge-yellow-bg",
      iconText: "text-badge-yellow",
      ring: "ring-badge-yellow/40",
      gradient: "from-amber-500/5 to-transparent",
    },
    blue: {
      iconBg: "bg-badge-blue-bg",
      iconText: "text-badge-blue",
      ring: "ring-badge-blue/40",
      gradient: "from-blue-500/5 to-transparent",
    },
    green: {
      iconBg: "bg-badge-green-bg",
      iconText: "text-badge-green",
      ring: "ring-badge-green/40",
      gradient: "from-emerald-500/5 to-transparent",
    },
  };

  const c = colorMap[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "premium-card w-full text-left p-5 cursor-pointer transition-all duration-300",
        isActive && `ring-2 ${c.ring}`
      )}
    >
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
            {label}
          </p>
          <p className="text-3xl font-bold text-foreground font-heading tracking-tight">
            {value}
          </p>
        </div>
        <div className={cn("size-12 rounded-xl flex items-center justify-center", c.iconBg)}>
          <Icon className={cn("size-5", c.iconText)} />
        </div>
      </div>
    </button>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────

export default function CandidateChecklistsPage() {
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");

  // ─── Fetch Checklists ─────────────────────────────────────────────

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

  // ─── Stats ────────────────────────────────────────────────────────

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

  // ─── Filtered Checklists ──────────────────────────────────────────

  const filteredChecklists = useMemo(() => {
    if (filter === "all") return checklists;
    return checklists.filter((c) => getDisplayStatus(c) === filter);
  }, [checklists, filter]);

  // ─── Loading State ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="My Checklists"
          description="View and complete your skills checklists requested by recruiters."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="premium-card p-5">
              <div className="relative z-10">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-8 w-10" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="premium-card p-5">
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-2.5 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-10 w-28 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="My Checklists"
          description="View and complete your skills checklists requested by recruiters."
        />
        <div className="glass-card-static p-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchChecklists} variant="outline" className="btn-outline-premium">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Checklists"
        description="View and complete your skills checklists requested by recruiters."
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          color="amber"
          isActive={filter === "pending"}
          onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
          delay={0}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={TrendingUp}
          color="blue"
          isActive={filter === "in_progress"}
          onClick={() => setFilter(filter === "in_progress" ? "all" : "in_progress")}
          delay={100}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={ShieldCheck}
          color="green"
          isActive={filter === "completed"}
          onClick={() => setFilter(filter === "completed" ? "all" : "completed")}
          delay={200}
        />
      </div>

      {/* Filter indicator */}
      {filter !== "all" && (
        <FadeIn duration={0.2}>
          <div className="flex items-center gap-3 px-1">
            <div className={cn(
              "size-2 rounded-full",
              filter === "pending" ? "bg-badge-yellow" :
              filter === "in_progress" ? "bg-badge-blue" : "bg-badge-green"
            )} />
            <span className="text-sm text-text-secondary">
              Showing: <span className="font-semibold text-foreground capitalize">{filter.replace("_", " ")}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-3 rounded-lg text-text-muted hover:text-foreground"
              onClick={() => setFilter("all")}
            >
              Clear filter
            </Button>
          </div>
        </FadeIn>
      )}

      {/* Checklist List */}
      {filteredChecklists.length === 0 ? (
        <FadeIn>
          <div className="glass-card-static p-12 text-center">
            <div className="size-16 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto mb-5">
              <ClipboardCheck className="size-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-bold text-foreground font-heading tracking-tight">
              {filter !== "all" ? "No checklists match this filter" : "No checklists yet"}
            </h3>
            <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
              {filter !== "all"
                ? "Try a different filter or clear it to see all checklists."
                : "When a recruiter sends you a skills checklist, it will appear here. Check back soon!"}
            </p>
          </div>
        </FadeIn>
      ) : (
        <StaggerChildren staggerDelay={0.06} className="space-y-4">
          {filteredChecklists.map((checklist) => {
            const displayStatus = getDisplayStatus(checklist);
            const statusConfig = getStatusConfig(displayStatus);
            const StatusIcon = statusConfig.icon;
            const completionPct = checklist.completionPct;
            const totalSkills = checklist.template.skills.length;
            const ratedSkills = checklist.existingRatings.filter(
              (r) => r.ratingValue !== null || r.isNa
            ).length;
            const categoryCount = new Set(checklist.template.skills.map((s) => s.category)).size;

            return (
              <StaggerItem key={checklist.id}>
                <div className="premium-card group p-5 sm:p-6">
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-bold text-foreground font-heading tracking-tight truncate">
                          {checklist.template.name}
                        </h3>
                        <Badge className={cn("text-[11px] font-semibold border gap-1.5 px-2.5 py-0.5 rounded-lg", statusConfig.badgeClass)}>
                          <StatusIcon className={cn("size-3", displayStatus === "in_progress" && "animate-spin")} />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-badge-green-bg text-badge-green border-badge-green/20 text-xs font-semibold px-2.5 py-0.5 rounded-lg hover:bg-badge-green-bg">
                          {checklist.template.profession}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs border-border text-text-secondary px-2.5 py-0.5 rounded-lg"
                        >
                          {checklist.template.specialty}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary">
                        From{" "}
                        <span className="font-medium text-foreground">
                          {checklist.recruiter.name}
                        </span>
                        {checklist.recruiter.organization && (
                          <>
                            {" "}at{" "}
                            <span className="font-medium text-foreground">
                              {checklist.recruiter.organization}
                            </span>
                          </>
                        )}
                      </p>
                      {/* Meta info */}
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span>{categoryCount} {categoryCount === 1 ? "category" : "categories"}</span>
                        <span className="text-border">|</span>
                        <span>{totalSkills} skills</span>
                        <span className="text-border">|</span>
                        <span>Sent {new Date(checklist.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      {/* Completion bar */}
                      {displayStatus !== "completed" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-text-secondary">Progress</span>
                            <span className="text-xs font-bold text-primary">
                              {completionPct}% ({ratedSkills}/{totalSkills})
                            </span>
                          </div>
                          <Progress
                            value={completionPct}
                            className="h-2 rounded-full bg-surface-3 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent-teal [&>div]:rounded-full"
                          />
                        </div>
                      )}
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2.5">
                      {displayStatus === "reuse_pending" ? (
                        <ReusePendingActions checklist={checklist} onActionDone={fetchChecklists} />
                      ) : displayStatus === "expired" ? (
                        <div className="text-right">
                          <Badge className="bg-gray-100 text-gray-500 border-gray-200">
                            Expired {checklist.expiresAt ? new Date(checklist.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                          </Badge>
                          <p className="text-xs text-text-muted mt-1.5 max-w-[200px]">
                            This request has expired. Ask your recruiter to resend.
                          </p>
                        </div>
                      ) : displayStatus === "completed" ? (
                        <>
                          <Link href={`/checklists/${checklist.id}`}>
                            <Button
                              variant="outline"
                              className="btn-outline-premium gap-2 rounded-xl h-10"
                            >
                              <Eye className="size-4" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            className="gap-2 border-primary/30 text-primary hover:bg-primary-light rounded-xl h-10"
                            onClick={() => window.open(`/api/candidate/checklists/${checklist.id}/pdf?mode=download`, '_blank')}
                          >
                            <Download className="size-4" />
                            PDF
                          </Button>
                        </>
                      ) : (
                        <Link href={`/checklists/${checklist.id}`}>
                          <Button
                            className="btn-gradient gap-2 rounded-xl h-10 font-semibold"
                          >
                            {displayStatus === "in_progress" ? (
                              <>
                                <Sparkles className="size-4" />
                                Continue Assessment
                              </>
                            ) : (
                              <>
                                <ChevronRight className="size-4" />
                                Start Assessment
                              </>
                            )}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>
      )}
    </div>
  );
}

// ─── Reuse-Pending Actions Component ────────────────────────────────────
// Shown when a recruiter requested a checklist the candidate already has a
// valid response for. Two options:
//   1. "Approve Share" — creates a ConsentShare linking the existing
//      response to the recruiter. Candidate picks an expiry (7/14/30/90
//      days). No re-completion needed.
//   2. "Complete New" — navigates to the assessment page. The rate
//      endpoint will detect reuse_pending status + supersede the old
//      response, creating a fresh one for the candidate to fill out.
function ReusePendingActions({
  checklist,
  onActionDone,
}: {
  checklist: ChecklistItem;
  onActionDone: () => void;
}) {
  const [approving, setApproving] = useState(false);
  const [expiryDays, setExpiryDays] = useState(30);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/candidate/checklists/${checklist.id}/share-existing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiryDays }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to share");
      toast.success("Checklist shared", {
        description: `Valid for ${expiryDays} days. Recruiter can now view it.`,
      });
      onActionDone();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to share";
      toast.error("Share failed", { description: msg });
    } finally {
      setApproving(false);
      setShowExpiryPicker(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-2.5 text-xs text-purple-700">
        <Sparkles className="size-3 inline mr-1" />
        You completed this on{" "}
        <strong>
          {checklist.submittedAt
            ? new Date(checklist.submittedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "earlier"}
        </strong>
        . Share it?
      </div>

      {showExpiryPicker ? (
        <div className="space-y-2 rounded-lg border p-2.5 bg-surface-2">
          <label className="text-xs font-medium text-text-secondary">
            Share expires in
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setExpiryDays(d)}
                className={cn(
                  "text-xs font-semibold py-1.5 rounded-md border transition-colors",
                  expiryDays === d
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-border text-text-secondary hover:border-primary/40"
                )}
              >
                {d}d
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="btn-gradient gap-1.5 h-8 flex-1 text-xs"
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <ShieldCheck className="size-3" />
              )}
              Confirm Share
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setShowExpiryPicker(false)}
              disabled={approving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Button
            size="sm"
            className="btn-gradient gap-1.5 h-9"
            onClick={() => setShowExpiryPicker(true)}
            disabled={approving}
          >
            <ShieldCheck className="size-3.5" />
            Approve Share
          </Button>
          <Link href={`/checklists/${checklist.id}`}>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9 w-full border-border text-text-secondary hover:bg-surface-2"
            >
              <ChevronRight className="size-3.5" />
              Complete New
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

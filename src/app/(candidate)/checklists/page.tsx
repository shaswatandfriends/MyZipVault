"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

// ─── Main Page Component ──────────────────────────────────────────────────

export default function CandidateChecklistsPage() {
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");

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

  // ─── Filtered Checklists ──────────────────────────────────────────────

  const filteredChecklists = useMemo(() => {
    if (filter === "all") return checklists;
    return checklists.filter((c) => getDisplayStatus(c) === filter);
  }, [checklists, filter]);

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
        <Card
          className={cn(
            "hover:shadow-md transition-shadow cursor-pointer",
            filter === "pending" && "ring-2 ring-amber-300"
          )}
          onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
        >
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

        <Card
          className={cn(
            "hover:shadow-md transition-shadow cursor-pointer",
            filter === "in_progress" && "ring-2 ring-blue-300"
          )}
          onClick={() => setFilter(filter === "in_progress" ? "all" : "in_progress")}
        >
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

        <Card
          className={cn(
            "hover:shadow-md transition-shadow cursor-pointer",
            filter === "completed" && "ring-2 ring-green-300"
          )}
          onClick={() => setFilter(filter === "completed" ? "all" : "completed")}
        >
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

      {/* Filter indicator */}
      {filter !== "all" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6B7280]">
            Showing: <span className="font-semibold capitalize">{filter.replace("_", " ")}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6 px-2"
            onClick={() => setFilter("all")}
          >
            Clear filter
          </Button>
        </div>
      )}

      {/* Checklist List */}
      {filteredChecklists.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="size-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">
              {filter !== "all" ? "No checklists match this filter" : "No checklists yet"}
            </h3>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              {filter !== "all"
                ? "Try a different filter or clear it to see all checklists."
                : "When a recruiter sends you a skills checklist, it will appear here. Check back soon!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredChecklists.map((checklist) => {
            const displayStatus = getDisplayStatus(checklist);
            const completionPct = checklist.completionPct;
            const totalSkills = checklist.template.skills.length;
            const ratedSkills = checklist.existingRatings.filter(
              (r) => r.ratingValue !== null || r.isNa
            ).length;
            const categoryCount = new Set(checklist.template.skills.map((s) => s.category)).size;

            return (
              <Card
                key={checklist.id}
                className="hover:shadow-md transition-shadow group"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0 space-y-2.5">
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
                      {/* Meta info */}
                      <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
                        <span>{categoryCount} {categoryCount === 1 ? "category" : "categories"}</span>
                        <span>·</span>
                        <span>{totalSkills} skills</span>
                        <span>·</span>
                        <span>Sent {new Date(checklist.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      {/* Completion bar */}
                      {displayStatus !== "completed" && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Progress</span>
                            <span className={cn("text-xs font-semibold", getStatusColor(displayStatus))}>
                              {completionPct}% ({ratedSkills}/{totalSkills})
                            </span>
                          </div>
                          <Progress value={completionPct} className="h-1.5" />
                        </div>
                      )}
                    </div>

                    {/* Right: Action Button */}
                    <div className="shrink-0">
                      {displayStatus === "completed" ? (
                        <Link href={`/checklists/${checklist.id}`}>
                          <Button
                            variant="outline"
                            className="gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                          >
                            <Eye className="size-4" />
                            View Submission
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/checklists/${checklist.id}`}>
                          <Button
                            className="gap-2 bg-[#166534] hover:bg-[#14532D] text-white group-hover:shadow-md transition-all"
                          >
                            {displayStatus === "in_progress" ? (
                              <>
                                <ClipboardCheck className="size-4" />
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

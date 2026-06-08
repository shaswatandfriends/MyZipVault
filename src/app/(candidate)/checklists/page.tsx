"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "@/lib/icons";
import Link from "next/link";

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

export default function CandidateChecklistsPage() {
  const router = useRouter();
  const [checklists, setChecklists] = useState<ChecklistRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Checklists" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
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

  const pendingCount = checklists.filter((c) => c.status === "sent").length;
  const completedCount = checklists.filter(
    (c) => c.status === "completed" || c.candidate_response?.status === "submitted"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklists"
        description="Complete your profession-specific skills checklists as requested by employers."
      />

      {/* Summary Stats */}
      {checklists.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="group hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-[#166534]/10 flex items-center justify-center">
                  <ClipboardCheck className="size-4 text-[#166534]" />
                </div>
                <div>
                  <p className="text-xl font-bold">{checklists.length}</p>
                  <p className="text-xs text-[#6B7280]">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="size-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{pendingCount}</p>
                  <p className="text-xs text-[#6B7280]">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{completedCount}</p>
                  <p className="text-xs text-[#6B7280]">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Checklist List */}
      {checklists.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-[#166534]/10 flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="size-7 text-[#166534]" />
            </div>
            <h3 className="text-lg font-medium">No checklists yet</h3>
            <p className="text-sm text-[#6B7280] mt-1 max-w-md mx-auto">
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
            const isCompleted =
              checklist.status === "completed" ||
              checklist.candidate_response?.status === "submitted";

            return (
              <Card
                key={checklist.id}
                className={`group transition-all ${
                  isPending
                    ? "hover:shadow-md cursor-pointer border-[#166534]/20"
                    : isCompleted
                      ? "border-emerald-200 bg-emerald-50/30"
                      : ""
                }`}
                onClick={() => isPending && router.push(`/checklists/${checklist.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? "bg-emerald-100"
                        : isPending
                          ? "bg-[#166534]/10"
                          : "bg-[#F3F4F6]"
                    }`}
                  >
                    <ClipboardCheck
                      className={`size-5 ${
                        isCompleted
                          ? "text-emerald-600"
                          : isPending
                            ? "text-[#166534]"
                            : "text-[#9CA3AF]"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {checklist.checklist_template.name}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      From {orgName} · {new Date(checklist.created_at).toLocaleDateString()}
                    </p>
                    {isPending && checklist.completion_pct > 0 && (
                      <div className="mt-2">
                        <Progress value={checklist.completion_pct} className="h-1.5" />
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {checklist.completion_pct}% complete
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        isCompleted
                          ? "default"
                          : isPending
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {isCompleted
                        ? "Completed"
                        : isPending
                          ? "Pending"
                          : checklist.status}
                    </Badge>
                    {isPending && (
                      <ArrowRight className="size-4 text-[#166534] opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
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

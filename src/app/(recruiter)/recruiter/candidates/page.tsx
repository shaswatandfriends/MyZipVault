"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, UserCheck, ArrowRight, Loader2 } from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Candidate {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  specialty: string;
  checklistRequests: Array<{
    id: number;
    status: string;
    completionPct: number;
    checklistTemplate: { name: string; specialty: string };
  }>;
  sharedDocuments: Array<{
    id: number;
    isUnlocked: boolean;
    entityType: string;
  }>;
}

export default function RecruiterCandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchCandidates = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/recruiter/dashboard?period=all");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (error) {
      console.error("[CANDIDATES_PAGE]", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Filter candidates by search query and status
  const filteredCandidates = candidates.filter((c) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`.toLowerCase();
      const email = c.email.toLowerCase();
      if (!fullName.includes(q) && !email.includes(q)) return false;
    }

    // Status filter
    if (statusFilter !== "all") {
      const hasCompleted = c.checklistRequests.some((cr) => cr.status === "completed");
      const hasPending = c.checklistRequests.some(
        (cr) => cr.status === "sent" || cr.status === "opened" || cr.status === "in_progress"
      );
      const hasShared = c.sharedDocuments.length > 0;

      if (statusFilter === "completed" && !hasCompleted) return false;
      if (statusFilter === "pending" && !hasPending) return false;
      if (statusFilter === "shared" && !hasShared) return false;
    }

    return true;
  });

  // Helper: get compliance status badge
  const getComplianceStatus = (candidate: Candidate) => {
    const hasCompleted = candidate.checklistRequests.some((cr) => cr.status === "completed");
    const hasPending = candidate.checklistRequests.some(
      (cr) => cr.status === "sent" || cr.status === "opened" || cr.status === "in_progress"
    );
    const hasShared = candidate.sharedDocuments.length > 0;

    if (hasCompleted && hasShared) return { label: "Complete", color: "text-green-700 bg-green-50 border-green-200" };
    if (hasPending) return { label: "Pending", color: "text-amber-700 bg-amber-50 border-amber-200" };
    if (hasShared) return { label: "Shared", color: "text-blue-700 bg-blue-50 border-blue-200" };
    return { label: "New", color: "text-gray-700 bg-gray-50 border-gray-200" };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="All candidates you've engaged with. Click any candidate to view their details."
      />

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "completed", label: "Completed" },
            { value: "shared", label: "Shared" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-primary text-white"
                  : "bg-surface-2 text-text-secondary hover:bg-surface-3"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Candidates List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="size-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No candidates match your filters"
                : "No candidates yet"}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Send a checklist request to get started."}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Link
                href="/recruiter/send"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                Send Request
                <ArrowRight className="size-4" />
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCandidates.map((candidate) => {
            const status = getComplianceStatus(candidate);
            const fullName =
              `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim() ||
              candidate.email;

            return (
              <Card
                key={candidate.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/recruiter/candidates/${candidate.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Avatar */}
                    <div className="size-12 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {(candidate.firstName?.[0] ?? "?").toUpperCase()}
                      {(candidate.lastName?.[0] ?? "").toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{fullName}</h3>
                        <Badge variant="outline" className={`text-xs shrink-0 ${status.color}`}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-secondary">
                        <span className="truncate">{candidate.email}</span>
                        {candidate.specialty && (
                          <>
                            <span>•</span>
                            <span className="shrink-0">{candidate.specialty}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: counts */}
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-foreground">
                        {candidate.checklistRequests.length}
                      </p>
                      <p className="text-[10px] text-text-muted uppercase tracking-wide">Requests</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-foreground">
                        {candidate.sharedDocuments.length}
                      </p>
                      <p className="text-[10px] text-text-muted uppercase tracking-wide">Shared</p>
                    </div>
                    <ArrowRight className="size-5 text-text-muted shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {!isLoading && filteredCandidates.length > 0 && (
        <p className="text-xs text-text-muted text-center">
          Showing {filteredCandidates.length} of {candidates.length} candidates
        </p>
      )}
    </div>
  );
}

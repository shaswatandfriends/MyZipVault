"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileDown,
  Archive,
  FileText,
  Lock,
  Mail,
  Phone,
  Stethoscope,
  User,
  Loader2,
  Unlock,
  CircleCheck,
  Circle,
  ShieldCheck,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────────────
interface CandidateInfo {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  profileCompletion: number;
}

interface PipelineStep {
  completed: boolean;
  date: string | null;
  progress?: number;
}

interface Pipeline {
  sent: PipelineStep;
  opened: PipelineStep;
  inProgress: PipelineStep;
  completed: PipelineStep;
}

interface DocumentInfo {
  consentShareId: number;
  type: string;
  name: string;
  isUnlocked: boolean;
  sharedAt: string;
  expiresAt: string;
  details: Record<string, unknown>;
  unlockedDocumentId: number | null;
}

interface SkillRating {
  skillName: string;
  category: string;
  ratingValue: string | null;
  isNa: boolean;
  sortOrder: number;
}

interface ChecklistRequestInfo {
  id: number;
  templateName: string;
  specialty: string;
  profession: string;
  status: string;
  completionPct: number;
  createdAt: string;
  openedAt: string | null;
}

interface CandidateData {
  candidate: CandidateInfo;
  checklistRequests: ChecklistRequestInfo[];
  pipeline: Pipeline;
  documents: DocumentInfo[];
  skillRatings: SkillRating[];
  totalDocuments: number;
  unlockedDocuments: number;
  lockedDocuments: number;
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDocTypeIcon(type: string) {
  switch (type) {
    case "checklist":
      return <ShieldCheck className="size-4 text-emerald-600" />;
    case "credential":
      return <FileText className="size-4 text-teal-600" />;
    case "resume":
      return <FileText className="size-4 text-teal-600" />;
    case "reference":
      return <User className="size-4 text-teal-600" />;
    default:
      return <FileText className="size-4 text-muted-foreground" />;
  }
}

// ─── Skeleton Loaders ───────────────────────────────────────────────
function PipelineSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function CandidateDetailPage() {
  const params = useParams();
  const candidateId = params.id as string;

  const [data, setData] = useState<CandidateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/recruiter/candidates/${candidateId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch candidate details");
      }
      const json = (await res.json()) as CandidateData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load candidate", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUnlock = async (consentShareId: number) => {
    setUnlockingId(consentShareId);
    try {
      const res = await fetch(`/api/recruiter/candidates/${candidateId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentShareId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to unlock document");
      }

      toast.success("Document unlocked", {
        description: "1 credit has been deducted from your balance.",
      });
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to unlock", { description: message });
    } finally {
      setUnlockingId(null);
    }
  };

  const handleDownloadDoc = async (doc: DocumentInfo) => {
    const docKey = `${doc.type}-${doc.consentShareId}`;
    setDownloadingDocId(docKey);
    try {
      const docId = doc.details.responseId ?? doc.details.credentialId ?? doc.details.resumeId ?? doc.details.referenceId;
      if (!docId) {
        toast.error("Cannot identify document");
        return;
      }

      const url = `/api/recruiter/download-packet?candidateId=${candidateId}&docType=${doc.type}&docId=${docId}`;
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to download document");
      }

      // Check if it's a redirect (for credentials/resumes with signed URLs)
      if (res.redirected) {
        window.open(res.url, "_blank");
      } else {
        // Download the blob (PDF or other file)
        const blob = await res.blob();
        const contentDisposition = res.headers.get("Content-Disposition");
        let filename = `document.${doc.type === "checklist" || doc.type === "reference" ? "pdf" : "bin"}`;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match) {
            filename = match[1].replace(/["']/g, "");
          }
        }

        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }

      toast.success("Download started");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to download", { description: message });
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!accessibleDocs.length) return;
    setDownloadingAll(true);
    try {
      const url = `/api/recruiter/download-packet?candidateId=${candidateId}&format=zip`;
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate ZIP");
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${fullName.replace(/\s+/g, "-")}-documents.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      toast.success("ZIP download started", {
        description: `${accessibleDocs.length} document(s) included.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to download ZIP", { description: message });
    } finally {
      setDownloadingAll(false);
    }
  };

  const candidate = data?.candidate;
  const fullName = candidate
    ? [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || candidate.email
    : "";

  // Pipeline steps
  const pipelineSteps = data?.pipeline
    ? [
        { key: "sent", label: "Sent", ...data.pipeline.sent },
        { key: "opened", label: "Opened", ...data.pipeline.opened },
        { key: "inProgress", label: "In Progress", ...data.pipeline.inProgress },
        { key: "completed", label: "Completed", ...data.pipeline.completed },
      ]
    : [];

  // Determine current step index
  const currentStepIndex = pipelineSteps.findIndex((s) => !s.completed);
  // If all completed, currentStepIndex = -1, set to last index
  const activeStep = currentStepIndex === -1 ? pipelineSteps.length - 1 : currentStepIndex;

  // Documents split
  const accessibleDocs = data?.documents.filter((d) => d.isUnlocked) ?? [];
  const lockedDocs = data?.documents.filter((d) => !d.isUnlocked) ?? [];

  // Skill ratings grouped by category
  const categoryMap = new Map<string, SkillRating[]>();
  if (data?.skillRatings) {
    for (const sr of data.skillRatings) {
      const list = categoryMap.get(sr.category) ?? [];
      list.push(sr);
      categoryMap.set(sr.category, list);
    }
  }

  // Overall completion
  const totalSkills = data?.skillRatings.length ?? 0;
  const completedSkills = data?.skillRatings.filter((sr) => sr.ratingValue || sr.isNa).length ?? 0;
  const overallPct = totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <PageHeader
        title="Candidate Details"
        description="View candidate verification status and documents."
        actions={
          <div className="flex items-center gap-2">
            {accessibleDocs.length > 0 && (
              <Button
                variant="default"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={downloadingAll}
                onClick={handleDownloadAll}
              >
                {downloadingAll ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Archive className="size-4" />
                )}
                Download All (ZIP)
              </Button>
            )}
            <Link href="/recruiter/dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="size-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── Candidate Info Card ────────────────────────────────────── */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : candidate ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xl font-semibold shrink-0">
                {candidate.firstName?.[0]?.toUpperCase() ?? candidate.email[0]?.toUpperCase()}
              </div>
              <div className="space-y-1 min-w-0">
                <h2 className="text-xl font-bold truncate">{fullName}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    {candidate.email}
                  </span>
                  {candidate.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-3.5" />
                      {candidate.phone}
                    </span>
                  )}
                  {data?.checklistRequests[0]?.specialty && (
                    <span className="flex items-center gap-1.5">
                      <Stethoscope className="size-3.5" />
                      {data.checklistRequests[0].specialty}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-xs">
                    <User className="size-3" />
                    Candidate
                  </Badge>
                  {data?.checklistRequests[0] && (
                    <Badge
                      variant="outline"
                      className={
                        data.checklistRequests[0].status === "completed"
                          ? "border-emerald-300 text-emerald-700"
                          : data.checklistRequests[0].status === "in_progress"
                            ? "border-amber-300 text-amber-700"
                            : "border-gray-300 text-gray-600"
                      }
                    >
                      {data.checklistRequests[0].status === "completed"
                        ? "Completed"
                        : data.checklistRequests[0].status === "in_progress"
                          ? "In Progress"
                          : data.checklistRequests[0].status === "sent"
                            ? "Sent"
                            : data.checklistRequests[0].status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Progress Pipeline ──────────────────────────────────────── */}
      {isLoading ? (
        <PipelineSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-emerald-600" />
              Verification Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-0">
              {pipelineSteps.map((step, idx) => {
                const isActive = idx === activeStep && !step.completed;
                const isDone = step.completed;
                const isFuture = !isDone && !isActive;

                return (
                  <div key={step.key} className="flex flex-col items-center flex-1 relative">
                    {/* Connecting line */}
                    {idx > 0 && (
                      <div
                        className={`absolute top-5 -left-1/2 w-full h-0.5 ${
                          pipelineSteps[idx - 1]?.completed
                            ? "bg-emerald-400"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    )}

                    {/* Circle */}
                    <div className="relative z-10 mb-2">
                      {isDone ? (
                        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                          <CheckCircle2 className="size-5" />
                        </div>
                      ) : isActive ? (
                        <div className="flex size-10 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50 text-amber-600 shadow-sm">
                          {step.progress != null && step.progress > 0 ? (
                            <span className="text-xs font-bold">{step.progress}%</span>
                          ) : (
                            <Circle className="size-5" />
                          )}
                        </div>
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-full border-2 border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800">
                          <Circle className="size-5" />
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`text-xs font-medium text-center ${
                        isDone
                          ? "text-emerald-700 dark:text-emerald-400"
                          : isActive
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>

                    {/* Timestamp */}
                    <span className="text-[11px] text-muted-foreground mt-0.5 text-center">
                      {isDone || isActive ? formatDateTime(step.date) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Documents ─────────────────────────────────────────────── */}
      {isLoading ? (
        <DocumentsSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Accessible Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Accessible Documents
              </CardTitle>
              <CardDescription>
                {accessibleDocs.length} document{accessibleDocs.length !== 1 ? "s" : ""} unlocked
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accessibleDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No accessible documents yet. Unlock documents to view them.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                  {accessibleDocs.map((doc) => {
                    const docKey = `${doc.type}-${doc.consentShareId}`;
                    const isDownloading = downloadingDocId === docKey;
                    return (
                      <div
                        key={doc.consentShareId}
                        className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20 p-3"
                      >
                        {getDocTypeIcon(doc.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Shared {formatDate(doc.sharedAt)}
                          </p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-xs shrink-0">
                          Accessible
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-8 w-8 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                          disabled={isDownloading}
                          onClick={() => handleDownloadDoc(doc)}
                          title="Download document"
                        >
                          {isDownloading ? (
                            <Loader2 className="size-4 animate-spin text-emerald-600" />
                          ) : (
                            <FileDown className="size-4 text-emerald-600" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Locked Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="size-4 text-amber-600" />
                Locked Documents
              </CardTitle>
              <CardDescription>
                {lockedDocs.length} document{lockedDocs.length !== 1 ? "s" : ""} require unlock
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lockedDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CircleCheck className="size-10 text-emerald-400 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    All documents are accessible.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                  {lockedDocs.map((doc) => (
                    <div
                      key={doc.consentShareId}
                      className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-3"
                    >
                      <Lock className="size-4 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Shared {formatDate(doc.sharedAt)}
                        </p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-xs shrink-0">
                        Locked
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                        disabled={unlockingId === doc.consentShareId}
                        onClick={() => handleUnlock(doc.consentShareId)}
                      >
                        {unlockingId === doc.consentShareId ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Unlock className="size-3.5" />
                        )}
                        Unlock for 1 Credit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Checklist Progress ─────────────────────────────────────── */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </CardContent>
        </Card>
      ) : totalSkills > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-emerald-600" />
              Checklist Progress
            </CardTitle>
            <CardDescription>
              {completedSkills} of {totalSkills} skills completed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall Completion</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  {overallPct}%
                </span>
              </div>
              <Progress value={overallPct} className="h-3" />
            </div>

            <Separator />

            {/* Category breakdown */}
            <div className="space-y-4">
              {Array.from(categoryMap.entries()).map(([category, skills]) => {
                const catCompleted = skills.filter((s) => s.ratingValue || s.isNa).length;
                const catPct = skills.length > 0 ? Math.round((catCompleted / skills.length) * 100) : 0;

                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{category}</span>
                      <span className="text-muted-foreground">
                        {catCompleted}/{skills.length} — {catPct}%
                      </span>
                    </div>
                    <Progress value={catPct} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

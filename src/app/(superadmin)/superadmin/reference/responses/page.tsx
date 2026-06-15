"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Eye,
  Calendar,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileCheck,
  User,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────────────

interface ResponseAnswer {
  id: number;
  questionId: number;
  questionText: string;
  responseType: string;
  answerText: string;
}

interface ReferenceResponseItem {
  id: number;
  candidateReferenceId: number;
  candidateName: string;
  managerEmail: string;
  managerName: string | null;
  managerPhone: string;
  facilityName: string;
  employmentStatus: string;
  submittedAt: string | null;
  overallComment: string | null;
  digitalSignature: string | null;
  signatureDate: string | null;
  answers: ResponseAnswer[];
}

// ─── Badge Helpers ──────────────────────────────────────────────────

function getEmploymentBadge(status: string) {
  switch (status) {
    case "current":
      return (
        <Badge className="text-xs" style={{ background: "var(--primary-light)", color: "var(--primary)", border: "none" }}>
          Current
        </Badge>
      );
    case "ending_contract":
      return (
        <Badge className="text-xs" style={{ background: "var(--badge-yellow-bg)", color: "var(--status-amber-dark)", border: "none" }}>
          Ending Contract
        </Badge>
      );
    case "past":
      return (
        <Badge className="text-xs" style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "none" }}>
          Past
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function getResponseTypeLabel(type: string) {
  switch (type) {
    case "rating_5":
      return "1-5 Rating";
    case "rating_3":
      return "1-3 Rating";
    case "yes_no":
      return "Yes/No";
    case "text":
      return "Text";
    default:
      return type;
  }
}

function getResponseTypeBadge(type: string) {
  switch (type) {
    case "rating_5":
      return (
        <Badge className="text-xs" style={{ background: "var(--primary-light)", color: "var(--primary)", border: "none" }}>
          1-5
        </Badge>
      );
    case "rating_3":
      return (
        <Badge className="text-xs" style={{ background: "var(--primary-light)", color: "var(--primary)", border: "none" }}>
          1-3
        </Badge>
      );
    case "yes_no":
      return (
        <Badge className="text-xs" style={{ background: "var(--badge-blue-bg)", color: "var(--status-blue-dark)", border: "none" }}>
          Yes/No
        </Badge>
      );
    case "text":
      return (
        <Badge className="text-xs" style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "none" }}>
          Text
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>;
  }
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string | Date) {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateText(text: string, maxLen: number) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ReferenceResponsesPage() {
  const [responses, setResponses] = useState<ReferenceResponseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filters
  const [employmentFilter, setEmploymentFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<ReferenceResponseItem | null>(null);

  const fetchResponses = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (employmentFilter !== "all") params.set("employmentStatus", employmentFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/superadmin/reference/responses?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch responses");
      }
      const data = await res.json();
      setResponses(data.responses || []);
      setTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load responses", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [employmentFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const openDetail = (resp: ReferenceResponseItem) => {
    setSelectedResponse(resp);
    setDetailOpen(true);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 animate-page-fade">
      <PageHeader
        title="Reference Responses"
        description="View completed reference responses with full Q&A details and digital signatures."
      />

      {/* Filters */}
      <Card className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Employment Status
              </label>
              <Select value={employmentFilter} onValueChange={(v) => { setEmploymentFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="ending_contract">Ending Contract</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                From
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 size-4" style={{ color: "var(--text-muted)" }} />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="pl-9 w-[160px]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                To
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 size-4" style={{ color: "var(--text-muted)" }} />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="pl-9 w-[160px]"
                />
              </div>
            </div>
            {(dateFrom || dateTo || employmentFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setEmploymentFilter("all");
                  setPage(1);
                }}
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : responses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="size-10 mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                No completed responses found
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Completed reference responses will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Reference (Manager)</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Comment Preview</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((resp) => (
                    <TableRow key={resp.id}>
                      <TableCell className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {resp.candidateName}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                            {resp.managerName || "External Manager"}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {resp.managerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {resp.facilityName}
                      </TableCell>
                      <TableCell>{getEmploymentBadge(resp.employmentStatus)}</TableCell>
                      <TableCell className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {resp.submittedAt ? formatDate(resp.submittedAt) : "N/A"}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px]" style={{ color: "var(--text-muted)" }}>
                        {resp.overallComment
                          ? truncateText(resp.overallComment, 60)
                          : <span className="italic text-xs">No comment</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => openDetail(resp)}
                        >
                          <Eye className="size-4" style={{ color: "var(--primary)" }} />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Full Response Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="size-5" style={{ color: "var(--primary)" }} />
              Reference Response Details
            </DialogTitle>
            <DialogDescription>
              Full Q&A response for reference #{selectedResponse?.candidateReferenceId}
            </DialogDescription>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-5">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Candidate</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {selectedResponse.candidateName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Reference (Manager)</p>
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5" style={{ color: "var(--text-muted)" }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {selectedResponse.managerName || "External Manager"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {selectedResponse.managerEmail}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Facility</p>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {selectedResponse.facilityName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Employment Status</p>
                  {getEmploymentBadge(selectedResponse.employmentStatus)}
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Submitted</p>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {selectedResponse.submittedAt
                      ? formatDateTime(selectedResponse.submittedAt)
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Q&A Pairs */}
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                  Questions & Answers
                </h4>
                <div className="space-y-3">
                  {selectedResponse.answers.map((answer) => (
                    <div
                      key={answer.id}
                      className="rounded-lg border p-3"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {answer.questionText}
                        </p>
                        {getResponseTypeBadge(answer.responseType)}
                      </div>
                      <div
                        className="rounded-md px-3 py-2"
                        style={{ background: "var(--surface-2)" }}
                      >
                        <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                          {answer.responseType === "yes_no" ? (
                            answer.answerText === "yes" ? (
                              <span style={{ color: "var(--primary)" }}>✓ Yes</span>
                            ) : answer.answerText === "no" ? (
                              <span style={{ color: "var(--status-red-dark)" }}>✗ No</span>
                            ) : (
                              answer.answerText
                            )
                          ) : answer.responseType === "rating_5" || answer.responseType === "rating_3" ? (
                            <span className="font-bold" style={{ color: "var(--primary)" }}>
                              {answer.answerText} / {answer.responseType === "rating_5" ? "5" : "3"}
                            </span>
                          ) : (
                            answer.answerText
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Comment */}
              {selectedResponse.overallComment && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                      Overall Comment
                    </h4>
                    <div
                      className="rounded-lg border p-3"
                      style={{ borderColor: "var(--border)", background: "var(--status-green-bg)" }}
                    >
                      <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                        {selectedResponse.overallComment}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Digital Signature */}
              {selectedResponse.digitalSignature && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                      Digital Signature
                    </h4>
                    <div
                      className="rounded-lg border p-3"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {selectedResponse.digitalSignature.startsWith("data:image") ? (
                        <img
                          src={selectedResponse.digitalSignature}
                          alt="Digital Signature"
                          className="h-20 object-contain"
                        />
                      ) : (
                        <p className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>
                          {selectedResponse.digitalSignature}
                        </p>
                      )}
                      {selectedResponse.signatureDate && (
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                          Signed on {formatDateTime(selectedResponse.signatureDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

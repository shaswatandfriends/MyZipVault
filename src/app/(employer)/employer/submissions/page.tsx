"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Send, RefreshCw, Eye, MapPin, Briefcase, Clock, CheckCircle2,
  User, Star, Loader2,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SubmissionRow {
  id: number;
  submitted_at: string;
  status: string;
  submission_type: string;
  candidate: { id: number; name: string; specialty: string | null; profession: string | null; city: string | null; state: string | null; job_title: string | null };
  job: { id: number; title: string };
  recruiter: { initials: string; full_name: string; recruiter_id: number } | null;
  placement_fee: number | null;
  placed_at: string | null;
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700 border-blue-200" },
    reviewing: { label: "Reviewing", className: "bg-amber-100 text-amber-700 border-amber-200" },
    interview: { label: "Interview", className: "bg-purple-100 text-purple-700 border-purple-200" },
    offer: { label: "Offer", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    placed: { label: "Placed", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200" },
    withdrawn: { label: "Withdrawn", className: "bg-gray-100 text-gray-700 border-gray-200" },
  };
  const c = map[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

export default function EmployerSubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/employer/submissions?${params}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setSubmissions(json.submissions);
    } catch { toast.error("Failed to load submissions"); }
    finally { setIsLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchSubmissions(), 400);
    return () => clearTimeout(t);
  }, [fetchSubmissions]);

  return (
    <div className="space-y-6">
      <PageHeader title="Submissions" description="Candidates submitted to your jobs by recruiters. Recruiter contact is anonymized — communicate through the platform."
        actions={<Button variant="outline" size="sm" onClick={fetchSubmissions} disabled={isLoading}><RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />Refresh</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-2"><Send className="size-5 text-blue-600" /><div><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{submissions.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><Clock className="size-5 text-amber-600" /><div><p className="text-xs text-muted-foreground">In Review</p><p className="text-lg font-bold">{submissions.filter(s => ["reviewing", "interview"].includes(s.status)).length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><CheckCircle2 className="size-5 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Placed</p><p className="text-lg font-bold">{submissions.filter(s => s.status === "placed").length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><User className="size-5 text-purple-600" /><div><p className="text-xs text-muted-foreground">Self-apply</p><p className="text-lg font-bold">{submissions.filter(s => s.submission_type === "self_apply").length}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="placed">Placed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center">
              <Send className="size-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">No submissions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Post jobs and recruiters will submit candidates here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Recruiter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{s.candidate.name}</p>
                          {s.candidate.specialty && <p className="text-xs text-muted-foreground">{s.candidate.specialty}</p>}
                          {(s.candidate.city || s.candidate.state) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="size-3" />{[s.candidate.city, s.candidate.state].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{s.job.title}</TableCell>
                      <TableCell>
                        {s.recruiter ? (
                          <div className="flex items-center gap-2">
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #0A66C2, #004182)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 12 }}>
                              {s.recruiter.initials}
                            </div>
                            <span className="text-sm">{s.recruiter.full_name}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Self-apply</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(s.status)}</TableCell>
                      <TableCell className="text-sm">{s.placement_fee ? `$${s.placement_fee.toLocaleString()}` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

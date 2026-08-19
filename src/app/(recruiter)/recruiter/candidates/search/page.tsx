"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Search, Users, MapPin, Briefcase, RefreshCw, Send, UserPlus,
  Lock, CheckCircle2, Eye, Database, Filter, Loader2, Mail, Phone,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CandidateRow {
  id: number;
  public_id: string;
  fullName: string;
  city: string | null;
  state: string | null;
  jobTitle: string | null;
  specialty: string | null;
  profession: string | null;
  source: string;
  ownership_phase: string;
  is_owner: boolean;
  has_revealed: boolean;
  primary_email: string | null;
  primary_phone: string | null;
  contact_info_locked: boolean;
  submission_count: number;
  has_submitted_to_job: boolean | null;
}

function getSourceBadge(source: string) {
  switch (source) {
    case "platform_pool": return <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">Pool</Badge>;
    case "recruiter_submitted": return <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">Recruiter</Badge>;
    case "self_signup": return <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Self</Badge>;
    default: return <Badge variant="outline">{source}</Badge>;
  }
}

export default function RecruiterCandidateSearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <RecruiterCandidateSearchInner />
    </Suspense>
  );
}

function RecruiterCandidateSearchInner() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [professionFilter, setProfessionFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitCandidate, setSubmitCandidate] = useState<CandidateRow | null>(null);
  const [submitNotes, setSubmitNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", city: "", state: "", job_title: "", specialty: "" });
  const [isAdding, setIsAdding] = useState(false);

  const fetchCandidates = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search, page: String(page), pageSize: "25",
      });
      if (professionFilter !== "all") params.set("profession", professionFilter);
      if (stateFilter) params.set("state", stateFilter);
      if (jobId) params.set("jobId", jobId);
      const res = await fetch(`/api/recruiter/candidates/search?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setCandidates(json.candidates);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch (err) {
      toast.error("Failed to load candidates", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsLoading(false);
    }
  }, [search, professionFilter, stateFilter, page, jobId]);

  useEffect(() => {
    const timeout = setTimeout(() => { setPage(1); fetchCandidates(); }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, professionFilter, stateFilter, page]);

  const handleSubmit = (candidate: CandidateRow) => {
    if (!jobId) {
      toast.error("No job selected — go to Jobs page first to pick a job");
      return;
    }
    if (candidate.has_submitted_to_job) {
      toast.error("This candidate is already submitted to this job");
      return;
    }
    setSubmitCandidate(candidate);
    setSubmitNotes("");
    setSubmitDialogOpen(true);
  };

  const confirmSubmit = async () => {
    if (!submitCandidate || !jobId) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/recruiter/jobs/${jobId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_record_id: submitCandidate.id,
          notes: submitNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      toast.success("Candidate submitted", {
        description: `${submitCandidate.fullName} submitted to job. Ownership: 90-day exclusive (75/25 split).`,
      });
      setSubmitDialogOpen(false);
      fetchCandidates();
    } catch (err) {
      toast.error("Submit failed", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCandidate = async () => {
    try {
      setIsAdding(true);
      const res = await fetch(`/api/recruiter/candidates/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");

      if (data.is_duplicate) {
        toast.info("Candidate already exists", {
          description: `Found existing record — ${data.candidate.fullName}. Use them directly or update contact info.`,
        });
      } else {
        toast.success("Candidate added", {
          description: `${data.candidate.fullName} is now in your exclusive ownership for 90 days.`,
        });
      }
      setAddDialogOpen(false);
      setAddForm({ name: "", email: "", phone: "", city: "", state: "", job_title: "", specialty: "" });
      fetchCandidates();
    } catch (err) {
      toast.error("Add failed", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find Candidates"
        description={jobId ? `Search the candidate pool and submit to job #${jobId}` : "Search the 1M healthcare candidate pool. Filter by specialty, location, or name."}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchCandidates} disabled={isLoading}>
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <UserPlus className="size-4" />
              Add Candidate
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Users className="size-5 text-blue-600" />
          <div><p className="text-xs text-muted-foreground">Total Pool</p><p className="text-lg font-bold">{total.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Database className="size-5 text-emerald-600" />
          <div><p className="text-xs text-muted-foreground">Showing</p><p className="text-lg font-bold">{candidates.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2">
          <CheckCircle2 className="size-5 text-purple-600" />
          <div><p className="text-xs text-muted-foreground">Page</p><p className="text-lg font-bold">{page} / {totalPages || 1}</p></div>
        </CardContent></Card>
        {jobId && (
          <Card><CardContent className="p-4 flex items-center gap-2">
            <Briefcase className="size-5 text-amber-600" />
            <div><p className="text-xs text-muted-foreground">Job #</p><p className="text-lg font-bold">{jobId}</p></div>
          </CardContent></Card>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search by name, email, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
              </div>
            </div>
            <Select value={professionFilter} onValueChange={setProfessionFilter}>
              <SelectTrigger><SelectValue placeholder="Profession" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Professions</SelectItem>
                <SelectItem value="nursing">Nursing</SelectItem>
                <SelectItem value="allied">Allied Health</SelectItem>
                <SelectItem value="physician">Physician</SelectItem>
                <SelectItem value="non-clinical">Non-Clinical</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="State (e.g., TX)" value={stateFilter} onChange={(e) => setStateFilter(e.target.value.toUpperCase())} maxLength={2} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      ) : candidates.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Users className="size-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-muted-foreground">No candidates found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting filters, or add a new candidate from your network.</p>
          <Button size="sm" className="mt-3" onClick={() => setAddDialogOpen(true)}><UserPlus className="size-4 mr-2" />Add Candidate</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{c.fullName}</h3>
                      {getSourceBadge(c.source)}
                      {c.is_owner && (
                        <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
                          Your candidate
                        </Badge>
                      )}
                      {c.ownership_phase === "exclusive" && !c.is_owner && (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                          In exclusive window
                        </Badge>
                      )}
                      {c.has_submitted_to_job && (
                        <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                          <CheckCircle2 className="size-3 mr-1" />Submitted
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {c.specialty && <span>{c.specialty}</span>}
                      {c.jobTitle && <span className="flex items-center gap-1"><Briefcase className="size-3" />{c.jobTitle}</span>}
                      {(c.city || c.state) && <span className="flex items-center gap-1"><MapPin className="size-3" />{[c.city, c.state].filter(Boolean).join(", ")}</span>}
                      <span>{c.submission_count} submission{c.submission_count !== 1 ? "s" : ""}</span>
                    </div>
                    {/* Contact info row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {c.contact_info_locked ? (
                        <span className="flex items-center gap-1 text-amber-700">
                          <Lock className="size-3" /> Contact info locked (exclusive to owner)
                        </span>
                      ) : c.primary_email || c.primary_phone ? (
                        <>
                          {c.primary_email && <span className="flex items-center gap-1 text-emerald-700"><Mail className="size-3" />{c.primary_email}</span>}
                          {c.primary_phone && <span className="flex items-center gap-1 text-emerald-700"><Phone className="size-3" />{c.primary_phone}</span>}
                        </>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Lock className="size-3" /> Reveal contact (2 credits)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {jobId && !c.has_submitted_to_job && (
                      <Button size="sm" onClick={() => handleSubmit(c)}>
                        <Send className="size-3.5 mr-1" />Submit
                      </Button>
                    )}
                    {!c.has_revealed && !c.contact_info_locked && !c.primary_email && !c.primary_phone && (
                      <Button variant="outline" size="sm">
                        <Eye className="size-3.5 mr-1" />Reveal (2 cr)
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || isLoading} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Submit dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Candidate to Job</DialogTitle>
            <DialogDescription>
              Submit <strong>{submitCandidate?.fullName}</strong> to job #{jobId}. This creates a submission with millisecond-precision timestamp. First submission wins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" value={submitNotes} onChange={(e) => setSubmitNotes(e.target.value)} rows={4} placeholder="Internal notes about why this candidate is a good fit..." />
            </div>
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              <p className="font-medium mb-1">Ownership & Split:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>0-90 days: <strong>Exclusive</strong> — only you can submit. 75/25 split.</li>
                <li>90-180 days: <strong>Residual</strong> — others can submit, you get 2% residual.</li>
                <li>180+ days: <strong>Open</strong> — standard 70/30 split.</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={confirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="size-4 mr-2 animate-spin" />Submitting...</> : <><Send className="size-4 mr-2" />Submit Candidate</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add candidate dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Candidate (Path B)</DialogTitle>
            <DialogDescription>
              Bring a candidate from your network. If their email AND phone don't match an existing record, you'll get 90-day exclusive ownership.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="add-name">Full Name *</Label>
              <Input id="add-name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Jane Smith" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="add-email">Email *</Label>
                <Input id="add-email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="jane@example.com" />
              </div>
              <div>
                <Label htmlFor="add-phone">Phone *</Label>
                <Input id="add-phone" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="+1 (555) 123-4567" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="add-city">City</Label>
                <Input id="add-city" value={addForm.city} onChange={(e) => setAddForm({ ...addForm, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="add-state">State</Label>
                <Input id="add-state" value={addForm.state} onChange={(e) => setAddForm({ ...addForm, state: e.target.value.toUpperCase() })} maxLength={2} placeholder="TX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="add-jobtitle">Job Title</Label>
                <Input id="add-jobtitle" value={addForm.job_title} onChange={(e) => setAddForm({ ...addForm, job_title: e.target.value })} placeholder="Registered Nurse" />
              </div>
              <div>
                <Label htmlFor="add-specialty">Specialty</Label>
                <Input id="add-specialty" value={addForm.specialty} onChange={(e) => setAddForm({ ...addForm, specialty: e.target.value })} placeholder="ICU" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Dedup:</strong> if email OR phone matches an existing candidate, the existing record is returned (no new ownership created). Both must be new to create a Path B record.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isAdding}>Cancel</Button>
            <Button onClick={handleAddCandidate} disabled={isAdding || !addForm.name || (!addForm.email && !addForm.phone)}>
              {isAdding ? <><Loader2 className="size-4 mr-2 animate-spin" />Adding...</> : <><UserPlus className="size-4 mr-2" />Add Candidate</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

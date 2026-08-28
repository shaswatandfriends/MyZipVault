"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Search, Users, MapPin, Briefcase, RefreshCw, Lock, Eye,
  Database, CheckCircle2, Loader2, Mail, Phone,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CandidateRow {
  id: number; fullName: string; city: string | null; state: string | null;
  jobTitle: string | null; specialty: string | null; profession: string | null;
  source: string; ownership_phase: string; has_revealed: boolean;
  primary_email: string | null; primary_phone: string | null;
  contact_info_locked: boolean; submission_count: number;
}

function getSourceBadge(source: string) {
  switch (source) {
    case "platform_pool": return <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">Pool</Badge>;
    case "recruiter_submitted": return <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">Recruiter</Badge>;
    case "self_signup": return <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Self</Badge>;
    default: return <Badge variant="outline">{source}</Badge>;
  }
}

export default function EmployerCandidateSearchPage() {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [professionFilter, setProfessionFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("");

  const fetchCandidates = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ search, page: String(page), pageSize: "25" });
      if (professionFilter !== "all") params.set("profession", professionFilter);
      if (stateFilter) params.set("state", stateFilter);
      const res = await fetch(`/api/employer/candidates/search?${params}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setCandidates(json.candidates);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch { toast.error("Failed to load candidates"); }
    finally { setIsLoading(false); }
  }, [search, professionFilter, stateFilter, page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchCandidates(); }, 400);
    return () => clearTimeout(t);
  }, [search, professionFilter, stateFilter, page]);

  return (
    <div className="space-y-6">
      <PageHeader title="Find Candidates" description="Search the healthcare candidate pool. Buy credits to reveal contact info."
        actions={<Button variant="outline" size="sm" onClick={fetchCandidates} disabled={isLoading}><RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />Refresh</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-2"><Users className="size-5 text-[var(--primary)]" /><div><p className="text-xs text-muted-foreground">Total Pool</p><p className="text-lg font-bold">{total.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><Database className="size-5 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Showing</p><p className="text-lg font-bold">{candidates.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-2"><CheckCircle2 className="size-5 text-purple-600" /><div><p className="text-xs text-muted-foreground">Page</p><p className="text-lg font-bold">{page} / {totalPages || 1}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
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
                      {c.ownership_phase === "exclusive" && (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">In exclusive window</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {c.specialty && <span>{c.specialty}</span>}
                      {c.jobTitle && <span className="flex items-center gap-1"><Briefcase className="size-3" />{c.jobTitle}</span>}
                      {(c.city || c.state) && <span className="flex items-center gap-1"><MapPin className="size-3" />{[c.city, c.state].filter(Boolean).join(", ")}</span>}
                      <span>{c.submission_count} submission{c.submission_count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {c.contact_info_locked ? (
                        <span className="flex items-center gap-1 text-amber-700"><Lock className="size-3" /> Contact info locked (exclusive to owner)</span>
                      ) : c.primary_email || c.primary_phone ? (
                        <>
                          {c.primary_email && <span className="flex items-center gap-1 text-emerald-700"><Mail className="size-3" />{c.primary_email}</span>}
                          {c.primary_phone && <span className="flex items-center gap-1 text-emerald-700"><Phone className="size-3" />{c.primary_phone}</span>}
                        </>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground"><Lock className="size-3" /> Reveal contact (2 credits)</span>
                      )}
                    </div>
                  </div>
                  {!c.has_revealed && !c.contact_info_locked && !c.primary_email && !c.primary_phone && (
                    <Button variant="outline" size="sm"><Eye className="size-3.5 mr-1" />Reveal (2 cr)</Button>
                  )}
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
    </div>
  );
}

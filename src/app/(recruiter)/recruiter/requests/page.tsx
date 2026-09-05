"use client";

/**
 * Requests page — shows ALL requests sent by the recruiter's organization,
 * across all candidates, with their current status.
 *
 * Three tabs:
 *   1. Checklist Requests — compliance checklists sent to candidates
 *   2. Document Shares — document share requests (BLS, ACLS, resume, etc.)
 *   3. VaultSign — documents sent for signature (RTRs, offers, etc.)
 *
 * Each tab shows a table with: candidate name, type, status, date sent, actions.
 * Filters: search by name, filter by status.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ClipboardCheck, FileText, FileSignature, Search, Loader2,
  Eye, ArrowRight, Clock, CheckCircle2, XCircle, Send, Share2,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabType = "checklists" | "shares" | "vaultsign";

interface ChecklistRequest {
  id: number;
  status: string;
  completion_pct: number;
  created_at: string;
  opened_at: string | null;
  candidate_user: { id: number; first_name: string | null; last_name: string | null; email: string };
  checklist_template: { id: number; name: string; profession: string; specialty: string };
}

interface ShareRequest {
  id: number;
  status: string;
  request_checklists: boolean;
  request_credentials: boolean;
  request_resume: boolean;
  request_references: boolean;
  message: string | null;
  created_at: string;
  candidate_user: { id: number; first_name: string | null; last_name: string | null; email: string };
  client_user: { id: number; first_name: string | null; last_name: string | null; email: string };
}

interface VaultSignDoc {
  id: number;
  document_name: string;
  document_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  expiry_date: string;
  candidate_lead_id: number | null;
}

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("checklists");
  const [checklistRequests, setChecklistRequests] = useState<ChecklistRequest[]>([]);
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [vaultSignDocs, setVaultSignDocs] = useState<VaultSignDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [checklistRes, vaultsignRes] = await Promise.all([
        fetch("/api/recruiter/dashboard?period=all"),
        fetch("/api/vaultsign/documents?limit=100"),
      ]);

      if (checklistRes.ok) {
        const data = await checklistRes.json();
        // Flatten all checklist requests from all candidates
        const allChecklists: ChecklistRequest[] = [];
        const allShares: ShareRequest[] = [];
        for (const candidate of data.candidates || []) {
          for (const req of candidate.checklistRequests || []) {
            allChecklists.push({
              ...req,
              candidate_user: {
                id: candidate.id,
                first_name: candidate.firstName,
                last_name: candidate.lastName,
                email: candidate.email,
              },
            });
          }
        }
        setChecklistRequests(allChecklists);
        // FIX C8: Populate share requests from dashboard data
        const allSharesData: ShareRequest[] = [];
        for (const candidate of data.candidates || []) {
          for (const sr of candidate.shareRequests || []) {
            allSharesData.push(sr);
          }
        }
        setShareRequests(allSharesData);
      }

      if (vaultsignRes.ok) {
        const data = await vaultsignRes.json();
        setVaultSignDocs(data.documents || data || []);
      }
    } catch (err) {
      console.error("[REQUESTS PAGE]", err);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── Status badge helper ──────────────────────────────────────────
  function getStatusBadge(status: string) {
    const s = status.toLowerCase();
    if (s === "completed" || s === "signed" || s === "shared")
      return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">{status}</Badge>;
    if (s === "declined" || s === "denied" || s === "voided" || s === "expired")
      return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">{status}</Badge>;
    if (s === "sent" || s === "pending" || s === "partially_signed")
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">{status}</Badge>;
    if (s === "draft")
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100">{status}</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  }

  // ─── Filter helper ──────────────────────────────────────────────
  function matchesSearch(name: string, email: string): boolean {
    if (!search) return true;
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  }

  // ─── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="All Requests"
        description="Track every request you've sent — checklists, documents, and signature requests."
      />

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by candidate name..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
        <TabsList>
          <TabsTrigger value="checklists" className="flex items-center gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Checklists ({checklistRequests.length})
          </TabsTrigger>
          <TabsTrigger value="shares" className="flex items-center gap-1.5">
            <Share2 className="h-3.5 w-3.5" />
            Shares ({shareRequests.length})
          </TabsTrigger>
          <TabsTrigger value="vaultsign" className="flex items-center gap-1.5">
            <FileSignature className="h-3.5 w-3.5" />
            VaultSign ({vaultSignDocs.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── Checklist Requests ─── */}
        <TabsContent value="checklists">
          <Card>
            <CardContent className="p-0">
              {checklistRequests.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardCheck className="h-10 w-10 text-text-muted mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">No checklist requests sent</p>
                  <p className="text-xs text-text-muted mt-1">
                    Send a compliance checklist from the Send Request page.
                  </p>
                  <Link href="/recruiter/send" className="inline-block mt-3">
                    <span className="text-sm text-primary hover:underline flex items-center gap-1">
                      Send Request <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-2 px-4 font-medium text-text-muted">Candidate</th>
                        <th className="py-2 px-4 font-medium text-text-muted">Checklist</th>
                        <th className="py-2 px-4 font-medium text-text-muted">Status</th>
                        <th className="py-2 px-4 font-medium text-text-muted">Progress</th>
                        <th className="py-2 px-4 font-medium text-text-muted">Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checklistRequests
                        .filter((req) => {
                          const name = `${req.candidate_user.first_name ?? ""} ${req.candidate_user.last_name ?? ""}`.trim();
                          return matchesSearch(name, req.candidate_user.email);
                        })
                        .map((req) => {
                          const name = `${req.candidate_user.first_name ?? ""} ${req.candidate_user.last_name ?? ""}`.trim() || req.candidate_user.email;
                          return (
                            <tr key={req.id} className="border-b border-border/60 hover:bg-surface-2/50">
                              <td className="py-3 px-4">
                                <p className="font-medium text-foreground">{name}</p>
                                <p className="text-xs text-text-muted">{req.candidate_user.email}</p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-foreground">{req.checklist_template.name}</p>
                                <p className="text-xs text-text-muted">{req.checklist_template.profession} · {req.checklist_template.specialty}</p>
                              </td>
                              <td className="py-3 px-4">{getStatusBadge(req.status)}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-16 bg-surface-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${req.completion_pct}%` }} />
                                  </div>
                                  <span className="text-xs text-text-muted">{req.completion_pct}%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-xs text-text-muted">
                                {new Date(req.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Share Requests (FIX C8: previously missing tab) ─── */}
        <TabsContent value="shares">
          <Card>
            <CardContent className="p-0">
              {shareRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Share2 className="h-10 w-10 text-text-muted mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">No document share requests</p>
                  <p className="text-xs text-text-muted mt-1">
                    Share requests are created when you request documents alongside checklists.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {shareRequests.filter(sr => matchesSearch(`${sr.candidate_user?.first_name || ""} ${sr.candidate_user?.last_name || ""}`, sr.candidate_user?.email || "")).map((sr) => (
                    <div key={sr.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {sr.candidate_user?.first_name} {sr.candidate_user?.last_name}
                          </span>
                          <span className="text-xs text-text-muted">{sr.candidate_user?.email}</span>
                        </div>
                        <div className="flex gap-1">
                          {sr.request_checklists && <Badge variant="outline" className="text-xs">Checklist</Badge>}
                          {sr.request_credentials && <Badge variant="outline" className="text-xs">Credentials</Badge>}
                          {sr.request_resume && <Badge variant="outline" className="text-xs">Resume</Badge>}
                          {sr.request_references && <Badge variant="outline" className="text-xs">References</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(sr.status)}
                        <span className="text-xs text-text-muted">{new Date(sr.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── VaultSign Documents ─── */}
        <TabsContent value="vaultsign">
          <Card>
            <CardContent className="p-0">
              {vaultSignDocs.length === 0 ? (
                <div className="text-center py-12">
                  <FileSignature className="h-10 w-10 text-text-muted mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">No VaultSign documents sent</p>
                  <p className="text-xs text-text-muted mt-1">
                    Send an RTR or offer letter from the VaultSign page.
                  </p>
                  <Link href="/recruiter/vaultsign/new" className="inline-block mt-3">
                    <span className="text-sm text-primary hover:underline flex items-center gap-1">
                      New Document <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-2 px-4 font-medium text-text-muted">Document</th>
                        <th className="py-2 px-4 font-medium text-text-muted">Type</th>
                        <th className="py-2 px-4 font-medium text-text-muted">Status</th>
                        <th className="py-2 px-4 font-medium text-text-muted">Sent</th>
                        <th className="py-2 px-4 font-medium text-text-muted">Expiry</th>
                        <th className="py-2 px-4 font-medium text-text-muted">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vaultSignDocs.map((doc) => (
                        <tr key={doc.id} className="border-b border-border/60 hover:bg-surface-2/50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-foreground truncate max-w-[200px]">{doc.document_name}</p>
                          </td>
                          <td className="py-3 px-4 text-xs text-text-muted">{doc.document_type}</td>
                          <td className="py-3 px-4">{getStatusBadge(doc.status)}</td>
                          <td className="py-3 px-4 text-xs text-text-muted">{new Date(doc.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-xs text-text-muted">{new Date(doc.expiry_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <Link href={`/recruiter/vaultsign/${doc.id}`} className="text-primary hover:underline text-xs flex items-center gap-1">
                              <Eye className="h-3 w-3" /> View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

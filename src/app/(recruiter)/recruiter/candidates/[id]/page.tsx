"use client";

/**
 * Candidate Profile — Unified 8-tab view
 *
 * This is the recruiter's command center for a single candidate.
 * Everything about the candidate lives here, in tabs:
 *
 *   1. Overview    — contact info, status, tags, next action, quick stats
 *   2. Timeline    — chronological audit trail of all interactions
 *   3. Documents   — compliance docs (BLS/ACLS/resume/credentials) with status
 *   4. VaultSign   — all VaultSign docs sent to this candidate
 *   5. Checklist   — compliance checklist progress
 *   6. Calendar    — interviews, start dates, credential expiry
 *   7. Requests    — pending requests (docs, references, calendar access)
 *   8. Access      — what recruiter has access to (email/phone verified)
 *
 * Data comes from /api/recruiter/bob/[id].
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, AlertCircle, Phone, Mail, MapPin, Calendar,
  FileText, FileSignature, ClipboardCheck, Clock, Eye, Send, Key,
  Edit3, MoreVertical, Ban, RefreshCw, Star, ChevronRight, Plus,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  ALL_STATUSES, STATUS_META, TAG_META, SOURCE_OPTIONS,
  type CandidateStatus, type CandidateTag,
} from "@/lib/bob/types";

// ─── Types ──────────────────────────────────────────────────────────
interface Activity {
  id: number;
  activity_type: string;
  description: string;
  actor_user_id: number | null;
  actor_type: string;
  metadata: any;
  created_at: string;
  actor: { id: number; first_name: string | null; last_name: string | null; email: string } | null;
}

interface VaultSignDoc {
  id: number;
  document_name: string;
  document_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  expiry_date: string;
  signers: Array<{
    id: number; name: string; email: string; role: string;
    status: string; signed_at: string | null; declined_at: string | null;
  }>;
}

interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  specialty: string | null;
  reached_for: string | null;
  remark: string | null;
  source: string;
  pipeline_stage: string;
  tag: string;
  star_rating: number | null;
  is_active: boolean;
  last_activity_at: string;
  last_activity_type: string | null;
  next_action: string | null;
  next_action_at: string | null;
  notes: string | null;
  blacklist_reason: string | null;
  blacklisted_at: string | null;
  created_at: string;
  updated_at: string;
  recruiter_user: { id: number; first_name: string | null; last_name: string | null; email: string };
  candidate_user: {
    id: number; first_name: string | null; last_name: string | null;
    email: string; phone: string | null; email_verified_at: string | null;
    candidate_profile: any;
  } | null;
  blacklisted_by: { id: number; first_name: string | null; last_name: string | null; email: string } | null;
  activities: Activity[];
  vault_sign_documents: VaultSignDoc[];
  call_schedules: any[];
  call_logs: any[];
  _count: { activities: number; vault_sign_documents: number };
}

interface Credential {
  id: number;
  document_name: string;
  file_url: string;
  expiration_date: string | null;
  status: string;
  verification_status: string;
  uploaded_at: string;
  review_notes: string | null;
}

interface ChecklistRequestItem {
  id: number;
  status: string;
  completion_pct: number;
  opened_at: string | null;
  created_at: string;
  checklist_template: { id: number; name: string; profession: string; specialty: string };
  client_user: { id: number; first_name: string | null; last_name: string | null; email: string };
}

interface ShareRequestItem {
  id: number;
  status: string;
  request_checklists: boolean;
  request_credentials: boolean;
  request_resume: boolean;
  request_references: boolean;
  message: string | null;
  created_at: string;
  client_user: { id: number; first_name: string | null; last_name: string | null; email: string };
}

interface CandidateData {
  credentials: Credential[];
  checklistRequests: ChecklistRequestItem[];
  shareRequests: ShareRequestItem[];
  resume: { id: number; file_url: string; parsed_data: any; created_at: string } | null;
}

type Tab = "overview" | "timeline" | "documents" | "vaultsign" | "checklist" | "calendar" | "requests" | "access";

const TABS: Array<{ id: Tab; label: string; icon: any }> = [
  { id: "overview",   label: "Overview",  icon: Eye },
  { id: "timeline",   label: "Timeline",  icon: Clock },
  { id: "documents",  label: "Documents", icon: FileText },
  { id: "vaultsign",  label: "VaultSign", icon: FileSignature },
  { id: "checklist",  label: "Checklist", icon: ClipboardCheck },
  { id: "calendar",   label: "Calendar",  icon: Calendar },
  { id: "requests",   label: "Requests",  icon: Send },
  { id: "access",     label: "Access",    icon: Key },
];

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [candidateData, setCandidateData] = useState<CandidateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Edit dialog
  const [showEdit, setShowEdit] = useState(false);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [showReactivate, setShowReactivate] = useState(false);
  const [showLogCall, setShowLogCall] = useState(false);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recruiter/bob/${leadId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch lead");
      }
      const data = await res.json();
      setLead(data.lead);
      setCandidateData(data.candidateData || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  // ─── Status change handler ──────────────────────────────────────
  async function changeStatus(newStatus: CandidateStatus) {
    try {
      const res = await fetch(`/api/recruiter/bob/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline_stage: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change status");
      }
      toast.success(`Status changed to ${STATUS_META[newStatus].label}`);
      fetchLead();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // ─── Blacklist handler ──────────────────────────────────────────
  async function handleBlacklist() {
    if (!blacklistReason.trim()) {
      toast.error("Blacklist reason is required");
      return;
    }
    try {
      const res = await fetch(`/api/recruiter/bob/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blacklist_reason: blacklistReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to blacklist");
      }
      toast.success("Lead blacklisted");
      setShowBlacklist(false);
      setBlacklistReason("");
      fetchLead();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // ─── Reactivate handler ─────────────────────────────────────────
  async function handleReactivate() {
    try {
      const res = await fetch(`/api/recruiter/bob/${leadId}/reactivate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reactivate");
      }
      toast.success("Lead reactivated — moved to your BOB");
      setShowReactivate(false);
      fetchLead();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // ─── Add note handler ───────────────────────────────────────────
  async function handleAddNote(text: string) {
    try {
      const res = await fetch(`/api/recruiter/bob/${leadId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_type: "note_added", text }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      toast.success("Note added");
      fetchLead();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // ─── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error || "Lead not found"}</span>
        </div>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/recruiter/candidates")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to BOB
        </Button>
      </div>
    );
  }

  const status = STATUS_META[lead.pipeline_stage as CandidateStatus];
  const tag = TAG_META[lead.tag as CandidateTag];
  const isBlacklisted = lead.pipeline_stage === "blacklisted";
  const isCompanyPool = ["inactive", "not_interested", "blacklisted"].includes(lead.pipeline_stage);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Back link */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/recruiter/candidates")}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to BOB
      </Button>

      {/* ─── Header card ─── */}
      <div className="bg-background border rounded-lg p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
              style={{ backgroundColor: status.bgColor, color: status.color, border: `2px solid ${status.borderColor}` }}
            >
              {lead.first_name[0]}{lead.last_name[0]}
            </div>

            {/* Name + contact */}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-foreground">
                {lead.first_name} {lead.last_name}
                {lead.star_rating && (
                  <span className="ml-2 text-amber-500" title={`${lead.star_rating} stars`}>
                    {"★".repeat(lead.star_rating)}
                  </span>
                )}
              </h1>

              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: status.color, backgroundColor: status.bgColor, border: `1px solid ${status.borderColor}` }}
                  title={status.description}
                >
                  {status.icon} {status.label}
                </span>
                <span className="text-xs" title={tag.description}>
                  {tag.emoji} {tag.label}
                </span>
                {lead.specialty && (
                  <span className="text-xs text-text-muted">· {lead.specialty}</span>
                )}
                {lead.job_title && (
                  <span className="text-xs text-text-muted">· {lead.job_title}</span>
                )}
              </div>

              {/* Contact info */}
              <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary flex-wrap">
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-foreground">
                    <Mail className="h-3 w-3" /> {lead.email}
                  </a>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-foreground">
                    <Phone className="h-3 w-3" /> {lead.phone}
                  </a>
                )}
                {lead.reached_for && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {lead.reached_for}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick status change */}
            <Select value={lead.pipeline_stage} onValueChange={(v) => changeStatus(v as CandidateStatus)}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].icon} {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* More actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowEdit(true)}>
                  <Edit3 className="h-4 w-4 mr-2" /> Edit details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowLogCall(true)}>
                  <Phone className="h-4 w-4 mr-2" /> Log a call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/recruiter/vaultsign/new?lead=${lead.id}`)}>
                  <FileSignature className="h-4 w-4 mr-2" /> Send VaultSign doc
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/recruiter/send?lead=${lead.id}`)}>
                  <Send className="h-4 w-4 mr-2" /> Request documents
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isCompanyPool ? (
                  <DropdownMenuItem onClick={() => setShowReactivate(true)}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Reactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => setShowBlacklist(true)}
                  >
                    <Ban className="h-4 w-4 mr-2" /> Blacklist
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Blacklist banner */}
        {isBlacklisted && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <Ban className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-red-900">This candidate is blacklisted</p>
                <p className="text-red-700 mt-0.5">
                  Reason: {lead.blacklist_reason || "No reason provided"}
                </p>
                {lead.blacklisted_at && (
                  <p className="text-xs text-red-600 mt-1">
                    Blacklisted on {new Date(lead.blacklisted_at).toLocaleDateString()} by{" "}
                    {lead.blacklisted_by
                      ? `${lead.blacklisted_by.first_name ?? ""} ${lead.blacklisted_by.last_name ?? ""}`.trim()
                      : "Unknown"}
                  </p>
                )}
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowReactivate(true)}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reactivate this candidate
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Next action */}
        {lead.next_action && !isBlacklisted && (
          <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Next action:</span>
              <span className="text-blue-800">{lead.next_action}</span>
              {lead.next_action_at && (
                <span className="text-blue-600 text-xs">
                  (due {new Date(lead.next_action_at).toLocaleDateString()})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Tabs ─── */}
      <div className="border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-text-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.id === "timeline" && lead._count.activities > 0 && (
                  <span className="text-[10px] bg-surface-2 px-1 rounded-full">{lead._count.activities}</span>
                )}
                {tab.id === "vaultsign" && lead._count.vault_sign_documents > 0 && (
                  <span className="text-[10px] bg-surface-2 px-1 rounded-full">{lead._count.vault_sign_documents}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Tab content ─── */}
      <div className="bg-background border rounded-lg p-5 min-h-[300px]">
        {activeTab === "overview" && <OverviewTab lead={lead} />}
        {activeTab === "timeline" && <TimelineTab activities={lead.activities} onAddNote={handleAddNote} />}
        {activeTab === "documents" && <DocumentsTab lead={lead} candidateData={candidateData} />}
        {activeTab === "vaultsign" && <VaultSignTab docs={lead.vault_sign_documents} leadId={lead.id} />}
        {activeTab === "checklist" && <ChecklistTab lead={lead} candidateData={candidateData} />}
        {activeTab === "calendar" && <CalendarTab lead={lead} />}
        {activeTab === "requests" && <RequestsTab lead={lead} candidateData={candidateData} />}
        {activeTab === "access" && <AccessTab lead={lead} />}
      </div>

      {/* ─── Edit dialog ─── */}
      {showEdit && (
        <EditLeadDialog
          lead={lead}
          open={showEdit}
          onOpenChange={setShowEdit}
          onSaved={() => {
            fetchLead();
            setShowEdit(false);
          }}
        />
      )}

      {/* ─── Blacklist dialog ─── */}
      <Dialog open={showBlacklist} onOpenChange={setShowBlacklist}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <Ban className="h-5 w-5" /> Blacklist this candidate?
            </DialogTitle>
            <DialogDescription>
              Blacklisted candidates prompt all recruiters before any activity. They stay in the Company Pool until reactivated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (required) *</label>
            <Textarea
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
              placeholder="e.g. Fraudulent credentials, behavioral issues, multiple backouts..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlacklist(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlacklist}>
              <Ban className="h-4 w-4 mr-1.5" /> Blacklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reactivate dialog ─── */}
      <Dialog open={showReactivate} onOpenChange={setShowReactivate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" /> Reactivate this candidate?
            </DialogTitle>
            <DialogDescription>
              {isBlacklisted
                ? `This candidate was blacklisted on ${lead.blacklisted_at ? new Date(lead.blacklisted_at).toLocaleDateString() : "unknown date"}. Reason: ${lead.blacklist_reason || "Not provided"}`
                : `This candidate is currently in the Company Pool (status: ${status.label}).`
              }
              <br /><br />
              Reactivating will:
              <br />• Move them to your BOB with status "Interested"
              <br />• Clear the blacklist (if applicable)
              <br />• Preserve the full activity history
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReactivate(false)}>Cancel</Button>
            <Button onClick={handleReactivate}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Yes, reactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Log Call dialog ─── */}
      {showLogCall && (
        <LogCallDialog
          leadName={`${lead.first_name} ${lead.last_name}`}
          leadId={lead.id}
          open={showLogCall}
          onOpenChange={setShowLogCall}
          onLogged={() => {
            fetchLead();
            setShowLogCall(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Tab: Overview ──────────────────────────────────────────────────
function OverviewTab({ lead }: { lead: Lead }) {
  const sourceLabel = SOURCE_OPTIONS.find((s) => s.value === lead.source)?.label
    ?? (lead.source.startsWith("other:") ? lead.source.slice(6) : lead.source);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left: contact + meta */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase text-text-muted mb-2">Contact</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Email</dt>
              <dd className="font-medium">{lead.email || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Phone</dt>
              <dd className="font-medium">{lead.phone || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Job title</dt>
              <dd className="font-medium">{lead.job_title || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Specialty</dt>
              <dd className="font-medium">{lead.specialty || "—"}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase text-text-muted mb-2">Lead info</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Source</dt>
              <dd className="font-medium">{sourceLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Reaching for</dt>
              <dd className="font-medium">{lead.reached_for || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Added</dt>
              <dd className="font-medium">{new Date(lead.created_at).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Last activity</dt>
              <dd className="font-medium">
                {new Date(lead.last_activity_at).toLocaleDateString()}
                {lead.last_activity_type && <span className="text-text-muted ml-1">({lead.last_activity_type})</span>}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Owning recruiter</dt>
              <dd className="font-medium">
                {lead.recruiter_user.first_name} {lead.recruiter_user.last_name}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Right: notes + quick stats */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase text-text-muted mb-2">Quick stats</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface-2 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{lead._count.activities}</p>
              <p className="text-[10px] text-text-muted uppercase">Activities</p>
            </div>
            <div className="bg-surface-2 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{lead._count.vault_sign_documents}</p>
              <p className="text-[10px] text-text-muted uppercase">Docs sent</p>
            </div>
            <div className="bg-surface-2 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{lead.call_logs?.length || 0}</p>
              <p className="text-[10px] text-text-muted uppercase">Calls</p>
            </div>
          </div>
        </div>

        {lead.remark && (
          <div>
            <h3 className="text-xs font-semibold uppercase text-text-muted mb-2">Call remark</h3>
            <p className="text-sm bg-surface-2 p-3 rounded-lg">{lead.remark}</p>
          </div>
        )}

        {lead.notes && (
          <div>
            <h3 className="text-xs font-semibold uppercase text-text-muted mb-2">Internal notes</h3>
            <p className="text-sm bg-surface-2 p-3 rounded-lg whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}

        {lead.candidate_user && (
          <div>
            <h3 className="text-xs font-semibold uppercase text-text-muted mb-2">Platform account</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-green-900">
                ✓ Linked to platform account
              </p>
              <p className="text-green-700 text-xs mt-1">
                {lead.candidate_user.email_verified_at
                  ? "Email verified"
                  : "Email not verified"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Timeline ──────────────────────────────────────────────────
function TimelineTab({ activities, onAddNote }: { activities: Activity[]; onAddNote: (text: string) => void }) {
  const [noteText, setNoteText] = useState("");

  function submitNote() {
    if (!noteText.trim()) return;
    onAddNote(noteText.trim());
    setNoteText("");
  }

  return (
    <div className="space-y-4">
      {/* Add note */}
      <div className="flex gap-2">
        <Input
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a note to the timeline..."
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitNote(); } }}
        />
        <Button onClick={submitNote} disabled={!noteText.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Add note
        </Button>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-10 w-10 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-muted">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  activity.activity_type === "blacklisted" ? "bg-red-500" :
                  activity.activity_type === "reactivated" ? "bg-green-500" :
                  activity.activity_type === "rtr_signed" || activity.activity_type === "offer_accepted" ? "bg-emerald-500" :
                  activity.activity_type === "rtr_denied" ? "bg-red-400" :
                  activity.activity_type === "note_added" ? "bg-blue-400" :
                  "bg-primary"
                }`} />
                <div className="w-px flex-1 bg-border" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{activity.description}</p>
                  <span className="text-xs text-text-muted shrink-0">
                    {new Date(activity.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  by {activity.actor_type}
                  {activity.actor ? ` (${activity.actor.first_name ?? ""} ${activity.actor.last_name ?? ""})`.trim() : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Documents ─────────────────────────────────────────────────
function DocumentsTab({ lead, candidateData }: { lead: Lead; candidateData: CandidateData | null }) {
  const credentials = candidateData?.credentials || [];
  const resume = candidateData?.resume || null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Compliance documents and credentials uploaded by the candidate.
        </p>
        <Link href="/recruiter/send">
          <Button size="sm" variant="outline">
            <Send className="h-4 w-4 mr-1.5" /> Request documents
          </Button>
        </Link>
      </div>

      {!lead.candidate_user ? (
        <div className="text-center py-12 bg-surface-2 rounded-lg">
          <FileText className="h-10 w-10 text-text-muted mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No platform account yet</p>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            This candidate hasn't signed up on MyZipVault yet. Once they do (e.g. after signing an RTR
            or receiving a Send Request), their uploaded documents will appear here automatically.
          </p>
        </div>
      ) : credentials.length === 0 && !resume ? (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-text-muted mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No documents uploaded yet</p>
          <p className="text-xs text-text-muted mt-1">
            The candidate has a platform account but hasn't uploaded any credentials or resume yet.
            Send a document request to prompt them.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Resume (if exists) */}
          {resume && (
            <div className="bg-background border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Resume</p>
                    <p className="text-xs text-text-muted">
                      Uploaded {new Date(resume.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <a
                  href={resume.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View
                </a>
              </div>
            </div>
          )}

          {/* Credentials */}
          {credentials.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-text-muted mb-2">
                Credentials ({credentials.length})
              </h4>
              <div className="space-y-2">
                {credentials.map((cred) => {
                  const statusColor =
                    cred.status === "expired" ? "text-red-600 bg-red-50 border-red-200" :
                    cred.status === "expiring_soon" ? "text-amber-600 bg-amber-50 border-amber-200" :
                    "text-green-600 bg-green-50 border-green-200";

                  const verifyColor =
                    cred.verification_status === "verified" ? "text-green-600" :
                    cred.verification_status === "rejected" ? "text-red-600" :
                    "text-amber-600";

                  return (
                    <div key={cred.id} className="bg-background border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {cred.document_name}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                            <span>Uploaded {new Date(cred.uploaded_at).toLocaleDateString()}</span>
                            {cred.expiration_date && (
                              <span className={cred.status === "expired" ? "text-red-600" : ""}>
                                Expires {new Date(cred.expiration_date).toLocaleDateString()}
                              </span>
                            )}
                            <span className={verifyColor}>
                              {cred.verification_status.replace(/_/g, " ")}
                            </span>
                          </div>
                          {cred.review_notes && (
                            <p className="text-xs text-text-muted mt-1 italic">
                              "{cred.review_notes}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor}`}>
                            {cred.status.replace(/_/g, " ")}
                          </span>
                          <a
                            href={cred.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: VaultSign ─────────────────────────────────────────────────
function VaultSignTab({ docs, leadId }: { docs: VaultSignDoc[]; leadId: number }) {
  if (docs.length === 0) {
    return (
      <div className="text-center py-12">
        <FileSignature className="h-10 w-10 text-text-muted mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">No VaultSign documents yet</p>
        <p className="text-xs text-text-muted mt-1 mb-4">
          Send an RTR or offer letter — it'll appear here automatically.
        </p>
        <Link href={`/recruiter/vaultsign/new?lead=${leadId}`}>
          <Button size="sm">
            <FileSignature className="h-4 w-4 mr-1.5" /> Send VaultSign document
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {docs.map((doc) => {
        const docStatus = doc.status;
        const statusColor =
          docStatus === "completed" ? "text-green-600 bg-green-50 border-green-200" :
          docStatus === "declined" ? "text-red-600 bg-red-50 border-red-200" :
          docStatus === "sent" || docStatus === "partially_signed" ? "text-blue-600 bg-blue-50 border-blue-200" :
          "text-text-muted bg-surface-2 border-border";

        return (
          <Link
            key={doc.id}
            href={`/recruiter/vaultsign/${doc.id}`}
            className="block bg-background border rounded-lg p-3 hover:shadow-sm hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{doc.document_name}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {doc.document_type} · Sent {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                {docStatus.replace(/_/g, " ")}
              </span>
            </div>

            {/* Signers */}
            <div className="flex items-center gap-2 mt-2">
              {doc.signers.map((signer) => (
                <span key={signer.id} className="text-[10px] flex items-center gap-1 text-text-muted">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    signer.status === "signed" ? "bg-green-500" :
                    signer.status === "declined" ? "bg-red-500" :
                    "bg-text-muted"
                  }`} />
                  {signer.name} ({signer.role})
                </span>
              ))}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Tab: Checklist ─────────────────────────────────────────────────
function ChecklistTab({ lead, candidateData }: { lead: Lead; candidateData: CandidateData | null }) {
  const checklistRequests = candidateData?.checklistRequests || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">Compliance checklist progress for this candidate.</p>
        <Link href="/recruiter/send">
          <Button size="sm" variant="outline">
            <ClipboardCheck className="h-4 w-4 mr-1.5" /> Send checklist
          </Button>
        </Link>
      </div>
      {!lead.candidate_user ? (
        <div className="text-center py-12 bg-surface-2 rounded-lg">
          <ClipboardCheck className="h-10 w-10 text-text-muted mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No platform account yet</p>
          <p className="text-xs text-text-muted mt-1">
            Compliance checklists require the candidate to have a MyZipVault account.
            Send a request to invite them.
          </p>
        </div>
      ) : checklistRequests.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardCheck className="h-10 w-10 text-text-muted mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No checklists sent yet</p>
          <p className="text-xs text-text-muted mt-1">
            Send a compliance checklist to start tracking this candidate's qualifications.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {checklistRequests.map((req) => {
            const statusColor =
              req.status === "completed" ? "text-green-600 bg-green-50 border-green-200" :
              req.status === "declined" || req.status === "cancelled" ? "text-red-600 bg-red-50 border-red-200" :
              req.status === "sent" || req.status === "opened" ? "text-blue-600 bg-blue-50 border-blue-200" :
              "text-text-muted bg-surface-2 border-border";

            return (
              <div key={req.id} className="bg-background border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {req.checklist_template.name}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {req.checklist_template.profession} · {req.checklist_template.specialty}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                      <span>Sent {new Date(req.created_at).toLocaleDateString()}</span>
                      {req.opened_at && (
                        <span>Opened {new Date(req.opened_at).toLocaleDateString()}</span>
                      )}
                      <span>by {req.client_user.first_name ?? ""} {req.client_user.last_name ?? ""}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                    {req.status}
                  </span>
                </div>
                {req.completion_pct > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Progress</span>
                      <span>{req.completion_pct}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${req.completion_pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Calendar ──────────────────────────────────────────────────
function CalendarTab({ lead }: { lead: Lead }) {
  const upcomingCalls = lead.call_schedules?.filter((c: any) =>
    c.status === "scheduled" && new Date(c.scheduled_date || c.scheduled_month) > new Date()
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">Interviews, calls, start dates, and credential expiries.</p>
        <Button size="sm" variant="outline">
          <Calendar className="h-4 w-4 mr-1.5" /> Schedule call
        </Button>
      </div>

      {upcomingCalls.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-10 w-10 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-muted">No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingCalls.map((call: any) => (
            <div key={call.id} className="bg-background border rounded-lg p-3">
              <p className="text-sm font-medium">
                Call scheduled: {call.scheduled_date
                  ? new Date(call.scheduled_date).toLocaleString()
                  : call.scheduled_month}
              </p>
              <p className="text-xs text-text-muted">Status: {call.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Requests ──────────────────────────────────────────────────
function RequestsTab({ lead, candidateData }: { lead: Lead; candidateData: CandidateData | null }) {
  const shareRequests = candidateData?.shareRequests || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Document share requests sent to this candidate.
        </p>
        <Link href="/recruiter/send">
          <Button size="sm" variant="outline">
            <Send className="h-4 w-4 mr-1.5" /> New request
          </Button>
        </Link>
      </div>

      {!lead.candidate_user ? (
        <div className="text-center py-12 bg-surface-2 rounded-lg">
          <Send className="h-10 w-10 text-text-muted mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No platform account yet</p>
          <p className="text-xs text-text-muted mt-1">
            Document share requests require the candidate to have a MyZipVault account.
          </p>
        </div>
      ) : shareRequests.length === 0 ? (
        <div className="text-center py-12">
          <Send className="h-10 w-10 text-text-muted mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No share requests sent</p>
          <p className="text-xs text-text-muted mt-1">
            Send a request to ask the candidate to share their checklist, credentials, resume, or references.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {shareRequests.map((req) => {
            const requestedTypes = [
              req.request_checklists && "Checklist",
              req.request_credentials && "Credentials",
              req.request_resume && "Resume",
              req.request_references && "References",
            ].filter(Boolean) as string[];

            const statusColor =
              req.status === "completed" || req.status === "shared" ? "text-green-600 bg-green-50 border-green-200" :
              req.status === "declined" ? "text-red-600 bg-red-50 border-red-200" :
              req.status === "pending" ? "text-amber-600 bg-amber-50 border-amber-200" :
              "text-text-muted bg-surface-2 border-border";

            return (
              <div key={req.id} className="bg-background border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Requesting: {requestedTypes.join(", ")}
                    </p>
                    {req.message && (
                      <p className="text-xs text-text-muted mt-1 italic">"{req.message}"</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                      <span>Sent {new Date(req.created_at).toLocaleDateString()}</span>
                      <span>by {req.client_user.first_name ?? ""} {req.client_user.last_name ?? ""}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                    {req.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Access ────────────────────────────────────────────────────
function AccessTab({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">What contact info and access you have for this candidate.</p>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-background border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Email address</span>
            <Badge variant={lead.email ? "default" : "secondary"}>
              {lead.email ? "Available" : "Missing"}
            </Badge>
          </div>
          {lead.email && <p className="text-xs text-text-muted mt-1">{lead.email}</p>}
        </div>

        <div className="bg-background border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Phone number</span>
            <Badge variant={lead.phone ? "default" : "secondary"}>
              {lead.phone ? "Available" : "Missing"}
            </Badge>
          </div>
          {lead.phone && <p className="text-xs text-text-muted mt-1">{lead.phone}</p>}
        </div>

        <div className="bg-background border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Platform account</span>
            <Badge variant={lead.candidate_user ? "default" : "secondary"}>
              {lead.candidate_user ? "Linked" : "Not signed up"}
            </Badge>
          </div>
          {lead.candidate_user && (
            <p className="text-xs text-text-muted mt-1">
              {lead.candidate_user.email_verified_at ? "Email verified" : "Email not verified"}
            </p>
          )}
        </div>

        <div className="bg-background border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Calendar access</span>
            <Badge variant="secondary">Not shared</Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">Request calendar access to see their availability.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Log Call Dialog ────────────────────────────────────────────────
function LogCallDialog({
  leadName, leadId, open, onOpenChange, onLogged,
}: {
  leadName: string;
  leadId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState("Reached — had a good conversation");
  const [notes, setNotes] = useState("");

  async function handleLog() {
    if (!outcome.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/recruiter/bob/${leadId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_type: "call_logged",
          outcome: outcome.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to log call");
      toast.success("Call logged — activity timeline updated");
      setOutcome("Reached — had a good conversation");
      setNotes("");
      onLogged();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" /> Log a call with {leadName}
          </DialogTitle>
          <DialogDescription>
            Logging a call updates the candidate&apos;s last activity and keeps them
            from going inactive (30-day rule).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium">Call outcome *</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Reached — had a good conversation">Reached — good conversation</SelectItem>
                <SelectItem value="Reached — left voicemail">Reached — left voicemail</SelectItem>
                <SelectItem value="Reached — not interested">Reached — not interested</SelectItem>
                <SelectItem value="Reached — call back later">Reached — call back later</SelectItem>
                <SelectItem value="No answer">No answer</SelectItem>
                <SelectItem value="Wrong number">Wrong number</SelectItem>
                <SelectItem value="Number disconnected">Number disconnected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed? Any follow-ups needed?"
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleLog} disabled={saving || !outcome.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Log call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Lead Dialog ───────────────────────────────────────────────
function EditLeadDialog({
  lead, open, onOpenChange, onSaved,
}: {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(lead.first_name);
  const [lastName, setLastName] = useState(lead.last_name);
  const [email, setEmail] = useState(lead.email || "");
  const [phone, setPhone] = useState(lead.phone || "");
  const [jobTitle, setJobTitle] = useState(lead.job_title || "");
  const [specialty, setSpecialty] = useState(lead.specialty || "");
  const [reachedFor, setReachedFor] = useState(lead.reached_for || "");
  const [notes, setNotes] = useState(lead.notes || "");

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/recruiter/bob/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName, last_name: lastName,
          email: email || null, phone: phone || null,
          job_title: jobTitle || null, specialty: specialty || null,
          reached_for: reachedFor || null, notes: notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      toast.success("Lead updated");
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">First name</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Last name</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Job title</label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Specialty</label>
              <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Reaching for</label>
            <Input value={reachedFor} onChange={(e) => setReachedFor(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

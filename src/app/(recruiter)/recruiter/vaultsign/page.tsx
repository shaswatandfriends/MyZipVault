"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSignature, Plus, Search, Eye, Send, Ban, Copy, RotateCcw,
  Clock, CheckCircle2, XCircle, AlertCircle, FileText, Loader2,
  ArrowRight, Filter, Upload, LayoutTemplate, Sparkles, ChevronRight,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────
interface Signer {
  id: number;
  name: string;
  email: string;
  role: string;
  party_number: number;
  status: string;
}

interface Document {
  id: number;
  document_name: string;
  document_type: string;
  status: string;
  signing_order: string;
  expiry_date: string;
  created_at: string;
  signers: Signer[];
}

interface Stats {
  pending: number;
  completed_this_month: number;
  declined: number;
  expiring_soon: number;
}

interface Template {
  id: number;
  name: string;
  description: string | null;
  document_type: string;
  document_url: string;
  placeholder_fields: string;
  predefined_sign_fields: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  preview_url?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" },
  sent: { label: "Sent", bg: "bg-blue-50", text: "text-blue-700" },
  partially_signed: { label: "Partially Signed", bg: "bg-[#FEF9C3]", text: "text-[#CA8A04]" },
  completed: { label: "Completed", bg: "bg-[#DCFCE7]", text: "text-[#166534]" },
  declined: { label: "Declined", bg: "bg-[#FEE2E2]", text: "text-[#DC2626]" },
  expired: { label: "Expired", bg: "bg-orange-50", text: "text-orange-700" },
  voided: { label: "Voided", bg: "bg-[#F3F4F6]", text: "text-[#9CA3AF]" },
};

const typeLabels: Record<string, string> = {
  right_to_represent: "Right to Represent",
  pre_offer_acceptance: "Pre-Offer Acceptance",
  offer_letter: "Offer Letter",
  nda: "NDA",
  background_check_authorization: "Background Check Auth",
  employment_contract: "Employment Contract",
  onboarding_form: "Onboarding Form",
  custom: "Custom",
};

const typeBadgeColors: Record<string, { bg: string; text: string; icon: string }> = {
  right_to_represent: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "🤝" },
  pre_offer_acceptance: { bg: "bg-teal-50", text: "text-teal-700", icon: "📋" },
  offer_letter: { bg: "bg-green-50", text: "text-green-700", icon: "✉️" },
  nda: { bg: "bg-amber-50", text: "text-amber-700", icon: "🔒" },
  background_check_authorization: { bg: "bg-purple-50", text: "text-purple-700", icon: "🔍" },
  employment_contract: { bg: "bg-blue-50", text: "text-blue-700", icon: "📝" },
  onboarding_form: { bg: "bg-cyan-50", text: "text-cyan-700", icon: "📄" },
  custom: { bg: "bg-gray-50", text: "text-gray-700", icon: "📎" },
};

const partyColors = ["#166534", "#0D9488", "#7C3AED", "#D97706"];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getSignerColor(status: string) {
  switch (status) {
    case "signed": return "#166534";
    case "declined": return "#DC2626";
    default: return "#9CA3AF";
  }
}

// ─── Component ──────────────────────────────────────────────────────
export default function VaultSignDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, completed_this_month: 0, declined: 0, expiring_soon: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/vaultsign/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {
      // Silently fail for templates — not critical
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("document_type", typeFilter);
      const res = await fetch(`/api/vaultsign/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setStats(data.stats || { pending: 0, completed_this_month: 0, declined: 0, expiring_soon: 0 });
      }
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleVoid = async (id: number) => {
    if (!confirm("Are you sure you want to void this document? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/vaultsign/documents/${id}/void`, { method: "POST" });
      if (res.ok) { toast.success("Document voided"); fetchDocuments(); }
      else { const d = await res.json(); toast.error(d.error || "Failed to void"); }
    } catch { toast.error("Failed to void document"); }
  };

  const handleSend = async (id: number) => {
    try {
      const res = await fetch(`/api/vaultsign/documents/${id}/send`, { method: "POST" });
      if (res.ok) { toast.success("Document sent for signature"); fetchDocuments(); }
      else { const d = await res.json(); toast.error(d.error || "Failed to send"); }
    } catch { toast.error("Failed to send document"); }
  };

  const handleDuplicate = async (doc: Document) => {
    try {
      const res = await fetch(`/api/vaultsign/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_name: `${doc.document_name} (Copy)`,
          document_type: doc.document_type,
          signing_order: doc.signing_order,
          expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          signers: doc.signers.filter((s) => s.party_number > 1).map((s) => ({
            name: s.name, email: s.email, role: s.role,
            party_number: s.party_number, signing_order_position: 2,
          })),
        }),
      });
      if (res.ok) { toast.success("Document duplicated"); fetchDocuments(); }
      else { const d = await res.json(); toast.error(d.error || "Failed to duplicate"); }
    } catch { toast.error("Failed to duplicate"); }
  };

  const getExpiryColor = (date: string) => {
    const diff = (new Date(date).getTime() - Date.now()) / 86400000;
    if (diff < 7) return "text-[#DC2626]";
    if (diff < 14) return "text-orange-600";
    return "text-[#6B7280]";
  };

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER — Title left, two buttons right
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            VaultSign
          </h1>
          <p className="text-sm text-[#6B7280]">Send, track, and manage signed documents.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-[#E5E7EB] text-[#374151] hover:bg-[#F8F7F4] hover:border-[#D1D5DB]"
            asChild
          >
            <Link href="/recruiter/vaultsign/upload">
              <Upload className="size-4 mr-2" /> Upload Custom PDF
            </Link>
          </Button>
          <Button asChild className="bg-[#166534] hover:bg-[#14532D]">
            <Link href="/recruiter/vaultsign/new">
              <Plus className="size-4 mr-2" /> New Document
            </Link>
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: Start with a Template (PRIMARY — shown first)
      ═══════════════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center size-9 rounded-lg bg-[#DCFCE7]">
            <LayoutTemplate className="size-5 text-[#166534]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Start with a Template</h2>
            <p className="text-sm text-[#6B7280]">Choose a pre-built template to get started quickly.</p>
          </div>
        </div>

        {templatesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#E5E7EB] p-5 animate-pulse"
              >
                <div className="h-4 bg-[#F3F4F6] rounded w-2/3 mb-3" />
                <div className="h-3 bg-[#F3F4F6] rounded w-full mb-2" />
                <div className="h-3 bg-[#F3F4F6] rounded w-4/5 mb-4" />
                <div className="h-6 bg-[#F3F4F6] rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#D1D5DB]">
            <LayoutTemplate className="size-12 mx-auto text-[#9CA3AF] mb-3" />
            <h3 className="text-lg font-medium text-[#111827]">No templates available yet</h3>
            <p className="text-sm text-[#6B7280] mt-1 mb-5">
              Templates will appear here once they are created by your organization.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button asChild className="bg-[#166534] hover:bg-[#14532D]">
                <Link href="/recruiter/vaultsign/new">
                  <Plus className="size-4 mr-2" /> Create from Scratch
                </Link>
              </Button>
              <Button variant="outline" className="border-[#E5E7EB]" asChild>
                <Link href="/recruiter/vaultsign/upload">
                  <Upload className="size-4 mr-2" /> Upload PDF
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const badge = typeBadgeColors[template.document_type] || typeBadgeColors.custom;
              return (
                <Link
                  key={template.id}
                  href={`/recruiter/vaultsign/new?template=${template.id}`}
                  className="group bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:border-[#166534]/30 hover:ring-1 hover:ring-[#166534]/10 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-medium text-[#111827] group-hover:text-[#166534] transition-colors line-clamp-1">
                      {template.name}
                    </h3>
                    <ChevronRight className="size-4 text-[#9CA3AF] group-hover:text-[#166534] shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-[#6B7280] line-clamp-2 mb-4 min-h-[2.5rem]">
                    {template.description || `Use this ${typeLabels[template.document_type] || "document"} template to get started.`}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge
                      className={`${badge.bg} ${badge.text} border-0 text-xs font-medium`}
                    >
                      <span className="mr-1">{badge.icon}</span>
                      {typeLabels[template.document_type] || "Custom"}
                    </Badge>
                    <span className="text-xs text-[#9CA3AF] flex items-center gap-1 group-hover:text-[#0D9488] transition-colors">
                      Use template
                      <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          DIVIDER between sections
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-[#E5E7EB]" />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2: Your Documents
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-[#F0FDFA]">
            <FileSignature className="size-5 text-[#0D9488]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Your Documents</h2>
            <p className="text-sm text-[#6B7280]">View and manage all your sent and received documents.</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pending Signatures", value: stats.pending, icon: Clock, color: "text-blue-600" },
            { label: "Completed This Month", value: stats.completed_this_month, icon: CheckCircle2, color: "text-[#166534]" },
            { label: "Declined", value: stats.declined, icon: XCircle, color: "text-[#DC2626]" },
            { label: "Expiring Soon", value: stats.expiring_soon, icon: AlertCircle, color: "text-orange-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#6B7280]">{s.label}</p>
                <s.icon className={`size-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-semibold text-[#111827] mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl border border-[#E5E7EB] p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
            <Input
              placeholder="Search documents..."
              className="pl-9 border-[#E5E7EB]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] border-[#E5E7EB]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="partially_signed">Partially Signed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px] border-[#E5E7EB]">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(typeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Documents Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-[#166534]" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-[#D1D5DB]">
            <FileSignature className="size-12 mx-auto text-[#9CA3AF] mb-3" />
            <h3 className="text-lg font-medium text-[#111827]">No documents yet</h3>
            <p className="text-sm text-[#6B7280] mt-1">Create your first document to get started.</p>
            <Button asChild className="mt-4 bg-[#166534] hover:bg-[#14532D]">
              <Link href="/recruiter/vaultsign/new"><Plus className="size-4 mr-2" /> New Document</Link>
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Document</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Signers</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Expiry</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Created</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const sc = statusConfig[doc.status] || statusConfig.draft;
                    return (
                      <tr key={doc.id} className="border-b border-[#E5E7EB] hover:bg-[#F8F7F4] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#111827]">{doc.document_name}</div>
                          <Badge variant="secondary" className="mt-1 text-[10px] bg-[#F3F4F6] text-[#6B7280]">
                            {typeLabels[doc.document_type] || doc.document_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex -space-x-2">
                            {doc.signers.slice(0, 4).map((s, i) => (
                              <div
                                key={s.id}
                                className="size-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${getSignerColor(s.status)}20`,
                                  color: getSignerColor(s.status),
                                }}
                                title={`${s.name} — ${s.status}`}
                              >
                                {getInitials(s.name)}
                              </div>
                            ))}
                            {doc.signers.length > 4 && (
                              <div className="size-7 rounded-full border-2 border-white bg-[#F3F4F6] flex items-center justify-center text-[10px] text-[#6B7280]">
                                +{doc.signers.length - 4}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${sc.bg} ${sc.text} border-0`}>{sc.label}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm ${getExpiryColor(doc.expiry_date)}`}>
                            {new Date(doc.expiry_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[#6B7280]">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push(`/recruiter/vaultsign/${doc.id}`)}>
                              <Eye className="size-4 text-[#6B7280]" />
                            </Button>
                            {doc.status === "draft" && (
                              <Button variant="ghost" size="icon" className="size-8" onClick={() => handleSend(doc.id)}>
                                <Send className="size-4 text-[#166534]" />
                              </Button>
                            )}
                            {(doc.status === "sent" || doc.status === "partially_signed") && (
                              <Button variant="ghost" size="icon" className="size-8" onClick={() => handleVoid(doc.id)}>
                                <Ban className="size-4 text-[#DC2626]" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDuplicate(doc)}>
                              <Copy className="size-4 text-[#6B7280]" />
                            </Button>
                            {doc.status === "declined" && (
                              <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push(`/recruiter/vaultsign/${doc.id}`)}>
                                <RotateCcw className="size-4 text-[#0D9488]" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

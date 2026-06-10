"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileSignature, Search, Eye, Clock, CheckCircle2, XCircle,
  AlertCircle, FileText, Loader2, Download, ExternalLink,
  ChevronRight, ArrowRight,
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
interface MySigner {
  id: number;
  status: string;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  sign_token: string;
  role: string;
}

interface OtherSigner {
  name: string;
  status: string;
  role: string;
}

interface Document {
  id: number;
  document_name: string;
  document_type: string;
  status: string;
  signing_order: string;
  expiry_date: string;
  personal_message: string | null;
  created_at: string;
  final_document_url: string | null;
  my_signer: MySigner | null;
  creator: {
    name: string;
    email: string;
    organization: string | null;
  } | null;
  total_signers: number;
  signed_count: number;
  other_signers: OtherSigner[];
}

interface Stats {
  pending: number;
  signed: number;
  declined: number;
  expiring_soon: number;
}

// ─── Helpers ────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" },
  sent: { label: "Awaiting Signature", bg: "bg-blue-50", text: "text-blue-700" },
  partially_signed: { label: "Partially Signed", bg: "bg-[#FEF9C3]", text: "text-[#CA8A04]" },
  completed: { label: "Completed", bg: "bg-[#DCFCE7]", text: "text-[#166534]" },
  declined: { label: "Declined", bg: "bg-[#FEE2E2]", text: "text-[#DC2626]" },
  expired: { label: "Expired", bg: "bg-orange-50", text: "text-orange-700" },
  voided: { label: "Voided", bg: "bg-[#F3F4F6]", text: "text-[#9CA3AF]" },
};

const signerStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "Pending", bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" },
  sent: { label: "Awaiting Your Signature", bg: "bg-blue-50", text: "text-blue-700" },
  viewed: { label: "Awaiting Your Signature", bg: "bg-blue-50", text: "text-blue-700" },
  signed: { label: "Signed", bg: "bg-[#DCFCE7]", text: "text-[#166534]" },
  declined: { label: "Declined", bg: "bg-[#FEE2E2]", text: "text-[#DC2626]" },
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

function getExpiryColor(date: string) {
  const diff = (new Date(date).getTime() - Date.now()) / 86400000;
  if (diff < 0) return "text-[#9CA3AF]";
  if (diff < 3) return "text-[#DC2626] font-medium";
  if (diff < 7) return "text-orange-600";
  return "text-[#6B7280]";
}

function formatExpiry(date: string) {
  const diff = (new Date(date).getTime() - Date.now()) / 86400000;
  if (diff < 0) return "Expired";
  if (diff < 1) return "Expires today";
  if (diff < 2) return "Expires tomorrow";
  if (diff < 7) return `Expires in ${Math.ceil(diff)} days`;
  if (diff < 30) return `Expires in ${Math.ceil(diff / 7)} weeks`;
  return new Date(date).toLocaleDateString();
}

// ─── Component ──────────────────────────────────────────────────────
export default function CandidateVaultSignPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, signed: 0, declined: 0, expiring_soon: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("document_type", typeFilter);
      const res = await fetch(`/api/candidate/vaultsign?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setStats(data.stats || { pending: 0, signed: 0, declined: 0, expiring_soon: 0 });
      } else {
        toast.error("Failed to load documents");
      }
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // Separate documents into categories
  const pendingDocs = documents.filter(
    (d) => d.my_signer && (d.my_signer.status === "sent" || d.my_signer.status === "viewed" || d.my_signer.status === "pending")
  );
  const completedDocs = documents.filter(
    (d) => d.my_signer && d.my_signer.status === "signed"
  );
  const declinedDocs = documents.filter(
    (d) => d.my_signer && d.my_signer.status === "declined"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            VaultSign
          </h1>
          <p className="text-sm text-[#6B7280]">
            View and sign documents sent to you by recruiters and agencies.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Awaiting Your Signature", value: stats.pending, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Signed by You", value: stats.signed, icon: CheckCircle2, color: "text-[#166534]", bg: "bg-[#DCFCE7]" },
          { label: "Declined", value: stats.declined, icon: XCircle, color: "text-[#DC2626]", bg: "bg-[#FEE2E2]" },
          { label: "Expiring Soon", value: stats.expiring_soon, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#6B7280]">{s.label}</p>
              <div className={`size-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`size-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-[#111827] mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pending Action Banner */}
      {pendingDocs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <FileSignature className="size-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900">
                You have {pendingDocs.length} document{pendingDocs.length > 1 ? "s" : ""} awaiting your signature
              </h3>
              <p className="text-xs text-blue-700 mt-0.5">
                Review and sign documents sent by recruiters. Links expire based on the document expiry date.
              </p>
              <div className="mt-3 space-y-2">
                {pendingDocs.slice(0, 3).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 bg-white rounded-xl border border-blue-100 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111827] truncate">{doc.document_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] bg-[#F3F4F6] text-[#6B7280]">
                          {typeLabels[doc.document_type] || doc.document_type}
                        </Badge>
                        <span className={`text-xs ${getExpiryColor(doc.expiry_date)}`}>
                          {formatExpiry(doc.expiry_date)}
                        </span>
                      </div>
                    </div>
                    <Button asChild size="sm" className="bg-[#166534] hover:bg-[#14532D] shrink-0">
                      <Link href={`/sign/${doc.my_signer?.sign_token}`}>
                        Sign Now <ArrowRight className="size-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                ))}
                {pendingDocs.length > 3 && (
                  <p className="text-xs text-blue-600">
                    +{pendingDocs.length - 3} more document{pendingDocs.length - 3 > 1 ? "s" : ""} below
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
            <SelectItem value="sent">Awaiting Signature</SelectItem>
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

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-[#166534]" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]">
          <FileSignature className="size-12 mx-auto text-[#9CA3AF] mb-3" />
          <h3 className="text-lg font-medium text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>No documents yet</h3>
          <p className="text-sm text-[#6B7280] mt-1">
            When a recruiter sends you a document for signature, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const sc = statusConfig[doc.status] || statusConfig.draft;
            const msc = doc.my_signer
              ? signerStatusConfig[doc.my_signer.status] || signerStatusConfig.pending
              : signerStatusConfig.pending;
            const isPendingSignature = doc.my_signer &&
              (doc.my_signer.status === "sent" || doc.my_signer.status === "viewed" || doc.my_signer.status === "pending");
            const isSigned = doc.my_signer?.status === "signed";
            const isDeclined = doc.my_signer?.status === "declined";

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Document icon */}
                  <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isPendingSignature ? "bg-blue-50" : isSigned ? "bg-[#DCFCE7]" : isDeclined ? "bg-[#FEE2E2]" : "bg-[#F3F4F6]"
                  }`}>
                    <FileSignature className={`size-5 ${
                      isPendingSignature ? "text-blue-600" : isSigned ? "text-[#166534]" : isDeclined ? "text-[#DC2626]" : "text-[#9CA3AF]"
                    }`} />
                  </div>

                  {/* Document info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[#111827] truncate">
                          {doc.document_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] bg-[#F3F4F6] text-[#6B7280]">
                            {typeLabels[doc.document_type] || doc.document_type}
                          </Badge>
                          <Badge className={`${msc.bg} ${msc.text} border-0 text-[10px]`}>
                            {msc.label}
                          </Badge>
                          {doc.creator?.organization && (
                            <span className="text-xs text-[#9CA3AF]">
                              from {doc.creator.organization}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isPendingSignature && doc.my_signer?.sign_token && (
                          <Button asChild size="sm" className="bg-[#166534] hover:bg-[#14532D]">
                            <Link href={`/sign/${doc.my_signer.sign_token}`}>
                              Sign Now
                            </Link>
                          </Button>
                        )}
                        {isSigned && doc.status === "completed" && doc.final_document_url && (
                          <Button asChild size="sm" variant="outline" className="border-[#E5E7EB] text-[#166534]">
                            <a href={doc.final_document_url} target="_blank" rel="noopener noreferrer">
                              <Download className="size-3.5 mr-1" /> Download
                            </a>
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="sm" className="text-[#6B7280]">
                          <Link href={`/vaultsign/${doc.id}`}>
                            <Eye className="size-3.5 mr-1" /> View
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-[#9CA3AF]">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatExpiry(doc.expiry_date)}
                      </span>
                      <span>
                        {doc.signed_count}/{doc.total_signers} signed
                      </span>
                      <span>
                        Sent {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Other signers progress */}
                    {doc.other_signers.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        {doc.other_signers.map((s, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className={`size-2 rounded-full ${
                              s.status === "signed" ? "bg-[#166534]" :
                              s.status === "viewed" ? "bg-[#0D9488]" :
                              s.status === "declined" ? "bg-[#DC2626]" : "bg-[#9CA3AF]"
                            }`} />
                            <span className="text-[10px] text-[#9CA3AF]">{s.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

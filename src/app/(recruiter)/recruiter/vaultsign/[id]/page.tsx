"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Eye, Send, Ban, Bell, RotateCcw, Download, FileText, CheckCircle2,
  XCircle, Clock, AlertCircle, Loader2, ChevronRight
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────
interface Signer {
  id: number;
  name: string;
  email: string;
  role: string;
  party_number: number;
  status: string;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  sign_token: string;
}

interface AuditEvent {
  event: string;
  user_id?: number;
  name?: string;
  ip_address?: string;
  timestamp: string;
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
  original_document_url: string | null;
  final_document_url: string | null;
  audit_trail: string;
  signers: Signer[];
  template?: { id: number; name: string } | null;
  creator?: { first_name: string | null; last_name: string | null; email: string } | null;
}

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

const partyColors = ["#166534", "#0D9488", "#7C3AED", "#D97706"];

const eventIcons: Record<string, any> = {
  document_created: FileText,
  document_sent: Send,
  viewed: Eye,
  signed: CheckCircle2,
  declined: XCircle,
  reminder_sent: Bell,
  document_expired: AlertCircle,
  document_voided: Ban,
};

// ─── Component ──────────────────────────────────────────────────────
export default function VaultSignDocumentDetail() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDoc = useCallback(async () => {
    try {
      const res = await fetch(`/api/vaultsign/documents/${docId}`);
      if (res.ok) {
        const data = await res.json();
        setDoc(data.document);
      } else {
        toast.error("Failed to load document");
      }
    } catch {
      toast.error("Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  const handleVoid = async () => {
    if (!confirm("Are you sure you want to void this document?")) return;
    setActionLoading("void");
    try {
      const res = await fetch(`/api/vaultsign/documents/${docId}/void`, { method: "POST" });
      if (res.ok) { toast.success("Document voided"); fetchDoc(); }
      else { const d = await res.json(); toast.error(d.error || "Failed to void"); }
    } catch { toast.error("Failed to void"); }
    finally { setActionLoading(null); }
  };

  const handleRemind = async (signerId: number) => {
    setActionLoading(`remind-${signerId}`);
    try {
      const res = await fetch(`/api/vaultsign/documents/${docId}/remind/${signerId}`, { method: "POST" });
      if (res.ok) { toast.success("Reminder sent"); fetchDoc(); }
      else { const d = await res.json(); toast.error(d.error || "Failed to send reminder"); }
    } catch { toast.error("Failed to send reminder"); }
    finally { setActionLoading(null); }
  };

  const handleRevise = async () => {
    setActionLoading("revise");
    try {
      const res = await fetch(`/api/vaultsign/documents/${docId}/revise`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success("Document revised");
        router.push(`/recruiter/vaultsign/${data.document.id}`);
      } else {
        const d = await res.json(); toast.error(d.error || "Failed to revise");
      }
    } catch { toast.error("Failed to revise"); }
    finally { setActionLoading(null); }
  };

  const auditEvents: AuditEvent[] = (() => {
    if (!doc?.audit_trail) return [];
    try { return JSON.parse(doc.audit_trail); } catch { return []; }
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-[#166534]" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="size-12 mx-auto text-[#9CA3AF] mb-3" />
        <h3 className="text-lg font-medium text-[#111827]">Document not found</h3>
      </div>
    );
  }

  const sc = statusConfig[doc.status] || statusConfig.draft;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              {doc.document_name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-[#F3F4F6] text-[#6B7280] border-0 text-xs">{typeLabels[doc.document_type] || doc.document_type}</Badge>
              <Badge className={`${sc.bg} ${sc.text} border-0`}>{sc.label}</Badge>
              <span className="text-sm text-[#6B7280]">Expires: {new Date(doc.expiry_date).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(doc.status === "sent" || doc.status === "partially_signed") && (
              <>
                <Button variant="ghost" onClick={handleVoid} disabled={actionLoading === "void"} className="text-[#DC2626] hover:text-[#DC2626]">
                  <Ban className="size-4 mr-2" /> Void
                </Button>
              </>
            )}
            {doc.status === "declined" && (
              <Button onClick={handleRevise} disabled={actionLoading === "revise"} className="bg-[#166534] hover:bg-[#14532D]">
                <RotateCcw className="size-4 mr-2" /> Revise & Resend
              </Button>
            )}
            {doc.status === "completed" && doc.final_document_url && (
              <Button className="bg-[#166534] hover:bg-[#14532D]" asChild>
                <a href={doc.final_document_url} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4 mr-2" /> Download Final PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Signers Status Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <h2 className="text-lg font-semibold text-[#111827] mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>Signers</h2>
        <div className="space-y-3">
          {doc.signers.map((signer, i) => {
            const color = partyColors[Math.min(signer.party_number - 1, 3)];
            const signerStatusConfig: Record<string, { label: string; color: string }> = {
              pending: { label: "Awaiting signature", color: "#9CA3AF" },
              sent: { label: "Awaiting signature", color: "#9CA3AF" },
              viewed: { label: "Viewed", color: "#0D9488" },
              signed: { label: "Signed", color: "#166534" },
              declined: { label: "Declined", color: "#DC2626" },
            };
            const ssc = signerStatusConfig[signer.status] || signerStatusConfig.pending;
            const initials = signer.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

            return (
              <div key={signer.id} className="flex items-center gap-4 p-4 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4]">
                <div className="size-10 rounded-full flex items-center justify-center text-sm font-medium" style={{ backgroundColor: `${color}20`, color }}>
                  {initials}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#111827]">{signer.name}</span>
                    <Badge className="border-0 text-xs" style={{ backgroundColor: `${color}20`, color }}>{signer.role}</Badge>
                  </div>
                  <p className="text-sm text-[#6B7280]">{signer.email}</p>
                </div>
                <div className="text-right">
                  {signer.status === "signed" && signer.signed_at && (
                    <div className="flex items-center gap-1 text-[#166534]">
                      <CheckCircle2 className="size-4" />
                      <span className="text-sm">Signed {new Date(signer.signed_at).toLocaleString()}</span>
                    </div>
                  )}
                  {signer.status === "declined" && (
                    <div>
                      <div className="flex items-center gap-1 text-[#DC2626]">
                        <XCircle className="size-4" />
                        <span className="text-sm">Declined</span>
                      </div>
                      {signer.decline_reason && <p className="text-xs text-[#6B7280] mt-1">"{signer.decline_reason}"</p>}
                    </div>
                  )}
                  {(signer.status === "pending" || signer.status === "sent" || signer.status === "viewed") && (
                    <div>
                      <div className="flex items-center gap-1" style={{ color: ssc.color }}>
                        <Clock className="size-4" />
                        <span className="text-sm">{ssc.label}</span>
                      </div>
                      {(doc.status === "sent" || doc.status === "partially_signed") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemind(signer.id)}
                          disabled={actionLoading === `remind-${signer.id}`}
                          className="mt-1 text-xs text-[#166534] h-7"
                        >
                          <Bell className="size-3 mr-1" /> Send Reminder
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Document Preview */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <h2 className="text-lg font-semibold text-[#111827] mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>Document Preview</h2>
        <div className="bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
          <FileText className="size-16 text-[#9CA3AF] mb-4" />
          <p className="text-sm text-[#6B7280]">{doc.document_name}</p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            {doc.status === "completed" ? "Final signed document available for download" : "Document awaiting signatures"}
          </p>
          {doc.status === "completed" && doc.final_document_url && (
            <Button asChild className="mt-4 bg-[#166534] hover:bg-[#14532D]">
              <a href={doc.final_document_url} target="_blank" rel="noopener noreferrer">
                <Download className="size-4 mr-2" /> Download PDF
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <h2 className="text-lg font-semibold text-[#111827] mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>Audit Trail</h2>
        {auditEvents.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] text-center py-8">No audit events recorded yet.</p>
        ) : (
          <div className="space-y-0">
            {auditEvents.map((event, i) => {
              const IconComp = eventIcons[event.event] || FileText;
              return (
                <div key={i} className="flex gap-4 py-3 border-b border-[#E5E7EB] last:border-b-0">
                  <div className="size-8 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0">
                    <IconComp className="size-4 text-[#6B7280]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#111827]">
                      {event.event === "document_created" && `Document created by ${event.name || "Unknown"}`}
                      {event.event === "document_sent" && `Document sent to signers`}
                      {event.event === "viewed" && `${event.name || "Signer"} viewed the document`}
                      {event.event === "signed" && `${event.name || "Signer"} signed the document`}
                      {event.event === "declined" && `${event.name || "Signer"} declined to sign`}
                      {event.event === "reminder_sent" && `Reminder sent to ${event.name || "signer"}`}
                      {event.event === "document_expired" && `Document expired`}
                      {event.event === "document_voided" && `Document voided`}
                      {!["document_created", "document_sent", "viewed", "signed", "declined", "reminder_sent", "document_expired", "document_voided"].includes(event.event) && event.event}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[#9CA3AF]">{new Date(event.timestamp).toLocaleString()}</span>
                      {event.ip_address && <span className="text-xs text-[#9CA3AF]">IP: {event.ip_address}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

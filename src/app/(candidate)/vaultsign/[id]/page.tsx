"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye, Send, CheckCircle2, XCircle, Clock, AlertCircle,
  Loader2, Download, FileText, FileSignature, ArrowLeft,
  ExternalLink, Shield, ChevronRight,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────
interface MySigner {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  sign_token: string;
}

interface Signer {
  id: number;
  name: string;
  email: string;
  role: string;
  party_number: number;
  status: string;
  signed_at: string | null;
  declined_at: string | null;
}

interface AuditEvent {
  event: string;
  user_id?: number;
  name?: string;
  signer_name?: string;
  signer_email?: string;
  ip_address?: string;
  reason?: string;
  timestamp: string;
}

interface DocumentDetail {
  id: number;
  document_name: string;
  document_type: string;
  status: string;
  signing_order: string;
  expiry_date: string;
  personal_message: string | null;
  created_at: string;
  document_url: string | null;
  final_document_url: string | null;
  my_signer: MySigner;
  signers: Signer[];
  creator: {
    name: string;
    email: string;
    organization: string | null;
  } | null;
  audit_trail: AuditEvent[];
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

const eventLabels: Record<string, string> = {
  document_created: "Document created",
  document_sent: "Document sent to signers",
  document_viewed: "Document viewed",
  viewed: "Document viewed",
  document_signed: "Document signed",
  signed: "Document signed",
  declined: "Signature declined",
  document_declined: "Signature declined",
  reminder_sent: "Reminder sent",
  document_expired: "Document expired",
  document_voided: "Document voided",
  sign_fields_saved: "Sign fields saved",
  document_completed: "All signatures collected",
  document_revised: "Document revised",
};

// ─── Component ──────────────────────────────────────────────────────
export default function CandidateVaultSignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDoc = useCallback(async () => {
    try {
      const res = await fetch(`/api/candidate/vaultsign/${docId}`);
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
        <h3 className="text-lg font-medium text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>Document not found</h3>
        <p className="text-sm text-[#6B7280] mt-1">This document may have been removed or you don't have access.</p>
        <Button asChild variant="outline" className="mt-4 border-[#E5E7EB]">
          <Link href="/vaultsign">Back to VaultSign</Link>
        </Button>
      </div>
    );
  }

  const sc = statusConfig[doc.status] || statusConfig.draft;
  const isPendingSignature = ["sent", "viewed", "pending"].includes(doc.my_signer?.status);
  const isSigned = doc.my_signer?.status === "signed";
  const isDeclined = doc.my_signer?.status === "declined";
  const signedCount = doc.signers.filter((s) => s.status === "signed").length;
  const allSigned = signedCount === doc.signers.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.push("/vaultsign")}
        className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to VaultSign
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              {doc.document_name}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-xs bg-[#F3F4F6] text-[#6B7280]">
                {typeLabels[doc.document_type] || doc.document_type}
              </Badge>
              <Badge className={`${sc.bg} ${sc.text} border-0`}>{sc.label}</Badge>
              <span className="text-sm text-[#6B7280]">
                Expires: {new Date(doc.expiry_date).toLocaleDateString()}
              </span>
            </div>
            {doc.creator && (
              <p className="text-sm text-[#6B7280] mt-2">
                Sent by <span className="font-medium text-[#111827]">{doc.creator.name}</span>
                {doc.creator.organization && (
                  <span> from <span className="font-medium text-[#111827]">{doc.creator.organization}</span></span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isPendingSignature && doc.my_signer?.sign_token && (
              <Button asChild className="bg-[#166534] hover:bg-[#14532D]">
                <Link href={`/sign/${doc.my_signer.sign_token}`}>
                  <FileSignature className="size-4 mr-2" /> Sign Document
                </Link>
              </Button>
            )}
            {isSigned && doc.status === "completed" && doc.final_document_url && (
              <Button asChild className="bg-[#166534] hover:bg-[#14532D]">
                <a href={doc.final_document_url} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4 mr-2" /> Download Final PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Personal Message */}
      {doc.personal_message && (
        <div className="bg-[#DCFCE7]/20 rounded-2xl border border-[#DCFCE7] p-5">
          <p className="text-xs font-medium text-[#166534] uppercase tracking-wider mb-2">Message from sender</p>
          <p className="text-sm text-[#111827]">{doc.personal_message}</p>
        </div>
      )}

      {/* Your Status Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <h2 className="text-lg font-semibold text-[#111827] mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
          Your Status
        </h2>
        <div className="flex items-center gap-4 p-4 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4]">
          <div className={`size-12 rounded-full flex items-center justify-center ${
            isSigned ? "bg-[#DCFCE7]" : isDeclined ? "bg-[#FEE2E2]" : isPendingSignature ? "bg-blue-50" : "bg-[#F3F4F6]"
          }`}>
            {isSigned ? (
              <CheckCircle2 className="size-6 text-[#166534]" />
            ) : isDeclined ? (
              <XCircle className="size-6 text-[#DC2626]" />
            ) : isPendingSignature ? (
              <Clock className="size-6 text-blue-600" />
            ) : (
              <AlertCircle className="size-6 text-[#9CA3AF]" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#111827]">
                {isSigned ? "You have signed this document" :
                 isDeclined ? "You declined to sign this document" :
                 isPendingSignature ? "Your signature is requested" :
                 "Document status update"}
              </span>
            </div>
            {isSigned && doc.my_signer.signed_at && (
              <p className="text-sm text-[#6B7280] mt-0.5">
                Signed on {new Date(doc.my_signer.signed_at).toLocaleString()}
              </p>
            )}
            {isDeclined && doc.my_signer.declined_at && (
              <div className="mt-1">
                <p className="text-sm text-[#6B7280]">
                  Declined on {new Date(doc.my_signer.declined_at).toLocaleString()}
                </p>
                {doc.my_signer.decline_reason && (
                  <p className="text-sm text-[#9CA3AF] mt-0.5 italic">"{doc.my_signer.decline_reason}"</p>
                )}
              </div>
            )}
            {isPendingSignature && (
              <p className="text-sm text-[#6B7280] mt-0.5">
                Review the document and add your signature when ready.
              </p>
            )}
          </div>
          {isPendingSignature && doc.my_signer?.sign_token && (
            <Button asChild className="bg-[#166534] hover:bg-[#14532D] shrink-0">
              <Link href={`/sign/${doc.my_signer.sign_token}`}>
                Sign Now <ChevronRight className="size-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Signing Progress */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <h2 className="text-lg font-semibold text-[#111827] mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
          Signing Progress
        </h2>
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#6B7280]">{signedCount} of {doc.signers.length} signers completed</span>
            <span className="font-medium text-[#111827]">
              {doc.signers.length > 0 ? Math.round((signedCount / doc.signers.length) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-[#F3F4F6] rounded-full h-2.5">
            <div
              className="bg-[#166534] h-2.5 rounded-full transition-all"
              style={{ width: `${doc.signers.length > 0 ? (signedCount / doc.signers.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Signer list */}
        <div className="space-y-3">
          {doc.signers.map((signer, i) => {
            const isMe = signer.id === doc.my_signer?.id;
            const partyColors = ["#166534", "#0D9488", "#7C3AED", "#D97706"];
            const color = partyColors[Math.min(signer.party_number - 1, 3)];

            return (
              <div key={signer.id} className={`flex items-center gap-4 p-4 rounded-xl border ${
                isMe ? "border-[#166534]/30 bg-[#DCFCE7]/10" : "border-[#E5E7EB] bg-[#F8F7F4]"
              }`}>
                <div className="size-10 rounded-full flex items-center justify-center text-sm font-medium" style={{
                  backgroundColor: `${color}20`,
                  color,
                }}>
                  {signer.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#111827]">{signer.name}</span>
                    {isMe && (
                      <Badge className="border-0 text-[10px] bg-[#DCFCE7] text-[#166534]">You</Badge>
                    )}
                    <Badge className="border-0 text-[10px]" style={{ backgroundColor: `${color}20`, color }}>
                      {signer.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#6B7280]">{signer.email}</p>
                </div>
                <div className="text-right">
                  {signer.status === "signed" && signer.signed_at && (
                    <div className="flex items-center gap-1 text-[#166534]">
                      <CheckCircle2 className="size-4" />
                      <span className="text-sm">Signed</span>
                    </div>
                  )}
                  {signer.status === "declined" && (
                    <div className="flex items-center gap-1 text-[#DC2626]">
                      <XCircle className="size-4" />
                      <span className="text-sm">Declined</span>
                    </div>
                  )}
                  {(signer.status === "pending" || signer.status === "sent" || signer.status === "viewed") && (
                    <div className="flex items-center gap-1 text-[#9CA3AF]">
                      <Clock className="size-4" />
                      <span className="text-sm">
                        {signer.status === "viewed" ? "Viewed" : "Waiting"}
                      </span>
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
        <h2 className="text-lg font-semibold text-[#111827] mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
          Document
        </h2>
        <div className="bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
          {doc.status === "completed" && doc.final_document_url ? (
            <>
              <CheckCircle2 className="size-16 text-[#166534] mb-4" />
              <p className="text-sm font-medium text-[#111827]">All signatures collected</p>
              <p className="text-xs text-[#6B7280] mt-1">Download the final signed document below</p>
              <Button asChild className="mt-4 bg-[#166534] hover:bg-[#14532D]">
                <a href={doc.final_document_url} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4 mr-2" /> Download Final PDF
                </a>
              </Button>
            </>
          ) : doc.document_url ? (
            <>
              <FileText className="size-16 text-[#9CA3AF] mb-4" />
              <p className="text-sm text-[#111827] font-medium">{doc.document_name}</p>
              <p className="text-xs text-[#6B7280] mt-1">Document preview available</p>
              <Button asChild variant="outline" className="mt-4 border-[#E5E7EB]">
                <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4 mr-2" /> View Document
                </a>
              </Button>
            </>
          ) : (
            <>
              <FileSignature className="size-16 text-[#9CA3AF] mb-4" />
              <p className="text-sm text-[#6B7280]">{doc.document_name}</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Document preview not available</p>
            </>
          )}
        </div>
      </div>

      {/* Audit Trail */}
      {doc.audit_trail && doc.audit_trail.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <h2 className="text-lg font-semibold text-[#111827] mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-[#166534]" />
              Audit Trail
            </div>
          </h2>
          <div className="space-y-0">
            {doc.audit_trail.map((event, i) => {
              const label = eventLabels[event.event] || event.event;
              return (
                <div key={i} className="flex gap-4 py-3 border-b border-[#E5E7EB] last:border-b-0">
                  <div className="size-8 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0">
                    {event.event === "signed" || event.event === "document_signed" || event.event === "document_completed" ? (
                      <CheckCircle2 className="size-4 text-[#166534]" />
                    ) : event.event === "declined" || event.event === "document_declined" ? (
                      <XCircle className="size-4 text-[#DC2626]" />
                    ) : event.event === "viewed" || event.event === "document_viewed" ? (
                      <Eye className="size-4 text-[#0D9488]" />
                    ) : (
                      <FileText className="size-4 text-[#6B7280]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#111827]">
                      {label}
                      {event.name && <span className="text-[#6B7280]"> — {event.name}</span>}
                      {/* signer_name is used in document_signed/document_viewed/document_declined events */}
                      {!event.name && event.signer_name && <span className="text-[#6B7280]"> — {event.signer_name}</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[#9CA3AF]">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                      {event.ip_address && (
                        <span className="text-xs text-[#9CA3AF]">IP: {event.ip_address}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VaultSignErrorBoundary } from "@/components/vaultsign/vaultsign-error-boundary";
import { toast } from "sonner";
import {
  ArrowLeft, Send, Ban, RefreshCw, Download, Clock, CheckCircle2,
  XCircle, FileText, Loader2, Bell, Eye, Mail, AlertTriangle,
  FileSignature, ChevronRight
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { getDocumentSignedUrl } from "@/lib/vaultsign/supabase-storage";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-text-secondary", bg: "bg-[#F3F4F6]" },
  sent: { label: "Sent", color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
  partially_signed: { label: "Partially Signed", color: "text-[#D97706]", bg: "bg-[#FFFBEB]" },
  completed: { label: "Completed", color: "text-primary", bg: "bg-primary-light" },
  declined: { label: "Declined", color: "text-[#DC2626]", bg: "bg-[#FEF2F2]" },
  expired: { label: "Expired", color: "text-text-secondary", bg: "bg-[#F3F4F6]" },
  voided: { label: "Voided", color: "text-text-secondary", bg: "bg-[#F3F4F6]" },
};

const SIGNER_STATUS_CONFIG: Record<string, { icon: any; color: string }> = {
  pending: { icon: Clock, color: "text-text-secondary" },
  sent: { icon: Mail, color: "text-[#2563EB]" },
  viewed: { icon: Eye, color: "text-[#D97706]" },
  signed: { icon: CheckCircle2, color: "text-primary" },
  declined: { icon: XCircle, color: "text-[#DC2626]" },
};

const TIMELINE_STEPS = [
  { key: "draft", label: "Created", description: "Click to view Created documents" },
  { key: "sent", label: "Sent", description: "Click to view Sent documents" },
  { key: "partially_signed", label: "In Progress", description: "Click to view In Progress documents" },
  { key: "completed", label: "Completed", description: "Click to view Completed documents" },
];

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [docId, setDocId] = useState<string>("");
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setDocId(p.id));
  }, [params]);

  useEffect(() => {
    const fetchDoc = async () => {
      if (!docId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/vaultsign/documents/${docId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setDocument(data);
      } catch (err) {
        toast.error("Failed to load document");
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [docId]);

  const handleSend = async () => {
    try {
      setActionLoading("send");
      const res = await fetch(`/api/vaultsign/documents/${docId}/send`, { method: "POST" });
      if (res.ok) {
        toast.success("Document sent for signature");
        setDocument({ ...document, status: "sent" });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Failed to send document");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVoid = async () => {
    if (!confirm("Are you sure you want to void this document?")) return;
    try {
      setActionLoading("void");
      const res = await fetch(`/api/vaultsign/documents/${docId}/void`, { method: "POST" });
      if (res.ok) {
        toast.success("Document voided");
        setDocument({ ...document, status: "voided" });
      }
    } catch {
      toast.error("Failed to void document");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemind = async (signerId: number) => {
    try {
      const res = await fetch(`/api/vaultsign/documents/${docId}/remind/${signerId}`, { method: "POST" });
      if (res.ok) toast.success("Reminder sent");
    } catch {
      toast.error("Failed to send reminder");
    }
  };

  const handleRevise = async () => {
    try {
      setActionLoading("revise");
      const res = await fetch(`/api/vaultsign/documents/${docId}/revise`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success("Document revised");
        router.push(`/recruiter/vaultsign/editor/${data.id}`);
      }
    } catch {
      toast.error("Failed to revise");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async () => {
    try {
      // Try export-pdf API first (handles signed URL generation and PDF generation from content)
      const res = await fetch(`/api/vaultsign/documents/${docId}/export-pdf`, {
        method: "POST",
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pdf_url) {
          window.open(data.pdf_url, "_blank");
          return;
        }
      }
      // Fallback: open the final_document_url or edited_pdf_url directly
      if (document?.final_document_url) {
        window.open(document.final_document_url, "_blank");
      } else if (document?.edited_pdf_url) {
        window.open(document.edited_pdf_url, "_blank");
      } else {
        toast.error("No PDF available for download");
      }
    } catch (err: any) {
      // Fallback to direct URLs
      if (document?.final_document_url) {
        window.open(document.final_document_url, "_blank");
      } else if (document?.edited_pdf_url) {
        window.open(document.edited_pdf_url, "_blank");
      } else {
        toast.error(err.message || "Failed to download PDF");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Skeleton Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-16" />
              <div>
                <Skeleton className="h-6 w-48 mb-1" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-36" />
            </div>
          </div>

          {/* Skeleton Timeline */}
          <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-1 overflow-x-auto">
                {Array.from({ length: 4 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    {i < 3 && <Skeleton className="flex-1 h-0.5 mx-2 min-w-[20px]" />}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skeleton Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Skeleton Signers */}
            <div className="lg:col-span-2">
              <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <CardHeader>
                  <Skeleton className="h-6 w-16" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-36" />
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-14 rounded-full" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Skeleton Details & Audit */}
            <div className="space-y-6">
              <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <CardHeader>
                  <Skeleton className="h-5 w-16" />
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <CardHeader>
                  <Skeleton className="h-5 w-20" />
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Skeleton className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-2 w-36" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!document) return null;

  const statusConf = STATUS_CONFIG[document.status] || STATUS_CONFIG.draft;
  const timelineProgress = TIMELINE_STEPS.findIndex((s) => s.key === document.status);

  return (
    <VaultSignErrorBoundary>
    <div className="min-h-screen bg-background animate-vaultsign-fade-in">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header — stacks on mobile with buttons below */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/recruiter/vaultsign")} className="text-text-secondary">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-foreground truncate" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                {document.document_name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge className={`${statusConf.bg} ${statusConf.color} border-0`}>{statusConf.label}</Badge>
                <span className="text-xs text-text-secondary">
                  {document.source_type === "word" ? "Word Document" : "PDF Document"} • {document.document_type}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {document.status === "draft" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border"
                  onClick={() => {
                    const route = document.source_type === "pdf"
                      ? `/recruiter/vaultsign/signer/${docId}`
                      : `/recruiter/vaultsign/editor/${docId}`;
                    router.push(route);
                  }}
                >
                  <FileText className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary-hover text-white"
                  onClick={handleSend}
                  disabled={actionLoading === "send"}
                >
                  {actionLoading === "send" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  Send for Signature
                </Button>
              </>
            )}
            {["sent", "partially_signed"].includes(document.status) && (
              <Button variant="outline" size="sm" className="border-[#DC2626]/30 text-[#DC2626] hover:bg-[#FEF2F2]" onClick={handleVoid} disabled={actionLoading === "void"}>
                <Ban className="h-4 w-4 mr-1" /> Void
              </Button>
            )}
            {document.status === "declined" && (
              <Button size="sm" className="bg-primary hover:bg-primary-hover text-white" onClick={handleRevise} disabled={actionLoading === "revise"}>
                <RefreshCw className="h-4 w-4 mr-1" /> Revise
              </Button>
            )}
            {document.status === "completed" && (
              <Button variant="outline" size="sm" className="border-border" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" /> Download PDF
              </Button>
            )}
          </div>
        </div>

        {/* Status Timeline — horizontally scrollable on mobile */}
        <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] mb-6 animate-vaultsign-scale-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {TIMELINE_STEPS.map((step, i) => (
                <React.Fragment key={step.key}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => router.push(`/recruiter/vaultsign?status=${step.key}`)}
                        className="flex items-center gap-2 flex-shrink-0 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-[#F0FDF4] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1"
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-transform hover:scale-110 ${
                          i <= timelineProgress ? "bg-primary text-white" : "bg-surface-3 text-text-muted"
                        }`}>
                          {i <= timelineProgress ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                        </div>
                        <span className={`text-sm font-semibold whitespace-nowrap ${i <= timelineProgress ? "text-primary" : "text-text-muted"}`}>
                          {step.label}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{step.description}</p>
                    </TooltipContent>
                  </Tooltip>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 min-w-[20px] ${i < timelineProgress ? "bg-primary" : "bg-surface-3"}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Signers */}
          <div className="lg:col-span-2">
            <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <CardHeader>
                <CardTitle className="text-lg">Signers</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3 vaultsign-stagger animate-vaultsign-slide-up">
                  {document.signers?.map((signer: any) => {
                    const sConfig = SIGNER_STATUS_CONFIG[signer.status] || SIGNER_STATUS_CONFIG.pending;
                    const StatusIcon = sConfig.icon;
                    return (
                      <div key={signer.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-white text-sm">
                            {signer.name?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">{signer.name}</p>
                          <p className="text-xs text-text-secondary">{signer.email}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">{signer.role}</Badge>
                            <div className="flex items-center gap-1">
                              <StatusIcon className={`h-3.5 w-3.5 ${sConfig.color}`} />
                              <span className={`text-xs ${sConfig.color}`}>
                                {signer.status === "signed" && signer.signed_at
                                  ? `Signed ${new Date(signer.signed_at).toLocaleDateString()}`
                                  : signer.status.charAt(0).toUpperCase() + signer.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {["sent", "viewed", "pending"].includes(signer.status) && ["sent", "partially_signed"].includes(document.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:bg-[#F0FDF4]"
                            onClick={() => handleRemind(signer.id)}
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right — Details & Audit */}
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Source</span>
                  <span className="text-foreground">{document.source_type === "word" ? "Word" : "PDF"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Signing Order</span>
                  <span className="text-foreground">{document.signing_order}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Expires</span>
                  <span className="text-foreground">{new Date(document.expiry_date).toLocaleDateString()}</span>
                </div>
                {document.personal_message && (
                  <div>
                    <span className="text-text-secondary">Message</span>
                    <p className="text-foreground mt-1 text-xs">{document.personal_message}</p>
                  </div>
                )}
                {document.creator && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Created By</span>
                    <span className="text-foreground">{document.creator.first_name || document.creator.email}</span>
                  </div>
                )}
                {document.document_hash && (
                  <div>
                    <span className="text-text-secondary">Document Hash</span>
                    <p className="text-[10px] text-text-muted font-mono break-all mt-0.5">{document.document_hash}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <CardHeader>
                <CardTitle className="text-base">Audit Trail</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {document.audit_trail?.map((entry: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">{entry.event?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                        <p className="text-[10px] text-text-secondary">
                          {entry.user_name} • {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </VaultSignErrorBoundary>
  );
}

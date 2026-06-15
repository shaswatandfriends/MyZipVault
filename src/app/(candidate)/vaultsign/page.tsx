"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VaultSignErrorBoundary } from "@/components/vaultsign/vaultsign-error-boundary";
import { toast } from "sonner";
import {
  FileSignature, Loader2, Clock, CheckCircle2, XCircle, ExternalLink
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-text-secondary", bg: "bg-[#F3F4F6]" },
  sent: { label: "Awaiting Signature", color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
  viewed: { label: "Viewed", color: "text-[#D97706]", bg: "bg-[#FFFBEB]" },
  signed: { label: "Signed", color: "text-primary", bg: "bg-primary-light" },
  declined: { label: "Declined", color: "text-[#DC2626]", bg: "bg-[#FEF2F2]" },
};

const DOC_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-text-secondary", bg: "bg-[#F3F4F6]" },
  sent: { label: "Sent", color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
  partially_signed: { label: "In Progress", color: "text-[#D97706]", bg: "bg-[#FFFBEB]" },
  completed: { label: "Completed", color: "text-primary", bg: "bg-primary-light" },
  declined: { label: "Declined", color: "text-[#DC2626]", bg: "bg-[#FEF2F2]" },
  expired: { label: "Expired", color: "text-text-secondary", bg: "bg-[#F3F4F6]" },
  voided: { label: "Voided", color: "text-text-secondary", bg: "bg-[#F3F4F6]" },
};

export default function CandidateVaultSignPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/candidate/vaultsign");
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
        }
      } catch (err) {
        toast.error("Failed to load documents");
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Skeleton Header */}
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-1" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Skeleton Document Cards */}
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-4 w-40 mb-1" />
                        <div className="flex items-center gap-2 mt-0.5">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <VaultSignErrorBoundary>
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            Documents to Sign
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">View and sign documents that require your signature</p>
        </div>

        {documents.length === 0 ? (
          <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <CardContent className="p-8 text-center">
              <FileSignature className="h-12 w-12 text-text-muted mx-auto mb-3" />
              <h3 className="font-medium text-foreground mb-1">No Documents Yet</h3>
              <p className="text-sm text-text-secondary">Documents that require your signature will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 vaultsign-stagger animate-vaultsign-slide-up">
            {documents.map((item: any, index: number) => {
              const docStatus = DOC_STATUS_CONFIG[item.document?.status] || DOC_STATUS_CONFIG.draft;
              const signerStatus = STATUS_CONFIG[item.signer_status] || STATUS_CONFIG.pending;
              return (
                <Card key={index} className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
                          <FileSignature className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.document?.document_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-text-secondary">{item.document?.organization?.name}</span>
                            <Badge className={`${docStatus.bg} ${docStatus.color} border-0 text-[10px]`}>
                              {docStatus.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${signerStatus.bg} ${signerStatus.color} border-0`}>
                          {signerStatus.label}
                        </Badge>
                        {item.signer_status !== "signed" && item.signer_status !== "declined" && item.sign_token && (
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary-hover text-white"
                            onClick={() => router.push(`/sign/${item.sign_token}`)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> Sign
                          </Button>
                        )}
                        {item.signer_status === "signed" && (
                          <div className="flex items-center gap-1 text-primary text-xs">
                            <CheckCircle2 className="h-4 w-4" />
                            Signed {item.signed_at ? new Date(item.signed_at).toLocaleDateString() : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </VaultSignErrorBoundary>
  );
}

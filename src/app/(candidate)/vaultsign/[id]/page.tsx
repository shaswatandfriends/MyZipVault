"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { VaultSignErrorBoundary } from "@/components/vaultsign/vaultsign-error-boundary";
import { toast } from "sonner";
import { ArrowLeft, Loader2, FileSignature, Download, CheckCircle2, Clock, ExternalLink } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function CandidateVaultSignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const docId = params.id as string;
  const [document, setDocument] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/candidate/vaultsign/${docId}`);
        if (res.ok) {
          const data = await res.json();
          setDocument(data.document);
          setSigner(data.signer);
        }
      } catch {
        toast.error("Failed to load document");
      } finally {
        setLoading(false);
      }
    };
    if (docId) fetchData();
  }, [docId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4]">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Skeleton Back Button */}
          <Skeleton className="h-8 w-32 mb-4" />

          {/* Skeleton Card */}
          <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-6 w-48 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <VaultSignErrorBoundary>
    <div className="min-h-screen bg-[#F8F7F4]">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" onClick={() => router.push("/vaultsign")} className="text-[#6B7280] mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Documents
        </Button>

        <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{document?.document_name}</CardTitle>
                <p className="text-sm text-[#6B7280] mt-0.5">{document?.organization?.name}</p>
              </div>
              <Badge className={
                signer?.status === "signed" ? "bg-[#DCFCE7] text-[#166534] border-0" :
                signer?.status === "declined" ? "bg-[#FEF2F2] text-[#DC2626] border-0" :
                "bg-[#EFF6FF] text-[#2563EB] border-0"
              }>
                {signer?.status === "signed" ? "Signed" : signer?.status === "declined" ? "Declined" : "Pending"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {signer?.status !== "signed" && signer?.status !== "declined" && signer?.sign_token && (
              <Button
                className="w-full bg-[#166534] hover:bg-[#14532D] text-white"
                onClick={() => router.push(`/sign/${signer.sign_token}`)}
              >
                <ExternalLink className="h-4 w-4 mr-2" /> Sign This Document
              </Button>
            )}

            {document?.signers && (
              <div>
                <h3 className="text-sm font-medium text-[#111827] mb-2">All Signers</h3>
                <div className="space-y-2">
                  {document.signers.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {s.status === "signed" ? (
                        <CheckCircle2 className="h-4 w-4 text-[#166534]" />
                      ) : (
                        <Clock className="h-4 w-4 text-[#6B7280]" />
                      )}
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[8px] bg-[#F3F4F6]">{s.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-[#111827]">{s.name}</span>
                      <Badge variant="outline" className="text-[10px]">{s.role}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {signer?.status === "signed" && document?.pdf_url && (
              <Button variant="outline" className="w-full" onClick={() => window.open(document.pdf_url, "_blank")}>
                <Download className="h-4 w-4 mr-2" /> Download Signed Document
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </VaultSignErrorBoundary>
  );
}

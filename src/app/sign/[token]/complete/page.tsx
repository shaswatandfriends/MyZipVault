"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { VaultSignErrorBoundary } from "@/components/vaultsign/vaultsign-error-boundary";
import {
  CheckCircle2, Download, FileText, Loader2, Shield, Clock
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function SigningCompletePage() {
  const params = useParams();
  const token = params.token as string;
  const [signingData, setSigningData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/vaultsign/sign/${token}`);
        if (res.ok) {
          const data = await res.json();
          setSigningData(data);
        }
      } catch {
        // Ignore errors — we just show a generic completion page
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-[#E5E7EB] p-8 max-w-lg w-full text-center">
          {/* Skeleton Success Icon */}
          <Skeleton className="w-16 h-16 rounded-full mx-auto mb-6" />

          {/* Skeleton Title */}
          <Skeleton className="h-7 w-56 mx-auto mb-2" />

          {/* Skeleton Lines */}
          <Skeleton className="h-4 w-full mx-auto mb-2" />
          <Skeleton className="h-4 w-3/4 mx-auto mb-6" />

          {/* Skeleton Info Box */}
          <Skeleton className="h-24 w-full rounded-xl mb-6" />

          {/* Skeleton Buttons */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <VaultSignErrorBoundary>
    <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-[#E5E7EB] p-8 max-w-lg w-full text-center animate-vaultsign-fade-in">
        {/* Success icon */}
        <div className="w-16 h-16 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto mb-6 animate-vaultsign-success-bounce">
          <CheckCircle2 className="h-8 w-8 text-[#166534]" />
        </div>

        <h1 className="text-2xl font-bold text-[#111827] mb-2">
          Document Signed Successfully!
        </h1>

        <p className="text-[#6B7280] mb-6">
          Your signature has been applied to the document. {signingData?.document?.status === "completed"
            ? "All parties have signed — the document is now complete."
            : "Other signers may still need to sign."}
        </p>

        {/* Document info */}
        <div className="bg-[#F8F7F4] rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="h-5 w-5 text-[#166534]" />
            <div>
              <p className="font-medium text-[#111827]">
                {signingData?.document?.document_name || "Document"}
              </p>
              <p className="text-xs text-[#6B7280]">
                Signed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>

          {signingData?.all_signers && (
            <div className="space-y-2 mt-3">
              {signingData.all_signers.map((signer: any, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {signer.status === "signed" ? (
                    <CheckCircle2 className="h-4 w-4 text-[#166534]" />
                  ) : (
                    <Clock className="h-4 w-4 text-[#D97706]" />
                  )}
                  <span className={signer.status === "signed" ? "text-[#166534]" : "text-[#6B7280]"}>
                    {signer.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {signer.status === "signed" ? "Signed" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legal notice */}
        <div className="flex items-start gap-2 text-left mb-6 p-3 bg-[#F0FDF4] rounded-lg">
          <Shield className="h-4 w-4 text-[#166534] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#374151]">
            This document was signed using VaultSign by MyZipVault. Your electronic signature is legally binding
            under the ESIGN Act and UETA. A copy of the signed document will be emailed to all parties.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            className="bg-[#166534] hover:bg-[#14532D] text-white"
            onClick={() => {
              if (signingData?.document?.pdf_url) {
                window.open(signingData.document.pdf_url, "_blank");
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" /> Download Signed Document
          </Button>
          <Button
            variant="outline"
            className="border-[#E5E7EB]"
            onClick={() => window.location.href = "/"}
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
    </VaultSignErrorBoundary>
  );
}

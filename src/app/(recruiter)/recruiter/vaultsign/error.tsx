"use client";

import { AlertTriangle } from "@/lib/icons";
import { Button } from "@/components/ui/button";

export default function VaultSignError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-[#E5E7EB] p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-[#D97706]" />
        </div>
        <h2 className="text-xl font-bold text-[#111827] mb-2">Something went wrong</h2>
        <p className="text-sm text-[#6B7280] mb-4">{error.message || "An unexpected error occurred"}</p>
        <div className="flex flex-col gap-2">
          <Button className="bg-[#166534] hover:bg-[#14532D] text-white w-full" onClick={reset}>Try Again</Button>
          <Button variant="outline" className="w-full border-[#E5E7EB]" onClick={() => window.location.href = "/recruiter/vaultsign"}>Go to Dashboard</Button>
        </div>
      </div>
    </div>
  );
}

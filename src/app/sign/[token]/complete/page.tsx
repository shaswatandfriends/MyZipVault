"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "@/lib/icons";

export default function SigningCompletePage() {
  const params = useParams();
  const token = params.token as string;
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCheck(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-4">
      <div className="max-w-[600px] w-full text-center space-y-6">
        {/* Animated Checkmark */}
        <div className={`flex items-center justify-center transition-all duration-500 ${showCheck ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
          <div className="size-20 rounded-full bg-[#DCFCE7] flex items-center justify-center">
            <CheckCircle2 className="size-10 text-[#166534]" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
          Document Signed!
        </h1>

        {/* Body */}
        <div className="space-y-2">
          <p className="text-[#6B7280]">
            Thank you. Your signature has been recorded.
          </p>
          <p className="text-[#6B7280]">
            You will receive a copy once everyone has signed.
          </p>
        </div>

        {/* Close */}
        <p className="text-sm text-[#9CA3AF]">You may close this window.</p>

        {/* Branding */}
        <div className="pt-8">
          <div className="flex items-center justify-center gap-2">
            <div className="size-6 rounded-md bg-[#166534] flex items-center justify-center text-[10px] font-bold text-white">ZV</div>
            <span className="text-xs text-[#9CA3AF]">Secured by MyZipVault VaultSign</span>
          </div>
        </div>
      </div>
    </div>
  );
}

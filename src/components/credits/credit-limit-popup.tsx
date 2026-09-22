"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, Zap, TrendingUp } from "@/lib/icons";
import Link from "next/link";

interface CreditUsage {
  isVerified: boolean;
  dailyUsed: number;
  monthlyUsed: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
}

interface CreditLimitPopupProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  isVerified: boolean;
}

export function CreditLimitPopup({
  open,
  onClose,
  title,
  message,
  isVerified,
}: CreditLimitPopupProps) {
  const defaultTitle = isVerified
    ? "Credit limit reached"
    : "Get more credits with verification";

  const defaultMessage = isVerified
    ? "Per our community guidelines, we cannot grant additional credits at this time to prevent spam risk. Your limits will reset automatically."
    : "You've reached your credit limit. Verify your account to get 5x more credits and unlock greater reach.";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <div className={`size-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
            isVerified ? "bg-amber-100" : "bg-blue-100"
          }`}>
            {isVerified ? (
              <AlertTriangle className="size-6 text-amber-600" />
            ) : (
              <ShieldCheck className="size-6 text-blue-600" />
            )}
          </div>
          <DialogTitle className="text-center text-lg font-bold text-[#174A43]">
            {title || defaultTitle}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-[#5C6B66] mt-2">
            {message || defaultMessage}
          </DialogDescription>
        </DialogHeader>

        {!isVerified && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <TrendingUp className="size-4" />
              Verified recruiters get:
            </div>
            <div className="space-y-1 text-xs text-blue-800">
              <div className="flex items-center gap-2">
                <Zap className="size-3" />
                <span><strong>50 credits/day</strong> (5x more than 10/day)</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="size-3" />
                <span><strong>500 credits/month</strong> (5x more than 100/month)</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3" />
                <span><strong>Verified badge</strong> on your profile</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3" />
                <span><strong>Certification tags</strong> (Allied, Nursing, Locums, Non-clinical)</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-4">
          {!isVerified && (
            <Button asChild className="w-full gap-2">
              <Link href="/recruiter/verification" onClick={onClose}>
                <ShieldCheck className="size-4" />
                Verify Your Account
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="w-full">
            {isVerified ? "Got it" : "Maybe later"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useCreditCheck() {
  const [usage, setUsage] = useState<CreditUsage | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupData, setPopupData] = useState<{
    title?: string;
    message?: string;
    isVerified: boolean;
  }>({ isVerified: false });

  useEffect(() => {
    fetch("/api/recruiter/credits/usage", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.isVerified !== undefined) setUsage(data);
      })
      .catch(() => {});
  }, []);

  const canSpend = async (amount: number = 1): Promise<boolean> => {
    try {
      const res = await fetch("/api/recruiter/credits/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();

      if (!data.allowed) {
        setPopupData({
          title: data.popupTitle,
          message: data.popupMessage,
          isVerified: data.isVerified,
        });
        setPopupOpen(true);
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  const popup = usage && (
    <CreditLimitPopup
      open={popupOpen}
      onClose={() => setPopupOpen(false)}
      title={popupData.title}
      message={popupData.message}
      isVerified={popupData.isVerified}
    />
  );

  return { usage, canSpend, popup };
}

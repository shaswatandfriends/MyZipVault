"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Mail, ShoppingCart, XCircle } from "@/lib/icons";

const DISMISS_KEY = "myzipvault_credit_low_dismissed_until";
const LOW_THRESHOLD = 5;

interface CreditBalanceResponse {
  balance: number;
  error?: string;
}

export function CreditLowPopup() {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const shouldShowPopup = useCallback((currentBalance: number): boolean => {
    // Don't show if credits are above threshold
    if (currentBalance > LOW_THRESHOLD) return false;

    // Check if user dismissed recently (within 24 hours)
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil) {
      const until = new Date(dismissedUntil);
      if (until > new Date()) return false;
    }

    return true;
  }, []);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/recruiter/credits/balance");
      if (!res.ok) return;

      const data: CreditBalanceResponse = await res.json();
      if (data.error) return;

      setBalance(data.balance);
      setLoading(false);

      if (shouldShowPopup(data.balance)) {
        setOpen(true);
      }
    } catch {
      // Silently fail — don't block the UI
    }
  }, [shouldShowPopup]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const handleDismiss = () => {
    // Set dismissal for 24 hours
    const until = new Date();
    until.setHours(until.getHours() + 24);
    localStorage.setItem(DISMISS_KEY, until.toISOString());
    setOpen(false);
  };

  const handleContactSales = () => {
    window.open("mailto:sales@myzipvault.com?subject=Credit%20Top-Up%20Request", "_blank");
    setOpen(false);
  };

  const handleBuyCredits = () => {
    setOpen(false);
    window.location.href = "/recruiter/billing";
  };

  // Don't render anything while loading or if balance is fine
  if (loading || balance === null || balance > LOW_THRESHOLD) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleDismiss();
      } else {
        setOpen(isOpen);
      }
    }}>
      <DialogContent className="sm:max-w-md border-[#E5E7EB] bg-white" showCloseButton={false}>
        <DialogHeader className="text-center sm:text-center">
          {/* Icon */}
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#F0FDF4]">
            <Coins className="h-7 w-7 text-[#16A34A]" />
          </div>

          <DialogTitle className="text-xl font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Your credits are running low!
          </DialogTitle>

          <DialogDescription className="text-sm text-[#6B7280] mt-1">
            Contact sales to top up your credits and continue using premium features.
          </DialogDescription>
        </DialogHeader>

        {/* Credit Balance Display */}
        <div className="flex flex-col items-center gap-1 py-4">
          <span className="text-sm font-medium text-[#6B7280]">Current Balance</span>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-4xl font-bold text-[#16A34A]"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              {balance}
            </span>
            <span className="text-sm font-medium text-[#6B7280]">credits</span>
          </div>
          {balance === 0 && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
              <XCircle className="h-3 w-3" />
              No credits remaining
            </span>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {/* Primary: Buy Credits */}
          <Button
            onClick={handleBuyCredits}
            className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold"
            size="lg"
          >
            <ShoppingCart className="h-4 w-4" />
            Buy Credits
          </Button>

          {/* Secondary: Contact Sales */}
          <Button
            onClick={handleContactSales}
            variant="outline"
            className="w-full border-[#16A34A] text-[#16A34A] hover:bg-[#F0FDF4] font-semibold"
            size="lg"
          >
            <Mail className="h-4 w-4" />
            Contact Sales
          </Button>

          {/* Tertiary: Dismiss */}
          <button
            onClick={handleDismiss}
            className="mt-1 text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
          >
            Dismiss for 24 hours
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cookie, X, ShieldCheck, Check } from "@/lib/icons";

/**
 * CookieConsent — GDPR/CCPA-compliant cookie consent banner.
 *
 * Behavior:
 *   - Shows on first visit (no `mzv_cookie_consent` value in localStorage)
 *   - User can choose:
 *       - "Accept all": stores { choice: 'accepted', timestamp }
 *       - "Reject non-essential": stores { choice: 'rejected', timestamp }
 *   - Either choice dismisses the banner for 90 days (regulation-friendly:
 *     re-prompt periodically so users can change their mind)
 *   - Escape key = reject
 *
 * Accessibility:
 *   - role="dialog" + aria-modal="true"
 *   - aria-labelledby pointing to the heading
 *   - Focus moves to the "Accept all" button on open
 *   - Escape closes (rejects)
 *   - Keyboard-navigable tab order: link → reject → accept → close
 *
 * Position: fixed at the bottom of the viewport, above the WhatsApp
 * floater (which sits at bottom-8 right-8). Stacks on mobile.
 */
const STORAGE_KEY = "mzv_cookie_consent";
const DISMISS_DAYS = 90;

interface ConsentRecord {
  choice: "accepted" | "rejected";
  timestamp: number;
}

function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (!parsed.choice || !parsed.timestamp) return null;
    if (parsed.choice !== "accepted" && parsed.choice !== "rejected") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(choice: "accepted" | "rejected") {
  try {
    const record: ConsentRecord = { choice, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage may be unavailable (private mode, disabled) — banner
    // will simply re-appear on next visit. Acceptable fallback.
  }
}

function isDismissed(record: ConsentRecord | null): boolean {
  if (!record) return false;
  const ageMs = Date.now() - record.timestamp;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays < DISMISS_DAYS;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);

  // On mount: check localStorage and decide whether to show
  useEffect(() => {
    const record = readConsent();
    if (!isDismissed(record)) {
      // Small delay so the banner doesn't pop in before the page renders
      const t = setTimeout(() => {
        setVisible(true);
        // Trigger the entrance animation on the next tick
        requestAnimationFrame(() => setAnimateIn(true));
      }, 600);
      return () => clearTimeout(t);
    }
  }, []);

  // When the banner becomes visible, move focus to the accept button
  // (accessibility best practice for modal dialogs)
  useEffect(() => {
    if (visible && acceptButtonRef.current) {
      // Delay the focus call by a tick so the entrance animation doesn't jump
      const t = setTimeout(() => acceptButtonRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Listen for Escape key — treat as reject
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleReject();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  const handleAccept = () => {
    writeConsent("accepted");
    setVisible(false);
    setAnimateIn(false);
  };

  const handleReject = () => {
    writeConsent("rejected");
    setVisible(false);
    setAnimateIn(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-[998] flex justify-center px-4 pb-4 sm:pb-6 pointer-events-none"
    >
      <div
        className={`pointer-events-auto w-full max-w-3xl rounded-2xl border border-border bg-white shadow-lg transition-all duration-300 ${
          animateIn ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
        style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)" }}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex size-9 items-center justify-center rounded-full bg-amber-50 border border-amber-200 flex-shrink-0">
              <Cookie className="size-4 text-amber-700" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h2 id="cookie-consent-title" className="text-sm font-semibold text-foreground">
                Cookies &amp; privacy
              </h2>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                We use essential cookies to keep you signed in and to remember your preferences.
                We&apos;d also like to use analytics cookies to improve the platform — you can opt out anytime.
                See our{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </Link>{" "}
                for details.
              </p>

              {/* Action buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  ref={acceptButtonRef}
                  size="sm"
                  onClick={handleAccept}
                  className="h-8"
                >
                  <Check className="size-3.5" />
                  Accept all
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  className="h-8"
                >
                  <ShieldCheck className="size-3.5" />
                  Reject non-essential
                </Button>
              </div>
            </div>

            {/* Close button (X) — dismisses as reject */}
            <button
              type="button"
              onClick={handleReject}
              aria-label="Dismiss (rejects non-essential cookies)"
              className="flex size-7 items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-foreground transition-colors flex-shrink-0"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

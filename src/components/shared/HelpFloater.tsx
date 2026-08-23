"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  HelpCircle, X, FileText, MessageSquare, Phone,
  ChevronDown, Clock, Send,
} from "@/lib/icons";

/**
 * HelpFloater — floating "Help" button that opens a panel with quick
 * support links, common issues, and an email contact form.
 *
 * Sits at bottom-right (bottom-24 right-8), above the WhatsApp floater
 * (which is at bottom-8 right-8) when both are visible. If WhatsApp is
 * not configured, this floater appears at bottom-8 right-8 instead.
 *
 * Behavior:
 *   - Click to open the panel (slides up + fades in)
 *   - Click outside, press Escape, or click X to close
 *   - Panel content:
 *     - Search FAQ (links to /faq)
 *     - Quick action buttons: FAQ / Support / Contact
 *     - Common issues accordion (top 5)
 *     - Email support form (mailto link, opens user's email client)
 *     - Hours + response time
 *
 * Persistence:
 *   - Dismissed state stored in localStorage for 7 days (so we don't
 *     annoy returning users — but the button is always visible; only the
 *     "auto-open on first visit" behavior is gated by this)
 */

const COMMON_ISSUES = [
  {
    q: "Can't log in after signing up",
    a: "Check your email for a verification link. The link expires after 24 hours — request a new one via /verify-email.",
  },
  {
    q: "Recruiter account pending approval",
    a: "New recruiter accounts require superadmin approval (1-2 business days). You'll get an email once approved.",
  },
  {
    q: "Credits not appearing after purchase",
    a: "Stripe purchases typically post instantly. If credits are missing after 5 minutes, refresh the page — if still missing, email support with the Stripe receipt.",
  },
  {
    q: "Submitted candidate was rejected",
    a: "First-submission-wins is enforced by the database timestamp. If another recruiter submitted milliseconds earlier, your credit is auto-refunded.",
  },
  {
    q: "VaultSign document won't load",
    a: "VaultSign works best on Chrome/Safari/Firefox. Try a hard refresh (Ctrl+Shift+R). If still broken, use the error reporter in your dashboard.",
  },
];

const SUPPORT_EMAIL = "support@myzipvault.com";

export function HelpFloater() {
  const [open, setOpen] = useState(false);
  const [openIssue, setOpenIssue] = useState<number | null>(null);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "" });
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    // Delay so the click that opened the panel doesn't immediately close it
    const t = setTimeout(() => {
      window.addEventListener("click", onClick);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("click", onClick);
    };
  }, [open]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.subject.trim() || !emailForm.body.trim()) return;
    // Build a mailto link
    const subject = encodeURIComponent(`[Help widget] ${emailForm.subject.trim()}`);
    const body = encodeURIComponent(`${emailForm.body.trim()}\n\n— sent from the MyZipVault help widget`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    // Don't auto-close — user might want to send another email
  };

  return (
    <div className="fixed bottom-24 right-6 sm:right-8 z-[997] flex flex-col items-end gap-3 pointer-events-none">
      {/* Panel (above the button) */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="help-floater-title"
          className="pointer-events-auto w-[360px] max-w-[calc(100vw-3rem)] rounded-2xl border border-border bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200"
          style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)" }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{
              background: "linear-gradient(135deg, #0A66C2 0%, #004182 100%)",
              color: "white",
            }}
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="size-4" />
              <h3 id="help-floater-title" className="text-sm font-semibold">
                How can we help?
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close help panel"
              className="rounded-md p-1 hover:bg-white/10 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Quick actions */}
            <div className="p-3 grid grid-cols-3 gap-2 border-b border-border">
              <Link
                href="/faq"
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface p-3 hover:border-primary/40 hover:bg-primary-light/30 transition-colors text-center"
              >
                <FileText className="size-4 text-primary" />
                <span className="text-xs font-medium text-foreground">FAQ</span>
              </Link>
              <Link
                href="/support"
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface p-3 hover:border-primary/40 hover:bg-primary-light/30 transition-colors text-center"
              >
                <MessageSquare className="size-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Support</span>
              </Link>
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface p-3 hover:border-primary/40 hover:bg-primary-light/30 transition-colors text-center"
              >
                <Phone className="size-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Contact</span>
              </Link>
            </div>

            {/* Common issues accordion */}
            <div className="p-3 border-b border-border">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-2">
                Common issues
              </p>
              <div className="space-y-1.5">
                {COMMON_ISSUES.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-border overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIssue(openIssue === i ? null : i)}
                      aria-expanded={openIssue === i}
                      className="w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-surface transition-colors"
                    >
                      <span className="text-xs font-medium text-foreground">{item.q}</span>
                      <ChevronDown
                        className="size-3.5 text-text-muted flex-shrink-0 transition-transform"
                        style={{ transform: openIssue === i ? "rotate(180deg)" : "none" }}
                      />
                    </button>
                    {openIssue === i && (
                      <div className="px-3 pb-2.5 text-xs text-text-secondary leading-relaxed">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailSubmit} className="p-3 border-b border-border">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-2">
                Email support
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Subject"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="w-full bg-white border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  required
                />
                <textarea
                  placeholder="How can we help?"
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  rows={3}
                  className="w-full bg-white border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary resize-none"
                  required
                />
                <Button
                  type="submit"
                  size="sm"
                  className="w-full h-8"
                  disabled={!emailForm.subject.trim() || !emailForm.body.trim()}
                >
                  <Send className="size-3" />
                  Open in email
                </Button>
                <p className="text-[10px] text-text-muted text-center">
                  Opens your email client with the message pre-filled.
                </p>
              </div>
            </form>

            {/* Hours footer */}
            <div className="p-3 flex items-center gap-2 bg-surface">
              <Clock className="size-3.5 text-text-muted flex-shrink-0" />
              <p className="text-[11px] text-text-secondary">
                Mon–Fri, 9 AM–6 PM ET. Weekend support is email-only, 24-hour target.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close help" : "Open help panel"}
        aria-expanded={open}
        className="pointer-events-auto flex size-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        style={{
          background: open ? "#111827" : "linear-gradient(135deg, #0A66C2 0%, #004182 100%)",
          color: "white",
          boxShadow: "0 4px 16px rgba(10,102,194,0.3)",
        }}
      >
        {open ? <X className="size-5" /> : <HelpCircle className="size-5" />}
      </button>
    </div>
  );
}

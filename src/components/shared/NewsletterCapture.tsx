"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Mail, Loader2, ArrowRight } from "@/lib/icons";

/**
 * NewsletterCapture — email lead magnet on the landing page.
 *
 * Offers a free lead magnet ("2026 Healthcare Salary Report") in exchange
 * for email. Stores the email in PlatformSetting so we can email them later.
 * Does NOT create a User account — just captures the email for marketing.
 *
 * Also stores UTM params (if present in URL) for channel attribution.
 */
export function NewsletterCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      // Capture UTM params from URL (for attribution)
      const url = new URL(window.location.href);
      const utm = {
        source: url.searchParams.get("utm_source") || "",
        medium: url.searchParams.get("utm_medium") || "",
        campaign: url.searchParams.get("utm_campaign") || "",
        term: url.searchParams.get("utm_term") || "",
        content: url.searchParams.get("utm_content") || "",
      };

      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...utm }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to subscribe");
      }

      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="size-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">You're in! 🎉</h3>
        <p className="text-sm text-text-secondary">
          Check your inbox for the 2026 Healthcare Salary Report. We'll also send you weekly job alerts and career tips.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            disabled={status === "loading"}
            className="pl-9 h-11 bg-white border-border"
            aria-label="Email address"
          />
        </div>
        <Button
          type="submit"
          disabled={status === "loading"}
          className="h-11 px-5 bg-primary hover:bg-primary-dark text-white font-semibold"
        >
          {status === "loading" ? (
            <><Loader2 className="size-4 mr-1 animate-spin" /> Subscribing...</>
          ) : (
            <>Get the report <ArrowRight className="size-4 ml-1" /></>
          )}
        </Button>
      </form>
      {status === "error" && (
        <p className="mt-2 text-xs text-rose-600">{errorMsg}</p>
      )}
      <p className="mt-2 text-[11px] text-text-secondary text-center">
        Free download. No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Mail, Loader2, AlertCircle } from "@/lib/icons";

/**
 * Public unsubscribe page — accessible at /unsubscribe?token=<tracking_token>
 *
 * When a recipient clicks the unsubscribe link in a campaign email:
 *   1. They hit /api/email/track/click/{token}?u=<encoded-unsubscribe-url>
 *   2. The click is recorded (clicked_at updated)
 *   3. They're redirected here to /unsubscribe?token={token}
 *   4. This page shows a confirmation form
 *   5. On confirm, the email is added to the EmailUnsubscribe table
 *   6. Future campaign sends skip emails in that table
 */
export default function UnsubscribePage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || params.token;
  const [status, setStatus] = useState<"loading" | "confirm" | "done" | "error">("loading");
  const [emailPreview, setEmailPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Look up the recipient by tracking token to show a preview of their email
  const loadRecipient = useCallback(async () => {
    if (!token) {
      setStatus("error");
      return;
    }
    try {
      const res = await fetch(`/api/email/unsubscribe?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        // Show masked email: g***@gmail.com
        const email = data.email || "";
        if (email) {
          const [name, domain] = email.split("@");
          const masked = name.length > 2
            ? name[0] + "***" + (name.length > 3 ? name[name.length - 1] : "")
            : name[0] + "***";
          setEmailPreview(`${masked}@${domain || ""}`);
        }
        setStatus("confirm");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, [token]);

  useEffect(() => {
    loadRecipient();
  }, [loadRecipient]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/email/unsubscribe?token=${token}`, {
        method: "POST",
      });
      if (res.ok) {
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(160deg, #0B162A 0%, #004182 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #0A66C2, #004182)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 20 }}>M</div>
          <span style={{ fontWeight: 700, fontSize: 20, color: "white" }}>MyZipVault</span>
        </Link>

        <div className="rounded-2xl bg-white shadow-xl p-8">
          {status === "loading" && (
            <div className="text-center py-8">
              <Loader2 className="size-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-text-muted">Loading...</p>
            </div>
          )}

          {status === "confirm" && (
            <div className="text-center space-y-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 mx-auto">
                <Mail className="size-7 text-amber-600" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Unsubscribe from campaign emails</h1>
              <p className="text-sm text-text-secondary">
                You&apos;re about to unsubscribe <strong>{emailPreview}</strong> from all future marketing emails from MyZipVault.
              </p>
              <p className="text-xs text-text-muted">
                You&apos;ll still receive transactional emails (account verification, password reset, document signing, etc.) — only marketing campaigns will be stopped.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <><Loader2 className="size-4 mr-1.5 animate-spin inline" /> Unsubscribing...</>
                  ) : (
                    "Yes, unsubscribe me"
                  )}
                </button>
                <Link
                  href="/"
                  className="rounded-full border border-border bg-white px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
                >
                  Cancel
                </Link>
              </div>
            </div>
          )}

          {status === "done" && (
            <div className="text-center space-y-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 mx-auto">
                <CheckCircle2 className="size-7 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-foreground">You&apos;ve been unsubscribed</h1>
              <p className="text-sm text-text-secondary">
                <strong>{emailPreview}</strong> will no longer receive marketing emails from MyZipVault.
              </p>
              <p className="text-xs text-text-muted">
                Changed your mind? You can re-subscribe by logging in to your account settings.
              </p>
              <Link
                href="/"
                className="inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
              >
                Back to MyZipVault
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-rose-50 mx-auto">
                <AlertCircle className="size-7 text-rose-600" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-sm text-text-secondary">
                We couldn&apos;t process your unsubscribe request. The link may have expired or is invalid.
              </p>
              <Link
                href="/"
                className="inline-block rounded-full border border-border bg-white px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
              >
                Back to MyZipVault
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-white/40 mt-4">
          &copy; 2026 MyZipVault. All rights reserved.
        </p>
      </div>
    </div>
  );
}

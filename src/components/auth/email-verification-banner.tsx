"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Mail, X, RefreshCw, Loader2 } from "@/lib/icons";
import { toast } from "sonner";

/**
 * Email Verification Banner
 *
 * Shows a persistent banner at the top of the page when the logged-in
 * user has not verified their email address.
 *
 * Per Gap 5 fix: unverified users can log in but have limited functionality.
 * This banner reminds them to verify and provides a resend link.
 *
 * The banner auto-hides if:
 *   - User is not logged in
 *   - User's email is verified (email_verified_at is set)
 *   - User closes it manually (per-session, comes back on next login)
 */
export function EmailVerificationBanner() {
  const { data: session, status } = useSession();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Check verification status on mount
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      setIsVerified(null);
      return;
    }

    // Super admins don't need email verification (OTP login)
    const role = (session.user as Record<string, unknown>).role as string;
    if (role === "super_admin") {
      setIsVerified(true);
      return;
    }

    // Fetch verification status
    fetch("/api/auth/verification-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setIsVerified(!!data.emailVerified);
        }
      })
      .catch(() => {
        // If we can't check, assume verified (don't block user)
        setIsVerified(true);
      });
  }, [session, status]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Verification email sent", {
          description: "Check your inbox for the verification link.",
        });
      } else {
        toast.error("Failed to resend", {
          description: data.error || "Please try again.",
        });
      }
    } catch {
      toast.error("Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  // Don't render if:
  // - Loading
  // - User not logged in
  // - Email is verified
  // - User dismissed the banner this session
  if (
    status === "loading" ||
    status !== "authenticated" ||
    isVerified === null ||
    isVerified === true ||
    dismissed
  ) {
    return null;
  }

  return (
    <div
      style={{
        background: "#FAF1DC",
        borderBottom: "1px solid #B8862B",
        padding: "0.75rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flex: 1,
          minWidth: 0,
        }}
      >
        <Mail
          className="size-5 shrink-0"
          style={{ color: "#B8862B" }}
        />
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#1A1A1A",
              margin: 0,
            }}
          >
            Please verify your email address
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#3A3A3A",
              margin: 0,
              marginTop: "2px",
            }}
          >
            Some features (uploading credentials, sharing documents, requesting
            references) are locked until you verify.
          </p>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleResend}
          disabled={isResending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.4rem 0.875rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            background: "#0B1F3A",
            color: "#F5F0E6",
            border: "1px solid #0B1F3A",
            borderRadius: "2px",
            cursor: isResending ? "not-allowed" : "pointer",
            opacity: isResending ? 0.7 : 1,
            transition: "all 150ms",
          }}
        >
          {isResending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Resend link
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#6B6B6B",
            borderRadius: "2px",
          }}
          aria-label="Dismiss banner"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

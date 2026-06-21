"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Mail, X, RefreshCw, Loader2 } from "@/lib/icons";
import { toast } from "sonner";

/**
 * Email Verification Banner — Spatial UI
 *
 * Shows a persistent banner at the top of the page when the logged-in
 * user has not verified their email address.
 *
 * Spatial UI: amber callout with backdrop-blur, terra accent on action button.
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
        background: "var(--status-amber-bg)",
        backdropFilter: "blur(10px) saturate(1.4)",
        WebkitBackdropFilter: "blur(10px) saturate(1.4)",
        borderBottom: "0.5px solid rgba(217, 119, 6, 0.25)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
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
        <div
          className="flex items-center justify-center size-7 shrink-0 rounded-[8px]"
          style={{
            background: "linear-gradient(180deg, #FCD34D 0%, #D97706 60%, #92400E 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 6px rgba(217,119,6,0.28)",
            color: "#fff",
          }}
        >
          <Mail className="size-4" />
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--status-amber-dark)",
              margin: 0,
            }}
          >
            Please verify your email address
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--status-amber-dark)",
              opacity: 0.85,
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
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            background: "linear-gradient(180deg, var(--primary-vivid) 0%, var(--primary) 60%, var(--primary-hover) 100%)",
            color: "#fff",
            border: "0.5px solid rgba(45, 90, 61, 0.5)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(45,90,61,0.24)",
            cursor: isResending ? "not-allowed" : "pointer",
            opacity: isResending ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isResending) {
              e.currentTarget.style.filter = "brightness(1.08)";
              e.currentTarget.style.transform = "scale(1.02)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = "none";
            e.currentTarget.style.transform = "scale(1)";
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
          className="inline-flex items-center justify-center size-7 rounded-full transition-all"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--status-amber-dark)",
            opacity: 0.7,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.background = "rgba(217, 119, 6, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.7";
            e.currentTarget.style.background = "transparent";
          }}
          aria-label="Dismiss banner"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "@/lib/icons";
import Link from "next/link";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
}

/**
 * Reusable error boundary component.
 * Used by error.tsx files in each route group directory.
 *
 * Per Gap 19: prevents white-screen crashes on key pages.
 * Shows a friendly error message with retry + home buttons.
 */
export function ErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again, or return to your dashboard.",
  homeHref = "/dashboard",
}: ErrorBoundaryProps) {
  useEffect(() => {
    // Log error to console for debugging (in production, this would go to Sentry)
    console.error("[ERROR_BOUNDARY]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--background, #F0FDFA)",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 1.5rem",
            borderRadius: "50%",
            background: "rgba(220, 38, 38, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertTriangle
            className="size-8"
            style={{ color: "#DC2626" }}
          />
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--foreground, #0F172A)",
            marginBottom: "0.75rem",
          }}
        >
          {title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            color: "var(--text-secondary, #475569)",
            marginBottom: "2rem",
          }}
        >
          {description}
        </p>

        {/* Error digest (if available) */}
        {error.digest && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted, #94A3B8)",
              marginBottom: "2rem",
              fontFamily: "monospace",
            }}
          >
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              background: "var(--primary, #059669)",
              color: "#FFFFFF",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              transition: "opacity 150ms",
            }}
          >
            <RefreshCw className="size-4" />
            Try Again
          </button>
          <Link
            href={homeHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              background: "transparent",
              color: "var(--text-secondary, #475569)",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "1px solid var(--border, #E2E8F0)",
              borderRadius: "0.5rem",
              textDecoration: "none",
              transition: "background 150ms",
            }}
          >
            <LayoutDashboard className="size-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

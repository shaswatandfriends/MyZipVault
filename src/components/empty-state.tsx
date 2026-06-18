"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  variant?: "default" | "compact";
}

/**
 * Reusable empty state component.
 * Used on dashboards and list pages when there's no data to show.
 *
 * Per Gap 16: provides guidance to new users instead of showing
 * empty cards with no context.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  variant = "default",
}: EmptyStateProps) {
  const padding = variant === "compact" ? "py-8" : "py-16";

  return (
    <div
      style={{
        padding: variant === "compact" ? "2rem 1.5rem" : "4rem 1.5rem",
        textAlign: "center",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: variant === "compact" ? 48 : 64,
          height: variant === "compact" ? 48 : 64,
          margin: "0 auto 1.25rem",
          borderRadius: "50%",
          background: "var(--primary-light, #D1FAE5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          className={variant === "compact" ? "size-6" : "size-8"}
          style={{ color: "var(--primary, #059669)" }}
        />
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: variant === "compact" ? "1rem" : "1.125rem",
          fontWeight: 600,
          color: "var(--foreground, #0F172A)",
          marginBottom: "0.5rem",
        }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: "0.875rem",
          lineHeight: 1.6,
          color: "var(--text-secondary, #475569)",
          maxWidth: "400px",
          margin: "0 auto 1.5rem",
        }}
      >
        {description}
      </p>

      {/* CTA */}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.5rem",
            background: "var(--primary, #059669)",
            color: "#FFFFFF",
            fontSize: "0.875rem",
            fontWeight: 600,
            borderRadius: "0.5rem",
            textDecoration: "none",
            transition: "opacity 150ms",
          }}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

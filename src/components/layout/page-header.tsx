"use client";

import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

// Spatial UI PageHeader — used across all inner pages.
// Eyebrow-style terra accent bar on the left, serif heading, soft description.
// The terra bar + serif title creates consistent visual hierarchy platform-wide.
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 min-w-0">
        {/* Terra accent bar */}
        <div
          className="hidden sm:block w-1 rounded-full shrink-0 self-stretch min-h-[2.5rem]"
          style={{
            background: "linear-gradient(180deg, var(--terra) 0%, var(--terra-light) 100%)",
            boxShadow: "0 0 8px rgba(201,123,84,0.3)",
          }}
        />
        <div className="min-w-0">
          <h1
            className="text-2xl font-bold tracking-tight font-heading"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="text-sm mt-1 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0">{actions}</div>
      )}
    </div>
  );
}

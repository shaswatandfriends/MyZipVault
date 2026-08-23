import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "@/lib/icons";

interface InfoPageShellProps {
  /** Eyebrow chip text — small uppercase label above the title */
  eyebrow?: string;
  /** Page H1 title */
  title: string;
  /** Subtitle paragraph below the title */
  subtitle?: string;
  /** Main page content (sections, cards, etc.) */
  children: ReactNode;
  /** Optional CTA block at the bottom of the page (before footer) */
  cta?: ReactNode;
}

/**
 * Shared layout for marketing/info pages on the public site.
 *
 * Used by /our-story, /contact, /referral-program, /for-candidates,
 * /for-recruiters, /for-employers, /marketplace-flow, /credit-system,
 * /faq, /support.
 *
 * Visual pattern matches the existing /about page: white background, simple
 * header with logo + back-to-home link, max-w-3xl content column, footer
 * with privacy/terms links.
 */
export function InfoPageShell({
  eyebrow,
  title,
  subtitle,
  children,
  cta,
}: InfoPageShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              M
            </div>
            <span
              className="font-semibold text-lg text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              MyZipVault
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-16">
        {eyebrow && (
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3"
            style={{ fontFamily: "'Satoshi', sans-serif" }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className="text-[36px] font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Satoshi', sans-serif" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 text-[17px] leading-relaxed text-text-secondary">
            {subtitle}
          </p>
        )}

        <div className="mt-10 space-y-10">{children}</div>

        {cta && <div className="mt-16">{cta}</div>}
      </main>

      {/* Footer */}
      <footer className="mt-auto">
        <div className="border-t border-border bg-white py-6 px-6">
          <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">
              &copy; 2026 MyZipVault. All rights reserved.
            </p>
            <nav className="flex items-center gap-4 text-sm text-text-secondary">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Section heading used inside InfoPageShell children.
 */
export function InfoSectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2
      className="text-[24px] font-bold text-foreground"
      style={{ fontFamily: "'Satoshi', sans-serif" }}
    >
      {children}
    </h2>
  );
}

/**
 * Standard paragraph used inside InfoPageShell children.
 */
export function InfoParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
      {children}
    </p>
  );
}

/**
 * Reusable CTA block with sign-up links for all three roles.
 */
export function RoleTriCta() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <h3
        className="text-[22px] font-bold text-foreground"
        style={{ fontFamily: "'Satoshi', sans-serif" }}
      >
        Ready to get started?
      </h3>
      <p className="mt-3 text-sm text-text-secondary">
        No credit card. No catch. Start in about a minute.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
        >
          I&apos;m a Candidate
        </Link>
        <Link
          href="/agency-signup"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
        >
          I&apos;m a Recruiter
        </Link>
        <Link
          href="/employer-signup"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
        >
          I&apos;m an Employer
        </Link>
      </div>
    </div>
  );
}

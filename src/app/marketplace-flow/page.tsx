import Link from "next/link";
import { InfoPageShell, InfoSectionHeading, InfoParagraph, RoleTriCta } from "@/components/layout/info-page-shell";
import { flowSteps, ownershipWindows, verificationItems } from "@/lib/landing-content";
import { CheckCircle2, ArrowRight } from "@/lib/icons";

export const metadata = {
  title: "Marketplace Flow — MyZipVault",
  description: "How MyZipVault's healthcare recruiting marketplace works: post jobs, find candidates, send RTR, submit & win. Plus the ownership windows that protect recruiters.",
};

export default function MarketplaceFlowPage() {
  return (
    <InfoPageShell
      eyebrow="Marketplace Flow"
      title="Four steps from job post to placement."
      subtitle="Every placement on MyZipVault follows the same four-step flow. Each step is enforced by the platform — no side deals, no cutouts, no paperwork lost in the cracks."
      cta={<RoleTriCta />}
    >
      {/* The flow */}
      <section>
        <InfoSectionHeading>The four steps</InfoSectionHeading>
        <div className="mt-6 space-y-4">
          {flowSteps.map((step, i) => (
            <div key={step.title} className="bg-white border border-border rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary text-white font-bold text-sm flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <step.icon className="size-5 text-primary" />
                    <p className="font-semibold text-foreground">{step.title}</p>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Path A vs Path B */}
      <section>
        <InfoSectionHeading>Path A vs Path B (recruiters)</InfoSectionHeading>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="bg-white border border-border rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2">Path A — Platform pool</p>
            <p className="font-semibold text-foreground mb-2">Search the candidate pool</p>
            <p className="text-sm text-text-secondary leading-relaxed mb-3">
              Recruiters search the public candidate pool by name, email, phone, specialty, or location. The pool includes candidates who signed up directly via /signup and any candidate added by another recruiter whose 180-day ownership window has expired.
            </p>
            <p className="text-xs text-text-muted">Standard 70/30 split. No exclusive ownership.</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2">Path B — Bring your own</p>
            <p className="font-semibold text-foreground mb-2">Add candidates from your network</p>
            <p className="text-sm text-text-secondary leading-relaxed mb-3">
              Recruiters bring their own candidates by entering the candidate&apos;s email and phone. If both are new to the platform, the recruiter gets 90 days of exclusive ownership — no other recruiter can see or submit the candidate during that window.
            </p>
            <p className="text-xs text-text-muted">75/25 split during 0-90 days. Residual 2% royalty 90-180 days.</p>
          </div>
        </div>
      </section>

      {/* Ownership windows */}
      <section>
        <InfoSectionHeading>Ownership windows</InfoSectionHeading>
        <InfoParagraph>
          The ownership window system protects recruiters who bring new candidates to the platform. During the exclusive window, no other recruiter can submit that candidate. After 90 days, the candidate enters the residual phase where other recruiters can submit, but the original owner gets a 2% royalty from the new recruiter&apos;s share. After 180 days, the candidate is fully open with the standard 70/30 split.
        </InfoParagraph>
        <div className="mt-6 space-y-4">
          {ownershipWindows.map((w) => (
            <div key={w.title} className="bg-white border border-border rounded-2xl p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
                <p className="font-semibold text-foreground">{w.title}</p>
                <span className="inline-flex items-center rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary">
                  {w.split}
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{w.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* First submission wins */}
      <section>
        <InfoSectionHeading>First submission wins</InfoSectionHeading>
        <InfoParagraph>
          When two recruiters try to submit the same candidate to the same job, the platform records the submission timestamp to the millisecond. The first submission wins. If two submissions arrive within the same millisecond (extremely rare), the recruiter with the higher reputation score wins. This rule is non-negotiable and enforced by the database, not by a customer service dispute.
        </InfoParagraph>
      </section>

      {/* Trust & verification */}
      <section>
        <InfoSectionHeading>Trust &amp; verification at every step</InfoSectionHeading>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {verificationItems.map((v) => (
            <div key={v.title} className="bg-white border border-border rounded-2xl p-6">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary-light mb-4">
                <v.icon className="size-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{v.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed mt-2">{v.desc}</p>
              <ul className="mt-4 space-y-2">
                {v.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-xs text-text-secondary">
                    <CheckCircle2 className="size-3.5 mt-0.5 text-primary flex-shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section>
        <InfoSectionHeading>Compliance built in</InfoSectionHeading>
        <InfoParagraph>
          Every submission requires a signed RTR (Right to Represent) document via VaultSign. Every placement has a full audit trail: who submitted, when, who approved, when the candidate signed, when the employer paid, and when the platform split the payout. No more lost emails, no more &quot;did you sign?&quot; disputes. The system remembers everything.
        </InfoParagraph>
      </section>

      {/* CTA inline */}
      <section>
        <InfoSectionHeading>Get started</InfoSectionHeading>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/employer-signup"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
          >
            Post a job <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/agency-signup"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
          >
            Become a recruiter
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
          >
            I&apos;m a candidate
          </Link>
        </div>
      </section>
    </InfoPageShell>
  );
}

import Link from "next/link";
import { InfoPageShell, InfoSectionHeading, InfoParagraph, RoleTriCta } from "@/components/layout/info-page-shell";
import { recruiterFeatures, ownershipWindows, testimonials } from "@/lib/landing-content";
import { Star } from "@/lib/icons";

export const metadata = {
  title: "For Recruiters — MyZipVault",
  description: "Independent healthcare recruiters: keep 70% of every placement fee, work for yourself, get 90-day ownership protection, and submit candidates with credit-gated reveals.",
};

export default function ForRecruitersPage() {
  return (
    <InfoPageShell
      eyebrow="For Recruiters"
      title="Work for yourself. Keep 70%. Not 30%."
      subtitle="Independent healthcare recruiters finally get the infrastructure agencies have always had — candidate pools, e-signature, ownership protection, real-time tracking. Bring your own candidates or search the platform pool. Keep 70% of every placement fee."
      cta={<RoleTriCta />}
    >
      {/* Pricing hero */}
      <section>
        <InfoSectionHeading>Pricing</InfoSectionHeading>
        <div className="mt-6 rounded-2xl border-2 border-primary bg-white p-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary mb-2">For Recruiters</p>
              <p className="text-[56px] font-bold text-foreground leading-none" style={{ fontFamily: "'Satoshi', sans-serif" }}>70/30</p>
              <p className="text-sm text-text-secondary mt-2">You keep 70% of every placement fee. Platform gets 30%. No upfront cost, no retainer.</p>
            </div>
            <Link
              href="/agency-signup"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark self-start sm:self-auto"
            >
              Become an independent recruiter
            </Link>
          </div>
        </div>
      </section>

      {/* All features */}
      <section>
        <InfoSectionHeading>Everything you get</InfoSectionHeading>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {recruiterFeatures.map((f) => (
            <div key={f.title} className="bg-white border border-border rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary-light flex-shrink-0">
                  <f.icon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{f.title}</p>
                  <p className="text-sm text-text-secondary leading-relaxed mt-1">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ownership windows */}
      <section>
        <InfoSectionHeading>Ownership windows — explained</InfoSectionHeading>
        <InfoParagraph>
          When you bring a new candidate to the platform (both email and phone are new), you get 90 days of exclusive access. No other recruiter can see or submit that candidate. After 90 days, the candidate enters a residual phase where others can submit, but you still get a 2% royalty. After 180 days, the candidate is fully open.
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

      {/* Approval flow */}
      <section>
        <InfoSectionHeading>Approval flow</InfoSectionHeading>
        <InfoParagraph>
          New recruiter accounts require superadmin approval before going live. This keeps the candidate pool clean. Approval typically takes 1-2 business days. You&apos;ll receive an email once approved. Once approved, you can start submitting candidates immediately — no further approval steps for individual submissions.
        </InfoParagraph>
      </section>

      {/* Testimonials */}
      <section>
        <InfoSectionHeading>What recruiters say</InfoSectionHeading>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white border border-border rounded-2xl p-6">
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={14} style={{ color: "#FBBF24", fill: "#FBBF24" }} />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-4">&quot;{t.text}&quot;</p>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-text-muted">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ link */}
      <section>
        <InfoSectionHeading>More questions?</InfoSectionHeading>
        <InfoParagraph>
          See the full recruiter FAQ on our{" "}
          <Link href="/faq" className="font-semibold text-primary hover:underline">
            FAQ page
          </Link>{" "}
          — including how credit-gated reveals work, how first-submission-wins is enforced, and how reputation scores are calculated.
        </InfoParagraph>
      </section>
    </InfoPageShell>
  );
}

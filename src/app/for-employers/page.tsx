import Link from "next/link";
import { InfoPageShell, InfoSectionHeading, InfoParagraph, RoleTriCta } from "@/components/layout/info-page-shell";
import { employerFeatures, ownershipWindows, testimonials } from "@/lib/landing-content";
import { Star, DollarSign } from "@/lib/icons";

export const metadata = {
  title: "For Employers — MyZipVault",
  description: "Healthcare employers: post jobs directly with your own commission budget, browse vetted candidates, and let recruiters compete to fill your openings.",
};

export default function ForEmployersPage() {
  return (
    <InfoPageShell
      eyebrow="For Employers"
      title="Post jobs. Set your budget. Get vetted candidates."
      subtitle="Skip the agency markup. Post jobs directly on MyZipVault with your own commission budget. Recruiters compete to fill your openings. You see every submission, every credential, every checklist. You pay the platform — the platform splits to recruiters."
      cta={<RoleTriCta />}
    >
      {/* Commission example */}
      <section>
        <InfoSectionHeading>How commission works</InfoSectionHeading>
        <div className="mt-6 rounded-2xl border-2 border-primary bg-white p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary-light flex-shrink-0">
              <DollarSign className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">You set the budget. Platform handles the split.</p>
              <p className="text-sm text-text-secondary mt-1">Example: you post a job with $10,000 commission. Here&apos;s what each side sees:</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 mt-4">
            <div className="rounded-lg bg-primary-light p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">Recruiter sees</p>
              <p className="text-2xl font-bold text-foreground mt-1" style={{ fontFamily: "'Satoshi', sans-serif" }}>$7,000</p>
              <p className="text-xs text-text-secondary mt-1">70% recruiter commission</p>
            </div>
            <div className="rounded-lg bg-surface p-4 border border-border">
              <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">Platform fee</p>
              <p className="text-2xl font-bold text-foreground mt-1" style={{ fontFamily: "'Satoshi', sans-serif" }}>$3,000</p>
              <p className="text-xs text-text-secondary mt-1">30% platform fee</p>
            </div>
            <div className="rounded-lg bg-primary-light p-4 border border-primary">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">You pay</p>
              <p className="text-2xl font-bold text-primary mt-1" style={{ fontFamily: "'Satoshi', sans-serif" }}>$10,000</p>
              <p className="text-xs text-text-secondary mt-1">Total, all-in</p>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-4">
            If the candidate was brought by another recruiter (Path B, within the 90-180 day residual window), the split becomes $6,800 recruiter + $3,000 platform + $200 original owner royalty. You still pay only $10,000.
          </p>
        </div>
      </section>

      {/* All features */}
      <section>
        <InfoSectionHeading>Everything you get</InfoSectionHeading>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {employerFeatures.map((f) => (
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
        <InfoSectionHeading>Why ownership windows matter to you</InfoSectionHeading>
        <InfoParagraph>
          The ownership window system means recruiters are incentivized to bring new candidates to your jobs — they earn the full 70% by adding a new candidate to the platform. It also means that even after a candidate has been on the platform for a while, recruiters still have a fair shot at submitting them. You get the widest possible candidate pool with transparent pricing at every stage.
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

      {/* Anonymized recruiter view */}
      <section>
        <InfoSectionHeading>You see recruiter work, not recruiter identity</InfoSectionHeading>
        <InfoParagraph>
          Employers see recruiter initials (e.g., &quot;SP&quot;) and a profile photo only. No email, no phone, no contact info. All communication goes through the platform. This protects recruiters from being cut out of placements, and it protects employers from being spammed off-platform. When a placement is confirmed, the platform handles payout — you pay us, we pay them.
        </InfoParagraph>
      </section>

      {/* Testimonials */}
      <section>
        <InfoSectionHeading>What employers say</InfoSectionHeading>
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
          See the full employer FAQ on our{" "}
          <Link href="/faq" className="font-semibold text-primary hover:underline">
            FAQ page
          </Link>{" "}
          — including how payments are processed, how BAA agreements work, and how to set up a company profile.
        </InfoParagraph>
      </section>
    </InfoPageShell>
  );
}

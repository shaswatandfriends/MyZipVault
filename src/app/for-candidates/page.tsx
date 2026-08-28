import Link from "next/link";
import { InfoPageShell, InfoSectionHeading, InfoParagraph, RoleTriCta } from "@/components/layout/info-page-shell";
import { candidateFeatures, verificationItems, testimonials } from "@/lib/landing-content";
import { Star, CheckCircle2 } from "@/lib/icons";

export const metadata = {
  title: "For Candidates — MyZipVault",
  description: "Healthcare professionals: own your credentials, reuse your checklists, sign documents online, and apply to jobs — 100% free, forever.",
};

export default function ForCandidatesPage() {
  return (
    <InfoPageShell
      eyebrow="For Candidates"
      title="Your career. Your data. Your terms."
      subtitle="Join MyZipVault as a healthcare professional. Build your vault once, reuse it forever. Apply to jobs, sign documents online, and share with recruiters on your terms. 100% free for candidates."
      cta={<RoleTriCta />}
    >
      {/* What you get */}
      <section>
        <InfoSectionHeading>Everything you get — free</InfoSectionHeading>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {candidateFeatures.map((f) => (
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

      {/* Verification & trust */}
      <section>
        <InfoSectionHeading>Trust &amp; verification</InfoSectionHeading>
        <InfoParagraph>
          Every document in your vault is verified by our admin team. Every checklist you complete is signed and timestamped. Every reference is collected via VaultSign with a full audit trail. Recruiters can verify authenticity — they can&apos;t fake it.
        </InfoParagraph>
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

      {/* Sharing control */}
      <section>
        <InfoSectionHeading>You control every share</InfoSectionHeading>
        <InfoParagraph>
          Grant a recruiter expiring access (7, 14, or 30 days) to your vault. Revoke it any time. The recruiter sees only what you allowed — nothing more. When access expires, every link is killed instantly. If you delete your account, every active share is purged in the same minute.
        </InfoParagraph>
      </section>

      {/* Testimonials */}
      <section>
        <InfoSectionHeading>What candidates say</InfoSectionHeading>
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

      {/* Pricing */}
      <section>
        <InfoSectionHeading>Pricing</InfoSectionHeading>
        <div className="mt-6 rounded-2xl border-2 border-primary bg-white p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary mb-2">For Candidates</p>
          <p className="text-[56px] font-bold text-foreground leading-none" style={{ fontFamily: "'Satoshi', sans-serif" }}>Free</p>
          <p className="text-sm text-text-secondary mt-2 mb-6">Forever. No credit card. No upsell.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
          >
            Create your free vault
          </Link>
        </div>
      </section>
    </InfoPageShell>
  );
}

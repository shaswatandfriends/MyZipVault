import Link from "next/link";
import { InfoPageShell, InfoSectionHeading, InfoParagraph } from "@/components/layout/info-page-shell";
import { creditActions } from "@/lib/landing-content";
import { CreditCard, Users, Briefcase, CheckCircle2 } from "@/lib/icons";

export const metadata = {
  title: "Credit System — MyZipVault",
  description: "How MyZipVault credits work: buy via Stripe, spend on reveals, submissions, RTRs, and checklists. Candidates are always free.",
};

export default function CreditSystemPage() {
  return (
    <InfoPageShell
      eyebrow="Credit System"
      title="One currency. Every action. Fully transparent."
      subtitle="MyZipVault credits are the only currency on the platform. Recruiters and employers buy them via Stripe. Candidates are always free — they never need credits for anything. Each action costs a fixed, configurable amount of credits."
    >
      {/* Who needs credits */}
      <section>
        <InfoSectionHeading>Who needs credits?</InfoSectionHeading>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex size-10 items-center justify-center rounded-full bg-surface mb-3">
              <Users className="size-5 text-text-muted" />
            </div>
            <p className="font-semibold text-foreground">Candidates</p>
            <p className="text-sm text-text-secondary leading-relaxed mt-1">
              Never need credits. 100% free forever. Candidates can use every feature without paying a cent.
            </p>
          </div>
          <div className="bg-white border-2 border-primary rounded-2xl p-6">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary-light mb-3">
              <Briefcase className="size-5 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Recruiters</p>
            <p className="text-sm text-text-secondary leading-relaxed mt-1">
              Buy credits to reveal contact info, submit candidates, and send checklists/RTRs. Credits never expire.
            </p>
          </div>
          <div className="bg-white border-2 border-primary rounded-2xl p-6">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary-light mb-3">
              <CreditCard className="size-5 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Employers</p>
            <p className="text-sm text-text-secondary leading-relaxed mt-1">
              Buy credits to reveal candidate contact info for direct sourcing. Posting jobs is free. Setting commission budget is free.
            </p>
          </div>
        </div>
      </section>

      {/* Action costs */}
      <section>
        <InfoSectionHeading>Action costs (default)</InfoSectionHeading>
        <InfoParagraph>
          The platform superadmin can configure every credit cost via the Superadmin → Credit Costs settings page. The costs shown here are defaults — your platform may differ.
        </InfoParagraph>
        <div className="mt-6 rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Action</th>
                <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Cost</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Who</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {creditActions.map((row) => (
                <tr key={row.action} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-foreground">{row.action}</td>
                  <td className="px-5 py-3 text-right font-semibold text-primary">{row.cost}</td>
                  <td className="px-5 py-3 text-text-secondary">{row.who}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* How to buy */}
      <section>
        <InfoSectionHeading>How to buy credits</InfoSectionHeading>
        <InfoParagraph>
          Credits are purchased via Stripe from the recruiter or employer dashboard. Bulk purchases receive volume discounts (set by the platform admin). Credits never expire — buy them when you need them and use them whenever. The platform admin can also allocate credits manually to recruiter/employer accounts (e.g., for onboarding bonuses, partner agreements, or refund adjustments).
        </InfoParagraph>
      </section>

      {/* Refunds & edge cases */}
      <section>
        <InfoSectionHeading>Refunds &amp; edge cases</InfoSectionHeading>
        <div className="mt-6 space-y-3">
          {[
            "Credits do not expire. Once purchased, they remain on your account until used.",
            "Refunds on unused credit balances are handled case-by-case via support.",
            "If a candidate you paid to reveal opts out / deletes their account before you contact them, the platform can refund the credit. Submit a support ticket with the reveal timestamp.",
            "If a submission is rejected because first-submission-wins was already taken by another recruiter, the submission credit is refunded automatically.",
            "Credits spent on RTRs that are declined by the candidate are not refunded — the e-signature infrastructure cost is incurred regardless of outcome.",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2 className="size-5 mt-0.5 text-primary flex-shrink-0" />
              <p className="text-sm text-text-secondary leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Get credits link */}
      <section>
        <InfoSectionHeading>Get credits</InfoSectionHeading>
        <InfoParagraph>
          Already have a recruiter or employer account? Log in and visit the Billing page in your dashboard. New to the platform?{" "}
          <Link href="/agency-signup" className="font-semibold text-primary hover:underline">Sign up as a recruiter</Link>{" "}
          or{" "}
          <Link href="/employer-signup" className="font-semibold text-primary hover:underline">sign up as an employer</Link>{" "}
          to get started.
        </InfoParagraph>
      </section>
    </InfoPageShell>
  );
}

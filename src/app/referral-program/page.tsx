import Link from "next/link";
import { InfoPageShell, InfoSectionHeading, InfoParagraph, RoleTriCta } from "@/components/layout/info-page-shell";
import { Handshake, Gift, Users, DollarSign, CheckCircle2 } from "@/lib/icons";

export const metadata = {
  title: "Referral Program — MyZipVault",
  description: "Earn credits and cash bonuses by referring healthcare professionals, recruiters, and employers to MyZipVault.",
};

export default function ReferralProgramPage() {
  return (
    <InfoPageShell
      eyebrow="Referral Program"
      title="Refer. Earn. Repeat."
      subtitle="When you bring a healthcare professional, recruiter, or employer to MyZipVault, you earn rewards every time they take a meaningful action."
      cta={<RoleTriCta />}
    >
      <section>
        <InfoSectionHeading>How it works</InfoSectionHeading>
        <InfoParagraph>
          Every MyZipVault user gets a personal referral link from their dashboard. Share it in your network — by email, text, LinkedIn, WhatsApp, or anywhere you source. When someone signs up through your link and completes a qualifying action, you earn the reward below. No cap, no expiration.
        </InfoParagraph>
      </section>

      <section>
        <InfoSectionHeading>What you earn</InfoSectionHeading>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary-light mb-3">
              <Users className="size-5 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Per candidate verified</p>
            <p className="text-[28px] font-bold text-primary mt-2" style={{ fontFamily: "'Satoshi', sans-serif" }}>5 credits</p>
            <p className="text-sm text-text-secondary leading-relaxed mt-2">
              When a candidate you referred verifies their email and completes profile setup.
            </p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary-light mb-3">
              <Handshake className="size-5 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Per recruiter approved</p>
            <p className="text-[28px] font-bold text-primary mt-2" style={{ fontFamily: "'Satoshi', sans-serif" }}>25 credits</p>
            <p className="text-sm text-text-secondary leading-relaxed mt-2">
              When a recruiter you referred is approved and submits their first candidate.
            </p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary-light mb-3">
              <DollarSign className="size-5 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Per employer first job</p>
            <p className="text-[28px] font-bold text-primary mt-2" style={{ fontFamily: "'Satoshi', sans-serif" }}>50 credits</p>
            <p className="text-sm text-text-secondary leading-relaxed mt-2">
              When an employer you referred posts their first job with a real commission budget.
            </p>
          </div>
        </div>
      </section>

      <section>
        <InfoSectionHeading>Qualifying actions</InfoSectionHeading>
        <div className="mt-6 space-y-3">
          {[
            "Candidate: verifies email + completes profile (specialty, location, phone).",
            "Recruiter: approved by superadmin + submits first candidate to a job.",
            "Employer: signs up + posts first job with commission budget set.",
            "Bonus: refer 5 active users in a month → 100 credits on top.",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2 className="size-5 mt-0.5 text-primary flex-shrink-0" />
              <p className="text-sm text-text-secondary leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <InfoSectionHeading>The fine print</InfoSectionHeading>
        <InfoParagraph>
          Credits you earn through referrals can be spent on the platform (reveal contact info, submit candidates, send checklists). They cannot be redeemed for cash. The platform reserves the right to revoke credits from accounts that game the system via self-referrals, fake emails, or duplicate accounts. Recruiters you refer must complete superadmin approval before the credit is issued.
        </InfoParagraph>
      </section>

      <section>
        <InfoSectionHeading>Get your link</InfoSectionHeading>
        <InfoParagraph>
          Your personal referral link lives in your dashboard under the Profile section. Log in as a{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">candidate</Link>,{" "}
          <Link href="/agency-login" className="font-semibold text-primary hover:underline">recruiter</Link>, or{" "}
          <Link href="/employer-signup" className="font-semibold text-primary hover:underline">employer</Link>{" "}
          and look for the &quot;Refer a friend&quot; card on your dashboard. New to the platform?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">Sign up free</Link>.
        </InfoParagraph>
      </section>
    </InfoPageShell>
  );
}

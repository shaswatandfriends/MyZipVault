import Link from "next/link";
import { InfoPageShell, InfoSectionHeading, InfoParagraph, RoleTriCta } from "@/components/layout/info-page-shell";
import { Target, Heart, Lightbulb, Users, ShieldCheck, Lock } from "@/lib/icons";

export const metadata = {
  title: "Our Story — MyZipVault",
  description: "Why we built MyZipVault: to give healthcare professionals control over their career data, give independent recruiters a fair playing field, and give employers direct access to vetted talent.",
};

export default function OurStoryPage() {
  return (
    <InfoPageShell
      eyebrow="Our Story"
      title="Built by people who lived the broken compliance loop."
      subtitle="MyZipVault was born from firsthand experience with the healthcare staffing industry — and a refusal to accept paperwork as the status quo."
      cta={<RoleTriCta />}
    >
      <section>
        <InfoSectionHeading>The beginning</InfoSectionHeading>
        <InfoParagraph>
          MyZipVault was born from firsthand experience with the broken healthcare compliance process. We watched talented nurses spend more time on paperwork than patient care. We saw agencies lose placements because compliance packets took too long. We saw independent recruiters get squeezed out by agency overhead, and we saw employers pay inflated fees for a process that should have been solved a decade ago.
        </InfoParagraph>
        <InfoParagraph>
          We decided there had to be a better way — one that respects the professional, protects their data, streamlines the process for everyone involved, and gives independent recruiters a real playing field instead of a corporate moat. Today, MyZipVault is building that future.
        </InfoParagraph>
      </section>

      <section>
        <InfoSectionHeading>The problem we solve</InfoSectionHeading>
        <InfoParagraph>
          The healthcare staffing industry relies on a compliance process that has not evolved in decades. Nurses fill out the same Med-Surg skills checklist for every agency. Social Security numbers and immunization records sit unencrypted in recruiter inboxes. References are collected via word-of-mouth phone calls with no verification. Meanwhile, staffing agencies spend thousands of hours and dollars chasing the same documents over and over.
        </InfoParagraph>
        <InfoParagraph>
          Independent recruiters — the people who actually source candidates — are forced to work for agencies because they have no way to compete on their own. Employers pay premium fees with no visibility into the commission split. Candidates have zero leverage over their own data once it has been shared. MyZipVault automates and secures this entire process — for all three sides.
        </InfoParagraph>
      </section>

      <section>
        <InfoSectionHeading>Our principles</InfoSectionHeading>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div className="bg-white border border-border rounded-2xl p-6 flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary-light">
              <Lock className="size-5 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
              Candidate control
            </h3>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Your data, your rules. No recruiter can browse your profile. You decide what to share, with whom, and for how long.
            </p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-6 flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary-light">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
              Security first
            </h3>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              HIPAA-aligned encryption, expiring access links, and zero data hoarding. When you delete your account, everything is gone.
            </p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-6 flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary-light">
              <Users className="size-5 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
              Mutual benefit
            </h3>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Nurses save hours of repetitive work. Recruiters keep 70% of fees. Employers get direct access. Everyone wins except the middleman markup.
            </p>
          </div>
        </div>
      </section>

      <section>
        <InfoSectionHeading>What drives us</InfoSectionHeading>
        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3">
            <Target className="size-5 mt-0.5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Mission</p>
              <p className="text-sm text-text-secondary leading-relaxed mt-1">
                Give healthcare professionals full control over their career data, give independent recruiters a fair playing field, and give employers direct access to vetted talent — all on one secure platform.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Heart className="size-5 mt-0.5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Heart</p>
              <p className="text-sm text-text-secondary leading-relaxed mt-1">
                Healthcare professionals keep our healthcare system running. They deserve better than scattered spreadsheets, endless email threads, and repetitive paperwork every time they take a new assignment.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Lightbulb className="size-5 mt-0.5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Insight</p>
              <p className="text-sm text-text-secondary leading-relaxed mt-1">
                Independent recruiters can outperform agencies on every metric except scale. Give them infrastructure — credential vaults, e-signature, candidate pools, ownership protection — and they win.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <InfoSectionHeading>Intellectual property</InfoSectionHeading>
        <InfoParagraph>
          MyZipVault&apos;s marketplace flow — credit-gated reveals, first-submission-wins, ownership windows with residual royalties — is patent pending (USPTO #64/048,063). We are building a category, not a feature.
        </InfoParagraph>
      </section>

      <section>
        <InfoSectionHeading>Get in touch</InfoSectionHeading>
        <InfoParagraph>
          We are always happy to hear from healthcare professionals, recruiters, employers, and anyone interested in making healthcare compliance better. Reach us at{" "}
          <Link href="/contact" className="font-semibold text-primary hover:underline">
            /contact
          </Link>{" "}
          or visit our{" "}
          <Link href="/about" className="font-semibold text-primary hover:underline">
            About page
          </Link>{" "}
          for a quick overview.
        </InfoParagraph>
      </section>
    </InfoPageShell>
  );
}

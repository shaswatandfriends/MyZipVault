import Link from "next/link";
import { InfoPageShell, InfoSectionHeading, InfoParagraph } from "@/components/layout/info-page-shell";
import { Mail, Phone, MessageSquare, Clock, Building2 } from "@/lib/icons";

export const metadata = {
  title: "Contact — MyZipVault",
  description: "Get in touch with MyZipVault. Email, phone, and platform support for healthcare professionals, recruiters, and employers.",
};

export default function ContactPage() {
  return (
    <InfoPageShell
      eyebrow="Contact"
      title="Let's talk."
      subtitle="Whether you're a candidate with a question, a recruiter looking to onboard, or an employer exploring the marketplace — we're happy to help."
    >
      <section>
        <InfoSectionHeading>Email</InfoSectionHeading>
        <InfoParagraph>
          For general questions, account issues, or partnership inquiries, email us at{" "}
          <a href="mailto:support@myzipvault.com" className="font-semibold text-primary hover:underline">
            support@myzipvault.com
          </a>
          . We respond within one business day during the work week.
        </InfoParagraph>
      </section>

      <section>
        <InfoSectionHeading>Phone</InfoSectionHeading>
        <InfoParagraph>
          For time-sensitive employer or recruiter onboarding calls, reach us at +1 (555) 123-4567, Monday through Friday, 9 AM to 6 PM Eastern Time.
        </InfoParagraph>
      </section>

      <section>
        <InfoSectionHeading>In-app support</InfoSectionHeading>
        <InfoParagraph>
          Already have an account? The fastest way to get help is to log in and visit the{" "}
          <Link href="/support" className="font-semibold text-primary hover:underline">
            Support page
          </Link>{" "}
          — every role (candidate, recruiter, employer, superadmin) has a dedicated support panel that links to FAQ categories, account tools, and a direct escalation form.
        </InfoParagraph>
      </section>

      <section>
        <InfoSectionHeading>Channels</InfoSectionHeading>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary-light">
                <Mail className="size-4 text-primary" />
              </div>
              <p className="font-semibold text-foreground">General inquiries</p>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Product questions, feature requests, or general feedback — email is the best channel.
            </p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary-light">
                <Building2 className="size-4 text-primary" />
              </div>
              <p className="font-semibold text-foreground">Employer onboarding</p>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Setting up a company profile, BAA, or large-volume job posting? Use the phone line above.
            </p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary-light">
                <MessageSquare className="size-4 text-primary" />
              </div>
              <p className="font-semibold text-foreground">Bug reports</p>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Found a bug? Use the in-app error reporter or email a screenshot and reproduction steps.
            </p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary-light">
                <Clock className="size-4 text-primary" />
              </div>
              <p className="font-semibold text-foreground">Hours</p>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Monday–Friday, 9 AM–6 PM ET. Weekend support is email-only with a 24-hour response target.
            </p>
          </div>
        </div>
      </section>

      <section>
        <InfoSectionHeading>Platform</InfoSectionHeading>
        <InfoParagraph>
          The platform is live at{" "}
          <Link href="/" className="font-semibold text-primary hover:underline">
            myzipvault.com
          </Link>
          . You can sign up as a{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">candidate</Link>,{" "}
          <Link href="/agency-signup" className="font-semibold text-primary hover:underline">recruiter</Link>, or{" "}
          <Link href="/employer-signup" className="font-semibold text-primary hover:underline">employer</Link>{" "}
          directly from the homepage — no sales call required.
        </InfoParagraph>
      </section>

      <section>
        <InfoSectionHeading>Press</InfoSectionHeading>
        <InfoParagraph>
          For press, investor, or partnership inquiries, email{" "}
          <a href="mailto:press@myzipvault.com" className="font-semibold text-primary hover:underline">
            press@myzipvault.com
          </a>
          .
        </InfoParagraph>
      </section>
    </InfoPageShell>
  );
}

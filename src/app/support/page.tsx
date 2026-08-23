import Link from "next/link";
import { InfoPageShell, InfoSectionHeading, InfoParagraph } from "@/components/layout/info-page-shell";
import { Mail, MessageSquare, FileText, Bell, ShieldCheck, Lock, AlertCircle } from "@/lib/icons";

export const metadata = {
  title: "Support — MyZipVault",
  description: "Get help with MyZipVault: in-app tools, FAQ categories, escalation forms, and direct support contacts for candidates, recruiters, and employers.",
};

export default function SupportPage() {
  return (
    <InfoPageShell
      eyebrow="Support"
      title="We're here to help."
      subtitle="Start with the FAQ, escalate via the in-app error reporter, or email us directly. Every role has dedicated support tools inside the platform."
    >
      {/* Quick links */}
      <section>
        <InfoSectionHeading>Quick links</InfoSectionHeading>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link href="/faq" className="block bg-white border border-border rounded-2xl p-5 hover:border-primary hover:bg-surface transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary-light">
                <FileText className="size-4 text-primary" />
              </div>
              <p className="font-semibold text-foreground">FAQ</p>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Full Q&amp;A across 8 categories — general, employers, VaultSign, marketplace, credits, checklists, privacy, jobs.
            </p>
          </Link>
          <a href="mailto:support@myzipvault.com" className="block bg-white border border-border rounded-2xl p-5 hover:border-primary hover:bg-surface transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary-light">
                <Mail className="size-4 text-primary" />
              </div>
              <p className="font-semibold text-foreground">Email support</p>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              support@myzipvault.com — typically responds within one business day during the work week.
            </p>
          </a>
          <Link href="/contact" className="block bg-white border border-border rounded-2xl p-5 hover:border-primary hover:bg-surface transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary-light">
                <MessageSquare className="size-4 text-primary" />
              </div>
              <p className="font-semibold text-foreground">Contact page</p>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              All our channels in one place — general inquiries, employer onboarding, bug reports, press.
            </p>
          </Link>
          <Link href="/privacy" className="block bg-white border border-border rounded-2xl p-5 hover:border-primary hover:bg-surface transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary-light">
                <Lock className="size-4 text-primary" />
              </div>
              <p className="font-semibold text-foreground">Privacy &amp; security</p>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              How we handle your data — encryption at rest, expiring shares, full audit trails, account deletion.
            </p>
          </Link>
        </div>
      </section>

      {/* In-app tools */}
      <section>
        <InfoSectionHeading>In-app support tools</InfoSectionHeading>
        <div className="mt-6 space-y-3">
          {[
            { icon: AlertCircle, label: "Error reporter", desc: "Every dashboard has an error reporter that captures the current page, user role, and a screenshot — automatically attached to your support ticket." },
            { icon: Bell, label: "Notifications panel", desc: "Real-time alerts for account issues, expiring credentials, pending approvals, and submission status changes." },
            { icon: ShieldCheck, label: "Audit log", desc: "Superadmin and recruiter accounts have a full audit log showing every action taken on their account." },
          ].map((tool) => (
            <div key={tool.label} className="bg-white border border-border rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary-light flex-shrink-0">
                  <tool.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{tool.label}</p>
                  <p className="text-sm text-text-secondary leading-relaxed mt-1">{tool.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Common issues */}
      <section>
        <InfoSectionHeading>Common issues &amp; fixes</InfoSectionHeading>
        <div className="mt-6 space-y-3">
          {[
            { q: "Can't log in after signing up", a: "Check your email for a verification link. The link expires after 24 hours — request a new one via /verify-email." },
            { q: "Recruiter account pending approval", a: "New recruiter accounts require superadmin approval (1-2 business days). You'll get an email once approved." },
            { q: "Credits not appearing after purchase", a: "Stripe purchases typically post instantly. If credits are missing after 5 minutes, refresh the page — if still missing, email support with the Stripe receipt." },
            { q: "Submitted candidate was rejected", a: "First-submission-wins is enforced by the database timestamp. If another recruiter submitted milliseconds earlier, your credit is auto-refunded." },
            { q: "VaultSign document won't load", a: "VaultSign works best on Chrome/Safari/Firefox. Try a hard refresh (Ctrl+Shift+R). If still broken, use the error reporter in your dashboard." },
            { q: "Want to delete my account", a: "Account deletion is available in Settings → Account → Delete. All recruiter access is killed instantly, and your data is purged per the privacy policy." },
          ].map((item, i) => (
            <div key={i} className="bg-white border border-border rounded-2xl p-5">
              <p className="font-semibold text-foreground">{item.q}</p>
              <p className="text-sm text-text-secondary leading-relaxed mt-1">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Escalation */}
      <section>
        <InfoSectionHeading>Escalations</InfoSectionHeading>
        <InfoParagraph>
          For urgent issues — locked out of account, suspected data breach, formal complaint about a recruiter or employer — email{" "}
          <a href="mailto:urgent@myzipvault.com" className="font-semibold text-primary hover:underline">
            urgent@myzipvault.com
          </a>
          . The urgent queue is monitored during business hours and prioritizes security and account access issues.
        </InfoParagraph>
      </section>

      {/* Hours */}
      <section>
        <InfoSectionHeading>Hours</InfoSectionHeading>
        <InfoParagraph>
          Monday–Friday, 9 AM–6 PM ET. Weekend support is email-only with a 24-hour response target. Critical security issues are monitored 24/7 via the urgent queue.
        </InfoParagraph>
      </section>
    </InfoPageShell>
  );
}

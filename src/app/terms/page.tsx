import Link from "next/link";
import { ArrowLeft } from "@/lib/icons";

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              ZV
            </div>
            <span
              className="font-semibold text-lg text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              MyZipVault
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1
          className="text-[36px] font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Satoshi', sans-serif" }}
        >
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-text-muted">Last updated: June 2025</p>

        <div className="mt-10 space-y-10">
          {/* 1. Acceptance of Terms */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              1. Acceptance of Terms
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              By accessing or using the MyZipVault platform at myzipvault.com, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the platform. These Terms apply to all users, including healthcare professionals, staffing agencies, recruiters, and administrators. We reserve the right to update these Terms at any time, and your continued use after changes are posted constitutes acceptance of the revised Terms.
            </p>
          </section>

          {/* 2. Description of Service */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              2. Description of Service
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              MyZipVault is a secure, candidate-controlled credential management platform for healthcare professionals. The service allows healthcare professionals to store, manage, and share their credentials, skills checklists, references, and professional documents with staffing agencies and recruiters on their own terms. For staffing agencies, the platform provides tools to request, track, and verify candidate compliance documents in real time. MyZipVault is not a job board, staffing agency, or healthcare provider. We do not make hiring, placement, or clinical decisions.
            </p>
          </section>

          {/* 3. Account Registration */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              3. Account Registration
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              To use MyZipVault, you must create an account and provide accurate, complete information. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must be at least 18 years old to create an account. Staffing agency accounts require approval by MyZipVault before gaining access to platform features. We reserve the right to suspend or terminate accounts that provide false information or violate these Terms.
            </p>
          </section>

          {/* 4. User Responsibilities */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              4. User Responsibilities
            </h2>

            <h3 className="mt-6 text-[16px] font-semibold text-foreground">
              4.1 For Healthcare Professionals (Candidates)
            </h3>
            <ul className="mt-3 list-disc pl-6 space-y-2 text-[16px] leading-relaxed text-text-secondary">
              <li>You are solely responsible for the accuracy and truthfulness of all information you upload, including credentials, skills assessments, and work history.</li>
              <li>You must not upload falsified, forged, or misleading documents.</li>
              <li>You control all sharing of your vault data. You grant and revoke access at your discretion.</li>
              <li>You are responsible for keeping your credentials current and updating expiration dates.</li>
            </ul>

            <h3 className="mt-6 text-[16px] font-semibold text-foreground">
              4.2 For Staffing Agencies and Recruiters
            </h3>
            <ul className="mt-3 list-disc pl-6 space-y-2 text-[16px] leading-relaxed text-text-secondary">
              <li>You may only request access to candidate data through the platform&apos;s built-in request system.</li>
              <li>You may not copy, screenshot, redistribute, or retain candidate data beyond the access period granted by the candidate.</li>
              <li>You must not use the platform to solicit candidates for purposes other than legitimate staffing inquiries.</li>
              <li>You are responsible for maintaining the confidentiality of all candidate data you access through the platform.</li>
            </ul>
          </section>

          {/* 5. Data Ownership and Control */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              5. Data Ownership and Control
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              You retain full ownership of all data you upload to MyZipVault. MyZipVault does not claim any ownership rights over your credentials, checklists, references, or professional documents. When you share data with a recruiter or agency, you grant them a limited, temporary, revocable license to view that data for the duration you specify. Upon expiration or revocation of access, the recipient&apos;s ability to view your data is terminated. MyZipVault does not sell your data to third parties.
            </p>
          </section>

          {/* 6. Acceptable Use */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              6. Acceptable Use
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              You agree not to:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2 text-[16px] leading-relaxed text-text-secondary">
              <li>Use the platform for any unlawful purpose or in violation of any applicable laws or regulations.</li>
              <li>Upload viruses, malware, or any code designed to disrupt the platform.</li>
              <li>Attempt to gain unauthorized access to other users&apos; accounts or data.</li>
              <li>Use automated tools (bots, scrapers) to extract data from the platform without written permission.</li>
              <li>Impersonate another person or entity, or misrepresent your qualifications or affiliation.</li>
              <li>Share your account credentials with others or allow others to access your account.</li>
              <li>Use the platform to harass, threaten, or discriminate against any individual or group.</li>
            </ul>
          </section>

          {/* 7. Payment and Credits */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              7. Payment and Credits
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              MyZipVault is free for healthcare professionals. Staffing agencies and recruiters may purchase credits to unlock additional candidate documents beyond those included in a standard request. Credits are non-refundable and expire 12 months from the date of purchase. Pricing and credit packages are subject to change with 30 days&apos; notice. We reserve the right to modify pricing and credit structures at our discretion.
            </p>
          </section>

          {/* 8. Intellectual Property */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              8. Intellectual Property
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              The MyZipVault platform, including its design, software, logos, trademarks, and content (excluding user-uploaded data), is the property of MyZipVault, Inc. and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works from the platform without our written consent. User-uploaded content remains the property of the respective users.
            </p>
          </section>

          {/* 9. Disclaimers */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              9. Disclaimers
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              MYZIPVAULT IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY USER-UPLOADED CONTENT.
            </p>
          </section>

          {/* 10. Limitation of Liability */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              10. Limitation of Liability
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MYZIPVAULT, INC. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
          </section>

          {/* 11. Indemnification */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              11. Indemnification
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              You agree to indemnify and hold harmless MyZipVault, Inc., its officers, directors, employees, and agents from any claims, liabilities, damages, losses, or expenses (including reasonable attorney fees) arising out of or related to your use of the platform, your violation of these Terms, or your violation of any rights of another party.
            </p>
          </section>

          {/* 12. Termination */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              12. Termination
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              You may terminate your account at any time by deleting it through the platform settings. Upon termination, your data will be deleted in accordance with our Privacy Policy. We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or pose a security risk, with or without notice. Sections 9, 10, and 11 shall survive termination.
            </p>
          </section>

          {/* 13. Governing Law */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              13. Governing Law
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the platform shall be resolved in the state or federal courts located in Delaware.
            </p>
          </section>

          {/* 14. Contact */}
          <section>
            <h2
              className="text-[24px] font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              14. Contact
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
              For questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-[16px] text-text-secondary">
                <strong className="text-foreground">Email:</strong> support@myzipvault.com
              </p>
              <p className="text-[16px] text-text-secondary">
                <strong className="text-foreground">Platform:</strong> myzipvault.com
              </p>
            </div>
          </section>
        </div>

        {/* Back Link */}
        <div className="mt-16 border-t border-border pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-accent-teal text-sm font-medium hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to MyZipVault
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto">
        <div className="border-t border-border bg-white py-6 px-6">
          <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">
              &copy; 2025 MyZipVault. All rights reserved.
            </p>
            <nav className="flex items-center gap-4 text-sm text-text-secondary">
              <Link href="/about" className="hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

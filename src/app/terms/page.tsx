import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              ZV
            </div>
            <span className="font-semibold text-lg">MyZipVault</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: June 2025</p>

        <div className="mt-8 space-y-8 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="mt-3">
              By accessing or using the MyZipVault platform at myzipvault.com, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the platform. These Terms apply to all users, including healthcare professionals, staffing agencies, recruiters, and administrators. We reserve the right to update these Terms at any time, and your continued use after changes are posted constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p className="mt-3">
              MyZipVault is a secure, candidate-controlled credential management platform for healthcare professionals. The service allows healthcare professionals to store, manage, and share their credentials, skills checklists, references, and professional documents with staffing agencies and recruiters on their own terms. For staffing agencies, the platform provides tools to request, track, and verify candidate compliance documents in real time. MyZipVault is not a job board, staffing agency, or healthcare provider. We do not make hiring, placement, or clinical decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Account Registration</h2>
            <p className="mt-3">
              To use MyZipVault, you must create an account and provide accurate, complete information. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must be at least 18 years old to create an account. Staffing agency accounts require approval by MyZipVault before gaining access to platform features. We reserve the right to suspend or terminate accounts that provide false information or violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. User Responsibilities</h2>
            <h3 className="mt-4 font-medium text-foreground">4.1 For Healthcare Professionals (Candidates)</h3>
            <ul className="mt-2 list-disc pl-6 space-y-2">
              <li>You are solely responsible for the accuracy and truthfulness of all information you upload, including credentials, skills assessments, and work history.</li>
              <li>You must not upload falsified, forged, or misleading documents.</li>
              <li>You control all sharing of your vault data. You grant and revoke access at your discretion.</li>
              <li>You are responsible for keeping your credentials current and updating expiration dates.</li>
            </ul>
            <h3 className="mt-4 font-medium text-foreground">4.2 For Staffing Agencies and Recruiters</h3>
            <ul className="mt-2 list-disc pl-6 space-y-2">
              <li>You may only request access to candidate data through the platform&apos;s built-in request system.</li>
              <li>You may not copy, screenshot, redistribute, or retain candidate data beyond the access period granted by the candidate.</li>
              <li>You must not use the platform to solicit candidates for purposes other than legitimate staffing inquiries.</li>
              <li>You are responsible for maintaining the confidentiality of all candidate data you access through the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Data Ownership and Control</h2>
            <p className="mt-3">
              You retain full ownership of all data you upload to MyZipVault. MyZipVault does not claim any ownership rights over your credentials, checklists, references, or professional documents. When you share data with a recruiter or agency, you grant them a limited, temporary, revocable license to view that data for the duration you specify. Upon expiration or revocation of access, the recipient&apos;s ability to view your data is terminated. MyZipVault does not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Acceptable Use</h2>
            <p className="mt-3">You agree not to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-2">
              <li>Use the platform for any unlawful purpose or in violation of any applicable laws or regulations.</li>
              <li>Upload viruses, malware, or any code designed to disrupt the platform.</li>
              <li>Attempt to gain unauthorized access to other users&apos; accounts or data.</li>
              <li>Use automated tools (bots, scrapers) to extract data from the platform without written permission.</li>
              <li>Impersonate another person or entity, or misrepresent your qualifications or affiliation.</li>
              <li>Share your account credentials with others or allow others to access your account.</li>
              <li>Use the platform to harass, threaten, or discriminate against any individual or group.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Payment and Credits</h2>
            <p className="mt-3">
              MyZipVault is free for healthcare professionals. Staffing agencies and recruiters may purchase credits to unlock additional candidate documents beyond those included in a standard request. Credits are non-refundable and expire 12 months from the date of purchase. Pricing and credit packages are subject to change with 30 days&apos; notice. We reserve the right to modify pricing and credit structures at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Intellectual Property</h2>
            <p className="mt-3">
              The MyZipVault platform, including its design, software, logos, trademarks, and content (excluding user-uploaded data), is the property of MyZipVault, Inc. and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works from the platform without our written consent. User-uploaded content remains the property of the respective users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Disclaimers</h2>
            <p className="mt-3">
              MYZIPVAULT IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR RELIABILITY OF ANY USER-UPLOADED CONTENT.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Limitation of Liability</h2>
            <p className="mt-3">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MYZIPVAULT, INC. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Indemnification</h2>
            <p className="mt-3">
              You agree to indemnify and hold harmless MyZipVault, Inc., its officers, directors, employees, and agents from any claims, liabilities, damages, losses, or expenses (including reasonable attorney fees) arising out of or related to your use of the platform, your violation of these Terms, or your violation of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">12. Termination</h2>
            <p className="mt-3">
              You may terminate your account at any time by deleting it through the platform settings. Upon termination, your data will be deleted in accordance with our Privacy Policy. We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or pose a security risk, with or without notice. Sections 9, 10, and 11 shall survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">13. Governing Law</h2>
            <p className="mt-3">
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the platform shall be resolved in the state or federal courts located in Delaware.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">14. Contact</h2>
            <p className="mt-3">
              For questions about these Terms of Service, please contact us at:
            </p>
            <ul className="mt-2 list-none space-y-1">
              <li><strong>Email:</strong> support@myzipvault.com</li>
              <li><strong>Platform:</strong> myzipvault.com</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 border-t pt-6">
          <Link href="/" className="text-primary hover:underline">
            &larr; Back to MyZipVault
          </Link>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";

export default function PrivacyPolicy() {
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
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: June 2025</p>

        <div className="mt-8 space-y-8 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p className="mt-3">
              MyZipVault, Inc. (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the MyZipVault platform at myzipvault.com. We are committed to protecting the privacy and security of healthcare professionals, staffing agencies, and all users of our service. This Privacy Policy describes how we collect, use, disclose, and safeguard your information when you use our platform. By using MyZipVault, you agree to the practices described in this policy. If you do not agree, please discontinue use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
            <h3 className="mt-4 font-medium text-foreground">2.1 Information You Provide</h3>
            <ul className="mt-2 list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, phone number, and password when you create an account.</li>
              <li><strong>Professional Credentials:</strong> Licenses, certifications (BLS, ACLS, RN, etc.), immunization records, and expiration dates that you choose to upload to your vault.</li>
              <li><strong>Skills Checklists:</strong> Self-assessed competency ratings on industry-standard skills checklists.</li>
              <li><strong>Resume and Work History:</strong> Employment history, education, and professional experience you enter or upload.</li>
              <li><strong>References:</strong> Contact information for professional references and evaluations submitted by those references.</li>
              <li><strong>Organization Information:</strong> For staffing agency accounts — company name, business address, and point of contact details.</li>
            </ul>

            <h3 className="mt-4 font-medium text-foreground">2.2 Information Collected Automatically</h3>
            <ul className="mt-2 list-disc pl-6 space-y-2">
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the platform, and interaction patterns.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers.</li>
              <li><strong>Cookies and Tracking:</strong> Session cookies for authentication and analytics cookies to improve our service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>To provide, maintain, and improve the MyZipVault platform and its features.</li>
              <li>To authenticate your identity and secure your account.</li>
              <li>To process skills checklist submissions, credential uploads, and reference requests.</li>
              <li>To facilitate the sharing of your vault data with recruiters or agencies only when you explicitly grant access.</li>
              <li>To send expiration reminders for certifications and licenses you have opted into tracking.</li>
              <li>To communicate important updates about your account, security alerts, and platform changes.</li>
              <li>To detect, investigate, and prevent fraudulent or unauthorized activity.</li>
              <li>To comply with legal obligations and enforce our terms of service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. How We Share Your Information</h2>
            <h3 className="mt-4 font-medium text-foreground">4.1 Sharing With Your Consent</h3>
            <p className="mt-2">
              The core principle of MyZipVault is candidate control. Your vault data — including skills checklists, credentials, references, and resume — is never shared with recruiters, agencies, or any third party without your explicit, affirmative consent. When you grant access, you set the duration (7, 14, or 30 days), and access automatically expires. You may revoke access at any time.
            </p>
            <h3 className="mt-4 font-medium text-foreground">4.2 Service Providers</h3>
            <p className="mt-2">
              We use third-party service providers who assist in operating our platform, including cloud hosting (Supabase), email delivery, and analytics. These providers are contractually obligated to process data only as instructed by us and maintain appropriate security measures.
            </p>
            <h3 className="mt-4 font-medium text-foreground">4.3 Legal Requirements</h3>
            <p className="mt-2">
              We may disclose information if required by law, subpoena, court order, or governmental regulation, or if we believe in good faith that disclosure is necessary to protect our rights, your safety, or the safety of others, or to investigate fraud or security issues.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Data Security</h2>
            <p className="mt-3">
              We implement industry-standard security measures to protect your information, including encryption of data in transit (TLS 1.2+) and at rest (AES-256), role-based access controls, regular security assessments, and monitoring for unauthorized access. While we strive to use commercially acceptable means to protect your data, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. HIPAA Alignment</h2>
            <p className="mt-3">
              MyZipVault is designed with HIPAA-aligned security practices. While we are not a covered entity or business associate under HIPAA, we voluntarily implement safeguards consistent with HIPAA Security Rule requirements, including administrative, physical, and technical safeguards. We do not make treatment, payment, or healthcare operations decisions. Users are responsible for ensuring their use of MyZipVault complies with their organization&apos;s HIPAA policies. This policy does not constitute a HIPAA Business Associate Agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Data Retention and Deletion</h2>
            <p className="mt-3">
              You retain ownership of all data you upload to your vault. You may delete individual items or your entire account at any time. Upon account deletion, all recruiter and agency access to your data is immediately revoked, and your data is permanently deleted from our active systems within 30 days. Backup copies may persist for up to 90 days for disaster recovery purposes, after which they are purged.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Your Rights</h2>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> You can view and download all data in your vault at any time.</li>
              <li><strong>Correction:</strong> You can update or correct your information at any time.</li>
              <li><strong>Deletion:</strong> You can delete your account and all associated data.</li>
              <li><strong>Revocation:</strong> You can revoke access to any shared data at any time.</li>
              <li><strong>Portability:</strong> You can export your data in a standard format.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Children&apos;s Privacy</h2>
            <p className="mt-3">
              MyZipVault is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 18, we will take steps to delete that information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Changes to This Policy</h2>
            <p className="mt-3">
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on our website and, where appropriate, by sending you an email notification. Your continued use of the platform after changes become effective constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Contact Us</h2>
            <p className="mt-3">
              If you have questions about this Privacy Policy or our data practices, please contact us at:
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

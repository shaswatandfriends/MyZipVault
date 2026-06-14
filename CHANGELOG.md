# MyZipVault Changelog

All notable changes to MyZipVault will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
with the scheme: `vMAJOR.MINOR.PATCH` (e.g., `v00.01.00`).

---

## [v00.01.00] — 2026-06-14

### Added
- Initial MyZipVault dev release — Healthcare Credential Verification SaaS
- Candidate portal: Dashboard, Checklists, Calendar, VaultSign, Credentials, Resume, References, Sharing, Settings
- Recruiter portal: Dashboard, Calendar, Send Request, VaultSign, Billing, BAA, Team
- Platform Admin portal: Dashboard, Users, Documents, Content, Reminders
- Super Admin portal: Dashboard, Admins, VaultSign, References, Skills Checklist, Templates, Announcements, Settings, API Vault, Feature Flags, Landing Page Editor, Analytics, Compliance, Audit Logs, Errors, Reminders
- VaultSign: Document signing workflow with PDF generation, signature capture, header/footer overlay, template management
- Authentication: NextAuth with role-based access (candidate, client_recruiter, client_admin, platform_admin, super_admin)
- Supabase integration: PostgreSQL database, file storage, connection pooling
- Stripe integration: Payment and billing infrastructure
- Brevo integration: Transactional email
- Affinda integration: Resume parsing
- Twilio integration: SMS notifications
- Landing page with superadmin-editable content
- Reference request and response workflow
- Skills checklist system
- Unified sidebar navigation with role-based menus
- Notification system (candidate + recruiter)
- Credit low popup for recruiter roles
- Proxy mode banner for demo/testing

### Changed
- VaultSign header/footer: Replaced 7 individual toggles with one combined toggle
- VaultSign: Split templates into "Shared" and "Platform" sections
- VaultSign: PDF generation pipeline uses PdfPrinter (non-singleton) for reliability

### Fixed
- VaultSign PDF download for 2nd party signers
- VaultSign sign field markers rendering
- VaultSign "Send for Signature" button functionality
- Header/footer config schema for PDF generation
- Signatures not visible in downloaded signed PDFs
- 5 critical VaultSign bugs (signing workflow, document generation, signature capture)

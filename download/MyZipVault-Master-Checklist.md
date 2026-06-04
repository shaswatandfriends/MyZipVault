# MyZipVault - Master Implementation Checklist

## PHASE 0: FOUNDATION

### Database (Prisma + Supabase)
- [x] Create organizations table
- [x] Create users table
- [x] Create admin_permissions table
- [x] Create candidate_profiles table
- [x] Create checklist_templates table
- [x] Create skills table
- [x] Create checklist_requests table
- [x] Create candidate_checklist_responses table
- [x] Create skill_ratings table
- [x] Create credentials table
- [x] Create resumes table
- [x] Create candidate_references table
- [x] Create reference_questions table
- [x] Create reference_responses table
- [x] Create consent_shares table
- [x] Create unlocked_documents table
- [x] Create credit_transactions table
- [x] Create invoices table
- [x] Create notifications table
- [x] Create pending_reminders table
- [x] Create platform_settings table
- [x] Create feature_flags table
- [x] Create email_templates table
- [x] Create announcements table
- [x] Create document_flags table
- [x] Create system_error_logs table
- [x] Create audit_logs table
- [x] Create automated_rules table
- [ ] Enable RLS on all tables

### Seed Data
- [x] Seed platform_settings (checklist_validity_days, share_expiry_options, credit_cost_per_document, baa_required, sms_enabled)
- [x] Seed feature_flags (sms_notifications, resume_builder, reference_engine, credit_upsell, document_verification_queue)
- [ ] Seed email_templates — candidate_invite ✅, existing_candidate_checklist ✅, manager_invite ❌, reference_reminder ✅, credential_expiry ✅, password_reset ✅, credential_rejected ❌, low_credit_alert ❌, baa_expiry ❌, account_suspension_confirmation ❌
- [x] Seed automated_rules (reference_reminder_3_day, credential_expiry_30_day)
- [x] Seed reference_questions (current, ending_contract, past)

### Auth (NextAuth — originally spec said Clerk, implemented with NextAuth)
- [x] Configure auth with 5 roles (super_admin, platform_admin, client_admin, client_recruiter, candidate)
- [x] Set up role-based route protection (middleware.ts)

### Storage (Supabase)
- [x] Create private bucket for credential_files
- [x] Create private bucket for resume_files
- [x] Create private bucket for baa_documents
- [ ] Create private bucket for invoice_pdfs
- [x] Implement pre-signed URL generation (storage.ts + api/storage/signed-url)
- [ ] Pre-signed URL 15-min expiry (needs verification)

### Backend (Next.js API Routes — originally spec said NestJS on Railway)
- [x] Set up project structure (Next.js API routes instead of NestJS)
- [x] Configure environment variables (no keys in frontend)
- [x] Implement encrypted platform_settings table for API keys (api-vault with AES-256)

### Frontend (Next.js 14 on Vercel)
- [x] Create public routes (/, /login, /signup, /onboard)
- [x] Create candidate routes (/dashboard, /checklists, /vault/credentials, /vault/resume, /references, /sharing, /settings)
- [x] Create recruiter routes (/recruiter/dashboard, /recruiter/send, /recruiter/candidates/[id], /recruiter/billing, /recruiter/baa, /recruiter/team)
- [x] Create platform admin routes (/admin, /admin/dashboard, /admin/users, /admin/documents, /admin/content, /admin/reminders)
- [x] Create super admin routes (/superadmin, /superadmin/dashboard, /superadmin/users, /superadmin/companies, /superadmin/admins, /superadmin/settings, /superadmin/api-vault, /superadmin/templates, /superadmin/analytics, /superadmin/announcements, /superadmin/compliance, /superadmin/errors, /superadmin/reminders)

---

## PHASE 1: CORE CANDIDATE FLOW

### Onboarding
- [x] Invite onboarding page (/onboard with token)
- [x] Organic signup page (/signup)
- [x] Existing candidate detection logic (recruiter/send-request checks existing email)
- [x] Password hashing with bcrypt (cost factor 10 — spec says 12)
- [ ] Update bcrypt cost factor from 10 to 12
- [x] T&C acceptance tracking (tos_accepted_at field exists)

### Candidate Dashboard
- [x] Dashboard UI with notification banner
- [x] Profile completion bar (0-100%)
- [x] Pending checklist notification
- [x] Empty state for new users

### Checklist Templates (Admin)
- [x] Create checklist template form
- [x] Edit checklist template
- [x] Delete checklist template
- [x] Add skill to template
- [x] Edit skill
- [x] Delete skill
- [x] Drag-drop reorder skills (@dnd-kit installed)
- [x] Category grouping for skills
- [x] Question type selector (rating_1_5/yes_no/text)
- [x] N/A option toggle (has_na_option)

### Checklist Completion (Candidate)
- [x] Checklist display page
- [x] Group skills by category
- [x] Rating 1-5 buttons (1,2,3,4,5)
- [x] Yes/No buttons
- [x] Text input for text type
- [x] N/A checkbox with input disable logic
- [x] Progress bar (updates as candidate answers)
- [x] Auto-save each rating to skill_ratings
- [x] Attestation text display
- [x] Signature field (full legal name)
- [x] Date field (auto-filled)
- [x] Submit button with validation
- [ ] Checklist reuse logic (check existing active response before creating new one) — NOT implemented in send-request

### Thank You Page
- [x] Version 1: profile_completion_pct < 25%
- [x] Version 2: profile_completion_pct 25-99%
- [x] Version 3: profile_completion_pct = 100%

### Credentials Vault
- [x] Upload credential (file, document_name, expiration_date, reminder_enabled)
- [x] Display credentials list
- [x] verification_status = pending_review by default
- [x] Status badges (active/expiring_soon/expired)
- [x] Reminder toggle

### Profile Completion Calculation
- [x] Resume uploaded: +25%
- [x] At least one verified credential: +25%
- [x] Active checklist response: +25%
- [x] Completed reference: +25%
- [x] Recalculate on any change

### Notifications
- [x] Notifications table integration
- [x] Unread badge on dashboard
- [x] In-app notification delivery

---

## PHASE 2: CORE RECRUITER FLOW

### Recruiter Dashboard
- [x] Recruiter login
- [x] Dashboard with recent activity
- [x] Credit balance display

### Send Request
- [x] Candidate lookup by email
- [x] New candidate invite logic
- [x] Existing candidate detection
- [x] Checklist template selector
- [x] Document selector (credentials, resume)
- [x] Credit preview modal
- [x] Confirm send with credit deduction
- [x] Insert credit_transactions record

### Candidate Detail Page
- [x] Real-time progress tracking
- [x] Shared documents list
- [x] Locked documents with "Unlock for 1 credit"
- [x] Unlock flow with credit deduction
- [x] Insert unlocked_documents record

### Credit System
- [ ] Stripe credit purchase integration (deferred — user excluded)
- [x] organizations.credits_balance management
- [x] Credit deduction logic
- [x] Credit transaction history

### BAA (Business Associate Agreement)
- [x] BAA required gate (check platform_settings)
- [x] BAA content viewer (scrollable)
- [x] Full legal name input
- [x] Title input
- [x] "I agree" checkbox
- [x] Sign button
- [ ] PDF generation with pdfmake
- [ ] Store PDF in Supabase
- [x] Update organizations.baa_status to signed
- [ ] Save baa_document_url
- [ ] Download Packet

### Download Packet
- [ ] Individual download buttons per document
- [ ] Download All ZIP button
- [ ] Checklist PDF generation (pdfmake)
- [ ] Checklist PDF content: Candidate name, Specialty, Checklist name, Date completed, Skills grouped by category, Attestation text, Candidate signature

---

## PHASE 3: RESUME AND REFERENCES

### Resume
- [x] Resume upload
- [x] Resume Builder feature flag
- [x] Affinda API integration for parsing
- [x] Edit parsed fields
- [x] Add experience manually
- [ ] Export to PDF (stub — "coming soon")
- [x] Store parsed_data as JSON

### Reference Request (Candidate)
- [x] Reference request form
- [x] Manager email and phone
- [x] Facility name
- [x] Employment status (current/ending_contract/past)
- [x] Send request button

### Manager Onboarding
- [x] Manager invite email (via Brevo)
- [x] Manager onboarding flow (/onboard with token)
- [ ] Manager gets free candidate vault

### Reference Completion (Manager)
- [x] Dynamic reference form by employment_status
- [x] Questions from reference_questions table
- [x] Response types (yes_no/rating_1_5/text)
- [x] Overall comment field
- [x] Attestation text
- [x] Digital signature (full legal name)
- [x] Signature date
- [x] Submit button

### Reference Storage
- [x] Store reference_responses
- [x] Update candidate_references.status to completed
- [ ] Reference PDF generation (pdfmake)
- [ ] Reference PDF content: Nurse name, Manager name, Facility, Employment status, Questions/answers, Overall comment, Manager signature, Attestation text, Submission date
- [ ] Store in candidate vault

---

## PHASE 4: SHARING AND CONSENT

### Consent Sharing (Candidate)
- [x] Sharing page
- [x] Select documents to share (checklist, credentials, resume, references)
- [x] Expiry selector (7/14/30 days)
- [x] Generate share link/permission
- [x] Insert consent_shares record

### Recruiter Access
- [x] View shared documents (based on consent_shares)
- [x] View locked documents
- [x] Credit unlock on click
- [x] Check is_deleted flag before granting access

### Account Deletion
- [x] Delete Account button in settings
- [x] Set account_status = suspended_deleting
- [x] Set deletion_requested_at = now
- [x] Immediately set is_deleted = true on all consent_shares
- [ ] Send account_suspension_confirmation email

### Account Restore (30-day grace period)
- [x] Login modal popup for suspended accounts
- [x] "Your account is scheduled for deletion on X" message
- [x] NO button: restore account
- [x] YES button: confirm deletion, log out immediately

### Permanent Deletion (30 days after request)
- [x] Cron job for 30-day purge (api/cron/purge)
- [x] Delete rows from: users, candidate_profiles, credentials, resumes, candidate_checklist_responses, skill_ratings, consent_shares, notifications, candidate_references, reference_responses
- [x] Preserve audit_logs rows

---

## PHASE 5: PLATFORM ADMIN

### Admin Login
- [x] /admin login page
- [x] Email + password authentication

### Admin Dashboard
- [x] Overview statistics
- [x] Recent activity

### Document Verification Queue
- [x] List pending credentials (verification_status = pending_review)
- [ ] Thumbnail preview
- [x] Verify button
- [x] Reject button
- [ ] Send credential_rejected email
- [x] Send notification on verify/reject

### User Management
- [x] Search users
- [x] Filter by role
- [x] Suspend user
- [x] Reset password

### Content Management (Full CRUD)
- [x] Manage professions
- [x] Manage specialties
- [x] Manage checklist templates
- [x] Manage skills
- [x] Manage reference questions

### Reminder Approval Queue
- [x] View pending_reminders with status = awaiting_approval
- [x] Approve individually
- [x] Send All button
- [x] On approve: send email, set status = sent, set actioned_by, actioned_at

---

## PHASE 6: SUPER ADMIN

### Super Admin Login
- [x] /superadmin login page
- [ ] Email + OTP (TOTP, 60-second expiry) — UI exists but uses mock OTP, NOT real TOTP
- [ ] Implement real TOTP with speakeasy/otplib

### Super Admin Dashboard
- [x] Platform overview
- [x] Key metrics

### Company Management
- [x] Create company
- [x] Edit company
- [x] Manage credits
- [x] Manage seat limits
- [x] Update BAA status
- [x] Swap seat emails

### Admin Management
- [x] Create platform admin (requires super admin approval)
- [x] Permission toggles (admin_permissions table)
- [x] Admin approval queue (is_approved = false → true on approval)

### Proxy Login
- [x] "Login As User" button on user records
- [x] Create scoped session
- [x] Persistent red banner: "You are currently viewing as [user email]"
- [x] Log to audit_logs with action = 'admin_proxy_login'
- [x] On Exit: destroy proxy session

### Platform Settings Editor
- [x] Edit platform_settings values
- [x] Encrypted storage for API keys

### API Vault
- [x] Store third-party API keys (encrypted)
- [x] Backend reads from api_keys table at runtime

### Feature Flags
- [x] Toggle features on/off
- [ ] SMS Notifications toggle validation (checks Twilio keys before enabling)

### Email Template Editor
- [x] Edit email_templates subject and body
- [ ] Variable preview ({{candidate_name}}, {{agency_name}}, etc.)

### CSV Export
- [x] Export user data
- [x] PII redaction toggle

### Analytics & Revenue Dashboard
- [x] Credit purchase analytics
- [x] Revenue charts (recharts)
- [x] Compliance Tools
- [x] Purge queue
- [ ] HIPAA data export ZIP

### Invoice Generator
- [ ] PDF generation with pdfmake
- [ ] Invoice content: MyZipVault logo, Agency name, Invoice date, Credit amount, Price per credit, Total, Invoice number
- [ ] Store in Supabase Storage

### System Error Log Viewer
- [x] View system_error_logs
- [x] Filter by severity (info/warning/critical)
- [x] Filter by service

### Reminder Approval Queue (Super Admin)
- [x] Same as platform admin view

---

## PHASE 7: LANDING PAGES

### Candidate View (Default)
- [x] Hero: "Stop Filling Out the Same Checklists. Own Your Career with MyZipVault."
- [x] Subheadline
- [x] CTA: "Create Your Free Vault"
- [x] Trust line
- [x] Problem section
- [x] Feature 1: Complete Once, Reuse for 30 Days
- [x] Feature 2: Never Start From Scratch
- [x] Feature 3: Never Let a Cert Expire Unnoticed
- [x] Feature 4: Build Your Verified Reference Network
- [x] Privacy section
- [x] Final CTA: "Claim Your Free Vault Now"

### Recruiter View
- [x] Toggle at top
- [x] Hero: "Stop Chasing Nurses for Checklists and References."
- [x] Subheadline
- [x] Feature 1: Real-Time Tracking
- [x] Feature 2: Instant Document Access
- [x] Feature 3: Verified References
- [x] Feature 4: HIPAA-Aligned Sharing
- [x] CTA: "Get Started"

### Design Requirements
- [x] Mobile responsive
- [x] Maximum 2 subtle animations
- [x] Clean, restrained design
- [ ] No generic SaaS template look (partially — some pages look template-y)

---

## PHASE 8: NOTIFICATIONS AND AUTOMATION

### Email (Brevo — originally spec said SendGrid)
- [x] Brevo integration (instead of SendGrid)
- [x] candidate_invite email
- [x] existing_candidate_checklist email
- [ ] manager_invite email
- [x] reference_reminder email
- [x] credential_expiry email
- [x] password_reset email
- [ ] credential_rejected email
- [ ] low_credit_alert email
- [ ] baa_expiry email
- [ ] account_suspension_confirmation email

### Cron Jobs
- [x] Daily 8am: Generate pending_reminders from automated_rules (api/cron/reminders)
- [x] Check reference_reminder_3_day
- [x] Check credential_expiry_30_day
- [x] Insert pending_reminders with status = awaiting_approval
- [x] Daily 11pm: Skip unapproved reminders (api/cron/reminders/skip)
- [x] Daily: 30-day account purge (api/cron/purge)
- [x] Daily: Update credential status (api/cron/status-update)
- [x] Daily: Update checklist response status (in status-update cron)

### SMS (Feature-Flagged OFF by default)
- [x] sms_notifications feature flag = false
- [ ] UI shows "Coming Soon" badge where SMS mentioned
- [ ] Super Admin enable requires Twilio keys in API vault
- [x] No Twilio integration until flag enabled (twilio.ts exists but not connected)

### Audit Logging
- [x] Log admin_proxy_login
- [ ] Log admin_viewed_credential
- [ ] Log admin_viewed_resume
- [x] Log admin_approved_document (partial — verify/reject logged in some routes)
- [ ] Log admin_rejected_document
- [ ] Log candidate_shared_document
- [x] Log recruiter_unlocked_document (partial)
- [ ] Log account_suspended
- [ ] Log account_restored
- [ ] Log account_permanently_deleted
- [x] Log baa_signed
- [ ] Log credits_purchased
- [x] Log credits_deducted (partial)

---

## SECURITY RULES (Cross-Cutting)

- [x] No API keys in frontend code
- [x] All secrets in backend environment variables
- [x] Super Admin manages API keys via encrypted platform_settings
- [x] All file URLs are pre-signed (signed-url route exists)
- [ ] Pre-signed URLs 15-min expiry (needs verification)
- [x] No public storage buckets
- [x] All database queries scoped by user identity via consent_shares
- [ ] Passwords hashed with bcrypt (cost factor 12) — currently 10, needs update
- [ ] Super Admin OTP = TOTP (60-second expiry) — currently mock
- [ ] HTTPS only, TLS 1.2 minimum
- [ ] RLS enabled on all tables

---

## SUMMARY

### ✅ COMPLETED: ~180 items
### ❌ PENDING: ~40 items

### Critical Pending Items (Priority Order):
1. **RLS on all Supabase tables** — Security requirement
2. **Real TOTP for superadmin login** — Security requirement (currently mock OTP)
3. **PDF generation** (pdfmake) — Needed for: BAA, invoices, checklists, references
4. **Checklist reuse logic** — Check existing active response before creating new
5. **Missing email templates** — manager_invite, credential_rejected, low_credit_alert, baa_expiry, account_suspension_confirmation
6. **Bcrypt cost factor 10→12** — Security hardening
7. **BAA PDF generation & storage** — Legal requirement
8. **Invoice PDF generation** — Business requirement
9. **Reference PDF generation** — Feature completeness
10. **Resume PDF export** — Feature completeness
11. **Download Packet / ZIP** — Feature completeness
12. **Credential thumbnail preview** — Admin UX
13. **SMS "Coming Soon" badges** — UX polish
14. **HIPAA data export ZIP** — Compliance
15. **Audit logging completeness** — 8+ missing log types
16. **Email template variable preview** — UX improvement
17. **Invoice_pdfs storage bucket** — Storage completeness
18. **Manager gets free candidate vault** — Business logic
19. **Feature flag SMS toggle validation** — Safety check

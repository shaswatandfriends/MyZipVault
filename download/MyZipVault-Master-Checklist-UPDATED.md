# MyZipVault - Master Implementation Checklist (UPDATED)

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
- [ ] Enable RLS on all tables (requires Supabase dashboard or SQL migration)

### Seed Data
- [x] Seed platform_settings
- [x] Seed feature_flags
- [x] Seed email_templates — ALL 10+ templates now seeded (candidate_invite, existing_candidate_checklist, manager_invite, reference_reminder, credential_expiry, password_reset, credential_rejected, low_credit_alert, baa_expiry, account_suspension_confirmation, and more)
- [x] Seed automated_rules (reference_reminder_3_day, credential_expiry_30_day, baa_expiry_reminder)
- [x] Seed reference_questions (current, ending_contract, past)

### Auth (NextAuth)
- [x] Configure auth with 5 roles
- [x] Set up role-based route protection (middleware.ts)

### Storage (Supabase)
- [x] Create private bucket for credential_files
- [x] Create private bucket for resume_files
- [x] Create private bucket for baa_documents
- [x] Create private bucket for invoice_pdfs (auto-created on first upload)
- [x] Implement pre-signed URL generation
- [x] Pre-signed URL 15-min expiry (updated from 1hr to 900s)

### Backend (Next.js API Routes)
- [x] Set up project structure
- [x] Configure environment variables
- [x] Implement encrypted platform_settings table for API keys

### Frontend (Next.js 16 on Vercel)
- [x] Create public routes
- [x] Create candidate routes
- [x] Create recruiter routes
- [x] Create platform admin routes
- [x] Create super admin routes

---

## PHASE 1: CORE CANDIDATE FLOW

### Onboarding
- [x] Invite onboarding page
- [x] Organic signup page
- [x] Existing candidate detection logic
- [x] Password hashing with bcrypt (cost factor 12 — UPDATED from 10)
- [x] T&C acceptance tracking

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
- [x] Drag-drop reorder skills
- [x] Category grouping for skills
- [x] Question type selector
- [x] N/A option toggle

### Checklist Completion (Candidate)
- [x] Checklist display page
- [x] Group skills by category
- [x] Rating 1-5 buttons
- [x] Yes/No buttons
- [x] Text input for text type
- [x] N/A checkbox with input disable logic
- [x] Progress bar
- [x] Auto-save each rating
- [x] Attestation text display
- [x] Signature field
- [x] Date field
- [x] Submit button with validation
- [x] Checklist reuse logic (checks existing active response before creating new)

### Thank You Page
- [x] Version 1, 2, 3 based on profile_completion_pct

### Credentials Vault
- [x] Upload credential
- [x] Display credentials list
- [x] verification_status = pending_review by default
- [x] Status badges
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
- [x] Document selector
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
- [ ] Stripe credit purchase integration (DEFERRED — user excluded)
- [x] organizations.credits_balance management
- [x] Credit deduction logic
- [x] Credit transaction history

### BAA (Business Associate Agreement)
- [x] BAA required gate
- [x] BAA content viewer
- [x] Full legal name input
- [x] Title input
- [x] "I agree" checkbox
- [x] Sign button
- [x] PDF generation with pdfmake
- [x] Store PDF in Supabase
- [x] Update organizations.baa_status to signed
- [x] Save baa_document_url
- [x] Download BAA PDF

### Download Packet
- [x] Individual download buttons per document
- [x] Download All ZIP button
- [x] Checklist PDF generation (pdfmake)
- [x] Checklist PDF content: Candidate name, Specialty, Checklist name, Date completed, Skills grouped by category, Attestation text, Candidate signature
- [x] Reference PDF generation and download
- [x] Credential file download via signed URL
- [x] Resume file download via signed URL

---

## PHASE 3: RESUME AND REFERENCES

### Resume
- [x] Resume upload
- [x] Resume Builder feature flag
- [x] Affinda API integration for parsing
- [x] Edit parsed fields
- [x] Add experience manually
- [x] Export to PDF (functional — uses pdfmake)
- [x] Store parsed_data as JSON

### Reference Request (Candidate)
- [x] Reference request form
- [x] Manager email and phone
- [x] Facility name
- [x] Employment status
- [x] Send request button

### Manager Onboarding
- [x] Manager invite email (via Brevo)
- [x] Manager onboarding flow
- [x] Manager gets free candidate vault (auto-created on reference completion)

### Reference Completion (Manager)
- [x] Dynamic reference form by employment_status
- [x] Questions from reference_questions table
- [x] Response types (yes_no/rating_1_5/text)
- [x] Overall comment field
- [x] Attestation text
- [x] Digital signature
- [x] Signature date
- [x] Submit button

### Reference Storage
- [x] Store reference_responses
- [x] Update candidate_references.status to completed
- [x] Reference PDF generation (pdfmake)
- [x] Reference PDF content: Nurse name, Manager name, Facility, Employment status, Questions/answers, Overall comment, Manager signature, Attestation text, Submission date

---

## PHASE 4: SHARING AND CONSENT

### Consent Sharing (Candidate)
- [x] Sharing page
- [x] Select documents to share
- [x] Expiry selector (7/14/30 days)
- [x] Generate share link/permission
- [x] Insert consent_shares record

### Recruiter Access
- [x] View shared documents
- [x] View locked documents
- [x] Credit unlock on click
- [x] Check is_deleted flag before granting access

### Account Deletion
- [x] Delete Account button in settings
- [x] Set account_status = suspended_deleting
- [x] Set deletion_requested_at = now
- [x] Immediately set is_deleted = true on all consent_shares
- [x] Send account_suspension_confirmation email

### Account Restore (30-day grace period)
- [x] Login modal popup for suspended accounts
- [x] "Your account is scheduled for deletion on X" message
- [x] NO button: restore account
- [x] YES button: confirm deletion, log out immediately

### Permanent Deletion (30 days after request)
- [x] Cron job for 30-day purge
- [x] Delete rows from all related tables
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
- [x] List pending credentials
- [x] Thumbnail preview (with signed URLs, PDF/image detection, preview dialog)
- [x] Verify button
- [x] Reject button
- [x] Send credential_rejected email
- [x] Send notification on verify/reject

### User Management
- [x] Search users
- [x] Filter by role
- [x] Suspend user
- [x] Reset password

### Content Management (Full CRUD)
- [x] Manage professions, specialties, checklist templates, skills, reference questions

### Reminder Approval Queue
- [x] View pending_reminders
- [x] Approve individually
- [x] Send All button
- [x] On approve: send email, set status = sent

---

## PHASE 6: SUPER ADMIN

### Super Admin Login
- [x] /superadmin login page
- [x] Email + TOTP (real TOTP with otplib, QR code setup)
- [x] Implement real TOTP with otplib

### Super Admin Dashboard
- [x] Platform overview
- [x] Key metrics

### Company Management
- [x] Create company, Edit company, Manage credits, Manage seat limits, Update BAA status, Swap seat emails

### Admin Management
- [x] Create platform admin, Permission toggles, Admin approval queue

### Proxy Login
- [x] "Login As User" button, Scoped session, Red banner, Audit log, Exit proxy

### Platform Settings Editor
- [x] Edit platform_settings values
- [x] Encrypted storage for API keys

### API Vault
- [x] Store third-party API keys (encrypted)
- [x] Backend reads from api_keys table at runtime

### Feature Flags
- [x] Toggle features on/off
- [x] SMS Notifications toggle validation (checks Twilio keys before enabling, shows "Setup Required" badge)

### Email Template Editor
- [x] Edit email_templates subject and body
- [x] Variable preview (detects {{variables}}, clickable chips to insert, sample data preview)
- [x] Send Test Email button

### CSV Export
- [x] Export user data
- [x] PII redaction toggle

### Analytics & Revenue Dashboard
- [x] Credit purchase analytics
- [x] Revenue charts
- [x] Compliance Tools
- [x] Purge queue
- [x] HIPAA data export ZIP (structured JSON files in ZIP archive)

### Invoice Generator
- [x] PDF generation with pdfmake
- [x] Invoice content: MyZipVault branding, Agency name, Invoice date, Credit amount, Price per credit, Total, Invoice number
- [x] Store in Supabase Storage
- [x] Download from billing page and superadmin compliance page

### System Error Log Viewer
- [x] View system_error_logs
- [x] Filter by severity
- [x] Filter by service

### Reminder Approval Queue (Super Admin)
- [x] Same as platform admin view

---

## PHASE 7: LANDING PAGES

### Candidate View (Default)
- [x] All features implemented (Hero, Subheadline, CTA, Problem, Features, Privacy, Final CTA)

### Recruiter View
- [x] All features implemented (Toggle, Hero, Features, CTA)

### Design Requirements
- [x] Mobile responsive
- [x] Maximum 2 subtle animations
- [x] Clean, restrained design
- [ ] No generic SaaS template look (cosmetic — functional priority over visual polish)

---

## PHASE 8: NOTIFICATIONS AND AUTOMATION

### Email (Brevo)
- [x] Brevo integration
- [x] candidate_invite email
- [x] existing_candidate_checklist email
- [x] manager_invite email
- [x] reference_reminder email
- [x] credential_expiry email
- [x] password_reset email
- [x] credential_rejected email
- [x] low_credit_alert email
- [x] baa_expiry email
- [x] account_suspension_confirmation email

### Cron Jobs
- [x] All cron jobs implemented (reminders, skip, purge, status-update)

### SMS (Feature-Flagged OFF by default)
- [x] sms_notifications feature flag = false
- [x] UI shows "Setup Required" badge where SMS mentioned (when Twilio not configured)
- [x] Super Admin enable requires Twilio keys in API vault (toggle disabled if no keys)
- [x] No Twilio integration until flag enabled

### Audit Logging
- [x] Log admin_proxy_login
- [x] Log admin_proxy_exit
- [x] Log admin_viewed_credential
- [x] Log admin_viewed_resume
- [x] Log admin_approved_document
- [x] Log admin_rejected_document
- [x] Log candidate_shared_document
- [x] Log recruiter_unlocked_document
- [x] Log account_suspended
- [x] Log account_restored
- [x] Log account_permanently_deleted
- [x] Log baa_signed
- [x] Log credits_purchased
- [x] Log credits_deducted

---

## SECURITY RULES (Cross-Cutting)

- [x] No API keys in frontend code
- [x] All secrets in backend environment variables
- [x] Super Admin manages API keys via encrypted platform_settings
- [x] All file URLs are pre-signed
- [x] Pre-signed URLs 15-min expiry (900 seconds)
- [x] No public storage buckets
- [x] All database queries scoped by user identity via consent_shares
- [x] Passwords hashed with bcrypt (cost factor 12)
- [x] Super Admin OTP = TOTP (real otplib with 60-second expiry)
- [x] HTTPS only, TLS 1.2 minimum (security headers in next.config.ts)
- [x] Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS, CSP, Permissions-Policy, X-XSS-Protection, Referrer-Policy
- [ ] RLS enabled on all tables (requires Supabase SQL migration)

---

## SUMMARY

### ✅ COMPLETED: ~215 items
### ❌ PENDING: 2 items (Stripe deferred, RLS)

### Remaining Items:
1. **RLS on all Supabase tables** — Requires Supabase SQL migration policies (not done via Prisma)
2. **Stripe credit purchase integration** — DEFERRED per user request
3. **Twilio SMS integration** — DEFERRED per user request
4. **Visual polish** — Landing page could be more unique (cosmetic, not functional)

---
Task ID: 1
Agent: Main Agent
Task: Integrate all third-party APIs (Supabase, Stripe, Brevo, Affinda, Twilio) into MyZipVault

Work Log:
- Switched Prisma database provider from SQLite to PostgreSQL (for Supabase)
- Installed npm packages: @supabase/supabase-js, stripe, @stripe/stripe-js, @affinda/affinda, twilio
- Created src/lib/supabase.ts — Supabase client (anon + admin/service-role)
- Created src/lib/storage.ts — File upload utility with Supabase Storage (fallback to base64 if not configured)
- Created src/lib/stripe.ts — Stripe Checkout Session creation + webhook verification
- Created src/lib/affinda.ts — Resume parsing via Affinda API
- Created src/lib/twilio.ts — SMS sending via Twilio
- Updated src/lib/email.ts — Integrated Twilio SMS when feature flag is on
- Updated src/app/api/credentials/upload/route.ts — Uses Supabase Storage for files
- Updated src/app/api/candidate/resume/upload/route.ts — Uses Supabase Storage + Affinda parsing
- Updated src/app/api/recruiter/credits/purchase/route.ts — Real Stripe Checkout (fallback: free credits)
- Created src/app/api/stripe/webhook/route.ts — Handles checkout.session.completed events
- Created src/app/api/integrations/status/route.ts — Health check for all integrations
- Created src/app/api/storage/signed-url/route.ts — Signed URL generation for private files
- Updated src/app/api/superadmin/api-vault/route.ts — Now encrypts keys with AES-256-CBC, shows live connection status
- Updated src/app/onboard/page.tsx — Wrapped useSearchParams in Suspense boundary
- Updated .env — Added SUPABASE_SERVICE_ROLE_KEY, better comments, proper format
- Build passes successfully

Stage Summary:
- All 5 third-party services are now properly integrated with code
- Each service gracefully falls back when API keys are not configured:
  - Supabase Storage → falls back to base64 in DB
  - Stripe → falls back to free credit grant
  - Brevo → falls back to console.log
  - Affinda → silently skips resume parsing
  - Twilio → silently skips SMS
- SuperAdmin API Vault now encrypts keys with AES-256-CBC
- Integration status endpoint available at /api/integrations/status
- User needs to provide actual API keys in .env to activate services

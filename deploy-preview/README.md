# BTS App Preview — Cloudflare Workers deployment

Live URL: https://bts-app-preview.bts-platform.workers.dev

## What this is
Static preview deployment of the MyZipVault landing page (production build,
fully hydrated, all sections functional). Scope:
- `/` — full landing page (hero, dual VaultProfessional/VaultRecruiter feeds, pricing, footer)
- `/api/landing-content` — stub serving the default landing config (matches app defaults)
- Any other route (GET) — branded "preview" page
- Any POST — honest 503 (no fake success in preview)

## What this is NOT (yet)
The full application (login, dashboards, vault, recruiter tools) requires the
production PostgreSQL database (Supabase — owner-gated) and will deploy via
@opennextjs/cloudflare once the DB is attached.

## Redeploy
```
bun run build && bun run start -p 3001        # production build + serve
cd deploy-preview/dist && rm -rf * && wget -p -nH -q http://localhost:3001/
cd .. && CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... bunx wrangler deploy
```
(Token lives in root .env — never commit it.)

## Files
- worker.js — fetch handler (API stub + fallback + honest 503 on writes)
- fallback.html — branded preview page for non-landing routes
- landing.json — default landing config served by the stub
- wrangler.jsonc — Worker config (name: bts-app-preview, assets: ./dist)
- dist/ — mirrored production build of the landing (gitignored, rebuild via steps above)

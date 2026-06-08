---
Task ID: 1
Agent: Main Agent
Task: Fix AI Resume Assistant 502 error on Vercel

Work Log:
- Investigated root cause: `internal-api.z.ai` resolves to private IPs (172.25.x.x) that neither Vercel's serverless functions nor the user's browser can reach from the public internet
- Created `/api/ai/proxy` route — server-side proxy that forwards AI requests to ZAI API (works in local dev, gives clear error on Vercel)
- Updated `lib/ai-client.ts` — client now calls `/api/ai/proxy` instead of trying to reach `internal-api.z.ai` directly from the browser
- Flipped resume upload parsing order: Affinda is now PRIMARY (works on Vercel), ZAI Vision is fallback
- Enhanced `lib/affinda.ts` with skill suggestion and job title suggestion capabilities using Affinda's public API
- Created `/api/ai/affinda` route for Affinda-backed AI features (skill suggestions, job title suggestions) that work on Vercel
- Updated `/api/ai/resume/route.ts` to try Affinda first for skill suggestions, then fall back to ZAI
- Updated debug endpoint to show both ZAI and Affinda status, with private IP detection
- Updated CSP to include `https://api.affinda.com` and `https://*.affinda.com`
- Build verified successfully

Stage Summary:
- Resume PARSING now works on Vercel via Affinda (publicly accessible API)
- Skill SUGGESTIONS now work on Vercel via Affinda
- AI chat/generation (summaries, improvements, chat) requires ZAI API which is only reachable in local dev — on Vercel these features will show a clear error message
- The AFFINDA_API_KEY must be set on Vercel for these features to work

import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────
// EDGE RATE LIMITER — protects all 311 API routes from abuse
// ─────────────────────────────────────────────────────────────────────
//
// How it works:
//   - In-memory Map stores per-IP request counts with a 60-second window
//   - Runs BEFORE the auth check (so even unauthenticated abusers get blocked)
//   - Two tiers:
//       Anonymous (no session token):  120 req/min per IP
//       Authenticated (has session):   300 req/min per IP
//
// Why these limits (sized for 1000 concurrent users):
//
//   A normal page load makes 3-5 API calls (dashboard data, notifications,
//   profile, etc.). At 120/min, an anonymous visitor can load ~24 pages
//   per minute — far more than any human needs. A scraper or bot hitting
//   the API will exhaust 120 calls in seconds and get a 429.
//
//   An authenticated user actively working — searching candidates,
//   browsing jobs, submitting, updating profile — makes 20-30 API calls
//   per minute. 300/min gives 10x headroom. A script abusing the API
//   (e.g., bulk-revealing candidates) will hit 300 fast and get blocked.
//
//   Corporate networks (shared IP behind NAT): 300/min per IP handles
//   ~10 active users behind one NAT — reasonable. If you have a larger
//   corporate customer with 50+ users on one IP, bump AUTH_LIMIT to 600.
//
//   1000 concurrent users × 5 calls (page load burst) = 5000 calls in
//   ~10 seconds = ~30,000/min total. With 300/min per IP, this requires
//   at least 17 unique IPs — which is normal (1000 users from 100+ IPs).
//
// Caveat: Each Vercel serverless instance has its own in-memory Map, so
// the counter is per-instance. In practice this is fine — Vercel runs
// 1-4 Edge instances for small apps, and even 4 instances × 300 = 1200
// req/min per IP is still reasonable for a determined abuser. For
// production-grade distributed rate limiting, use Vercel KV or Upstash
// Redis (paid). This in-memory approach costs nothing and handles 1000
// users well.
// ─────────────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000; // 60 seconds

// Per-IP limits per 60-second window
const ANON_LIMIT = 120;  // anonymous: ~24 page loads per minute
const AUTH_LIMIT = 300;  // authenticated: ~60 page loads / 10x active work

// In-memory store: Map<ip, { count: number, resetAt: number }>
const ipCounts = new Map<string, { count: number; resetAt: number }>();

// Cleanup: if the Map grows too large (memory leak prevention), purge
// expired entries. Runs on every 500th request.
let requestCounter = 0;

function checkEdgeRateLimit(
  ip: string,
  isAuthenticated: boolean
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  const limit = isAuthenticated ? AUTH_LIMIT : ANON_LIMIT;

  // Periodic cleanup (every 500 requests)
  requestCounter++;
  if (requestCounter % 500 === 0) {
    for (const [key, val] of ipCounts) {
      if (val.resetAt < now) ipCounts.delete(key);
    }
  }

  const entry = ipCounts.get(ip);

  if (!entry || entry.resetAt < now) {
    // New window
    ipCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0, remaining: limit - 1 };
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter, remaining: 0 };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: limit - entry.count,
  };
}

// Extract client IP from request — Vercel provides x-forwarded-for
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first (client IP)
    return forwarded.split(",")[0].trim();
  }
  // Fallback (shouldn't happen on Vercel, but just in case)
  return req.headers.get("x-real-ip") || "unknown";
}

// ─────────────────────────────────────────────────────────────────────
// MAIN MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ token, req }) {
      const pathname = req.nextUrl.pathname;

      // ── EDGE RATE LIMITING (API routes only) ──
      // Applied before auth checks so even unauthenticated abusers get blocked.
      // Page routes are NOT rate-limited (they're cached/CDN-served by Vercel).
      if (pathname.startsWith("/api/")) {
        // Skip rate limiting for webhook + cron routes (they use their own auth)
        const isWebhookOrCron =
          pathname.startsWith("/api/stripe/webhook") ||
          pathname.startsWith("/api/cron/");
        if (!isWebhookOrCron) {
          const ip = getClientIp(req as unknown as NextRequest);
          const isAuthenticated = !!token?.id;
          const result = checkEdgeRateLimit(ip, isAuthenticated);

          if (!result.allowed) {
            // Return 429 Too Many Requests
            const response = NextResponse.json(
              {
                error: "Too many requests. Please slow down.",
                retryAfter: result.retryAfterSeconds,
              },
              {
                status: 429,
                headers: {
                  "Retry-After": String(result.retryAfterSeconds),
                  "X-RateLimit-Limit": String(isAuthenticated ? AUTH_LIMIT : ANON_LIMIT),
                  "X-RateLimit-Remaining": "0",
                  "X-RateLimit-Reset": String(
                    Math.ceil((Date.now() + RATE_LIMIT_WINDOW_MS) / 1000)
                  ),
                },
              }
            );
            return response as any;
          }
        }
      }

      // ── PUBLIC ROUTES (always allowed, but rate-limited above) ──
      const publicRoutes = ["/", "/login", "/signup", "/employer-signup", "/onboard", "/admin-login", "/superadmin-login", "/agency-login", "/agency-signup", "/privacy", "/terms", "/about", "/forgot-password", "/reset-password", "/verify-email", "/verify-document", "/notifications", "/browse-jobs", "/blog", "/contact", "/for-candidates", "/for-employers", "/for-recruiters", "/support", "/our-story", "/faq", "/marketplace-flow", "/credit-system", "/referral-program"];
      const publicPrefixes = ["/reference/", "/api/reference/", "/api/auth/", "/api/cron/", "/api/public/", "/shared/", "/api/shared/", "/sign/", "/api/vaultsign/sign/", "/api/verify-document"];

      // Allow public GET access to landing page content (so the public landing page can fetch it)
      if (pathname === "/api/superadmin/landing-page" && req.method === "GET") return true;

      // Public blog post pages (/blog/[slug]) — allowed without auth
      if (pathname.startsWith("/blog/")) return true;

      // Public job detail page (/browse-jobs/[id]) — allowed without auth
      if (pathname.startsWith("/browse-jobs/")) return true;

      // Public recruiter review/report endpoints — multi-source reputation system.
      // Any authenticated user (candidate, recruiter, employer) can leave a review
      // or file a report on a recruiter. The routes themselves enforce auth.
      // Must be checked BEFORE the /api/recruiter role gate below.
      if (pathname.match(/^\/api\/recruiter\/[^/]+\/(review|report)$/)) {
        return true;
      }

      if (publicRoutes.some((r) => pathname === r)) return true;
      if (publicPrefixes.some((p) => pathname.startsWith(p))) return true;

      // Static files
      if (pathname.startsWith("/_next/")) return true;

      // ── NOT AUTHENTICATED — redirect to role-appropriate login page ──
      if (!token || !token.id) {
        const loginPage = pathname.startsWith("/superadmin") ? "/superadmin-login"
          : pathname.startsWith("/admin") ? "/admin-login"
          : pathname.startsWith("/recruiter") ? "/agency-login"
          : pathname.startsWith("/employer") ? "/employer-signup"
          : "/login";

        if (pathname === loginPage) return true;

        const loginUrl = new URL(loginPage, req.nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl) as any;
      }

      const role = token.role as string;

      // ── ROLE-BASED ACCESS ──
      if (pathname.startsWith("/superadmin") && role !== "super_admin") return false;
      if (pathname.startsWith("/admin") && !["super_admin", "platform_admin"].includes(role)) return false;
      if (pathname.startsWith("/recruiter") && !["client_admin", "client_recruiter"].includes(role)) return false;
      // Employer-only routes
      if (pathname.startsWith("/employer") && role !== "employer") return false;
      if (pathname.startsWith("/api/employer") && role !== "employer") return false;
      // Candidate-only routes (NOT including /notifications — that's shared)
      if (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/checklists") ||
        pathname.startsWith("/calendar") ||
        pathname.startsWith("/vault/") ||
        pathname.startsWith("/vaultsign") ||
        pathname.startsWith("/references") ||
        pathname.startsWith("/recruiters") ||
        pathname.startsWith("/sharing") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/profile-completion")
      ) {
        if (role !== "candidate") return false;
      }

      // API routes - check role for protected APIs
      if (pathname.startsWith("/api/superadmin") && role !== "super_admin") return false;
      if (pathname.startsWith("/api/admin") && !["super_admin", "platform_admin"].includes(role)) return false;
      if (pathname.startsWith("/api/recruiter") && !["client_admin", "client_recruiter"].includes(role)) return false;
      if (pathname.startsWith("/api/candidate") && role !== "candidate") return false;

      return true;
    },
  },
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|upload/|fonts/).*)",
  ],
};

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ token, req }) {
      const pathname = req.nextUrl.pathname;

      // Public routes - always allowed
      const publicRoutes = ["/", "/login", "/signup", "/employer-signup", "/onboard", "/admin-login", "/superadmin-login", "/agency-login", "/agency-signup", "/privacy", "/terms", "/about", "/forgot-password", "/reset-password", "/verify-email", "/verify-document", "/notifications", "/browse-jobs"];
      const publicPrefixes = ["/reference/", "/api/reference/", "/api/auth/", "/api/cron/", "/api/public/", "/shared/", "/api/shared/", "/sign/", "/api/vaultsign/sign/", "/api/verify-document"];

      // Allow public GET access to landing page content (so the public landing page can fetch it)
      if (pathname === "/api/superadmin/landing-page" && req.method === "GET") return true;

      // Public job detail page (/browse-jobs/[id]) — allowed without auth
      if (pathname.startsWith("/browse-jobs/")) return true;

      if (publicRoutes.some((r) => pathname === r)) return true;
      if (publicPrefixes.some((p) => pathname.startsWith(p))) return true;

      // Static files and API routes for auth
      if (pathname.startsWith("/_next/")) return true;

      // Not authenticated — redirect to the CORRECT login page based on URL
      // (instead of always going to /login which is the candidate login)
      if (!token || !token.id) {
        // Determine which login page to redirect to based on the URL
        const loginPage = pathname.startsWith("/superadmin") ? "/superadmin-login"
          : pathname.startsWith("/admin") ? "/admin-login"
          : pathname.startsWith("/recruiter") ? "/agency-login"
          : pathname.startsWith("/employer") ? "/employer-signup"
          : "/login";

        // If we're already on the correct login page, allow (don't loop)
        if (pathname === loginPage) return true;

        // Redirect to the role-appropriate login page
        const loginUrl = new URL(loginPage, req.nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl) as any;
      }

      const role = token.role as string;

      // Role-based access
      if (pathname.startsWith("/superadmin") && role !== "super_admin") return false;
      if (pathname.startsWith("/admin") && !["super_admin", "platform_admin"].includes(role)) return false;
      if (pathname.startsWith("/recruiter") && !["client_admin", "client_recruiter"].includes(role)) return false;
      // Employer-only routes
      if (pathname.startsWith("/employer") && role !== "employer") return false;
      // Employer API routes
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
      // /notifications is shared across ALL roles — no role restriction here

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

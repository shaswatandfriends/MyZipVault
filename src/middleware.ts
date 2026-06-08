import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ token, req }) {
      const pathname = req.nextUrl.pathname;

      // Public routes - always allowed
      const publicRoutes = ["/", "/login", "/signup", "/onboard", "/admin-login", "/superadmin-login", "/agency-login", "/agency-signup", "/privacy", "/terms", "/about"];
      const publicPrefixes = ["/reference/", "/api/reference/", "/api/auth/", "/api/cron/"];

      if (publicRoutes.some((r) => pathname === r)) return true;
      if (publicPrefixes.some((p) => pathname.startsWith(p))) return true;

      // Static files and API routes for auth
      if (pathname.startsWith("/_next/")) return true;

      // Not authenticated
      if (!token) return false;

      const role = token.role as string;

      // Role-based access
      if (pathname.startsWith("/superadmin") && role !== "super_admin") return false;
      if (pathname.startsWith("/admin") && !["super_admin", "platform_admin"].includes(role)) return false;
      if (pathname.startsWith("/recruiter") && !["client_admin", "client_recruiter"].includes(role)) return false;
      if (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/checklists") ||
        pathname.startsWith("/calendar") ||
        pathname.startsWith("/vault") ||
        pathname.startsWith("/references") ||
        pathname.startsWith("/sharing") ||
        pathname.startsWith("/settings")
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
    "/((?!_next/static|_next/image|favicon.ico|upload/).*)",
  ],
};

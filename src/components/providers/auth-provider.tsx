"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo } from "react";
import type { AuthUser, UserRole } from "@/lib/types";

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  organizationId: number | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  organizationId: null,
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/employer-signup", "/onboard", "/admin-login", "/superadmin-login", "/agency-login", "/agency-signup", "/privacy", "/terms", "/about", "/forgot-password", "/reset-password", "/verify-email", "/verify-document"];

const PUBLIC_ROUTE_PREFIXES = ["/reference/", "/sign/", "/shared/"];

function getRoleDashboard(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/superadmin/dashboard";
    case "platform_admin":
      return "/admin/dashboard";
    case "client_admin":
    case "client_recruiter":
      return "/recruiter/dashboard";
    case "employer":
      return "/employer/dashboard";
    case "candidate":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}

function getRolePrefix(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/superadmin";
    case "platform_admin":
      return "/admin";
    case "client_admin":
    case "client_recruiter":
      return "/recruiter";
    case "employer":
      return "/employer";
    case "candidate":
      return "/";
    default:
      return "/";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isLoading = status === "loading";

  const user = useMemo<AuthUser | null>(() => {
    if (!session?.user) return null;
    const u = session.user as Record<string, unknown>;
    // If JWT refresh callback cleared the id (user deleted/suspended mid-session),
    // treat as unauthenticated so the user is redirected to login.
    if (!u.id) return null;
    const userId = Number(u.id);
    if (!userId) return null;
    return {
      id: userId,
      email: u.email as string,
      role: u.role as UserRole,
      organizationId: u.organizationId as number | null,
      isApproved: u.isApproved as boolean,
      firstName: u.firstName as string | null,
      lastName: u.lastName as string | null,
    };
  }, [session]);

  const role = user?.role ?? null;
  const organizationId = user?.organizationId ?? null;

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname) ||
      PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    // ─── Handle null user (session expired, inactivity timeout, or suspended) ───
    // When JWT callback clears token.id (Gap 10: inactivity timeout, or
    // Gap 2: account suspended), session?.user still exists but user is null.
    // Treat this as unauthenticated — redirect to login.
    if (!session?.user || !user) {
      if (!isPublicRoute) {
        let loginPage = "/login";
        if (pathname.startsWith("/superadmin")) {
          loginPage = "/superadmin-login";
        } else if (pathname.startsWith("/recruiter")) {
          loginPage = "/agency-login";
        } else if (pathname.startsWith("/admin")) {
          loginPage = "/admin-login";
        } else if (pathname.startsWith("/employer")) {
          // No dedicated employer login page — /employer-signup links back to /login
          loginPage = "/employer-signup";
        }
        router.replace(loginPage);
      }
      return;
    }

    // Authenticated user on a public route — redirect to their dashboard
    // EXCEPTIONS:
    //   1. Login pages — DON'T redirect. The user just signed out and
    //      landed here. Even if the session cookie hasn't cleared yet
    //      (Vercel serverless delay), we must let them stay on the
    //      login page. Otherwise they bounce back to dashboard = auto-login.
    //   2. /onboard — accessible while logged in (invite token flow)
    //   3. /verify-document, /shared/ — always accessible
    const LOGIN_ROUTES = ["/login", "/agency-login", "/admin-login", "/superadmin-login", "/forgot-password", "/reset-password", "/verify-email", "/signup", "/agency-signup", "/employer-signup"];
    const isLoginPage = LOGIN_ROUTES.includes(pathname);
    const ALWAYS_ACCESSIBLE_PUBLIC_ROUTES = ["/verify-document", "/shared/"];
    const isPrefixPublic = PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    const isAlwaysAccessible = ALWAYS_ACCESSIBLE_PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

    if (isPublicRoute && !isLoginPage && pathname !== "/onboard" && !isPrefixPublic && !isAlwaysAccessible) {
      const dashboard = getRoleDashboard(user.role);
      router.replace(dashboard);
      return;
    }

    // If on a login page with a session, DON'T redirect — just stay.
    // The login page's handleSubmit() calls signOut() before signIn(),
    // so the old session will be cleared when they actually try to log in.
    if (isLoginPage) {
      return;
    }

    // Check role-based access — ensure user is in the correct route group
    if (user) {
      const allowedPrefix = getRolePrefix(user.role);

      // Define which prefixes each role can access
      // /notifications is shared across ALL roles
      const roleAccess: Record<UserRole, string[]> = {
        super_admin: ["/superadmin", "/notifications"],
        platform_admin: ["/admin", "/notifications"],
        client_admin: ["/recruiter", "/notifications"],
        client_recruiter: ["/recruiter", "/notifications"],
        employer: ["/employer", "/notifications"],
        candidate: ["/dashboard", "/checklists", "/calendar", "/vault", "/references", "/recruiters", "/sharing", "/settings", "/profile-completion", "/notifications", "/vaultsign"],
      };

      const allowedPaths = roleAccess[user.role] ?? [];
      const isAllowed = allowedPaths.some((prefix) => pathname.startsWith(prefix));

      // If on an authenticated route but not allowed for this role, redirect
      if (!isAllowed && !isPublicRoute) {
        router.replace(getRoleDashboard(user.role));
      }
    }
  }, [session, isLoading, pathname, router, user]);

  return (
    <AuthContext.Provider value={{ user, role, organizationId, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

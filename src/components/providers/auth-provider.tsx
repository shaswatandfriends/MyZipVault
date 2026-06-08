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

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/onboard", "/admin-login", "/superadmin-login", "/agency-login", "/agency-signup", "/privacy", "/terms", "/about", "/forgot-password", "/reset-password", "/verify-email"];

const PUBLIC_ROUTE_PREFIXES = ["/reference/"];

function getRoleDashboard(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/superadmin/dashboard";
    case "platform_admin":
      return "/admin/dashboard";
    case "client_admin":
    case "client_recruiter":
      return "/recruiter/dashboard";
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
    return {
      id: Number(u.id),
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

    if (!session?.user) {
      // Not authenticated — redirect to appropriate login page if not on a public route
      if (!isPublicRoute) {
        // Determine which login page to redirect to based on the route prefix
        let loginPage = "/login";
        if (pathname.startsWith("/superadmin")) {
          loginPage = "/superadmin-login";
        } else if (pathname.startsWith("/recruiter")) {
          loginPage = "/agency-login";
        } else if (pathname.startsWith("/admin")) {
          loginPage = "/admin-login";
        }
        router.replace(loginPage);
      }
      return;
    }

    // Authenticated user on a public route — redirect to their dashboard
    // Exception: reference form pages are always public (for managers)
    const isPrefixPublic = PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (isPublicRoute && pathname !== "/onboard" && !isPrefixPublic) {
      const dashboard = getRoleDashboard(user!.role);
      router.replace(dashboard);
      return;
    }

    // Check role-based access — ensure user is in the correct route group
    if (user) {
      const allowedPrefix = getRolePrefix(user.role);

      // Define which prefixes each role can access
      const roleAccess: Record<UserRole, string[]> = {
        super_admin: ["/superadmin"],
        platform_admin: ["/admin"],
        client_admin: ["/recruiter"],
        client_recruiter: ["/recruiter"],
        candidate: ["/dashboard", "/checklists", "/calendar", "/vault", "/references", "/sharing", "/settings"],
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

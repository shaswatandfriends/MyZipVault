import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(role: UserRole) {
  const session = await requireAuth();
  const userRole = (session.user as Record<string, unknown>).role as string;
  if (userRole !== role) {
    redirect(getRoleDashboard(userRole as UserRole));
  }
  return session;
}

export async function requireAnyRole(roles: UserRole[]) {
  const session = await requireAuth();
  const userRole = (session.user as Record<string, unknown>).role as string;
  if (!roles.includes(userRole as UserRole)) {
    redirect(getRoleDashboard(userRole as UserRole));
  }
  return session;
}

export function getRoleDashboard(role: UserRole): string {
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

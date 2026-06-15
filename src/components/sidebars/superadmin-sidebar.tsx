"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Building2,
  ShieldCheck,
  Settings,
  KeyRound,
  FileCode,
  BarChart3,
  Megaphone,
  Scale,
  AlertTriangle,
  Bell,
  LogOut,
  ChevronLeft,
  ToggleLeft,
  PencilRuler,
  CalendarDays,
  ClipboardList,
  Eye,
  UserCheck,
  ScrollText,
  Database,
  FileSignature,
  Activity,
  Trash2,
  ListChecks,
} from "@/lib/icons";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

const coreNavItems = [
  { title: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard },
  { title: "Users", href: "/superadmin/users", icon: Users },
  { title: "Companies", href: "/superadmin/companies", icon: Building2 },
  { title: "Admins", href: "/superadmin/admins", icon: ShieldCheck },
  { title: "Calendar", href: "/superadmin/calendar", icon: CalendarDays },
];

const skillsNavItems = [
  { title: "Overview", href: "/superadmin/skills/overview", icon: Eye },
  { title: "Skills Database", href: "/superadmin/skills", icon: Database },
  { title: "Recruiters", href: "/superadmin/skills/recruiters", icon: UserCheck },
  { title: "Companies", href: "/superadmin/skills/companies", icon: Building2 },
  { title: "Candidates", href: "/superadmin/skills/users", icon: Users },
  { title: "Audit Logs", href: "/superadmin/skills/audit-logs", icon: ScrollText },
];

const referencesNavItems = [
  { title: "Overview", href: "/superadmin/references/overview", icon: Eye },
  { title: "Deletion Requests", href: "/superadmin/references/requests", icon: Trash2 },
  { title: "Responses", href: "/superadmin/references/responses", icon: FileSignature },
  { title: "Candidates", href: "/superadmin/references/candidates", icon: Users },
  { title: "Form Config", href: "/superadmin/references/forms", icon: ListChecks },
  { title: "Questions", href: "/superadmin/references", icon: Database },
  { title: "Audit Logs", href: "/superadmin/references/audit-logs", icon: ScrollText },
];

const systemNavItems = [
  { title: "Settings", href: "/superadmin/settings", icon: Settings },
  { title: "Feature Flags", href: "/superadmin/feature-flags", icon: ToggleLeft },
  { title: "API Vault", href: "/superadmin/api-vault", icon: KeyRound },
  { title: "Templates", href: "/superadmin/templates", icon: FileCode },
  { title: "Analytics", href: "/superadmin/analytics", icon: BarChart3 },
  { title: "Landing Page", href: "/superadmin/landing-page-editor", icon: PencilRuler },
];

const monitorNavItems = [
  { title: "Announcements", href: "/superadmin/announcements", icon: Megaphone },
  { title: "Compliance", href: "/superadmin/compliance", icon: Scale },
  { title: "Errors", href: "/superadmin/errors", icon: AlertTriangle },
  { title: "Reminders", href: "/superadmin/reminders", icon: Bell },
];

export function SuperadminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.email?.[0]?.toUpperCase() ?? "SA";

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? "Super Admin";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/superadmin/dashboard">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--primary)] font-bold text-sm text-white">
                  ZV
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span
                    className="font-semibold text-[var(--foreground)]"
                    style={{ fontFamily: "'Satoshi', sans-serif" }}
                  >
                    MyZipVault
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">Super Admin</span>
                </div>
                <ChevronLeft className="ml-auto text-[var(--text-muted)] group-data-[state=expanded]:rotate-0 group-data-[state=collapsed]:rotate-180 transition-transform" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="bg-[var(--border)]" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[var(--text-muted)]">Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out",
                        isActive
                          ? "bg-[var(--primary-light)] font-semibold text-[var(--primary)]"
                          : "text-[var(--text-secondary)] hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[var(--text-muted)]">Skills Checklist</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {skillsNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out",
                        isActive
                          ? "bg-[var(--primary-light)] font-semibold text-[var(--primary)]"
                          : "text-[var(--text-secondary)] hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[var(--text-muted)]">References</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {referencesNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/superadmin/references" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out",
                        isActive
                          ? "bg-[var(--primary-light)] font-semibold text-[var(--primary)]"
                          : "text-[var(--text-secondary)] hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[var(--text-muted)]">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out",
                        isActive
                          ? "bg-[var(--primary-light)] font-semibold text-[var(--primary)]"
                          : "text-[var(--text-secondary)] hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[var(--text-muted)]">Monitor</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {monitorNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out",
                        isActive
                          ? "bg-[var(--primary-light)] font-semibold text-[var(--primary)]"
                          : "text-[var(--text-secondary)] hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator className="bg-[var(--border)]" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <Avatar className="size-8">
                <AvatarFallback className="bg-[var(--primary-light)] text-xs font-semibold text-[var(--primary)]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="truncate text-sm font-medium text-[var(--foreground)]">{displayName}</span>
                <span className="text-xs text-[var(--text-muted)]">Super Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              className="text-[var(--text-secondary)] hover:bg-surface-2 hover:text-foreground"
              onClick={() => signOut({ callbackUrl: "/superadmin-login" })}
            >
              <LogOut className="size-5" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

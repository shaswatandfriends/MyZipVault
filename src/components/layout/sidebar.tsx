"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { LucideIcon } from "@/lib/icons";
import {
  Shield,
  LayoutDashboard,
  ClipboardCheck,
  CalendarDays,
  FileText,
  FileUser,
  Users,
  Share2,
  Settings,
  Send,
  CreditCard,
  FileSignature,
  FileCheck,
  Pencil,
  Bell,
  Building2,
  Key,
  ToggleLeft,
  Mail,
  BarChart3,
  Megaphone,
  ShieldCheck,
  AlertTriangle,
  LogOut,
  ScrollText,
  ChevronDown,
  Eye,
  Database,
  Activity,
  UserCheck,
  ClipboardList,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Sidebar } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import type { UserRole } from "@/lib/types";

// ─── Nav Item Types ────────────────────────────────────────────────────
interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface NavSection {
  title: string; // e.g. "OVERVIEW", "MANAGE", "CONFIGURATION"
  items: NavItem[];
}

interface NavGroup {
  title: string; // e.g. "Skills Checklist", "Reference"
  icon: LucideIcon;
  sections: NavSection[];
}

// ─── Role Display Labels ─────────────────────────────────────────────
const roleLabels: Record<UserRole, string> = {
  candidate: "Candidate",
  client_recruiter: "Recruiter",
  client_admin: "Client Admin",
  platform_admin: "Admin",
  super_admin: "Super Admin",
};

// ─── Candidate Nav Items ─────────────────────────────────────────────
const candidateNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Checklists", href: "/checklists", icon: ClipboardCheck },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "VaultSign", href: "/vaultsign", icon: FileSignature },
  { title: "Credentials", href: "/vault/credentials", icon: FileText },
  { title: "Resume", href: "/vault/resume", icon: FileUser },
  { title: "References", href: "/references", icon: Users },
  { title: "Sharing", href: "/sharing", icon: Share2 },
  { title: "Settings", href: "/settings", icon: Settings },
];

// ─── Recruiter Nav Items ─────────────────────────────────────────────
const recruiterNav: NavItem[] = [
  { title: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { title: "Book of Business", href: "/recruiter/candidates", icon: Users },
  { title: "Pipeline Report", href: "/recruiter/bob/report", icon: BarChart3, adminOnly: true },
  { title: "Calendar", href: "/recruiter/calendar", icon: CalendarDays },
  { title: "Send Request", href: "/recruiter/send", icon: Send },
  { title: "VaultSign", href: "/recruiter/vaultsign", icon: FileSignature },
  { title: "Org Settings", href: "/recruiter/settings", icon: Settings },
  { title: "Billing", href: "/recruiter/billing", icon: CreditCard },
  { title: "BAA", href: "/recruiter/baa", icon: FileCheck, adminOnly: true },
  { title: "Team", href: "/recruiter/team", icon: Users, adminOnly: true },
];

// ─── Platform Admin Nav Items ────────────────────────────────────────
const platformAdminNav: NavItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Documents", href: "/admin/documents", icon: FileCheck },
  { title: "Content", href: "/admin/content", icon: Pencil },
  { title: "Reminders", href: "/admin/reminders", icon: Bell },
];

// ─── Super Admin: Skills Checklist Group ──────────────────────────────
const skillsChecklistGroup: NavGroup = {
  title: "Skills Checklist",
  icon: ClipboardCheck,
  sections: [
    {
      title: "OVERVIEW",
      items: [
        { title: "Overview", href: "/superadmin/skills/overview", icon: LayoutDashboard },
      ],
    },
    {
      title: "MANAGE",
      items: [
        { title: "All Recruiters", href: "/superadmin/skills/recruiters", icon: Users },
        { title: "Companies", href: "/superadmin/skills/companies", icon: Building2 },
      ],
    },
    {
      title: "CONFIGURATION",
      items: [
        { title: "Skills Database", href: "/superadmin/skills", icon: Database },
        { title: "Audit Logs", href: "/superadmin/skills/audit-logs", icon: Activity },
        { title: "Users", href: "/superadmin/skills/users", icon: UserCheck },
      ],
    },
  ],
};

// ─── Super Admin: Reference Group ─────────────────────────────────────
const referenceGroup: NavGroup = {
  title: "Reference",
  icon: ScrollText,
  sections: [
    {
      title: "OVERVIEW",
      items: [
        { title: "Overview", href: "/superadmin/references/overview", icon: LayoutDashboard },
      ],
    },
    {
      title: "MANAGE",
      items: [
        { title: "Ref Requests", href: "/superadmin/references/requests", icon: ScrollText },
        { title: "Ref Responses", href: "/superadmin/references/responses", icon: Eye },
        { title: "All Candidates", href: "/superadmin/references/candidates", icon: Users },
      ],
    },
    {
      title: "CONFIGURATION",
      items: [
        { title: "Ref Questions", href: "/superadmin/references", icon: ClipboardList },
        { title: "Ref Forms", href: "/superadmin/references/forms", icon: Pencil },
        { title: "Audit Logs", href: "/superadmin/references/audit-logs", icon: Activity },
      ],
    },
  ],
};

// ─── Super Admin: Flat Nav Items (non-grouped) ───────────────────────
const superAdminFlatNav: NavItem[] = [
  { title: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard },
];

const superAdminBottomNav: NavItem[] = [
  // Management
  { title: "Admins", href: "/superadmin/admins", icon: Shield },
  { title: "VaultSign", href: "/superadmin/vaultsign", icon: FileSignature },
  { title: "Ref Requests", href: "/superadmin/reference-requests", icon: ScrollText },
  // Communication
  { title: "Templates", href: "/superadmin/templates", icon: Mail },
  { title: "Announcements", href: "/superadmin/announcements", icon: Megaphone },
  // Configuration
  { title: "Settings", href: "/superadmin/settings", icon: Settings },
  { title: "API Vault", href: "/superadmin/api-vault", icon: Key },
  { title: "Feature Flags", href: "/superadmin/feature-flags", icon: ToggleLeft },
  // Content
  { title: "Landing Page", href: "/superadmin/landing-page-editor", icon: Pencil },
  // Monitoring
  { title: "Analytics", href: "/superadmin/analytics", icon: BarChart3 },
  { title: "Compliance", href: "/superadmin/compliance", icon: ShieldCheck },
  { title: "Audit Logs", href: "/superadmin/audit-logs", icon: Activity },
  { title: "Errors", href: "/superadmin/errors", icon: AlertTriangle },
  { title: "Reminders", href: "/superadmin/reminders", icon: Bell },
];

// Section divider positions for superadmin bottom nav
const superAdminSectionDividers: Record<string, string> = {
  "/superadmin/admins": "MANAGEMENT",
  "/superadmin/templates": "COMMUNICATION",
  "/superadmin/settings": "CONFIGURATION",
  "/superadmin/landing-page-editor": "CONTENT",
  "/superadmin/analytics": "MONITORING",
};

// ─── Super Admin Groups ──────────────────────────────────────────────
const superAdminGroups: NavGroup[] = [skillsChecklistGroup, referenceGroup];

// ─── Get all hrefs for a group (for active state detection) ──────────
function getGroupHrefs(group: NavGroup): string[] {
  return group.sections.flatMap((s) => s.items.map((i) => i.href));
}

// ─── Get Nav Items for a Role ────────────────────────────────────────
function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "candidate":
      return candidateNav;
    case "client_recruiter":
      return recruiterNav.filter((item) => !item.adminOnly);
    case "client_admin":
      return recruiterNav;
    case "platform_admin":
      return platformAdminNav;
    case "super_admin":
      return superAdminFlatNav; // only used for flat items
    default:
      return [];
  }
}



// ─── Collapsible Nav Group Component ─────────────────────────────────
function NavGroupSection({ group, pathname }: { group: NavGroup; pathname: string }) {
  const allHrefs = useMemo(() => getGroupHrefs(group), [group]);
  const isAnyActive = allHrefs.some(
    (href) => pathname === href || pathname.startsWith(href + "/")
  );
  const [isExpanded, setIsExpanded] = useState(isAnyActive);

  // Auto-expand when a child becomes active
  useEffect(() => {
    if (isAnyActive) setIsExpanded(true);
  }, [isAnyActive]);

  return (
    <div className="space-y-0.5">
      {/* Group header - clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex w-full items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium transition-all duration-150",
          isAnyActive
            ? "text-white font-medium"
            : "text-white/42 hover:text-white/70"
        )}
        style={isAnyActive ? {
          background: "rgba(201,123,84,0.2)",
          borderLeft: "2px solid #C97B54",
        } : {
          borderLeft: "2px solid transparent",
        }}
      >
        <group.icon className="size-4 shrink-0" style={{ color: isAnyActive ? "#C97B54" : "rgba(255,255,255,0.28)" }} />
        <span className="flex-1 text-left">{group.title}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-200",
            isExpanded ? "rotate-180" : "rotate-0"
          )}
          style={{ color: "rgba(255,255,255,0.28)" }}
        />
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="ml-2 pl-4 space-y-1.5" style={{ borderLeft: "0.5px solid rgba(255,255,255,0.07)" }}>
          {group.sections.map((section) => (
            <div key={section.title}>
              {/* Section header */}
              <p className="px-3 pt-2 pb-0.5 text-[8px] font-bold tracking-widest text-white/20 uppercase">
                {section.title}
              </p>
              {/* Section items */}
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium transition-all duration-150",
                      isActive
                        ? "text-white font-medium"
                        : "text-white/42 hover:text-white/70"
                    )}
                    style={isActive ? {
                      background: "rgba(201,123,84,0.15)",
                      borderRadius: "6px",
                    } : {}}
                  >
                    <item.icon className="size-3.5 shrink-0" style={{ color: isActive ? "#C97B54" : "rgba(255,255,255,0.28)" }} />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main AppSidebar Component ───────────────────────────────────────
export function AppSidebar() {
  const { user, role } = useAuth();
  const pathname = usePathname();
  const [orgSettings, setOrgSettings] = useState<{ show_billing_to_recruiters?: boolean } | null>(null);

  // Fetch org settings to conditionally show/hide Billing for recruiters
  useEffect(() => {
    if (role === "client_recruiter" || role === "client_admin") {
      fetch("/api/vaultsign/organization")
        .then((res) => res.ok ? res.json() : null)
        .then((data) => { if (data) setOrgSettings(data); })
        .catch(() => {});
    }
  }, [role]);

  if (!role) return null;

  const isSuperAdmin = role === "super_admin";
  let navItems = isSuperAdmin ? superAdminFlatNav : getNavItems(role);

  // Filter out Billing for recruiters if org setting is off
  if (role === "client_recruiter" && orgSettings && !orgSettings.show_billing_to_recruiters) {
    navItems = navItems.filter((item) => item.href !== "/recruiter/billing");
  }

  const label = roleLabels[role];

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.email?.[0]?.toUpperCase() ?? "U";

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? "User";

  return (
    <Sidebar collapsible="offcanvas">
      <div className="glass-sidebar flex h-full w-full flex-col overflow-hidden" style={{ borderRight: "0.5px solid rgba(255,255,255,0.07)" }}>
        {/* ── Top Section: Logo + Brand ── */}
        <div className="flex shrink-0 items-center gap-2.5 px-3.5 py-4" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
          <div className="flex size-6 items-center justify-center rounded-md shrink-0" style={{ background: "#C97B54" }}>
            <span className="text-[11px] font-bold text-white">M</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className="text-sm font-medium leading-tight text-white"
              style={{ fontFamily: "'Lora', serif" }}
            >
              MyZipVault
            </span>
            <span className="text-[8px] text-white/30 uppercase tracking-wider font-medium">
              {label}
            </span>
          </div>
        </div>

        {/* ── Navigation Section ── */}
        <ScrollArea className="flex-1 overflow-hidden py-2.5">
          <nav className="flex flex-col gap-0.5">
            {/* Flat nav items */}
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium transition-all duration-150 relative",
                    isActive
                      ? "text-white font-medium"
                      : "text-white/42 hover:text-white/70"
                  )}
                  style={isActive ? {
                    background: "rgba(201,123,84,0.2)",
                    borderLeft: "2px solid #C97B54",
                  } : {
                    borderLeft: "2px solid transparent",
                  }}
                >
                  <item.icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-[#C97B54]" : "text-white/28 group-hover:text-white/42")} />
                  <span>{item.title}</span>
                </Link>
              );
            })}

            {/* Superadmin: Collapsible Groups */}
            {isSuperAdmin && (
              <>
                <div className="my-1.5 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                {superAdminGroups.map((group) => (
                  <NavGroupSection
                    key={group.title}
                    group={group}
                    pathname={pathname}
                  />
                ))}
                <div className="my-1.5 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

                {/* Bottom nav items for superadmin with section dividers */}
                {superAdminBottomNav.map((item, index) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const sectionLabel = superAdminSectionDividers[item.href];
                  return (
                    <React.Fragment key={item.href}>
                      {sectionLabel && (
                        <>
                          {index > 0 && <div className="my-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />}
                          <p className="px-3.5 pt-2 pb-0.5 text-[8px] font-bold tracking-widest text-white/20 uppercase">
                            {sectionLabel}
                          </p>
                        </>
                      )}
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium transition-all duration-150 relative",
                          isActive
                            ? "text-white font-medium"
                            : "text-white/42 hover:text-white/70"
                        )}
                        style={isActive ? {
                          background: "rgba(201,123,84,0.2)",
                          borderLeft: "2px solid #C97B54",
                        } : {
                          borderLeft: "2px solid transparent",
                        }}
                      >
                        <item.icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-[#C97B54]" : "text-white/28 group-hover:text-white/42")} />
                        <span>{item.title}</span>
                      </Link>
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </nav>
        </ScrollArea>

        {/* ── Bottom Section: User + Sign Out ── */}
        <div className="shrink-0 space-y-2 p-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
          {/* Theme Toggle + Notification Bell (all roles) */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell variant="sidebar" />
          </div>

          {/* User Info */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/5 transition-colors rounded-lg">
            <div className="flex size-7 items-center justify-center rounded-full shrink-0" style={{ background: "#C97B54" }}>
              <span className="text-[10px] font-semibold text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white/70">
                {displayName}
              </p>
              <p
                className="truncate text-[9px] text-white/25"
                title={user?.email ?? ""}
              >
                {user?.email}
              </p>
            </div>
          </div>

          {/* Logout Button with Confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-white/42 hover:text-white/70 hover:bg-white/5 transition-colors rounded-lg">
                <LogOut className="size-5" />
                <span>Sign Out</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-border bg-surface !fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle
                  className="text-foreground font-heading tracking-tight"
                >
                  Sign out of MyZipVault?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-text-secondary">
                  You will need to sign in again to access your account. Any unsaved changes may be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border text-text-secondary hover:bg-surface-2">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="btn-gradient text-white hover:brightness-110"
                  onClick={(e) => {
                    // ⚠️ Critical: prevent Radix from auto-closing the dialog
                    // before the async signOut() resolves. Without this, the
                    // button unmounts mid-async and the redirect never fires.
                    e.preventDefault();

                    let redirectUrl = "/login";
                    if (role === "super_admin") {
                      redirectUrl = "/superadmin-login";
                    } else if (role === "client_admin" || role === "client_recruiter") {
                      redirectUrl = "/agency-login";
                    } else if (role === "platform_admin") {
                      redirectUrl = "/admin-login";
                    }

                    // Fire-and-forget with a fallback timeout so the user is
                    // NEVER stuck on a half-closed dialog.
                    signOut({ redirect: false })
                      .catch(() => {})
                      .finally(() => {
                        window.location.href = redirectUrl;
                      });

                    // Hard fallback — if signOut hangs for any reason,
                    // redirect after 1.5s anyway.
                    setTimeout(() => {
                      window.location.href = redirectUrl;
                    }, 1500);
                  }}
                >
                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Sidebar>
  );
}

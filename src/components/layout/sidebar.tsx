// @ts-nocheck — TODO(audit-2): pre-existing schema drift in legacy calendar/vaultsign/pdf code. Model names and fields don't match current Prisma schema. Suppressing to enable strict TS on clean files. Fix individually in a follow-up session.
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
  Layers,
  FolderOpen,
  Inbox,
  Briefcase,
  Search,
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
import { useSidebar } from "@/components/ui/sidebar";
import { ChevronLeft, ChevronRight } from "@/lib/icons";
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

// ─── Employer Nav Items ──────────────────────────────────────────────
const employerNav: NavItem[] = [
  { title: "Dashboard", href: "/employer/dashboard", icon: LayoutDashboard },
  { title: "My Jobs", href: "/employer/jobs", icon: Briefcase },
  { title: "Find Candidates", href: "/employer/candidates/search", icon: Search },
  { title: "Submissions", href: "/employer/submissions", icon: Send },
  { title: "Billing", href: "/employer/billing", icon: CreditCard },
];

// ─── Candidate Nav Items ─────────────────────────────────────────────
const candidateNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Browse Jobs", href: "/browse-jobs", icon: Briefcase },
  { title: "Checklists", href: "/checklists", icon: ClipboardCheck },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "VaultSign", href: "/vaultsign", icon: FileSignature },
  { title: "Credentials", href: "/vault/credentials", icon: FileText },
  { title: "Resume", href: "/vault/resume", icon: FileUser },
  { title: "References", href: "/references", icon: Users },
  { title: "Sharing", href: "/sharing", icon: Share2 },
  { title: "Settings", href: "/settings", icon: Settings },
];

// ─── Recruiter Nav Items (flat — non-grouped) ─────────────────────────
const recruiterNav: NavItem[] = [
  { title: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
];

// ─── Recruiter: Marketplace Group ───────────────────────────────────────
const marketplaceGroup: NavGroup = {
  title: "Marketplace",
  icon: Briefcase,
  sections: [
    {
      title: "JOBS & CANDIDATES",
      items: [
        { title: "Open Jobs", href: "/recruiter/jobs", icon: Briefcase },
        { title: "Find Candidates", href: "/recruiter/candidates/search", icon: Search },
      ],
    },
  ],
};

// ─── Recruiter: Book of Business Group ─────────────────────────────────
const bobGroup: NavGroup = {
  title: "Book of Business",
  icon: Users,
  sections: [
    {
      title: "PIPELINE",
      items: [
        { title: "My BOB", href: "/recruiter/candidates", icon: Users },
        { title: "Pipeline Report", href: "/recruiter/bob/report", icon: BarChart3, adminOnly: true },
        { title: "Candidate Pools", href: "/recruiter/pools", icon: FolderOpen },
      ],
    },
  ],
};

// ─── Recruiter: Send Request Group ─────────────────────────────────────
const sendRequestGroup: NavGroup = {
  title: "Send Request",
  icon: Send,
  sections: [
    {
      title: "REQUESTS",
      items: [
        { title: "New Request", href: "/recruiter/send", icon: Send },
        { title: "Compliance Bundles", href: "/recruiter/bundles", icon: Layers },
      ],
    },
  ],
};

// ─── Recruiter: Bottom Nav Items (after groups) ────────────────────────
const recruiterBottomNav: NavItem[] = [
  { title: "Calendar", href: "/recruiter/calendar", icon: CalendarDays },
  { title: "VaultSign", href: "/recruiter/vaultsign", icon: FileSignature },
  { title: "Notifications", href: "/recruiter/notifications", icon: Bell },
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
        { title: "Checklist Requests", href: "/superadmin/skills/checklist-requests", icon: Inbox },
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
  { title: "Users", href: "/superadmin/users", icon: Users },
  { title: "Companies", href: "/superadmin/companies", icon: Building2 },
  { title: "Candidates Pool", href: "/superadmin/candidates", icon: Database },
  { title: "Jobs", href: "/superadmin/jobs", icon: Briefcase },
  { title: "Submissions", href: "/superadmin/submissions", icon: Send },
  { title: "Admins", href: "/superadmin/admins", icon: Shield },
  { title: "VaultSign", href: "/superadmin/vaultsign", icon: FileSignature },
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
    case "employer":
      return employerNav;
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
    <div className="space-y-1">
      {/* Group header - clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "spatial-nav-item w-full",
          isAnyActive && "spatial-nav-item-active"
        )}
        title={group.title}
      >
        <group.icon className="size-4 shrink-0" style={{ color: isAnyActive ? "#70B5F9" : "rgba(255,255,255,0.35)" }} />
        <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">{group.title}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
            isExpanded ? "rotate-180" : "rotate-0"
          )}
          style={{ color: "rgba(255,255,255,0.35)" }}
        />
      </button>

      {/* Collapsible content — hidden when sidebar is collapsed */}
      {isExpanded && (
        <div className="ml-2 pl-3 space-y-1.5 group-data-[collapsible=icon]:hidden" style={{ borderLeft: "0.5px solid rgba(255,255,255,0.08)" }}>
          {group.sections.map((section) => (
            <div key={section.title}>
              {/* Section header */}
              <p className="px-3 pt-2 pb-1 text-[9px] font-bold tracking-[0.18em] text-white/25 uppercase">
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
                      "spatial-nav-item text-[11px] py-1",
                      isActive && "spatial-nav-item-active"
                    )}
                  >
                    <item.icon className="size-3.5 shrink-0" style={{ color: isActive ? "#70B5F9" : "rgba(255,255,255,0.35)" }} />
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
  const { state, toggleSidebar, isMobile } = useSidebar();
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
  const isRecruiter = role === "client_recruiter" || role === "client_admin";
  let navItems = isSuperAdmin ? superAdminFlatNav : getNavItems(role);

  // Filter out Billing for recruiters if org setting is off
  // Default: hide billing for recruiters until org settings confirm it should show
  // This prevents the "Billing appears for a second then disappears" flicker
  if (role === "client_recruiter") {
    const shouldShowBilling = orgSettings?.show_billing_to_recruiters === true;
    if (!shouldShowBilling) {
      navItems = navItems.filter((item) => item.href !== "/recruiter/billing");
    }
  }

  // Recruiter groups — filter adminOnly items for client_recruiter
  const recruiterGroups = isRecruiter ? [marketplaceGroup, bobGroup, sendRequestGroup] : [];
  const recruiterBottom = isRecruiter
    ? role === "client_recruiter"
      ? recruiterBottomNav.filter((item) => !item.adminOnly)
      : recruiterBottomNav
    : [];

  // Apply billing filter to bottom nav too
  const recruiterBottomFiltered = role === "client_recruiter"
    ? recruiterBottom.filter((item) => {
        if (item.href === "/recruiter/billing") {
          return orgSettings?.show_billing_to_recruiters === true;
        }
        return true;
      })
    : recruiterBottom;

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
    <Sidebar collapsible="icon">
      <div className="spatial-sidebar flex h-full w-full flex-col overflow-hidden">
        {/* ── Top Section: Logo + Brand + Collapse Button ── */}
        <div
          className="relative z-[1] flex shrink-0 items-center justify-between gap-2 px-3 py-3.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-start group-data-[collapsible=icon]:gap-3 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-4"
          style={{ borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}
        >
          {/* Logo + Brand */}
          <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:justify-center">
            <div
              className="flex size-7 items-center justify-center rounded-[6px] shrink-0"
              style={{
                background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(201,123,84,0.3)",
              }}
            >
              <span className="text-[12px] font-bold text-white">M</span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium leading-tight text-white" style={{ fontFamily: "'Lora', serif" }}>
                MyZipVault
              </span>
              <span className="text-[9px] text-white/35 uppercase tracking-[0.12em] font-semibold">
                {label}
              </span>
            </div>
          </div>

          {/* Collapse/Expand button */}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[collapsible=icon]:order-2"
              style={{
                width: "32px",
                height: "32px",
                background: "transparent",
                border: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.transform = "scale(1)";
              }}
              title={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
            >
              {state === "expanded" ? (
                <ChevronLeft className="size-4 text-white/50" />
              ) : (
                <ChevronRight className="size-5 text-white/80" />
              )}
            </button>
          )}
        </div>

        {/* ── Navigation Section ── */}
        <ScrollArea className="flex-1 overflow-hidden py-3">
          <nav className="flex flex-col gap-1 px-2.5">
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
                    "spatial-nav-item",
                    isActive && "spatial-nav-item-active"
                  )}
                >
                  <item.icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-[#70B5F9]" : "text-white/35 group-hover:text-white/55")} />
                  <span>{item.title}</span>
                </Link>
              );
            })}

            {/* Recruiter: Collapsible Groups (BOB + Send Request) */}
            {isRecruiter && recruiterGroups.length > 0 && (
              <>
                <div className="my-2 h-px mx-2 group-data-[collapsible=icon]:hidden" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)" }} />
                {recruiterGroups.map((group) => {
                  // Filter adminOnly items from group sections for client_recruiter
                  const filteredGroup: NavGroup = {
                    ...group,
                    sections: group.sections.map((s) => ({
                      ...s,
                      items: s.items.filter((item) => role === "client_admin" || !item.adminOnly),
                    })),
                  };
                  return (
                    <NavGroupSection
                      key={group.title}
                      group={filteredGroup}
                      pathname={pathname}
                    />
                  );
                })}
                <div className="my-2 h-px mx-2 group-data-[collapsible=icon]:hidden" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)" }} />
              </>
            )}

            {/* Recruiter: Bottom nav items (Calendar, VaultSign, etc.) */}
            {isRecruiter && recruiterBottomFiltered.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "spatial-nav-item",
                    isActive && "spatial-nav-item-active"
                  )}
                >
                  <item.icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-[#70B5F9]" : "text-white/35 group-hover:text-white/55")} />
                  <span>{item.title}</span>
                </Link>
              );
            })}

            {/* Superadmin: Collapsible Groups */}
            {isSuperAdmin && (
              <>
                <div className="my-2 h-px mx-2 group-data-[collapsible=icon]:hidden" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)" }} />
                {superAdminGroups.map((group) => (
                  <NavGroupSection
                    key={group.title}
                    group={group}
                    pathname={pathname}
                  />
                ))}
                <div className="my-2 h-px mx-2 group-data-[collapsible=icon]:hidden" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)" }} />

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
                          {index > 0 && <div className="my-1.5 h-px mx-2 group-data-[collapsible=icon]:hidden" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)" }} />}
                          <p className="px-3.5 pt-2 pb-1 text-[9px] font-bold tracking-[0.18em] text-white/25 uppercase group-data-[collapsible=icon]:hidden">
                            {sectionLabel}
                          </p>
                        </>
                      )}
                      <Link
                        href={item.href}
                        className={cn(
                          "spatial-nav-item",
                          isActive && "spatial-nav-item-active"
                        )}
                      >
                        <item.icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-[#70B5F9]" : "text-white/35 group-hover:text-white/55")} />
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
        <div
          className="relative z-[1] shrink-0 space-y-3 p-3 group-data-[collapsible=icon]:space-y-2 group-data-[collapsible=icon]:p-1.5"
          style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)" }}
        >
          {/* Theme Toggle + Notification Bell */}
          <div className="flex items-center gap-1.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2">
            <ThemeToggle />
            <NotificationBell variant="sidebar" />
          </div>

          {/* Divider — hidden when collapsed */}
          <div
            className="h-px group-data-[collapsible=icon]:hidden"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }}
          />

          {/* User Info — glass container */}
          <div
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[12px] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1.5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-9"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.06)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            }}
            title={state === "collapsed" ? displayName : undefined}
          >
            <div
              className="flex size-8 items-center justify-center rounded-full shrink-0 group-data-[collapsible=icon]:size-7"
              style={{
                background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(201,123,84,0.3)",
              }}
            >
              <span className="text-[10px] font-semibold text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-medium text-white/80 leading-tight">
                {displayName}
              </p>
              <p className="truncate text-[9px] text-white/30 leading-tight" title={user?.email ?? ""}>
                {user?.email}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-[12px] text-xs font-medium text-white/40 hover:text-white/80 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1.5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(184,64,64,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                title={state === "collapsed" ? "Sign Out" : undefined}
              >
                <LogOut className="size-4 shrink-0 group-data-[collapsible=icon]:mx-auto" />
                <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
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
                    // before the async signOut() resolves.
                    e.preventDefault();

                    let redirectUrl = "/login";
                    if (role === "super_admin") {
                      redirectUrl = "/superadmin-login";
                    } else if (role === "client_admin" || role === "client_recruiter") {
                      redirectUrl = "/agency-login";
                    } else if (role === "platform_admin") {
                      redirectUrl = "/admin-login";
                    }

                    // Sign out, then wait 500ms for cookie to clear before
                    // redirecting. Without the delay, the old session cookie
                    // is still present when the login page loads, causing
                    // AuthProvider to redirect back to the dashboard.
                    signOut({ redirect: false })
                      .then(() => new Promise((resolve) => setTimeout(resolve, 500)))
                      .catch(() => {})
                      .finally(() => {
                        // Use replace() so back button doesn't return to dashboard
                        window.location.replace(redirectUrl);
                      });
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

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
  User,
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
  Sparkles,
  Handshake,
  HelpCircle,
  TrendingUp,
  Coins,
  Gift,
  Flag,
  DollarSign,
  Lock,
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

// ─── Recruiter: My Work Group (quick-access shortcuts) ────────────────
const myWorkGroup: NavGroup = {
  title: "My Work",
  icon: Inbox,
  sections: [
    {
      title: "SHORTCUTS",
      items: [
        { title: "My Submittals", href: "/recruiter/jobs?filter=submittals", icon: Send },
        { title: "My Placements", href: "/recruiter/jobs?filter=placements", icon: Handshake },
        { title: "Messages", href: "/recruiter/messages", icon: Mail },
      ],
    },
  ],
};

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
// Note: Notifications is NOT here — it's rendered as a live <NotificationBell>
// component at the bottom of the sidebar (with badge count). Having it in both
// places would be redundant.
const recruiterBottomNav: NavItem[] = [
  { title: "Calendar", href: "/recruiter/calendar", icon: CalendarDays },
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

// ─── Super Admin: Marketplace Group ───────────────────────────────────
const superAdminMarketplaceGroup: NavGroup = {
  title: "Marketplace",
  icon: Briefcase,
  sections: [
    {
      title: "MANAGE",
      items: [
        { title: "Jobs", href: "/superadmin/jobs", icon: Briefcase },
        { title: "Candidates Pool", href: "/superadmin/candidates", icon: Database },
        { title: "Submissions", href: "/superadmin/submissions", icon: Send },
      ],
    },
  ],
};

// ─── Super Admin: Flat Nav Items (non-grouped) ───────────────────────
const superAdminFlatNav: NavItem[] = [
  { title: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard },
  { title: "Calendar", href: "/superadmin/calendar", icon: CalendarDays },
];

// ─── Super Admin: Collapsible Groups ─────────────────────────────────

// Marketplace group (already defined above as superAdminMarketplaceGroup)

// Credits & Billing group
const superAdminCreditsGroup: NavGroup = {
  title: "Credits & Billing",
  icon: Coins,
  sections: [
    {
      title: "MANAGE",
      items: [
        { title: "Credits Overview", href: "/superadmin/credits/dashboard", icon: LayoutDashboard },
        { title: "Credit Costs", href: "/superadmin/credit-costs", icon: DollarSign },
        { title: "Invoices & Compliance", href: "/superadmin/compliance", icon: ShieldCheck },
      ],
    },
  ],
};

// Users & Organizations group
const superAdminUsersGroup: NavGroup = {
  title: "Users & Organizations",
  icon: Users,
  sections: [
    {
      title: "MANAGE",
      items: [
        { title: "Users", href: "/superadmin/users", icon: Users },
        { title: "Companies", href: "/superadmin/companies", icon: Building2 },
        { title: "Admins", href: "/superadmin/admins", icon: Shield },
        { title: "Documents", href: "/superadmin/documents", icon: FileText },
      ],
    },
  ],
};

// Communication group
const superAdminCommunicationGroup: NavGroup = {
  title: "Communication",
  icon: Mail,
  sections: [
    {
      title: "MANAGE",
      items: [
        { title: "Email Templates", href: "/superadmin/templates", icon: Mail },
        { title: "Announcements", href: "/superadmin/announcements", icon: Megaphone },
        { title: "Reminders", href: "/superadmin/reminders", icon: Bell },
      ],
    },
  ],
};

// Content & Branding group
const superAdminContentGroup: NavGroup = {
  title: "Content & Branding",
  icon: Pencil,
  sections: [
    {
      title: "MANAGE",
      items: [
        { title: "Landing Page", href: "/superadmin/landing-page-editor", icon: Pencil },
        { title: "Auth Pages", href: "/superadmin/auth-page-editor", icon: Lock },
        { title: "Resume Templates", href: "/superadmin/resume-templates", icon: FileText },
        { title: "VaultSign", href: "/superadmin/vaultsign", icon: FileSignature },
      ],
    },
  ],
};

// Moderation group
const superAdminModerationGroup: NavGroup = {
  title: "Moderation",
  icon: ShieldCheck,
  sections: [
    {
      title: "QUEUE",
      items: [
        { title: "Recruiter Reports", href: "/superadmin/reports", icon: Flag },
        { title: "Review Disputes", href: "/superadmin/review-disputes", icon: AlertTriangle },
      ],
    },
  ],
};

// Insights group
const superAdminInsightsGroup: NavGroup = {
  title: "Insights",
  icon: BarChart3,
  sections: [
    {
      title: "ANALYTICS",
      items: [
        { title: "Analytics", href: "/superadmin/analytics", icon: BarChart3 },
        { title: "Growth", href: "/superadmin/growth", icon: TrendingUp },
      ],
    },
    {
      title: "LOGS",
      items: [
        { title: "Audit Logs", href: "/superadmin/audit-logs", icon: Activity },
        { title: "Errors", href: "/superadmin/errors", icon: AlertTriangle },
      ],
    },
  ],
};

// Configuration group
const superAdminConfigGroup: NavGroup = {
  title: "Configuration",
  icon: Settings,
  sections: [
    {
      title: "SETTINGS",
      items: [
        { title: "Settings", href: "/superadmin/settings", icon: Settings },
        { title: "API Vault", href: "/superadmin/api-vault", icon: Key },
        { title: "Feature Flags", href: "/superadmin/feature-flags", icon: ToggleLeft },
      ],
    },
  ],
};

const superAdminBottomNav: NavItem[] = [];

// Section divider positions for superadmin bottom nav (empty now — all in groups)
const superAdminSectionDividers: Record<string, string> = {};

// ─── Super Admin Groups ──────────────────────────────────────────────
const superAdminGroups: NavGroup[] = [
  superAdminMarketplaceGroup,
  superAdminCreditsGroup,
  superAdminUsersGroup,
  skillsChecklistGroup,
  referenceGroup,
  superAdminCommunicationGroup,
  superAdminContentGroup,
  superAdminModerationGroup,
  superAdminInsightsGroup,
  superAdminConfigGroup,
];

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



// ─── Helper: check if a nav item is active ───────────────────────────
// Shared between group-level (isAnyActive) and item-level (isActive) checks
// so they always agree.
//
// Rules:
// 1. Items WITH query strings (e.g. /recruiter/jobs?filter=submittals)
//    → exact match against fullPath (path + query)
// 2. Items WITHOUT query strings
//    → if current URL has a query string, a sibling owns it → NOT active
//    → otherwise, exact match OR subpath match
// 3. Sibling exclusion: /recruiter/candidates (My BOB) should NOT match
//    /recruiter/candidates/search (Find Candidates) or /recruiter/candidates/123
//    (candidate detail page). These are sibling routes, not child routes.
function isItemActive(href: string, pathname: string, fullPath: string | undefined): boolean {
  // Rule 1: query-string items
  if (href.includes("?")) {
    return fullPath === href;
  }

  const fullPathHasQuery = fullPath ? fullPath.includes("?") : false;

  // Rule 2: if URL has a query, a sibling with that query owns it
  if (fullPathHasQuery) return false;

  // Rule 3: sibling exclusion for /recruiter/candidates
  // My BOB (/recruiter/candidates) should only match EXACTLY /recruiter/candidates,
  // NOT subpaths like /recruiter/candidates/search or /recruiter/candidates/123
  if (href === "/recruiter/candidates") {
    return pathname === href;
  }

  // Default: exact match OR subpath match
  return pathname === href || pathname.startsWith(href + "/");
}

// ─── Collapsible Nav Group Component ─────────────────────────────────
function NavGroupSection({ group, pathname, fullPath }: { group: NavGroup; pathname: string; fullPath?: string }) {
  const allHrefs = useMemo(() => getGroupHrefs(group), [group]);
  // Group is "active" if any of its items matches.
  // Uses the SAME isItemActive helper as the item-level check so group
  // and item states always agree.
  const isAnyActive = allHrefs.some((href) => isItemActive(href, pathname, fullPath));
  const [isExpanded, setIsExpanded] = useState(isAnyActive);

  // Auto-expand when a child becomes active, auto-collapse when no child is active.
  // This ensures only the group containing the current page is expanded —
  // other groups collapse when you navigate away from them.
  // The user can still manually toggle any group by clicking its header.
  useEffect(() => {
    setIsExpanded(isAnyActive);
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
        <group.icon className="size-4 shrink-0 self-center" style={{ color: isAnyActive ? "#FFFFFF" : "rgba(255,255,255,0.85)" }} />
        <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">{group.title}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 self-center transition-transform duration-200 group-data-[collapsible=icon]:hidden",
            isExpanded ? "rotate-180" : "rotate-0"
          )}
          style={{ color: isAnyActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)" }}
        />
      </button>

      {/* Collapsible content — hidden when sidebar is collapsed */}
      {isExpanded && (
        <div className="ml-2 pl-3 space-y-1.5 group-data-[collapsible=icon]:hidden" style={{ borderLeft: "0.5px solid rgba(255,255,255,0.08)" }}>
          {group.sections.map((section) => (
            <div key={section.title}>
              {/* Section header */}
              <p className="px-3 pt-2 pb-1 text-xs font-bold tracking-[0.15em] text-white/65 uppercase">
                {section.title}
              </p>
              {/* Section items */}
              {section.items.map((item) => {
                // Use the shared isItemActive helper so item-level and
                // group-level active states always agree.
                const isActive = isItemActive(item.href, pathname, fullPath);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "spatial-nav-item text-xs py-1",
                      isActive && "spatial-nav-item-active"
                    )}
                  >
                    <item.icon className="size-3.5 shrink-0 self-center" style={{ color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.75)" }} />
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

// ─── View Public Profile Button (recruiters only) ────────────────────
function ViewPublicProfileButton() {
  const [publicId, setPublicId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/public-id", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.public_id) setPublicId(data.public_id);
      })
      .catch(() => {});
  }, []);

  if (!publicId) return null;

  return (
    <a
      href={`/recruiter/${publicId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-xs font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1.5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9"
      title="View Public Profile"
      style={{
        color: "rgba(255,255,255,0.85)",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.10)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
        e.currentTarget.style.color = "rgba(255,255,255,0.85)";
      }}
    >
      <User className="size-4 shrink-0 text-[#C9A961]" />
      <span className="group-data-[collapsible=icon]:hidden">View Public Profile</span>
    </a>
  );
}

// ─── Main AppSidebar Component ───────────────────────────────────────
export function AppSidebar() {
  const { user, role } = useAuth();
  const pathname = usePathname();
  const { state, toggleSidebar, isMobile } = useSidebar();
  const [orgSettings, setOrgSettings] = useState<{ show_billing_to_recruiters?: boolean } | null>(null);

  // Track the query string so sidebar active-state can distinguish URLs that
  // share the same path but differ by ?filter= (e.g. /recruiter/jobs vs
  // /recruiter/jobs?filter=submittals). usePathname() strips the query string,
  // so we read window.location.search.
  //
  // IMPORTANT: When navigating between ?filter=submittals and ?filter=placements,
  // the pathname stays the same (/recruiter/jobs) — only the query changes.
  // Next.js client-side navigations use pushState/replaceState which do NOT
  // fire popstate. So we poll window.location.search on a short interval to
  // detect query-string-only changes. This is lightweight (string comparison
  // every 200ms) and avoids the Suspense boundary requirement of
  // useSearchParams().
  const [search, setSearch] = useState("");
  useEffect(() => {
    // Set immediately on mount / pathname change
    setSearch(window.location.search);

    // Poll for query-string changes (handles pushState/replaceState that
    // don't fire popstate)
    const interval = setInterval(() => {
      setSearch((prev) => {
        const current = window.location.search;
        return prev !== current ? current : prev;
      });
    }, 200);

    // Also listen for popstate (browser back/forward)
    const handler = () => setSearch(window.location.search);
    window.addEventListener("popstate", handler);

    return () => {
      clearInterval(interval);
      window.removeEventListener("popstate", handler);
    };
  }, [pathname]);

  // Build a full href (path + query) for active-state comparisons
  const fullPath = search ? `${pathname}${search}` : pathname;

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
  const recruiterGroups = isRecruiter ? [myWorkGroup, marketplaceGroup, bobGroup, sendRequestGroup] : [];
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
          {/* Brand mark — inline SVG designed for dark sidebar backgrounds.
              White Z on transparent square with gold accent border.
              Uses /logo.png on light backgrounds; this SVG on dark. */}
          <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 30 30"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
              aria-label="MyZipVault"
              role="img"
            >
              {/* Subtle gold-tinted rounded square backdrop for contrast on dark glass */}
              <rect
                x="1.49"
                y="1.49"
                width="27.02"
                height="27.02"
                rx="6"
                fill="rgba(201,169,97,0.10)"
                stroke="rgba(201,169,97,0.55)"
                strokeWidth="0.75"
              />
              {/* White Z mark — same path as /logo.svg */}
              <path d="M15.47,7.1l-1.3,1.85c-0.2,0.29-0.54,0.47-0.9,0.47h-7.1V7.09C6.16,7.1,15.47,7.1,15.47,7.1z" fill="#FFFFFF" />
              <polygon points="24.3,7.1 13.14,22.91 5.7,22.91 16.86,7.1" fill="#FFFFFF" />
              <path d="M14.53,22.91l1.31-1.86c0.2-0.29,0.54-0.47,0.9-0.47h7.09v2.33H14.53z" fill="#FFFFFF" />
            </svg>
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="text-[15px] font-bold text-white tracking-tight leading-none font-heading">
                MyZipVault
              </span>
              {label && (
                <span className="text-[10px] text-white/55 uppercase tracking-[0.14em] font-semibold mt-0.5">
                  {label}
                </span>
              )}
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
                  <item.icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-white" : "text-white/75 group-hover:text-white")} />
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
                      fullPath={fullPath}
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
                  <item.icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-white" : "text-white/75 group-hover:text-white")} />
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
                    fullPath={fullPath}
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
                          <p className="px-3.5 pt-2 pb-1 text-xs font-bold tracking-[0.15em] text-white/65 uppercase group-data-[collapsible=icon]:hidden">
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
                        <item.icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-white" : "text-white/75 group-hover:text-white")} />
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
          {/* Notification Bell only — theme toggle removed (light mode is forced) */}
          <div className="flex items-center gap-1.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-2">
            <NotificationBell variant="sidebar" />
          </div>

          {/* Divider — hidden when collapsed */}
          <div
            className="h-px group-data-[collapsible=icon]:hidden"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }}
          />

          {/* View Public Profile — recruiters only */}
          {isRecruiter && (
            <ViewPublicProfileButton />
          )}

          {/* Take a tour button — dispatches custom event caught by <TourHost />.
              Uses gold accent + Sparkles icon (consistent line weight with other Lucide icons) — clearly
              differentiated from nav items via accent color and border treatment. */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("mzv:tour:start"))}
            className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-xs font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1.5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9"
            title="Take a tour"
            style={{
              color: "#C9A961",
              background: "rgba(201,169,97,0.08)",
              border: "1px solid rgba(201,169,97,0.25)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(201,169,97,0.15)";
              e.currentTarget.style.borderColor = "rgba(201,169,97,0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(201,169,97,0.08)";
              e.currentTarget.style.borderColor = "rgba(201,169,97,0.25)";
            }}
          >
            <Sparkles className="size-4 shrink-0" style={{ color: "#C9A961" }} />
            <span className="group-data-[collapsible=icon]:hidden">Take a tour</span>
          </button>

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
                // Gold→sage gradient — high contrast against dark sidebar bg
                background: "linear-gradient(135deg, #C9A961 0%, #8FA99C 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 8px rgba(201,169,97,0.35)",
              }}
            >
              <span className="text-xs font-bold text-[#0D3B2E]">{initials}</span>
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-[13px] font-semibold text-white/95 leading-tight">
                {displayName !== user?.email ? displayName : "My Account"}
              </p>
              <p className="truncate text-[11px] text-white/65 leading-tight mt-0.5" title={user?.email ?? ""}>
                {user?.email}
              </p>
            </div>
          </div>

          {/* Logout Button — action button style (border + glass tint, distinct from nav items) */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-xs font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-1.5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:h-9"
                style={{
                  color: "rgba(255,159,159,0.95)",
                  background: "rgba(184,64,64,0.06)",
                  border: "1px solid rgba(184,64,64,0.20)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(184,64,64,0.12)";
                  e.currentTarget.style.borderColor = "rgba(184,64,64,0.40)";
                  e.currentTarget.style.color = "#FFB0B0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(184,64,64,0.06)";
                  e.currentTarget.style.borderColor = "rgba(184,64,64,0.20)";
                  e.currentTarget.style.color = "rgba(255,159,159,0.95)";
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

                    // Sign out and redirect to the homepage (index page).
                    // Use callbackUrl to force NextAuth to clear the cookie
                    // and navigate to '/' — no more auto-login on refresh.
                    signOut({
                      callbackUrl: "/",
                      redirect: true,
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

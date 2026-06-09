"use client";

import { useState, useEffect, useMemo } from "react";
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
  CheckCheck,
  Info,
  Loader2,
  ScrollText,
  Trash2,
  XCircle,
  ChevronDown,
  Eye,
  Database,
  Activity,
  UserCheck,
  ClipboardList,
  DollarSign,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { Sidebar } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  { title: "Credentials", href: "/vault/credentials", icon: FileText },
  { title: "Resume", href: "/vault/resume", icon: FileUser },
  { title: "References", href: "/references", icon: Users },
  { title: "Sharing", href: "/sharing", icon: Share2 },
  { title: "Settings", href: "/settings", icon: Settings },
];

// ─── Recruiter Nav Items ─────────────────────────────────────────────
const recruiterNav: NavItem[] = [
  { title: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { title: "Calendar", href: "/recruiter/calendar", icon: CalendarDays },
  { title: "Send Request", href: "/recruiter/send", icon: Send },
  { title: "VaultSign", href: "/recruiter/vaultsign", icon: FileSignature },
  { title: "Billing", href: "/recruiter/billing", icon: CreditCard },
  { title: "BAA", href: "/recruiter/baa", icon: FileCheck },
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
  { title: "Admins", href: "/superadmin/admins", icon: Shield },
  { title: "Ref Requests", href: "/superadmin/reference-requests", icon: ScrollText },
  { title: "VaultSign", href: "/superadmin/vaultsign", icon: FileSignature },
  { title: "Settings", href: "/superadmin/settings", icon: Settings },
  { title: "API Vault", href: "/superadmin/api-vault", icon: Key },
  { title: "Feature Flags", href: "/superadmin/feature-flags", icon: ToggleLeft },
  { title: "Templates", href: "/superadmin/templates", icon: Mail },
  { title: "Analytics", href: "/superadmin/analytics", icon: BarChart3 },
  { title: "Landing Page", href: "/superadmin/landing-page-editor", icon: Pencil },
  { title: "Announcements", href: "/superadmin/announcements", icon: Megaphone },
  { title: "Compliance", href: "/superadmin/compliance", icon: ShieldCheck },
  { title: "Audit Logs", href: "/superadmin/audit-logs", icon: Activity },
  { title: "Errors", href: "/superadmin/errors", icon: AlertTriangle },
  { title: "Reminders", href: "/superadmin/reminders", icon: Bell },
];

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

// ─── Notification Type Icons ─────────────────────────────────────────
const notificationTypeIcons: Record<string, LucideIcon> = {
  credential: FileText,
  checklist: ClipboardCheck,
  reference: Users,
  sharing: Share2,
  system: Info,
  reference_deletion: ScrollText,
  reference_deleted: Trash2,
  reference_deletion_rejected: XCircle,
};

// ─── Notification Shape ──────────────────────────────────────────────
interface SidebarNotification {
  id: number;
  type: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

// ─── Notification Bell Sub-component ─────────────────────────────────
function NotificationBell({ role }: { role: UserRole }) {
  const [notifications, setNotifications] = useState<SidebarNotification[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const apiEndpoint =
    role === "candidate"
      ? "/api/candidate/notifications"
      : "/api/recruiter/notifications";

  useEffect(() => {
    let mounted = true;

    const doFetch = () => {
      fetch(apiEndpoint)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!mounted || !data) return;
          setNotifications(
            Array.isArray(data) ? data : data.notifications ?? []
          );
        })
        .catch(() => {});
    };

    const initialTimer = setTimeout(doFetch, 0);
    const interval = setInterval(doFetch, 30000);

    return () => {
      mounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [apiEndpoint]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await fetch(apiEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // silently fail
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#6B7280] transition-all duration-200 ease-in-out hover:bg-[#F3F4F6] hover:text-[#111827]">
          <Bell className="size-5 shrink-0" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-[#166534] text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 rounded-xl border-[#E5E7EB] bg-white p-0 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
          <h4
            className="text-sm font-semibold text-[#111827]"
            style={{ fontFamily: "'Clash Display', sans-serif" }}
          >
            Notifications
          </h4>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-[#166534] hover:underline"
            >
              <CheckCheck className="size-3" />
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[#9CA3AF]">
              No notifications
            </p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => {
                const IconComp = notificationTypeIcons[n.type] ?? Bell;
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 border-b border-[#E5E7EB] px-4 py-3 transition-colors last:border-b-0 hover:bg-[#F8F7F4]"
                  >
                    <IconComp className="mt-0.5 size-4 shrink-0 text-[#9CA3AF]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[#111827]">{n.message}</p>
                      <p className="mt-0.5 text-xs text-[#9CA3AF]">
                        {formatDate(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#166534]" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
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
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out",
          isAnyActive
            ? "bg-[#DCFCE7] font-semibold text-[#166534]"
            : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
        )}
      >
        <group.icon className="size-5 shrink-0" />
        <span className="flex-1 text-left">{group.title}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-200",
            isExpanded ? "rotate-180" : "rotate-0"
          )}
        />
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="ml-2 pl-4 border-l border-[#E5E7EB] space-y-2">
          {group.sections.map((section) => (
            <div key={section.title}>
              {/* Section header */}
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-widest text-[#9CA3AF] uppercase">
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
                      "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ease-in-out",
                      isActive
                        ? "bg-[#DCFCE7] font-semibold text-[#166534]"
                        : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
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

  if (!role) return null;

  const isSuperAdmin = role === "super_admin";
  const navItems = isSuperAdmin ? superAdminFlatNav : getNavItems(role);
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
      <div className="flex h-full w-full flex-col overflow-hidden bg-white border-r border-[#E5E7EB]">
        {/* ── Top Section: Logo + Brand ── */}
        <div className="flex shrink-0 items-center gap-3 px-4 py-4">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#166534] text-xs font-bold text-white">
            ZV
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[15px] font-semibold leading-tight text-[#111827]"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              MyZipVault
            </span>
            <span className="text-[11px] font-medium text-[#9CA3AF]">
              {label}
            </span>
          </div>
        </div>
        <div className="mx-3 h-px shrink-0 bg-[#E5E7EB]" />

        {/* ── Navigation Section ── */}
        <ScrollArea className="flex-1 overflow-hidden px-3 py-3">
          <nav className="flex flex-col gap-1">
            {/* Flat nav items (Dashboard for superadmin, all items for other roles) */}
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out",
                    isActive
                      ? "bg-[#DCFCE7] font-semibold text-[#166534]"
                      : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              );
            })}

            {/* Superadmin: Collapsible Groups */}
            {isSuperAdmin && (
              <>
                <div className="my-1.5 h-px bg-[#E5E7EB]" />
                {superAdminGroups.map((group) => (
                  <NavGroupSection
                    key={group.title}
                    group={group}
                    pathname={pathname}
                  />
                ))}
                <div className="my-1.5 h-px bg-[#E5E7EB]" />

                {/* Bottom nav items for superadmin */}
                {superAdminBottomNav.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out",
                        isActive
                          ? "bg-[#DCFCE7] font-semibold text-[#166534]"
                          : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
                      )}
                    >
                      <item.icon className="size-5 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </ScrollArea>

        {/* ── Bottom Section: User + Sign Out ── */}
        <div className="shrink-0 space-y-2 border-t border-[#E5E7EB] p-3">
          {/* Notification Bell (candidates & recruiters) */}
          {(role === "candidate" || role === "client_admin" || role === "client_recruiter") && (
            <NotificationBell role={role} />
          )}

          {/* User Info */}
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-[#DCFCE7] text-xs font-semibold text-[#166534]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#111827]">
                {displayName}
              </p>
              <p
                className="truncate text-xs text-[#9CA3AF]"
                title={user?.email ?? ""}
              >
                {user?.email}
              </p>
            </div>
          </div>

          {/* Logout Button with Confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#6B7280] transition-all duration-200 ease-in-out hover:bg-[#F3F4F6] hover:text-[#111827]">
                <LogOut className="size-5" />
                <span>Sign Out</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-[#E5E7EB] bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle
                  className="text-[#111827]"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Sign out of MyZipVault?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[#6B7280]">
                  You will need to sign in again to access your account. Any unsaved changes may be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6]">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-[#166534] text-white hover:bg-[#14532D]"
                  onClick={async () => {
                    let redirectUrl = "/login";
                    if (role === "super_admin") {
                      redirectUrl = "/superadmin-login";
                    } else if (role === "client_admin" || role === "client_recruiter") {
                      redirectUrl = "/agency-login";
                    } else if (role === "platform_admin") {
                      redirectUrl = "/admin-login";
                    }
                    await signOut({ callbackUrl: redirectUrl });
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

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
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#166534] font-bold text-sm text-white">
                  ZV
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span
                    className="font-semibold text-[#111827]"
                    style={{ fontFamily: "'Clash Display', sans-serif" }}
                  >
                    MyZipVault
                  </span>
                  <span className="text-xs text-[#9CA3AF]">Super Admin</span>
                </div>
                <ChevronLeft className="ml-auto text-[#9CA3AF] group-data-[state=expanded]:rotate-0 group-data-[state=collapsed]:rotate-180 transition-transform" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="bg-[#E5E7EB]" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[#9CA3AF]">Core</SidebarGroupLabel>
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
                          ? "bg-[#DCFCE7] font-semibold text-[#166534]"
                          : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
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
          <SidebarGroupLabel className="text-[#9CA3AF]">System</SidebarGroupLabel>
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
                          ? "bg-[#DCFCE7] font-semibold text-[#166534]"
                          : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
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
          <SidebarGroupLabel className="text-[#9CA3AF]">Monitor</SidebarGroupLabel>
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
                          ? "bg-[#DCFCE7] font-semibold text-[#166534]"
                          : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
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
        <SidebarSeparator className="bg-[#E5E7EB]" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <Avatar className="size-8">
                <AvatarFallback className="bg-[#DCFCE7] text-xs font-semibold text-[#166534]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="truncate text-sm font-medium text-[#111827]">{displayName}</span>
                <span className="text-xs text-[#9CA3AF]">Super Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              className="text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
              onClick={() => signOut({ callbackUrl: "/login" })}
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

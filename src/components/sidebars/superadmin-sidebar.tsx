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
} from "lucide-react";

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

const coreNavItems = [
  { title: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard },
  { title: "Users", href: "/superadmin/users", icon: Users },
  { title: "Companies", href: "/superadmin/companies", icon: Building2 },
  { title: "Admins", href: "/superadmin/admins", icon: ShieldCheck },
];

const systemNavItems = [
  { title: "Settings", href: "/superadmin/settings", icon: Settings },
  { title: "Feature Flags", href: "/superadmin/feature-flags", icon: ToggleLeft },
  { title: "API Vault", href: "/superadmin/api-vault", icon: KeyRound },
  { title: "Templates", href: "/superadmin/templates", icon: FileCode },
  { title: "Analytics", href: "/superadmin/analytics", icon: BarChart3 },
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
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-bold text-sm">
                  ZV
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">MyZipVault</span>
                  <span className="text-xs text-muted-foreground">Super Admin</span>
                </div>
                <ChevronLeft className="ml-auto group-data-[state=expanded]:rotate-0 group-data-[state=collapsed]:rotate-180 transition-transform" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Monitor</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {monitorNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium text-sm truncate">{displayName}</span>
                <span className="text-xs text-muted-foreground">Super Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

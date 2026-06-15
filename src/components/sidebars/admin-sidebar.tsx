"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  FileText,
  PenSquare,
  Bell,
  LogOut,
  ChevronLeft,
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

const navItems = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Documents", href: "/admin/documents", icon: FileText },
  { title: "Content", href: "/admin/content", icon: PenSquare },
  { title: "Reminders", href: "/admin/reminders", icon: Bell },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.email?.[0]?.toUpperCase() ?? "A";

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? "Admin";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin/dashboard">
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
                  <span className="text-xs text-[var(--text-muted)]">Admin Portal</span>
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
          <SidebarGroupLabel className="text-[var(--text-muted)]">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
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
                <span className="text-xs text-[var(--text-muted)]">Platform Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              className="text-[var(--text-secondary)] hover:bg-surface-2 hover:text-foreground"
              onClick={async () => { try { await signOut({ redirect: false }); } catch {} window.location.href = "/admin-login"; }}
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

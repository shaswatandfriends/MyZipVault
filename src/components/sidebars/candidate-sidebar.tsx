"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShieldCheck,
  FileText,
  Users,
  Share2,
  Settings,
  LogOut,
  ChevronLeft,
  CalendarDays,
  ClipboardCheck,
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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Checklists", href: "/checklists", icon: ClipboardCheck },
  { title: "Credentials", href: "/vault/credentials", icon: ShieldCheck },
  { title: "Resume", href: "/vault/resume", icon: FileText },
  { title: "References", href: "/references", icon: Users },
  { title: "Sharing", href: "/sharing", icon: Share2 },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function CandidateSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.email?.[0]?.toUpperCase() ?? "C";

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? "Candidate";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
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
                  <span className="text-xs text-[var(--text-muted)]">Candidate Portal</span>
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
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
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
                <span className="text-xs text-[var(--text-muted)]">Candidate</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              className="text-[var(--text-secondary)] hover:bg-surface-2 hover:text-foreground"
              onClick={async () => { try { await signOut({ redirect: false }); } catch {} window.location.href = "/login"; }}
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

export function CandidateSidebarTrigger() {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <Button variant="ghost" size="sm" className="md:hidden text-[var(--text-secondary)] hover:text-[var(--foreground)]" asChild>
        <Link href="/dashboard">
          <ChevronLeft className="mr-1 size-4" />
          Back
        </Link>
      </Button>
    </div>
  );
}

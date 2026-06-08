"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  Send,
  CreditCard,
  FileSignature,
  Users,
  LogOut,
  ChevronLeft,
  Bell,
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
  { title: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { title: "Calendar", href: "/recruiter/calendar", icon: CalendarDays },
  { title: "Send Request", href: "/recruiter/send", icon: Send },
  { title: "Billing", href: "/recruiter/billing", icon: CreditCard },
  { title: "BAA", href: "/recruiter/baa", icon: FileSignature },
  { title: "Team", href: "/recruiter/team", icon: Users, adminOnly: true },
  { title: "Notifications", href: "/recruiter/notifications", icon: Bell },
];

export function RecruiterSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isClientAdmin = user?.role === "client_admin";

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isClientAdmin
  );

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.email?.[0]?.toUpperCase() ?? "R";

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? "Recruiter";

  const roleLabel =
    user?.role === "client_admin" ? "Client Admin" : "Recruiter";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/recruiter/dashboard">
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
                  <span className="text-xs text-[#9CA3AF]">Recruiter Portal</span>
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
          <SidebarGroupLabel className="text-[#9CA3AF]">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href === "/recruiter/candidates" &&
                    pathname.startsWith("/recruiter/candidates"));

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
                <span className="text-xs text-[#9CA3AF]">{roleLabel}</span>
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

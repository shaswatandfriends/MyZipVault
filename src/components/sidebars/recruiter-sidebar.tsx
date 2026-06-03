"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Send,
  CreditCard,
  FileSignature,
  Users,
  LogOut,
  ChevronLeft,
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

const navItems = [
  { title: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { title: "Send Request", href: "/recruiter/send", icon: Send },
  { title: "Billing", href: "/recruiter/billing", icon: CreditCard },
  { title: "BAA", href: "/recruiter/baa", icon: FileSignature },
  { title: "Team", href: "/recruiter/team", icon: Users, adminOnly: true },
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
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-bold text-sm">
                  ZV
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">MyZipVault</span>
                  <span className="text-xs text-muted-foreground">Recruiter Portal</span>
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
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
                    >
                      <Link href={item.href}>
                        <item.icon />
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
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium text-sm truncate">{displayName}</span>
                <span className="text-xs text-muted-foreground">{roleLabel}</span>
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

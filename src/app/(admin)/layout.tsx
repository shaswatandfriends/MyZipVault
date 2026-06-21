"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { PageTransition } from "@/components/motion";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const displayName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "Admin";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="spatial-header flex h-14 items-center gap-3 px-6 sticky top-0 z-30">
          <SidebarTrigger className="-ml-1 text-text-secondary hover:text-foreground transition-colors" />
          <Separator orientation="vertical" className="mr-2 !h-4 bg-border" />
          <div className="flex items-center justify-between flex-1 min-w-0">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate font-heading tracking-tight">
                Welcome, {displayName}
              </h1>
              <p className="text-xs text-text-secondary truncate">Platform administration & monitoring</p>
            </div>
          </div>
        </header>
        <div className="relative min-h-screen">
          <div className="mesh-background" />
          <div className="p-6 md:p-10 relative z-10">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

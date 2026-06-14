"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const displayName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "Super Admin";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b border-[#E5E7EB] px-6 bg-white">
          <SidebarTrigger className="-ml-1 text-[#6B7280] hover:text-[#111827]" />
          <Separator orientation="vertical" className="mr-2 !h-4 bg-[#E5E7EB]" />
          <div className="flex items-center justify-between flex-1 min-w-0">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-[#111827] truncate" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                Welcome, {displayName}
              </h1>
              <p className="text-[11px] text-[#6B7280] truncate">Super admin & system oversight</p>
            </div>
          </div>
        </header>
        <div className="p-6 md:p-8 bg-[#F8F7F4] min-h-screen">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

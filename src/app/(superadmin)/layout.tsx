"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { Separator } from "@/components/ui/separator";

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 items-center gap-3 border-b border-[#E5E7EB] px-6 bg-white">
          <SidebarTrigger className="-ml-1 text-[#6B7280] hover:text-[#111827]" />
          <Separator orientation="vertical" className="mr-2 !h-4 bg-[#E5E7EB]" />
          <span
            className="text-sm font-semibold text-[#111827]"
            style={{ fontFamily: "'Clash Display', sans-serif" }}
          >
            Super Admin
          </span>
        </header>
        <div className="p-6 md:p-8 bg-[#F8F7F4] min-h-screen">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { PageTransition } from "@/components/motion";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-screen flex flex-col overflow-hidden relative">
        <div className="mesh-background" />
        <EmailVerificationBanner />
        {/* No header bar — collapse button is inside the sidebar next to logo */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10">
          <div className="p-4 md:p-6 relative z-10">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

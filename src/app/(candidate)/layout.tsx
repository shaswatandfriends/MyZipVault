"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/components/providers/auth-provider";
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
        {/* Minimal header — just the sidebar collapse toggle */}
        <header className="spatial-header flex h-12 items-center px-4 shrink-0 z-30 relative">
          <SidebarTrigger className="text-text-secondary hover:text-foreground transition-colors" />
        </header>
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

"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { CreditLowPopup } from "@/components/credit-low-popup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/motion";
import { CreditCard, Send } from "@/lib/icons";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const isClientAdmin = user?.role === "client_admin";

  // Fetch credits balance for header
  const [credits, setCredits] = useState<number | null>(null);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/recruiter/credits/balance");
      if (res.ok) {
        const data = await res.json();
        setCredits(data?.balance ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const isRecruiterRole =
    user?.role === "client_admin" || user?.role === "client_recruiter";

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
                Dashboard
              </h1>
              <p className="text-xs text-text-secondary truncate">
                Manage your candidate verification requests and track your organization&apos;s activity
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <div className="spatial-material-thin flex items-center gap-2 px-3 py-1.5">
                <CreditCard className="size-3.5 text-primary" />
                <span className="text-xs font-medium text-text-secondary">Credits</span>
                <Badge className="text-white border-0 text-xs px-2 py-0">
                  {credits ?? "..."}
                </Badge>
              </div>
              <Button asChild className="h-8 text-xs">
                <Link href="/recruiter/send">
                  <Send className="size-3" />
                  Send Request
                </Link>
              </Button>
            </div>
          </div>
        </header>
        <div className="relative min-h-screen overflow-x-hidden">
          <div className="mesh-background" />
          <div className="p-6 md:p-10 relative z-10">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </div>
      </SidebarInset>

      {/* Low Credits Popup — only for client_admin and client_recruiter */}
      {isRecruiterRole && <CreditLowPopup />}
    </SidebarProvider>
  );
}

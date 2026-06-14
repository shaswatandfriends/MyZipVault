"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { CreditLowPopup } from "@/components/credit-low-popup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        <header className="flex h-14 items-center gap-3 border-b border-[#E5E7EB] px-6 bg-white">
          <SidebarTrigger className="-ml-1 text-[#6B7280] hover:text-[#111827]" />
          <Separator orientation="vertical" className="mr-2 !h-4 bg-[#E5E7EB]" />
          <div className="flex items-center justify-between flex-1 min-w-0">
            <div className="min-w-0">
              <h1
                className="text-sm font-semibold text-[#111827] truncate"
                style={{ fontFamily: "'Clash Display', sans-serif" }}
              >
                Dashboard
              </h1>
              <p className="text-[11px] text-[#6B7280] truncate">
                Manage your candidate verification requests and track your organization&apos;s activity
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-dashed border-[#E5E7EB]">
                <CreditCard className="size-3.5 text-emerald-600" />
                <span className="text-[11px] font-medium text-[#6B7280]">Credits</span>
                <Badge className="bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-600 text-xs px-1.5 py-0">
                  {credits ?? "…"}
                </Badge>
              </div>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-3">
                <Link href="/recruiter/send">
                  <Send className="size-3" />
                  Send Request
                </Link>
              </Button>
            </div>
          </div>
        </header>
        <div className="p-6 md:p-8 bg-[#F8F7F4] min-h-screen">{children}</div>
      </SidebarInset>

      {/* Low Credits Popup — only for client_admin and client_recruiter */}
      {isRecruiterRole && <CreditLowPopup />}
    </SidebarProvider>
  );
}

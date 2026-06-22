"use client";

import { useCallback, useEffect, useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { PageTransition } from "@/components/motion";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import Link from "next/link";
import { ArrowUpRight } from "@/lib/icons";

// ─── Circular Progress Component ─────────────────────────────────
function CircularProgress({
  percentage,
  size = 32,
  strokeWidth = 3,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 100
      ? "var(--primary)"
      : percentage >= 50
        ? "var(--primary-vivid)"
        : percentage >= 25
          ? "var(--terra)"
          : "var(--badge-red)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold" style={{ color }}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [profileCompletion, setProfileCompletion] = useState(0);

  // Fetch profile completion dynamically
  const fetchProfileCompletion = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/profile");
      if (res.ok) {
        const data = await res.json();
        setProfileCompletion(data.profileCompletionPct ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchProfileCompletion();
  }, [fetchProfileCompletion]);

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : "there";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-screen flex flex-col overflow-hidden relative">
        <div className="mesh-background" />
        <EmailVerificationBanner />
        <header className="spatial-header flex h-14 items-center gap-3 px-6 shrink-0 z-30 relative">
          <SidebarTrigger className="-ml-1 text-text-secondary hover:text-foreground transition-colors" />
          <Separator orientation="vertical" className="mr-2 !h-4 bg-border" />
          <div className="flex items-center justify-between flex-1 min-w-0">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate font-heading tracking-tight">
                Welcome, {displayName}
              </h1>
              <p className="text-xs text-text-secondary truncate">
                Here&apos;s an overview of your vault
              </p>
            </div>
            <Link href="/profile-completion" className="group shrink-0 ml-3">
              <div className="relative flex items-center gap-2 cursor-pointer">
                <CircularProgress percentage={profileCompletion} size={32} strokeWidth={3} />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-tight">
                    Profile
                  </span>
                  <span className="text-[10px] text-text-secondary leading-tight">
                    {profileCompletion}% done
                  </span>
                </div>
                <ArrowUpRight className="size-2.5 text-text-muted group-hover:text-primary transition-colors" />
              </div>
            </Link>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10">
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
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
      ? "#166534"
      : percentage >= 50
        ? "#16A34A"
        : percentage >= 25
          ? "#F59E0B"
          : "#EF4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
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
                Welcome, {displayName}
              </h1>
              <p className="text-[11px] text-[#6B7280] truncate">
                Here&apos;s an overview of your vault
              </p>
            </div>
            <Link href="/profile-completion" className="group shrink-0 ml-3">
              <div className="relative flex items-center gap-2 cursor-pointer">
                <CircularProgress percentage={profileCompletion} size={32} strokeWidth={3} />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-[#111827] group-hover:text-[#166534] transition-colors leading-tight">
                    Profile
                  </span>
                  <span className="text-[9px] text-[#6B7280] leading-tight">
                    {profileCompletion}% done
                  </span>
                </div>
                <ArrowUpRight className="size-2.5 text-[#9CA3AF] group-hover:text-[#166534] transition-colors" />
              </div>
            </Link>
          </div>
        </header>
        <div className="p-6 md:p-8 bg-[#F8F7F4] min-h-screen">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

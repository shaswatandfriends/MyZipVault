"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Mail,
  FileText,
  ShieldCheck,
  Users,
  CalendarDays,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "@/lib/icons";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Circular Progress (larger version for profile page) ──────────
function CircularProgress({
  percentage,
  size = 160,
  strokeWidth = 10,
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
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {percentage}%
        </span>
        <span className="text-xs text-text-secondary mt-0.5">Complete</span>
      </div>
    </div>
  );
}

// ─── Profile Data Interface ───────────────────────────────────────
interface ProfileData {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  emailVerified: boolean;
  hasResume: boolean;
  credentialCount: number;
  referenceCount: number;
  hasAvailability: boolean;
  profileCompletionPct: number;
}

// ─── Completion Item Component ────────────────────────────────────
function CompletionItem({
  icon: Icon,
  title,
  description,
  weight,
  isComplete,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  weight: number;
  isComplete: boolean;
  href: string;
}) {
  return (
    <Card className={cn(isComplete && "border-green-200 bg-green-50/50")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "size-10 rounded-lg flex items-center justify-center shrink-0",
              isComplete ? "bg-primary/10" : "bg-[#F3F4F6]"
            )}
          >
            <Icon
              className={cn(
                "size-5",
                isComplete ? "text-primary" : "text-text-muted"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <Badge
                variant={isComplete ? "default" : "secondary"}
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  isComplete && "bg-primary text-white"
                )}
              >
                {weight}%
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{description}</p>
          </div>
          {isComplete ? (
            <CheckCircle2 className="size-5 text-primary shrink-0" />
          ) : (
            <Link href={href}>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs shrink-0"
              >
                Complete <ArrowRight className="size-3" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Profile Completion Page ─────────────────────────────────
export default function ProfileCompletionPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/profile");
      if (res.ok) {
        const profileData = await res.json();
        setData({
          firstName: profileData.firstName ?? null,
          lastName: profileData.lastName ?? null,
          phone: profileData.phone ?? null,
          emailVerified: !!profileData.emailVerified,
          hasResume: !!profileData.hasResume,
          credentialCount: profileData.credentialCount ?? 0,
          referenceCount: profileData.referenceCount ?? 0,
          hasAvailability: !!profileData.hasAvailability,
          profileCompletionPct: profileData.profileCompletionPct ?? 0,
        });
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex flex-col items-center py-8">
          <Skeleton className="size-40 rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const completionItems = [
    {
      icon: User,
      title: "Profile Information",
      description: "Fill in your first name, last name, and phone number",
      weight: 20,
      isComplete: !!(data.firstName && data.lastName && data.phone),
      href: "/settings",
    },
    {
      icon: Mail,
      title: "Email Verification",
      description: "Verify your email address to secure your account",
      weight: 15,
      isComplete: data.emailVerified,
      href: "/settings",
    },
    {
      icon: FileText,
      title: "Resume",
      description: "Upload or build your resume using our AI-powered builder",
      weight: 25,
      isComplete: data.hasResume,
      href: "/vault/resume",
    },
    {
      icon: ShieldCheck,
      title: "Credentials",
      description: "Add at least one credential (license, certification, etc.)",
      weight: 15,
      isComplete: data.credentialCount > 0,
      href: "/vault/credentials",
    },
    {
      icon: Users,
      title: "References",
      description: "Request at least one professional reference",
      weight: 15,
      isComplete: data.referenceCount > 0,
      href: "/references",
    },
    {
      icon: CalendarDays,
      title: "Availability",
      description: "Set your availability on the calendar so recruiters can find you",
      weight: 10,
      isComplete: data.hasAvailability,
      href: "/calendar",
    },
  ];

  const completedCount = completionItems.filter((i) => i.isComplete).length;
  const totalCount = completionItems.length;

  const displayName =
    data.firstName && data.lastName
      ? `${data.firstName} ${data.lastName}`
      : user?.email ?? "User";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-xl font-semibold text-foreground sm:text-2xl"
          style={{ fontFamily: "'Satoshi', sans-serif" }}
        >
          Profile Completion
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Complete your profile to unlock full access for recruiters and agencies.
        </p>
      </div>

      {/* Circle + Summary */}
      <div className="flex flex-col items-center py-6">
        <CircularProgress percentage={data.profileCompletionPct} />
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-foreground">
            {displayName}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {completedCount} of {totalCount} steps completed
          </p>
        </div>
        {data.profileCompletionPct === 100 && (
          <div className="mt-4 flex items-center gap-2 rounded-full bg-primary-light px-4 py-2">
            <CheckCircle2 className="size-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Your profile is complete!
            </span>
          </div>
        )}
        {data.profileCompletionPct < 100 && (
          <p className="mt-4 text-center text-xs text-text-secondary max-w-md">
            Recruiters are more likely to reach out to candidates with complete profiles.
            Each step brings you closer to unlocking full visibility.
          </p>
        )}
      </div>

      {/* Completion Items */}
      <div className="space-y-3">
        {completionItems.map((item) => (
          <CompletionItem key={item.title} {...item} />
        ))}
      </div>
    </div>
  );
}

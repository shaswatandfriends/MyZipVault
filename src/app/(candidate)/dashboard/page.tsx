"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck,
  ShieldCheck,
  Users,
  FileText,
  Bell,
  X,
  ArrowRight,
  PartyPopper,
  CheckCircle2,
  Sparkles,
  CalendarDays,
  Mail,
  Loader2,
} from "@/lib/icons";
import Link from "next/link";
import { toast } from "sonner";

interface DashboardData {
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    profileCompletionPct: number;
  } | null;
  resume: { id: number; fileUrl: string | null } | null;
  credentials: { total: number; active: number };
  checklists: { total: number; completed: number; pending: number };
  references: { total: number; completed: number };
  pendingChecklistRequests: {
    id: number;
    checklistName: string;
    status: string;
    createdAt: string;
  }[];
  notifications: {
    id: number;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
  }[];
  emailVerified: boolean;
}

export default function CandidateDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [showEmailBanner, setShowEmailBanner] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [thankYouState, setThankYouState] = useState<{
    show: boolean;
    pct: number;
  } | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const dashboardData = await res.json();
      setData(dashboardData);
    } catch {
      setError("Failed to load dashboard. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Check for thank you state from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const submitted = params.get("submitted");
    if (submitted === "true") {
      setThankYouState({ show: true, pct: data?.profile?.profileCompletionPct ?? 0 });
    }
  }, [data?.profile?.profileCompletionPct]);

  // Check if email verification banner was dismissed this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem("emailBannerDismissed");
    if (dismissed === "true") {
      setShowEmailBanner(false);
    }
  }, []);

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setIsResending(true);
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (res.ok) {
        toast.success("Verification email sent", {
          description: "Check your inbox for the verification link.",
        });
      } else {
        toast.error("Failed to send verification email. Please try again.");
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const dismissEmailBanner = () => {
    setShowEmailBanner(false);
    sessionStorage.setItem("emailBannerDismissed", "true");
  };

  const dismissBanner = () => setShowBanner(false);

  const dismissThankYou = () => setThankYouState(null);

  const displayName =
    data?.profile?.firstName && data?.profile?.lastName
      ? `${data.profile.firstName} ${data.profile.lastName}`
      : user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : "there";

  const profileCompletion = data?.profile?.profileCompletionPct ?? 0;
  const hasResume = !!data?.resume?.fileUrl;
  const isEmptyState =
    !data?.checklists?.total &&
    !data?.credentials?.total &&
    !data?.references?.total &&
    !hasResume;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchDashboard} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${displayName}`}
        description="Here's an overview of your credential vault"
      />

      {/* Thank You State */}
      {thankYouState?.show && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            {thankYouState.pct >= 100 ? (
              <PartyPopper className="size-5 text-primary shrink-0 mt-0.5" />
            ) : thankYouState.pct >= 25 ? (
              <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              {thankYouState.pct >= 100 ? (
                <>
                  <p className="font-medium text-sm">You&apos;re all set!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your profile is fully ready. Recruiters can now access your verified credentials.
                  </p>
                </>
              ) : thankYouState.pct >= 25 ? (
                <>
                  <p className="font-medium text-sm">Your checklist is saved!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your profile is {thankYouState.pct}% complete. Keep going to unlock full access for recruiters.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-sm">Great job! Your checklist is saved!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You&apos;re just getting started. Complete your profile to make it visible to recruiters.
                  </p>
                </>
              )}
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={dismissThankYou}>
              <X className="size-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Email Verification Banner */}
      {!data?.emailVerified && showEmailBanner && (
        <Card className="border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Mail className="size-5 text-green-700 dark:text-green-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Please verify your email address
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                Check your inbox or resend the verification email.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-green-300 text-green-800 hover:bg-green-100 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-900"
                disabled={isResending}
                onClick={handleResendVerification}
              >
                {isResending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  "Resend"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissEmailBanner}
                className="text-green-600 dark:text-green-400"
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Banner */}
      {data?.pendingChecklistRequests?.length > 0 && showBanner && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                You have {data.pendingChecklistRequests.length} pending checklist{" "}
                {data.pendingChecklistRequests.length === 1 ? "request" : "requests"}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Complete your skills checklists to share with employers
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/checklists">
                <Button size="sm" variant="outline" className="gap-1 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900">
                  View <ArrowRight className="size-3" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={dismissBanner} className="text-amber-600 dark:text-amber-400">
                <X className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Completion */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Profile Completion</p>
            <span className="text-sm font-semibold text-primary">{profileCompletion}%</span>
          </div>
          <Progress value={profileCompletion} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {profileCompletion === 0
              ? "Start by completing your profile information"
              : profileCompletion < 50
                ? "Keep going! Add more details to strengthen your profile"
                : profileCompletion < 100
                  ? "Almost there! Complete your profile for full access"
                  : "Your profile is complete! 🎉"}
          </p>
        </CardContent>
      </Card>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="group hover:shadow-md transition-shadow">
          <Link href="/vault/resume">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="size-4 text-primary" />
                </div>
                <Badge variant={hasResume ? "default" : "secondary"} className="text-xs">
                  {hasResume ? "Uploaded" : "Not Added"}
                </Badge>
              </div>
              <p className="text-sm font-medium">Resume</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasResume ? "Resume on file" : "Upload your resume"}
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="group hover:shadow-md transition-shadow">
          <Link href="/checklists">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardCheck className="size-4 text-primary" />
                </div>
                {data?.checklists?.pending > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {data.checklists.pending} pending
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium">Checklists</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data?.checklists?.completed ?? 0} of {data?.checklists?.total ?? 0} completed
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="group hover:shadow-md transition-shadow">
          <Link href="/calendar">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="size-4 text-primary" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  Schedule
                </Badge>
              </div>
              <p className="text-sm font-medium">Calendar</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track deadlines & expirations
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="group hover:shadow-md transition-shadow">
          <Link href="/vault/credentials">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="size-4 text-primary" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {data?.credentials?.active ?? 0} active
                </Badge>
              </div>
              <p className="text-sm font-medium">Credentials</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data?.credentials?.total ?? 0} total documents
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="group hover:shadow-md transition-shadow">
          <Link href="/references">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="size-4 text-primary" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {data?.references?.completed ?? 0} done
                </Badge>
              </div>
              <p className="text-sm font-medium">References</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data?.references?.total ?? 0} total references
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Empty State for Organic Signups */}
      {isEmptyState && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="size-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Welcome to MyZipVault</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Your vault is ready. Start by uploading your resume or adding your certifications
              to build your verified professional profile.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
              <Link href="/vault/resume">
                <Button className="gap-2">
                  <FileText className="size-4" />
                  Upload Resume
                </Button>
              </Link>
              <Link href="/vault/credentials">
                <Button variant="outline" className="gap-2">
                  <ShieldCheck className="size-4" />
                  Add Credentials
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {data?.notifications && data.notifications.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-2 rounded-lg text-sm ${
                    notification.isRead ? "opacity-60" : "bg-muted/50"
                  }`}
                >
                  <div className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

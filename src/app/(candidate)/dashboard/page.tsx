"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck,
  ShieldCheck,
  Users,
  FileText,
  X,
  PartyPopper,
  CheckCircle2,
  Sparkles,
  CalendarDays,
  FileSignature,
  Mail,
  Download,
  ClipboardList,
  ArrowRight,
} from "@/lib/icons";
import Link from "next/link";
import { toast } from "sonner";
import { BannerCarousel } from "@/components/banners/banner-carousel";
import { RequestedDocuments } from "@/components/candidate/requested-documents";

// ─── Dashboard Data Interface ─────────────────────────────────────
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
  vaultsign: { pending: number; signed: number; total: number };
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

// ─── Main Dashboard Component ─────────────────────────────────────
export default function CandidateDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [thankYouState, setThankYouState] = useState<{
    show: boolean;
    pct: number;
  } | null>(null);
  const [emailBannerDismissed, setEmailBannerDismissed] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const dashboardData = await res.json();
      setData(dashboardData);
      setError("");
    } catch {
      const msg = "Failed to load dashboard. Please refresh.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchDashboard();
    }, 60_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchDashboard]);

  // Check for thank you state from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const submitted = params.get("submitted");
    if (submitted === "true") {
      setThankYouState({ show: true, pct: data?.profile?.profileCompletionPct ?? 0 });
    }
  }, [data?.profile?.profileCompletionPct]);

  const dismissThankYou = () => setThankYouState(null);

  const hasResume = !!data?.resume?.fileUrl;
  const isEmptyState =
    !data?.checklists?.total &&
    !data?.credentials?.total &&
    !data?.references?.total &&
    !hasResume;

  const handleExport = () => {
    if (!data) return;
    const rows = [
      ["Category", "Status", "Count", "Details"],
      ["Resume", hasResume ? "Uploaded" : "Not Added", "", data.resume?.fileUrl ? "On file" : "Not uploaded"],
      ["Credentials", "Active", String(data.credentials.active), `${data.credentials.total} total`],
      ["Checklists", "Completed", String(data.checklists.completed), `${data.checklists.completed} of ${data.checklists.total}`],
      ["References", "Completed", String(data.references.completed), `${data.references.total} total`],
      ["VaultSign", "Pending", String(data.vaultsign.pending), `${data.vaultsign.signed} signed, ${data.vaultsign.total} total`],
      ["Profile Completion", "", `${data.profile?.profileCompletionPct ?? 0}%`, ""],
      ["Email Verified", data.emailVerified ? "Yes" : "No", "", ""],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "myzipvault-dashboard.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton for welcome section */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="size-20 rounded-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-3">
      {/* ── Top Bar with Export ── */}
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
          <Download className="size-3.5" />
          Export
        </Button>
      </div>

      {/* ── Announcement Carousel ── */}
      <BannerCarousel />

      {/* ── Email Verification Nudge ── */}
      {data && !data.emailVerified && !emailBannerDismissed && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Mail className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm text-amber-800 dark:text-amber-200">
                Verify your email address
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Please verify your email to access all features and secure your account.
              </p>
              <Link href="/verify-email" className="inline-block mt-2">
                <Button size="sm" variant="outline" className="gap-1.5 border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900">
                  <Mail className="size-3.5" />
                  Verify Email
                </Button>
              </Link>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
              onClick={() => setEmailBannerDismissed(true)}
            >
              <X className="size-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Requested Documents (from recruiters) ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2 px-1">Document Requests</h2>
        <RequestedDocuments />
      </div>

      {/* ── Thank You State ── */}
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

      {/* ── Getting Started Onboarding (for new users) ── */}
      {data && (data.profile?.profileCompletionPct ?? 0) < 50 && !thankYouState?.show && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-5 text-primary" />
              <h2 className="font-semibold text-base text-foreground">Getting Started</h2>
              <Badge variant="outline" className="ml-auto text-xs">
                {data.profile?.profileCompletionPct ?? 0}% complete
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Complete these steps to build your vault and make your profile visible to recruiters.
            </p>
            <div className="space-y-2">
              {/* Step 1: Resume */}
              <Link
                href="/vault/resume"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors group"
              >
                {data.resume ? (
                  <CheckCircle2 className="size-5 text-green-600 shrink-0" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-text-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${data.resume ? "text-text-secondary line-through" : "text-foreground"}`}>
                    Upload your resume
                  </p>
                  <p className="text-xs text-text-muted">PDF or Word — we&apos;ll parse it automatically</p>
                </div>
                {!data.resume && <ArrowRight className="size-4 text-text-muted group-hover:text-primary transition-colors shrink-0" />}
              </Link>

              {/* Step 2: Credentials */}
              <Link
                href="/vault/credentials"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors group"
              >
                {data.credentials.total > 0 ? (
                  <CheckCircle2 className="size-5 text-green-600 shrink-0" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-text-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${data.credentials.total > 0 ? "text-text-secondary line-through" : "text-foreground"}`}>
                    Add a credential
                  </p>
                  <p className="text-xs text-text-muted">BLS, ACLS, immunizations, licenses, etc.</p>
                </div>
                {data.credentials.total === 0 && <ArrowRight className="size-4 text-text-muted group-hover:text-primary transition-colors shrink-0" />}
              </Link>

              {/* Step 3: Checklist */}
              <Link
                href="/checklists"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors group"
              >
                {data.checklists.completed > 0 ? (
                  <CheckCircle2 className="size-5 text-green-600 shrink-0" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-text-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${data.checklists.completed > 0 ? "text-text-secondary line-through" : "text-foreground"}`}>
                    Complete a skill checklist
                  </p>
                  <p className="text-xs text-text-muted">
                    {data.checklists.pending > 0
                      ? `You have ${data.checklists.pending} pending request${data.checklists.pending > 1 ? "s" : ""}`
                      : "Recruiters will send these — check back soon"}
                  </p>
                </div>
                {data.checklists.completed === 0 && <ArrowRight className="size-4 text-text-muted group-hover:text-primary transition-colors shrink-0" />}
              </Link>

              {/* Step 4: References */}
              <Link
                href="/references"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors group"
              >
                {data.references.total > 0 ? (
                  <CheckCircle2 className="size-5 text-green-600 shrink-0" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-text-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${data.references.total > 0 ? "text-text-secondary line-through" : "text-foreground"}`}>
                    Request a reference
                  </p>
                  <p className="text-xs text-text-muted">Ask a manager to verify your work history</p>
                </div>
                {data.references.total === 0 && <ArrowRight className="size-4 text-text-muted group-hover:text-primary transition-colors shrink-0" />}
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick Status Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="group hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: "var(--editorial-navy, #0B1F3A)" }}>
          <Link href="/vault/resume">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-lg flex items-center justify-center" style={{ background: "var(--editorial-navy, #0B1F3A)" }}>
                  <FileText className="size-4" style={{ color: "var(--editorial-cream, #F5F0E6)" }} />
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

        <Card className="group hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: "var(--editorial-gold, #C9A961)" }}>
          <Link href="/checklists">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-lg flex items-center justify-center" style={{ background: "var(--editorial-gold, #C9A961)" }}>
                  <ClipboardCheck className="size-4" style={{ color: "var(--editorial-navy, #0B1F3A)" }} />
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

        <Card className="group hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: "var(--editorial-navy, #0B1F3A)" }}>
          <Link href="/calendar">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-lg flex items-center justify-center" style={{ background: "var(--editorial-navy, #0B1F3A)" }}>
                  <CalendarDays className="size-4" style={{ color: "var(--editorial-cream, #F5F0E6)" }} />
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

        <Card className="group hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: "var(--editorial-gold, #C9A961)" }}>
          <Link href="/vault/credentials">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-lg flex items-center justify-center" style={{ background: "var(--editorial-gold, #C9A961)" }}>
                  <ShieldCheck className="size-4" style={{ color: "var(--editorial-navy, #0B1F3A)" }} />
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

        <Card className="group hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: "var(--editorial-navy, #0B1F3A)" }}>
          <Link href="/references">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-lg flex items-center justify-center" style={{ background: "var(--editorial-navy, #0B1F3A)" }}>
                  <Users className="size-4" style={{ color: "var(--editorial-cream, #F5F0E6)" }} />
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

        <Card className="group hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: "var(--editorial-gold, #C9A961)" }}>
          <Link href="/vaultsign">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-lg flex items-center justify-center" style={{ background: "var(--editorial-gold, #C9A961)" }}>
                  <FileSignature className="size-4" style={{ color: "var(--editorial-navy, #0B1F3A)" }} />
                </div>
                {(data?.vaultsign?.pending ?? 0) > 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    {data.vaultsign.pending} pending
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {data?.vaultsign?.signed ?? 0} signed
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium">VaultSign</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(data?.vaultsign?.pending ?? 0) > 0
                  ? `${data.vaultsign.pending} document${data.vaultsign.pending > 1 ? "s" : ""} to sign`
                  : `${data?.vaultsign?.total ?? 0} total documents`}
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* ── Empty State for Organic Signups ── */}
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

      {/* ── Pending Checklists Action Items ── */}
      {data?.pendingChecklistRequests && data.pendingChecklistRequests.length > 0 && (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Pending Checklists</h3>
              </div>
              <Badge variant="destructive" className="text-xs">
                {data.pendingChecklistRequests.length} pending
              </Badge>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.pendingChecklistRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{req.checklistName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Assigned {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href="/checklists">
                    <Button size="sm" variant="outline" className="gap-1 shrink-0">
                      Complete Now
                      <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Recent Activity ── */}
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

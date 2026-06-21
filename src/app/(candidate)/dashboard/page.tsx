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

// ─── Stat Card Icon Style Helper ──────────────────────────────────
// Returns spatial-styled icon container — forest green or terracotta
function statIconStyle(variant: "primary" | "terra") {
  if (variant === "terra") {
    return {
      background: "linear-gradient(180deg, #E08862 0%, #C97B54 60%, #A0522D 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(201,123,84,0.28)",
      color: "#fff",
    };
  }
  return {
    background: "linear-gradient(180deg, #4A7C59 0%, #2D5A3D 60%, #1E3A26 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(45,90,61,0.28)",
    color: "#fff",
  };
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
        <Skeleton className="h-40 w-full rounded-[20px]" />
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
            <p className="mb-4" style={{ color: "var(--status-red)" }}>{error}</p>
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
      {/* ── Announcement Carousel ── */}
      <BannerCarousel />

      {/* ── Email Verification Nudge — spatial amber callout ── */}
      {data && !data.emailVerified && !emailBannerDismissed && (
        <div
          className="rounded-[20px] p-4 flex items-start gap-3"
          style={{
            background: "var(--status-amber-bg)",
            border: "0.5px solid rgba(217,119,6,0.25)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          <Mail className="size-5 shrink-0 mt-0.5" style={{ color: "var(--status-amber)" }} />
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: "var(--status-amber-dark)" }}>
              Verify your email address
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--status-amber-dark)" }}>
              Please verify your email to access all features and secure your account.
            </p>
            <Link href="/verify-email" className="inline-block mt-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
              >
                <Mail className="size-3.5" />
                Verify Email
              </Button>
            </Link>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setEmailBannerDismissed(true)}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* ── Requested Documents (from recruiters) ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2 px-1">Document Requests</h2>
        <RequestedDocuments />
      </div>

      {/* ── Thank You State — spatial primary callout ── */}
      {thankYouState?.show && (
        <div
          className="rounded-[20px] p-4 flex items-start gap-3"
          style={{
            background: "var(--primary-light)",
            border: "0.5px solid var(--status-green-border)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          {thankYouState.pct >= 100 ? (
            <PartyPopper className="size-5 shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
          ) : thankYouState.pct >= 25 ? (
            <Sparkles className="size-5 shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
          ) : (
            <CheckCircle2 className="size-5 shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
          )}
          <div className="flex-1">
            {thankYouState.pct >= 100 ? (
              <>
                <p className="font-semibold text-sm" style={{ color: "var(--primary)" }}>You&apos;re all set!</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Your profile is fully ready. Recruiters can now access your verified credentials.
                </p>
              </>
            ) : thankYouState.pct >= 25 ? (
              <>
                <p className="font-semibold text-sm" style={{ color: "var(--primary)" }}>Your checklist is saved!</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Your profile is {thankYouState.pct}% complete. Keep going to unlock full access for recruiters.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-sm" style={{ color: "var(--primary)" }}>Great job! Your checklist is saved!</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  You&apos;re just getting started. Complete your profile to make it visible to recruiters.
                </p>
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={dismissThankYou}>
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* ── Getting Started Onboarding — spatial list items ── */}
      {data && (data.profile?.profileCompletionPct ?? 0) < 50 && !thankYouState?.show && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="size-5" style={{ color: "var(--primary)" }} />
              <h2 className="font-semibold text-base text-foreground font-heading">Getting Started</h2>
              <Badge variant="outline" className="ml-auto text-xs">
                {data.profile?.profileCompletionPct ?? 0}% complete
              </Badge>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
              Complete these steps to build your vault and make your profile visible to recruiters.
            </p>
            <div className="space-y-2">
              {/* Step 1: Resume */}
              <Link
                href="/vault/resume"
                className="spatial-list-item group"
              >
                {data.resume ? (
                  <CheckCircle2 className="size-5 shrink-0" style={{ color: "var(--primary)" }} />
                ) : (
                  <div
                    className="size-5 rounded-full shrink-0"
                    style={{ border: "2px solid var(--border-strong)" }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${data.resume ? "line-through" : ""}`}
                    style={{ color: data.resume ? "var(--text-secondary)" : "var(--text-primary)" }}
                  >
                    Upload your resume
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>PDF or Word — we&apos;ll parse it automatically</p>
                </div>
                {!data.resume && <ArrowRight className="size-4 group-hover:text-primary transition-colors shrink-0" style={{ color: "var(--text-muted)" }} />}
              </Link>

              {/* Step 2: Credentials */}
              <Link
                href="/vault/credentials"
                className="spatial-list-item group"
              >
                {data.credentials.total > 0 ? (
                  <CheckCircle2 className="size-5 shrink-0" style={{ color: "var(--primary)" }} />
                ) : (
                  <div
                    className="size-5 rounded-full shrink-0"
                    style={{ border: "2px solid var(--border-strong)" }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${data.credentials.total > 0 ? "line-through" : ""}`}
                    style={{ color: data.credentials.total > 0 ? "var(--text-secondary)" : "var(--text-primary)" }}
                  >
                    Add a credential
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>BLS, ACLS, immunizations, licenses, etc.</p>
                </div>
                {data.credentials.total === 0 && <ArrowRight className="size-4 group-hover:text-primary transition-colors shrink-0" style={{ color: "var(--text-muted)" }} />}
              </Link>

              {/* Step 3: Checklist */}
              <Link
                href="/checklists"
                className="spatial-list-item group"
              >
                {data.checklists.completed > 0 ? (
                  <CheckCircle2 className="size-5 shrink-0" style={{ color: "var(--primary)" }} />
                ) : (
                  <div
                    className="size-5 rounded-full shrink-0"
                    style={{ border: "2px solid var(--border-strong)" }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${data.checklists.completed > 0 ? "line-through" : ""}`}
                    style={{ color: data.checklists.completed > 0 ? "var(--text-secondary)" : "var(--text-primary)" }}
                  >
                    Complete a skill checklist
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {data.checklists.pending > 0
                      ? `You have ${data.checklists.pending} pending request${data.checklists.pending > 1 ? "s" : ""}`
                      : "Recruiters will send these — check back soon"}
                  </p>
                </div>
                {data.checklists.completed === 0 && <ArrowRight className="size-4 group-hover:text-primary transition-colors shrink-0" style={{ color: "var(--text-muted)" }} />}
              </Link>

              {/* Step 4: References */}
              <Link
                href="/references"
                className="spatial-list-item group"
              >
                {data.references.total > 0 ? (
                  <CheckCircle2 className="size-5 shrink-0" style={{ color: "var(--primary)" }} />
                ) : (
                  <div
                    className="size-5 rounded-full shrink-0"
                    style={{ border: "2px solid var(--border-strong)" }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${data.references.total > 0 ? "line-through" : ""}`}
                    style={{ color: data.references.total > 0 ? "var(--text-secondary)" : "var(--text-primary)" }}
                  >
                    Request a reference
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ask a manager to verify your work history</p>
                </div>
                {data.references.total === 0 && <ArrowRight className="size-4 group-hover:text-primary transition-colors shrink-0" style={{ color: "var(--text-muted)" }} />}
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick Status Cards — spatial cards with gradient icons ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="group">
          <Link href="/vault/resume">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-[10px] flex items-center justify-center" style={statIconStyle("primary")}>
                  <FileText className="size-4" />
                </div>
                <Badge variant={hasResume ? "default" : "secondary"} className="text-xs">
                  {hasResume ? "Uploaded" : "Not Added"}
                </Badge>
              </div>
              <p className="text-sm font-semibold">Resume</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {hasResume ? "Resume on file" : "Upload your resume"}
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="group">
          <Link href="/checklists">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-[10px] flex items-center justify-center" style={statIconStyle("terra")}>
                  <ClipboardCheck className="size-4" />
                </div>
                {data?.checklists?.pending > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {data.checklists.pending} pending
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold">Checklists</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {data?.checklists?.completed ?? 0} of {data?.checklists?.total ?? 0} completed
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="group">
          <Link href="/calendar">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-[10px] flex items-center justify-center" style={statIconStyle("primary")}>
                  <CalendarDays className="size-4" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  Schedule
                </Badge>
              </div>
              <p className="text-sm font-semibold">Calendar</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Track deadlines &amp; expirations
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="group">
          <Link href="/vault/credentials">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-[10px] flex items-center justify-center" style={statIconStyle("terra")}>
                  <ShieldCheck className="size-4" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {data?.credentials?.active ?? 0} active
                </Badge>
              </div>
              <p className="text-sm font-semibold">Credentials</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {data?.credentials?.total ?? 0} total documents
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="group">
          <Link href="/references">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-[10px] flex items-center justify-center" style={statIconStyle("primary")}>
                  <Users className="size-4" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {data?.references?.completed ?? 0} done
                </Badge>
              </div>
              <p className="text-sm font-semibold">References</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {data?.references?.total ?? 0} total references
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="group">
          <Link href="/vaultsign">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 rounded-[10px] flex items-center justify-center" style={statIconStyle("terra")}>
                  <FileSignature className="size-4" />
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
              <p className="text-sm font-semibold">VaultSign</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {(data?.vaultsign?.pending ?? 0) > 0
                  ? `${data.vaultsign.pending} document${data.vaultsign.pending > 1 ? "s" : ""} to sign`
                  : `${data?.vaultsign?.total ?? 0} total documents`}
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* ── Empty State — spatial empty state ── */}
      {isEmptyState && (
        <Card>
          <CardContent className="p-8 text-center">
            <div
              className="size-14 rounded-[20px] flex items-center justify-center mx-auto mb-4"
              style={{
                background: "var(--primary-light)",
                border: "0.5px solid var(--status-green-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            >
              <Sparkles className="size-7" style={{ color: "var(--primary)" }} />
            </div>
            <h3 className="text-lg font-semibold font-heading">Welcome to MyZipVault</h3>
            <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4" style={{ color: "var(--primary)" }} />
                <h3 className="text-sm font-semibold font-heading">Pending Checklists</h3>
              </div>
              <Badge variant="destructive" className="text-xs">
                {data.pendingChecklistRequests.length} pending
              </Badge>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.pendingChecklistRequests.map((req) => (
                <div
                  key={req.id}
                  className="spatial-list-item"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{req.checklistName}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
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
            <h3 className="text-sm font-semibold mb-3 font-heading">Recent Activity</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-2 rounded-[12px] text-sm ${
                    notification.isRead ? "opacity-60" : ""
                  }`}
                  style={
                    notification.isRead
                      ? {}
                      : {
                          background: "var(--material-thin-bg)",
                          backdropFilter: "blur(20px) saturate(1.5)",
                          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
                          border: "0.5px solid var(--material-thin-border)",
                        }
                  }
                >
                  <div className="size-2 rounded-full shrink-0 mt-1.5" style={{ background: "var(--primary)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{notification.message}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
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

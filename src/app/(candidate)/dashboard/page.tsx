"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck, ShieldCheck, Users, FileText,
  CheckCircle2, Sparkles, CalendarDays, FileSignature,
  ClipboardList, ArrowRight, Bell, Lock, Zap, TrendingUp,
  Upload, Share2, Settings, FolderOpen, AlertTriangle,
  FileCheck, CreditCard, Clock,
} from "@/lib/icons";
import Link from "next/link";
import { toast } from "sonner";
import { BannerCarousel } from "@/components/banners/banner-carousel";

// ─── Types ─────────────────────────────────────────────────────────
interface CredentialItem {
  id: number; documentName: string; status: string; verificationStatus: string; expirationDate: string | null;
}
interface NotificationItem {
  id: number;
  title: string | null;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityType: string | null;
}
interface DashboardData {
  profile: { firstName: string; profileCompletionPct: number } | null;
  resume: { fileUrl: string | null } | null;
  credentials: { total: number; active: number; verified: number; topItems: CredentialItem[] };
  checklists: { total: number; completed: number; pending: number };
  references: { total: number; completed: number; pending: number };
  vaultsign: { pending: number; signed: number; total: number };
  pendingChecklistRequests: { id: number; checklistName: string; status: string; createdAt: string; assignedBy: string }[];
  shareRequestCount: number;
  notifications: NotificationItem[];
  emailVerified: boolean;
  hasCalendar: boolean;
  hasActiveChecklistResponse: boolean;
  pendingItemCount: number;
}

// ─── Helpers ───────────────────────────────────────────────────────
function statIconStyle(variant: "primary" | "terra") {
  if (variant === "terra") return { background: "linear-gradient(180deg, var(--terra-light) 0%, var(--terra) 60%, var(--terra-dark) 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(201,123,84,0.28)", color: "#fff" };
  return { background: "linear-gradient(180deg, var(--primary-light) 0%, var(--primary) 60%, var(--primary-dark) 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(45,90,61,0.28)", color: "#fff" };
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatExpiry(dateStr: string | null): { text: string; isExpiring: boolean } {
  if (!dateStr) return { text: "No expiry", isExpiring: false };
  const date = new Date(dateStr);
  const days = Math.floor((date.getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: "Expired", isExpiring: true };
  if (days < 30) return { text: `Expires in ${days}d`, isExpiring: true };
  return { text: `Expires ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, isExpiring: false };
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "checklist_reminder":
    case "checklist_share_request":
      return ClipboardCheck;
    case "vaultsign_invitation":
    case "vaultsign_reminder":
      return FileSignature;
    case "credential_expiry":
      return ShieldCheck;
    case "reference_request":
      return Users;
    case "share_request":
      return Share2;
    case "call_scheduled":
    case "call_reminder":
      return CalendarDays;
    default:
      return Bell;
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Main Component ────────────────────────────────────────────────
export default function CandidateDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Initial load — sets isLoading + error
  const initialLoad = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/candidate/dashboard", { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
      setError("");
    } catch (err: unknown) {
      // Don't show error if this was an abort (request was superseded)
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Failed to load dashboard. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Polling — never hides loaded data, only shows non-blocking toast on failure
  const poll = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/candidate/dashboard", { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
      // Note: do NOT set error or isLoading here — polling failures
      // should not hide the existing dashboard. Just toast silently.
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Silent failure — keep existing data visible. Only toast once per
      // minute (the poll interval) so the user isn't spammed.
      // Note: we intentionally do NOT setError here.
      console.warn("[DASHBOARD] Poll failed, keeping existing data");
    }
  }, []);

  // Initial load on mount
  useEffect(() => { initialLoad(); }, [initialLoad]);

  // Polling interval — every 60s, never hides dashboard on failure
  useEffect(() => {
    pollingRef.current = setInterval(() => poll(), 60_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      abortRef.current?.abort();
    };
  }, [poll]);

  // ─── Derived data (memoized) ──────────────────────────────────────
  const hasResume = !!data?.resume?.fileUrl;
  const pct = data?.profile?.profileCompletionPct ?? 0;
  const firstName = data?.profile?.firstName ?? "there";

  const steps = useMemo(() => [
    { label: "Account Created", done: true },
    { label: "Email Verified", done: data?.emailVerified ?? false },
    { label: "Upload Resume", done: hasResume },
    { label: "Add Credentials", done: (data?.credentials?.total ?? 0) > 0 },
    { label: "Complete References", done: (data?.references?.completed ?? 0) > 0 },
  ], [data, hasResume]);

  const nextAction = useMemo(() => {
    if (!data) return { label: "Loading...", desc: "", href: "/dashboard", btn: "..." };
    if (!hasResume)
      return { label: "Upload Resume", desc: "Unlock AI Resume, ATS Scoring & Job Matching", href: "/vault/resume", btn: "Upload Resume" };
    if ((data.credentials?.total ?? 0) === 0)
      return { label: "Add Credentials", desc: "Add your licenses and certifications", href: "/vault/credentials", btn: "Add Credentials" };
    if ((data.references?.completed ?? 0) === 0)
      return { label: "Request Reference", desc: "Build trust with verified references", href: "/references", btn: "Request Reference" };
    return { label: "Complete Profile", desc: "Finish setup to unlock recruiter visibility", href: "/profile-completion", btn: "Continue Setup" };
  }, [data, hasResume]);

  // Action center items — counts actual items, not categories
  const actionItems = useMemo(() => {
    if (!data) return [];
    const items: { label: string; sub: string; btn: string; href: string; count: number }[] = [];
    if (data.checklists?.pending > 0)
      items.push({ label: `${data.checklists.pending} Checklist${data.checklists.pending > 1 ? "s" : ""} Assigned`, sub: "Complete your assigned skill checklists", btn: "Continue", href: "/checklists", count: data.checklists.pending });
    if (data.vaultsign?.pending > 0)
      items.push({ label: `${data.vaultsign.pending} Document${data.vaultsign.pending > 1 ? "s" : ""} to Sign`, sub: "VaultSign requests pending your signature", btn: "Review", href: "/vaultsign", count: data.vaultsign.pending });
    if (data.references?.pending > 0)
      items.push({ label: `${data.references.pending} Reference Request${data.references.pending > 1 ? "s" : ""} Pending`, sub: "Follow up on your reference requests", btn: "Respond", href: "/references", count: data.references.pending });
    if (data.shareRequestCount > 0)
      items.push({ label: `${data.shareRequestCount} Share Request${data.shareRequestCount > 1 ? "s" : ""}`, sub: "Recruiters want to access your documents", btn: "Review", href: "/sharing", count: data.shareRequestCount });
    return items;
  }, [data]);

  const pendingItemCount = data?.pendingItemCount ?? 0;

  // ─── Loading state ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[220px] w-full rounded-[24px]" />
        <Skeleton className="h-[120px] w-full rounded-[16px]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-[80px] rounded-[12px]" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-[200px] rounded-[16px]" />)}</div>
      </div>
    );
  }

  // ─── Error state (only on initial load) ───────────────────────────
  if (error && !data) {
    return <Card><CardContent className="p-6 text-center"><p className="mb-4" style={{ color: "var(--status-red)" }}>{error}</p><Button onClick={initialLoad} variant="outline">Try Again</Button></CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <BannerCarousel />

      {/* ════ SECTION 1: SMART HERO BANNER ════ */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 rounded-[24px] p-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(45,90,61,0.95) 0%, rgba(30,58,38,0.95) 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 16px 48px rgba(45,90,61,0.22)", minHeight: "220px" }}>
          <div className="absolute rounded-full pointer-events-none" style={{ width: 320, height: 320, top: -120, right: -80, background: "radial-gradient(circle, rgba(74,124,89,0.4) 0%, rgba(74,124,89,0) 70%)", filter: "blur(40px)" }} />
          <div className="absolute rounded-full pointer-events-none" style={{ width: 200, height: 200, bottom: -80, left: 40, background: "radial-gradient(circle, rgba(201,123,84,0.3) 0%, rgba(201,123,84,0) 70%)", filter: "blur(30px)" }} />
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--terra-light)" }}>Dashboard</p>
            <h1 className="text-2xl font-bold text-white mt-1 font-heading">{getTimeGreeting()}, {firstName} 👋</h1>
            <p className="text-sm text-white/70 mt-1">Complete your profile to unlock recruiter visibility</p>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white/80">Profile Completion</span>
                <span className="text-sm font-bold text-white">{pct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--terra-light), var(--terra))" }} />
              </div>
              {pct < 100 && <p className="text-xs text-white/50 mt-1.5">{pct < 50 ? "Keep going! You're just getting started." : "Almost there! Complete the remaining steps."}</p>}
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {step.done ? <CheckCircle2 className="size-4" style={{ color: "var(--badge-green)" }} /> : <div className="size-4 rounded-full border-2 border-white/30" />}
                  <span className={`text-xs ${step.done ? "text-white/90" : "text-white/50"}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Next Best Action */}
        <div className="lg:w-[280px] shrink-0 rounded-[20px] p-5" style={{ background: "var(--material-regular-bg)", backdropFilter: "var(--material-regular-blur)", WebkitBackdropFilter: "var(--material-regular-blur)", border: "0.5px solid var(--material-regular-border)", boxShadow: "var(--specular-top), var(--depth-floating)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--terra)" }}>Next Best Action</p>
          <h3 className="text-base font-bold mt-1 font-heading" style={{ color: "var(--text-primary)" }}>{nextAction.label}</h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{nextAction.desc}</p>
          <Button asChild className="w-full mt-4"><Link href={nextAction.href}>{nextAction.btn}<ArrowRight className="size-4" /></Link></Button>
        </div>
      </div>

      {/* ════ SECTION 2: ACTION CENTER ════ */}
      {actionItems.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-[8px] flex items-center justify-center" style={statIconStyle("terra")}><Bell className="size-3.5" /></div>
                <h3 className="text-sm font-bold font-heading">Action Center</h3>
              </div>
              <Badge variant="destructive" className="text-xs">{pendingItemCount}</Badge>
            </div>
            <div className="space-y-2">
              {actionItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-[10px]" style={{ background: "var(--material-thin-bg)" }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.sub}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0 h-7 text-xs"><Link href={item.href}>{item.btn}</Link></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════ SECTION 3: AT A GLANCE ════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { value: `${pct}%`, label: "Profile", color: "var(--primary)", sub: pct < 100 ? "Keep going!" : "Complete!" },
          { value: data?.credentials?.total ?? 0, label: "Documents", color: "var(--primary)", sub: `${data?.credentials?.verified ?? 0} verified` },
          { value: pendingItemCount, label: "Requests", color: "var(--terra)", sub: "Pending" },
          { value: data?.vaultsign?.pending ?? 0, label: "To Sign", color: "var(--status-amber)", sub: "VaultSign" },
        ].map((stat, i) => (
          <div key={i} className="flex flex-col items-center justify-center p-3 rounded-[14px]" style={{ background: "var(--material-thin-bg)", backdropFilter: "var(--material-thin-blur)", WebkitBackdropFilter: "var(--material-thin-blur)", border: "0.5px solid var(--material-thin-border)", boxShadow: "var(--specular-top), var(--depth-1)" }}>
            <span className="text-2xl font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</span>
            <span className="text-[10px] font-medium uppercase tracking-wide mt-0.5" style={{ color: "var(--text-muted)" }}>{stat.label}</span>
            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* ════ SECTION 4: CORE PROFESSIONAL MODULES ════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resume */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-[10px] flex items-center justify-center" style={statIconStyle("primary")}><FileText className="size-4" /></div>
              <h4 className="text-sm font-bold font-heading">Resume Status</h4>
            </div>
            {hasResume ? (
              <>
                <p className="text-sm font-medium">Resume on file</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Ready for recruiter viewing</p>
                <Button asChild variant="outline" size="sm" className="w-full mt-3"><Link href="/vault/resume">View Resume</Link></Button>
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No resume uploaded yet</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Upload or build your resume to get discovered</p>
                <div className="flex flex-col gap-2 mt-3">
                  <Button asChild size="sm"><Link href="/vault/resume"><Upload className="size-3.5" /> Upload Resume</Link></Button>
                  <Button asChild variant="outline" size="sm"><Link href="/vault/resume"><Sparkles className="size-3.5" /> Build with AI</Link></Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Credentials */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-[10px] flex items-center justify-center" style={statIconStyle("terra")}><ShieldCheck className="size-4" /></div>
              <h4 className="text-sm font-bold font-heading">Credential Status</h4>
              <Badge variant="secondary" className="ml-auto text-xs">{data?.credentials?.active ?? 0} active</Badge>
            </div>
            {(data?.credentials?.total ?? 0) > 0 ? (
              <>
                <div className="space-y-1.5">
                  {data?.credentials?.topItems?.map((cred) => {
                    const expiry = formatExpiry(cred.expirationDate);
                    return (
                      <div key={cred.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {cred.verificationStatus === "verified" ? <CheckCircle2 className="size-3.5 shrink-0" style={{ color: "var(--primary)" }} /> : expiry.isExpiring ? <AlertTriangle className="size-3.5 shrink-0" style={{ color: "var(--status-amber)" }} /> : <div className="size-3.5 rounded-full shrink-0" style={{ border: "1.5px solid var(--border-strong)" }} />}
                          <span className="truncate font-medium">{cred.documentName}</span>
                        </div>
                        <span className="shrink-0" style={{ color: expiry.isExpiring ? "var(--status-amber)" : "var(--text-muted)" }}>{expiry.text}</span>
                      </div>
                    );
                  })}
                </div>
                <Link href="/vault/credentials" className="block text-xs text-center mt-3" style={{ color: "var(--primary)" }}>View All Credentials →</Link>
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No credentials added yet</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Add BLS, ACLS, licenses, immunizations, etc.</p>
                <Button asChild size="sm" className="w-full mt-3"><Link href="/vault/credentials"><ShieldCheck className="size-3.5" /> Add Credentials</Link></Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* References */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-[10px] flex items-center justify-center" style={statIconStyle("primary")}><Users className="size-4" /></div>
              <h4 className="text-sm font-bold font-heading">References</h4>
              <Badge variant="secondary" className="ml-auto text-xs">{data?.references?.completed ?? 0} verified</Badge>
            </div>
            {(data?.references?.total ?? 0) > 0 ? (
              <>
                <p className="text-sm font-medium">{data?.references?.completed ?? 0} verified references</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{data?.references?.pending ?? 0} pending</p>
                <Link href="/references" className="block text-xs text-center mt-3" style={{ color: "var(--primary)" }}>View All References →</Link>
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No references yet</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Request references to build trust with employers</p>
                <Button asChild size="sm" className="w-full mt-3"><Link href="/references"><Users className="size-3.5" /> Request Reference</Link></Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ════ SECTION 5: QUICK ACCESS ════ */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { icon: ClipboardCheck, label: "Checklists", href: "/checklists", badge: data?.checklists?.pending, sub: data?.checklists?.pending ? `${data.checklists.pending} Pending` : "No pending" },
          { icon: CalendarDays, label: "Calendar", href: "/calendar", sub: "View schedule" },
          { icon: FileSignature, label: "VaultSign", href: "/vaultsign", badge: data?.vaultsign?.pending, sub: data?.vaultsign?.pending ? `${data.vaultsign.pending} Pending` : "All signed" },
          { icon: Share2, label: "Sharing", href: "/sharing", sub: data?.shareRequestCount ? `${data.shareRequestCount} Requests` : "0 Shared" },
          { icon: Settings, label: "Settings", href: "/settings", sub: "Manage profile" },
        ].map((item, i) => (
          <Button key={i} asChild variant="ghost" className="flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-[14px] shrink-0 min-w-[110px] h-auto" style={{ background: "var(--material-thin-bg)", backdropFilter: "var(--material-thin-blur)", WebkitBackdropFilter: "var(--material-thin-blur)", border: "0.5px solid var(--material-thin-border)", boxShadow: "var(--specular-top), var(--depth-1)" }}>
            <Link href={item.href}>
              <div className="relative">
                <item.icon className="size-5" style={{ color: i % 2 === 0 ? "var(--primary)" : "var(--terra)" }} />
                {item.badge && item.badge > 0 ? <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "var(--status-red)" }} aria-label={`${item.badge} pending`}>{item.badge}</span> : null}
              </div>
              <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
              <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{item.sub}</span>
            </Link>
          </Button>
        ))}
      </div>

      {/* ════ SECTION 6 & 7: PENDING TASKS + ACTIVITY (2-col) ════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Tasks — always render, show empty state if none */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4" style={{ color: "var(--primary)" }} />
                <h3 className="text-sm font-bold font-heading">Pending Checklists</h3>
              </div>
              {data?.pendingChecklistRequests && data.pendingChecklistRequests.length > 0 && (
                <Badge variant="destructive" className="text-xs">{data.pendingChecklistRequests.length}</Badge>
              )}
            </div>
            {data?.pendingChecklistRequests && data.pendingChecklistRequests.length > 0 ? (
              <div className="space-y-2">
                {data.pendingChecklistRequests.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-center justify-between gap-3 p-2.5 rounded-[10px]" style={{ background: "var(--material-thin-bg)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{req.checklistName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Assigned by {req.assignedBy} • {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="shrink-0 h-7 text-xs"><Link href="/checklists">Continue <ArrowRight className="size-3" /></Link></Button>
                  </div>
                ))}
                {data.pendingChecklistRequests.length > 5 && <Link href="/checklists" className="block text-xs text-center mt-2" style={{ color: "var(--primary)" }}>View All Checklists →</Link>}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="size-8 mb-2" style={{ color: "var(--primary)" }} />
                <p className="text-sm font-medium">You're all caught up!</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>No pending checklist requests</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity — always render, show empty state if none */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold font-heading">Recent Activity</h3>
              {data?.notifications && data.notifications.some(n => !n.isRead) && (
                <Badge variant="secondary" className="text-xs">
                  {data.notifications.filter(n => !n.isRead).length} new
                </Badge>
              )}
            </div>
            {data?.notifications && data.notifications.length > 0 ? (
              <div className="space-y-2">
                {data.notifications.slice(0, 6).map((n) => {
                  const NotifIcon = getNotificationIcon(n.type);
                  return (
                    <div key={n.id} className="flex items-start gap-3 p-2 rounded-[10px] text-sm" style={n.isRead ? {} : { background: "var(--material-thin-bg)" }}>
                      <div className="size-7 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: "var(--material-thin-bg)", border: "0.5px solid var(--material-thin-border)" }}>
                        <NotifIcon className="size-3.5" style={{ color: n.isRead ? "var(--text-muted)" : "var(--primary)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {n.title && <p className="text-xs font-semibold truncate">{n.title}</p>}
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{n.message}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{formatRelativeTime(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <div className="size-2 rounded-full shrink-0 mt-2" style={{ background: "var(--primary)" }} />}
                    </div>
                  );
                })}
                <Link href="/notifications" className="block text-xs text-center mt-2" style={{ color: "var(--primary)" }}>View All Notifications →</Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Bell className="size-8 mb-2" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm font-medium">No recent activity</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Notifications will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ════ SECTION 8: VALUE PROPOSITION FOOTER ════ */}
      <div className="rounded-[20px] p-5" style={{ background: "var(--material-thin-bg)", backdropFilter: "var(--material-thin-blur)", WebkitBackdropFilter: "var(--material-thin-blur)", border: "0.5px solid var(--material-thin-border)" }}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            { icon: FolderOpen, label: "All in One Vault", desc: "Store all documents in one secure place", color: "var(--primary)" },
            { icon: Zap, label: "AI Powered", desc: "AI helps build better resumes", color: "var(--terra)" },
            { icon: Lock, label: "Secure & Private", desc: "Encrypted and 100% under your control", color: "var(--primary)" },
            { icon: TrendingUp, label: "Recruiter Ready", desc: "Get discovered by top employers", color: "var(--terra)" },
            { icon: CalendarDays, label: "Always Up to Date", desc: "Never miss an expiration deadline", color: "var(--primary)" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1.5">
              <div className="size-9 rounded-[10px] flex items-center justify-center" style={{ background: "var(--material-regular-bg)", border: "0.5px solid var(--material-regular-border)" }}>
                <item.icon className="size-4" style={{ color: item.color }} />
              </div>
              <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{item.label}</span>
              <span className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>{item.desc}</span>
            </div>
          ))}
        </div>
        {pct < 100 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4" style={{ borderTop: "0.5px solid var(--border)" }}>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Your profile is {pct}% complete</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Complete the remaining steps to unlock all features</p>
            </div>
            <Button asChild><Link href="/profile-completion">Continue Setup <ArrowRight className="size-4" /></Link></Button>
          </div>
        )}
      </div>
    </div>
  );
}

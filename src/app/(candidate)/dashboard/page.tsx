"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck, ShieldCheck, Users, FileText, X, PartyPopper,
  CheckCircle2, Sparkles, CalendarDays, FileSignature, Mail,
  ClipboardList, ArrowRight, ArrowUpRight, Bell, Lock, Zap, TrendingUp,
  Upload, FileUser, Share2, Settings,
} from "@/lib/icons";
import Link from "next/link";
import { toast } from "sonner";
import { BannerCarousel } from "@/components/banners/banner-carousel";
import { RequestedDocuments } from "@/components/candidate/requested-documents";

// ─── Types ─────────────────────────────────────────────────────────
interface DashboardData {
  profile: { firstName: string; lastName: string; phone: string; profileCompletionPct: number } | null;
  resume: { id: number; fileUrl: string | null } | null;
  credentials: { total: number; active: number };
  checklists: { total: number; completed: number; pending: number };
  references: { total: number; completed: number };
  vaultsign: { pending: number; signed: number; total: number };
  pendingChecklistRequests: { id: number; checklistName: string; status: string; createdAt: string }[];
  notifications: { id: number; message: string; type: string; isRead: boolean; createdAt: string }[];
  emailVerified: boolean;
}

// ─── Icon style helper ─────────────────────────────────────────────
function statIconStyle(variant: "primary" | "terra") {
  if (variant === "terra") {
    return { background: "linear-gradient(180deg, #E08862 0%, #C97B54 60%, #A0522D 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(201,123,84,0.28)", color: "#fff" };
  }
  return { background: "linear-gradient(180deg, #4A7C59 0%, #2D5A3D 60%, #1E3A26 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(45,90,61,0.28)", color: "#fff" };
}

// ─── Main Component ────────────────────────────────────────────────
export default function CandidateDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
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
      setError("Failed to load dashboard. Please refresh.");
      toast.error("Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => {
    pollingRef.current = setInterval(() => fetchDashboard(), 60_000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchDashboard]);

  const hasResume = !!data?.resume?.fileUrl;
  const pct = data?.profile?.profileCompletionPct ?? 0;
  const displayName = data?.profile ? `${data.profile.firstName}` : "there";

  // Profile steps
  const steps = [
    { label: "Account Created", done: true },
    { label: "Email Verified", done: data?.emailVerified ?? false },
    { label: "Upload Resume", done: hasResume },
    { label: "Add Credentials", done: (data?.credentials?.total ?? 0) > 0 },
    { label: "Complete References", done: (data?.references?.completed ?? 0) > 0 },
  ];

  // Next best action
  const nextAction = !hasResume
    ? { label: "Upload Resume", desc: "Unlock AI Resume, ATS Scoring & Job Matching", href: "/vault/resume", btn: "Upload Resume" }
    : (data?.credentials?.total ?? 0) === 0
    ? { label: "Add Credentials", desc: "Add your licenses and certifications", href: "/vault/credentials", btn: "Add Credentials" }
    : (data?.references?.completed ?? 0) === 0
    ? { label: "Request Reference", desc: "Build trust with verified references", href: "/references", btn: "Request Reference" }
    : { label: "Complete Profile", desc: "Finish setup to unlock recruiter visibility", href: "/profile-completion", btn: "Continue Setup" };

  // Action center items
  const actionItems = [];
  if (data?.checklists?.pending && data.checklists.pending > 0) actionItems.push({ label: `${data.checklists.pending} Checklist${data.checklists.pending > 1 ? "s" : ""} Assigned`, btn: "Continue", href: "/checklists" });
  if (data?.vaultsign?.pending && data.vaultsign.pending > 0) actionItems.push({ label: `${data.vaultsign.pending} Documents to Sign`, btn: "Review", href: "/vaultsign" });
  if (data?.references?.total && (data.references.total - data.references.completed) > 0) actionItems.push({ label: `${data.references.total - data.references.completed} Reference Requests Pending`, btn: "Respond", href: "/references" });

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full rounded-[20px]" />
        <Skeleton className="h-[100px] w-full rounded-[16px]" />
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[80px] rounded-[12px]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card><CardContent className="p-6 text-center">
        <p className="mb-4" style={{ color: "var(--status-red)" }}>{error}</p>
        <Button onClick={fetchDashboard} variant="outline">Try Again</Button>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <BannerCarousel />

      {/* ════════ SECTION 1: SMART HERO BANNER ════════ */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Welcome + Progress */}
        <div
          className="flex-1 rounded-[24px] p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(45,90,61,0.95) 0%, rgba(30,58,38,0.95) 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 16px 48px rgba(45,90,61,0.22)",
            minHeight: "200px",
          }}
        >
          {/* Decorative orb */}
          <div className="absolute rounded-full pointer-events-none" style={{ width: 300, height: 300, top: -100, right: -80, background: "radial-gradient(circle, rgba(74,124,89,0.4) 0%, rgba(74,124,89,0) 70%)", filter: "blur(40px)" }} />
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#E8A882" }}>Dashboard</p>
            <h1 className="text-2xl font-bold text-white mt-1 font-heading">Welcome back, {displayName} 👋</h1>
            <p className="text-sm text-white/70 mt-1">Complete your profile to unlock recruiter visibility</p>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white/80">Profile Completion</span>
                <span className="text-sm font-bold text-white">{pct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #E8A882, #C97B54)" }} />
              </div>
            </div>

            {/* Steps */}
            <div className="flex flex-wrap gap-3 mt-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {step.done ? (
                    <CheckCircle2 className="size-4" style={{ color: "#86EFAC" }} />
                  ) : (
                    <div className="size-4 rounded-full border-2 border-white/30" />
                  )}
                  <span className={`text-xs ${step.done ? "text-white/90" : "text-white/50"}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Next Best Action */}
        <div
          className="lg:w-[300px] shrink-0 rounded-[20px] p-5"
          style={{
            background: "rgba(255,252,248,0.72)",
            backdropFilter: "blur(30px) saturate(1.8) brightness(1.04)",
            WebkitBackdropFilter: "blur(30px) saturate(1.8) brightness(1.04)",
            border: "0.5px solid rgba(255,255,255,0.7)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 8px 24px rgba(45,90,61,0.08)",
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--terra)" }}>Next Best Action</p>
          <h3 className="text-base font-bold mt-1 font-heading" style={{ color: "var(--text-primary)" }}>{nextAction.label}</h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{nextAction.desc}</p>
          <Button asChild className="w-full mt-4" size="default">
            <Link href={nextAction.href}>{nextAction.btn}<ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </div>

      {/* ════════ SECTION 2: ACTION CENTER ════════ */}
      {actionItems.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-[8px] flex items-center justify-center" style={statIconStyle("terra")}>
                  <Bell className="size-3.5" />
                </div>
                <h3 className="text-sm font-bold font-heading">Action Center</h3>
              </div>
              <Badge variant="destructive" className="text-xs">{actionItems.length}</Badge>
            </div>
            <div className="space-y-2">
              {actionItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-[10px]" style={{ background: "var(--material-thin-bg)" }}>
                  <p className="text-sm font-medium">{item.label}</p>
                  <Button asChild size="sm" variant="outline" className="shrink-0 h-7 text-xs">
                    <Link href={item.href}>{item.btn}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════════ SECTION 3: AT A GLANCE — 4 compact cards ════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Profile */}
        <div className="flex flex-col items-center justify-center p-3 rounded-[14px]" style={{ background: "var(--material-thin-bg)", backdropFilter: "var(--material-thin-blur)", WebkitBackdropFilter: "var(--material-thin-blur)", border: "0.5px solid var(--material-thin-border)", boxShadow: "var(--specular-top), var(--depth-1)" }}>
          <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>{pct}%</span>
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Profile</span>
        </div>
        {/* Documents */}
        <div className="flex flex-col items-center justify-center p-3 rounded-[14px]" style={{ background: "var(--material-thin-bg)", backdropFilter: "var(--material-thin-blur)", WebkitBackdropFilter: "var(--material-thin-blur)", border: "0.5px solid var(--material-thin-border)", boxShadow: "var(--specular-top), var(--depth-1)" }}>
          <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>{data?.credentials?.total ?? 0}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Documents</span>
        </div>
        {/* Requests */}
        <div className="flex flex-col items-center justify-center p-3 rounded-[14px]" style={{ background: "var(--material-thin-bg)", backdropFilter: "var(--material-thin-blur)", WebkitBackdropFilter: "var(--material-thin-blur)", border: "0.5px solid var(--material-thin-border)", boxShadow: "var(--specular-top), var(--depth-1)" }}>
          <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--terra)" }}>{actionItems.length}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Requests</span>
        </div>
        {/* Signatures */}
        <div className="flex flex-col items-center justify-center p-3 rounded-[14px]" style={{ background: "var(--material-thin-bg)", backdropFilter: "var(--material-thin-blur)", WebkitBackdropFilter: "var(--material-thin-blur)", border: "0.5px solid var(--material-thin-border)", boxShadow: "var(--specular-top), var(--depth-1)" }}>
          <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--status-red)" }}>{data?.vaultsign?.pending ?? 0}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>To Sign</span>
        </div>
      </div>

      {/* ════════ SECTION 4: CORE PROFESSIONAL MODULES ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resume Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-[10px] flex items-center justify-center" style={statIconStyle("primary")}>
                <FileText className="size-4" />
              </div>
              <h4 className="text-sm font-bold font-heading">Resume</h4>
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

        {/* Credential Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-[10px] flex items-center justify-center" style={statIconStyle("terra")}>
                <ShieldCheck className="size-4" />
              </div>
              <h4 className="text-sm font-bold font-heading">Credentials</h4>
              <Badge variant="secondary" className="ml-auto text-xs">{data?.credentials?.active ?? 0} active</Badge>
            </div>
            {(data?.credentials?.total ?? 0) > 0 ? (
              <>
                <p className="text-sm font-medium">{data?.credentials?.total ?? 0} total credentials</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{data?.credentials?.active ?? 0} active & verified</p>
                <Button asChild variant="outline" size="sm" className="w-full mt-3"><Link href="/vault/credentials">View All Credentials</Link></Button>
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
              <div className="size-8 rounded-[10px] flex items-center justify-center" style={statIconStyle("primary")}>
                <Users className="size-4" />
              </div>
              <h4 className="text-sm font-bold font-heading">References</h4>
              <Badge variant="secondary" className="ml-auto text-xs">{data?.references?.completed ?? 0} verified</Badge>
            </div>
            {(data?.references?.total ?? 0) > 0 ? (
              <>
                <p className="text-sm font-medium">{data?.references?.completed ?? 0} verified references</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{(data?.references?.total ?? 0) - (data?.references?.completed ?? 0)} pending</p>
                <Button asChild variant="outline" size="sm" className="w-full mt-3"><Link href="/references">View All References</Link></Button>
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No references yet</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Request references to build trust</p>
                <Button asChild size="sm" className="w-full mt-3"><Link href="/references"><Users className="size-3.5" /> Request Reference</Link></Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ════════ SECTION 5: QUICK ACCESS ════════ */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { icon: ClipboardCheck, label: "Checklists", href: "/checklists", badge: data?.checklists?.pending },
          { icon: CalendarDays, label: "Calendar", href: "/calendar" },
          { icon: FileSignature, label: "VaultSign", href: "/vaultsign", badge: data?.vaultsign?.pending },
          { icon: Share2, label: "Sharing", href: "/sharing" },
          { icon: Settings, label: "Settings", href: "/settings" },
        ].map((item, i) => (
          <Link key={i} href={item.href} className="flex flex-col items-center justify-center gap-1.5 px-4 py-3 rounded-[14px] shrink-0 min-w-[100px]"
            style={{ background: "var(--material-thin-bg)", backdropFilter: "var(--material-thin-blur)", WebkitBackdropFilter: "var(--material-thin-blur)", border: "0.5px solid var(--material-thin-border)", boxShadow: "var(--specular-top), var(--depth-1)" }}>
            <div className="relative">
              <item.icon className="size-5" style={{ color: "var(--primary)" }} />
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "var(--status-red)" }}>{item.badge}</span>
              ) : null}
            </div>
            <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
          </Link>
        ))}
      </div>

      {/* ════════ SECTION 6: PENDING TASKS ════════ */}
      {data?.pendingChecklistRequests && data.pendingChecklistRequests.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4" style={{ color: "var(--primary)" }} />
                <h3 className="text-sm font-bold font-heading">Pending Tasks</h3>
              </div>
              <Badge variant="destructive" className="text-xs">{data.pendingChecklistRequests.length}</Badge>
            </div>
            <div className="space-y-2">
              {data.pendingChecklistRequests.slice(0, 5).map((req) => (
                <div key={req.id} className="flex items-center justify-between gap-3 p-2.5 rounded-[10px]" style={{ background: "var(--material-thin-bg)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{req.checklistName}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Assigned {new Date(req.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0 h-7 text-xs">
                    <Link href="/checklists">Continue <ArrowRight className="size-3" /></Link>
                  </Button>
                </div>
              ))}
            </div>
            {data.pendingChecklistRequests.length > 5 && (
              <Button asChild variant="ghost" size="sm" className="w-full mt-2"><Link href="/checklists">View All</Link></Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════ SECTION 7: ACTIVITY FEED ════════ */}
      {data?.notifications && data.notifications.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-bold mb-3 font-heading">Recent Activity</h3>
            <div className="space-y-2">
              {data.notifications.slice(0, 6).map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-2 rounded-[10px] text-sm"
                  style={n.isRead ? {} : { background: "var(--material-thin-bg)" }}>
                  <div className="size-2 rounded-full shrink-0 mt-1.5" style={{ background: n.isRead ? "var(--text-muted)" : "var(--primary)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{n.message}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{new Date(n.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════════ SECTION 8: VALUE PROPOSITION FOOTER ════════ */}
      <div className="flex flex-wrap gap-3 justify-center py-2">
        {[
          { icon: Zap, label: "AI Powered" },
          { icon: Lock, label: "Secure & Private" },
          { icon: TrendingUp, label: "ATS Optimized" },
          { icon: ShieldCheck, label: "Vault Integrated" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "var(--material-thin-bg)", border: "0.5px solid var(--material-thin-border)" }}>
            <item.icon className="size-3.5" style={{ color: "var(--terra)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

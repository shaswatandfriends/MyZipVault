"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Send, CheckCircle2, X, Clock, Calendar, DollarSign,
  User, Briefcase, Building2, MapPin, Loader2, ShieldCheck,
  AlertCircle, FileText, ChevronRight, CreditCard,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";

interface SubmissionDetail {
  id: number;
  status: string;
  submitted_at: string;
  submission_type: string;
  recruiter_notes: string | null;
  created_at: string;
  updated_at: string;
  placement_fee: number | null;
  recruiter_payout: number | null;
  platform_payout: number | null;
  original_owner_residual: number | null;
  payout_split_phase: string | null;
  placed_at: string | null;
  payment_status: "pending" | "paid";
  candidate: {
    id: number;
    name: string;
    specialty: string | null;
    profession: string | null;
    city: string | null;
    state: string | null;
    job_title: string | null;
  };
  job: {
    id: number;
    title: string;
    profession: string | null;
    specialty: string | null;
    commission_amount: number | null;
    commission_type: string | null;
    commission_percentage: number | null;
    salary_min: number | null;
    salary_max: number | null;
  };
  recruiter: { initials: string; recruiter_id: number } | null;
  ownership_phase: "exclusive" | "residual" | "expired" | "none";
  status_history: Array<{ status: string; changed_at: string; changed_by_user_id?: number; notes?: string | null }>;
}

const STATUS_FLOW = ["reviewing", "interview", "offer", "placed"] as const;
const TERMINAL_STATUSES = ["placed", "rejected", "withdrawn"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    submitted: "bg-slate-100 text-slate-700 border-slate-200",
    reviewing: "bg-blue-50 text-blue-700 border-blue-200",
    interview: "bg-amber-50 text-amber-700 border-amber-200",
    offer: "bg-violet-50 text-violet-700 border-violet-200",
    placed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    withdrawn: "bg-slate-50 text-slate-500 border-slate-200",
    placement_paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status.replace(/_/g, " ")}</Badge>;
}

function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

function formatDateTime(s: string): string {
  return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatRelative(s: string): string {
  const diffMs = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function EmployerSubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/employer/submissions/${params.id}`, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Failed (${res.status})` }));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      const json = await res.json();
      setSubmission(json.submission);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Show toast if redirected back from Stripe
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      toast.success("Payment received", {
        description: "Your placement payment is being processed. The recruiter has been notified.",
      });
    } else if (payment === "canceled") {
      toast.error("Payment canceled", {
        description: "You can retry the payment from this page.",
      });
    }
  }, [searchParams]);

  const updateStatus = async (newStatus: string, notes?: string) => {
    setUpdating(newStatus);
    try {
      const res = await fetch(`/api/employer/submissions/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      toast.success(`Status updated to ${newStatus}`);
      await load(); // refetch to get updated payout info
    } catch (e) {
      toast.error("Failed to update status", { description: e instanceof Error ? e.message : "" });
    } finally {
      setUpdating(null);
    }
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await fetch(`/api/employer/submissions/${params.id}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.alreadyPaid) {
          toast.info("This placement has already been paid.");
          await load();
          return;
        }
        throw new Error(data.error || `Failed (${res.status})`);
      }
      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e) {
      toast.error("Failed to start payment", { description: e instanceof Error ? e.message : "" });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[200px] rounded-xl" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="space-y-6">
        <Link href="/employer/submissions" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to submissions
        </Link>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="size-10 text-rose-500 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Couldn&apos;t load this submission</p>
            <p className="text-sm text-text-muted mt-1">{error ?? "Unknown error"}</p>
            <Button variant="outline" className="mt-4" onClick={load}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(submission.status);
  const isPlaced = submission.status === "placed";
  const canPay = isPlaced && submission.payment_status === "pending" && submission.placement_fee !== null;
  const isPaid = submission.payment_status === "paid";
  const currentStepIdx = STATUS_FLOW.indexOf(submission.status as typeof STATUS_FLOW[number]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/employer/submissions" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to submissions
        </Link>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <Loader2 className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* ─── Page Header ─── */}
      <PageHeader
        title={`Submission #${submission.id}`}
        description={`${submission.candidate.name} for ${submission.job.title}`}
      />

      {/* ─── Top: Candidate + Job + Recruiter Cards ─── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Candidate */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary-light">
                <User className="size-4 text-primary" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Candidate</p>
            </div>
            <p className="text-base font-semibold text-foreground">{submission.candidate.name}</p>
            <p className="text-sm text-text-secondary mt-1">
              {submission.candidate.specialty ?? submission.candidate.profession ?? "Healthcare professional"}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {[
                submission.candidate.job_title,
                [submission.candidate.city, submission.candidate.state].filter(Boolean).join(", "),
              ].filter(Boolean).join(" · ")}
            </p>
          </CardContent>
        </Card>

        {/* Job */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary-light">
                <Briefcase className="size-4 text-primary" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Job</p>
            </div>
            <Link href={`/employer/jobs/${submission.job.id}`} className="text-base font-semibold text-foreground hover:text-primary">
              {submission.job.title}
            </Link>
            <p className="text-sm text-text-secondary mt-1">
              {[submission.job.profession, submission.job.specialty].filter(Boolean).join(" · ")}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Commission:{" "}
              {submission.job.commission_type === "flat"
                ? formatCurrency(submission.job.commission_amount)
                : submission.job.commission_type === "percentage"
                ? `${submission.job.commission_percentage}% of salary`
                : "—"}
            </p>
          </CardContent>
        </Card>

        {/* Recruiter (anonymized) */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary-light">
                <User className="size-4 text-primary" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Submitted by</p>
            </div>
            {submission.recruiter ? (
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-full text-white font-bold text-sm"
                  style={{ background: "linear-gradient(135deg, #0A66C2, #004182)" }}
                >
                  {submission.recruiter.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{submission.recruiter.initials}</p>
                  <p className="text-xs text-text-muted">Recruiter (anonymized)</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
                  <User className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Self-apply</p>
                  <p className="text-xs text-text-muted">Candidate applied directly</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Status Workflow + Payout ─── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Status Workflow</h2>
            {statusBadge(submission.status)}
          </div>

          {/* Workflow progress */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {["submitted", "reviewing", "interview", "offer", "placed"].map((step, i) => {
              const stepIdx = STATUS_FLOW.indexOf(step as typeof STATUS_FLOW[number]);
              const isCurrent = submission.status === step;
              const isPast = currentStepIdx > stepIdx && currentStepIdx >= 0;
              return (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{
                      background: isCurrent ? "#0A66C2" : isPast ? "#EAF3FB" : "#F9FAFB",
                      color: isCurrent ? "#fff" : isPast ? "#0A66C2" : "#9CA3AF",
                      border: isPast && !isCurrent ? "1px solid #DBEAFE" : "1px solid #E5E7EB",
                    }}
                  >
                    {isPast && !isCurrent && <CheckCircle2 className="size-3" />}
                    {step}
                  </div>
                  {i < 4 && <ChevronRight className="size-3 text-text-muted" />}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          {!isTerminal && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">Update status:</p>
              <div className="flex flex-wrap gap-2">
                {submission.status === "submitted" && (
                  <Button size="sm" onClick={() => updateStatus("reviewing")} disabled={!!updating}>
                    {updating === "reviewing" ? <Loader2 className="size-4 animate-spin" /> : <Clock className="size-4" />} Mark as Reviewing
                  </Button>
                )}
                {(submission.status === "submitted" || submission.status === "reviewing") && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus("interview")} disabled={!!updating}>
                    {updating === "interview" ? <Loader2 className="size-4 animate-spin" /> : <Calendar className="size-4" />} Interview
                  </Button>
                )}
                {["submitted", "reviewing", "interview"].includes(submission.status) && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => updateStatus("offer")} disabled={!!updating}>
                      {updating === "offer" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Extend Offer
                    </Button>
                    <Button size="sm" variant="default" onClick={() => updateStatus("placed")} disabled={!!updating}>
                      {updating === "placed" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Mark as Placed
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => updateStatus("rejected")} disabled={!!updating}>
                  <X className="size-4" /> Reject
                </Button>
              </div>
            </div>
          )}

          {isTerminal && submission.status !== "placed" && (
            <p className="text-sm text-text-muted">This submission is in a terminal state: {submission.status}.</p>
          )}

          {/* Placement + Payout info */}
          {isPlaced && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="size-5 text-emerald-600" />
                <p className="font-semibold text-emerald-900">Placement Confirmed</p>
                {submission.placed_at && (
                  <span className="text-xs text-emerald-700 ml-auto">{formatDateTime(submission.placed_at)}</span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Total Fee</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(submission.placement_fee)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Recruiter Payout</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(submission.recruiter_payout)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Platform Fee</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(submission.platform_payout)}</p>
                </div>
                {submission.original_owner_residual !== null && submission.original_owner_residual > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Original Owner Residual</p>
                    <p className="text-xl font-bold text-violet-700">{formatCurrency(submission.original_owner_residual)}</p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-text-muted">Split phase:</span>
                <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                  {submission.payout_split_phase ?? "open"}
                </Badge>
                <span className="text-xs text-text-muted">·</span>
                <span className="text-xs text-text-muted">
                  Candidate ownership: <span className="font-medium text-foreground">{submission.ownership_phase}</span>
                </span>
              </div>

              {/* Payment action */}
              <div className="mt-4 pt-4 border-t border-emerald-200">
                {isPaid ? (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="size-4" />
                    <p className="text-sm font-medium">Payment complete</p>
                    <span className="text-xs text-emerald-600">— recruiter payouts have been released.</span>
                  </div>
                ) : canPay ? (
                  <div className="space-y-3">
                    <p className="text-sm text-text-secondary">
                      To release payouts to the recruiter, pay the placement fee via Stripe.
                    </p>
                    <Button size="lg" onClick={handlePay} disabled={paying}>
                      {paying ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                      Pay {formatCurrency(submission.placement_fee)} via Stripe
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">Payment status: {submission.payment_status}</p>
                )}
              </div>
            </div>
          )}

          {/* Recruiter notes */}
          {submission.recruiter_notes && (
            <div className="mt-4 rounded-lg border border-border bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-2">Recruiter notes</p>
              <p className="text-sm text-text-secondary">{submission.recruiter_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Timeline ─── */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Activity Timeline</h2>
          {submission.status_history.length === 0 ? (
            <p className="text-sm text-text-muted">No history recorded.</p>
          ) : (
            <div className="space-y-3">
              {[...submission.status_history].reverse().map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex size-7 items-center justify-center rounded-full bg-surface flex-shrink-0 mt-0.5">
                    {h.status === "placement_paid"
                      ? <DollarSign className="size-3.5 text-emerald-600" />
                      : h.status === "placed"
                      ? <CheckCircle2 className="size-3.5 text-emerald-600" />
                      : h.status === "rejected"
                      ? <X className="size-3.5 text-rose-500" />
                      : <Clock className="size-3.5 text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusBadge(h.status)}
                      <span className="text-xs text-text-muted">{formatRelative(h.changed_at)}</span>
                      <span className="text-xs text-text-muted">·</span>
                      <span className="text-xs text-text-muted">{formatDateTime(h.changed_at)}</span>
                    </div>
                    {h.notes && <p className="text-xs text-text-secondary mt-1">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

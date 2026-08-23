"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Star, Users, Briefcase, MapPin, DollarSign, TrendingUp, Clock,
  ShieldCheck, MessageSquare, Flag, ArrowLeft, CheckCircle2,
  Loader2, Send, MessageCircle, AlertTriangle,
} from "@/lib/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ProfileData {
  recruiter: {
    public_id: string;
    full_name: string;
    role: string;
    organization: string | null;
    account_status: string;
  };
  reputation: {
    overall_score: number;
    professionalism_avg?: number;
    communication_avg?: number;
    job_match_avg?: number;
    process_speed_avg?: number;
    post_placement_avg?: number;
    total_reviews: number;
    verified_reviews: number;
    total_placements?: number;
    avg_time_to_fill_days?: number | null;
    candidate_retention_pct?: number | null;
    badge_tier: string;
    is_top_recruiter: boolean;
    is_verified_recruiter: boolean;
  };
  reviews: Array<{
    id: number;
    reviewer_role: string;
    professionalism: number;
    communication: number;
    job_match: number;
    process_speed: number;
    post_placement: number;
    avg_score: string;
    comment: string | null;
    is_anonymous: boolean;
    is_verified_placement: boolean;
    recruiter_reply: string | null;
    recruiter_replied_at: string | null;
    admin_annotation: string | null;
    has_dispute: boolean;
    dispute_status: string | null; // null | 'pending' | 'upheld' | 'dismissed' | 'review_removed'
    is_negative: boolean;
    viewer_can_reply: boolean;
    viewer_can_dispute: boolean;
    created_at: string;
  }>;
  viewer_is_recruiter: boolean;
  public_jobs: Array<{
    id: number;
    public_id: string;
    title: string;
    specialty: string | null;
    city: string | null;
    state: string | null;
    is_remote: boolean;
    salary_display: string | null;
    employment_type: string | null;
    created_at: string;
  }>;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-amber-500" : score > 0 ? "bg-red-500" : "bg-gray-300";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{score.toFixed(1)}/10</span>
      </div>
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score / 2); // 1-10 → 1-5 stars
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`size-4 ${i < stars ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
      ))}
    </div>
  );
}

export default function PublicRecruiterProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <PublicRecruiterProfileInner />
    </Suspense>
  );
}

function PublicRecruiterProfileInner() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply state (recruiter replying to their own review)
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyTargetReviewId, setReplyTargetReviewId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  // Dispute state (recruiter disputing a negative review)
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeTargetReviewId, setDisputeTargetReviewId] = useState<number | null>(null);
  const [disputeForm, setDisputeForm] = useState({
    reason_category: "",
    explanation: "",
    evidence_urls: "",
  });

  const [reviewForm, setReviewForm] = useState({
    professionalism: 7, communication: 7, job_match: 7, process_speed: 7, post_placement: 7,
    comment: "", is_anonymous: false,
  });
  const [reportForm, setReportForm] = useState({
    reason_category: "", description: "", is_anonymous: false,
  });

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/public/recruiter/${publicId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      // Profile not found
    } finally {
      setIsLoading(false);
    }
  }, [publicId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleReviewSubmit = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/recruiter/${data!.recruiter.public_id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reviewForm,
          recruiter_public_id: data!.recruiter.public_id,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to submit review");
      toast.success("Review submitted", { description: "Thank you for your feedback." });
      setReviewDialogOpen(false);
      setReviewForm({ professionalism: 7, communication: 7, job_match: 7, process_speed: 7, post_placement: 7, comment: "", is_anonymous: false });
      fetchProfile();
    } catch (err) {
      toast.error("Failed to submit review", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportSubmit = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/recruiter/${data!.recruiter.public_id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reportForm,
          recruiter_public_id: data!.recruiter.public_id,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to submit report");
      toast.success("Report filed", { description: "Our team will review this and take appropriate action." });
      setReportDialogOpen(false);
      setReportForm({ reason_category: "", description: "", is_anonymous: false });
    } catch (err) {
      toast.error("Failed to file report", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Reply handler (recruiter replies to a review on their own profile) ───
  const handleReplySubmit = async () => {
    if (!replyTargetReviewId) return;
    if (replyText.trim().length < 10) {
      toast.error("Reply too short", { description: "Reply must be at least 10 characters." });
      return;
    }
    if (replyText.length > 300) {
      toast.error("Reply too long", { description: "Reply must be at most 300 characters." });
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/reviews/${replyTargetReviewId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to post reply");
      toast.success("Reply posted", {
        description: "Your reply is now visible publicly under the review.",
      });
      setReplyDialogOpen(false);
      setReplyTargetReviewId(null);
      setReplyText("");
      fetchProfile();
    } catch (err) {
      toast.error("Failed to post reply", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReplyDialog = (reviewId: number) => {
    setReplyTargetReviewId(reviewId);
    setReplyText("");
    setReplyDialogOpen(true);
  };

  // ─── Dispute handler (recruiter disputes a negative review) ───
  const handleDisputeSubmit = async () => {
    if (!disputeTargetReviewId) return;
    if (!disputeForm.reason_category) {
      toast.error("Reason required", { description: "Please select a reason category." });
      return;
    }
    if (disputeForm.explanation.trim().length < 100) {
      toast.error("Explanation too short", { description: "Explanation must be at least 100 characters." });
      return;
    }
    try {
      setIsSubmitting(true);
      // Parse evidence URLs (one per line, optional)
      const evidenceUrls = disputeForm.evidence_urls
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await fetch(`/api/reviews/${disputeTargetReviewId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason_category: disputeForm.reason_category,
          explanation: disputeForm.explanation.trim(),
          evidence_urls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to file dispute");
      toast.success("Dispute filed", {
        description: "Our team will review it and may remove, annotate, or keep the review based on the evidence provided.",
      });
      setDisputeDialogOpen(false);
      setDisputeTargetReviewId(null);
      setDisputeForm({ reason_category: "", explanation: "", evidence_urls: "" });
      fetchProfile();
    } catch (err) {
      toast.error("Failed to file dispute", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDisputeDialog = (reviewId: number) => {
    setDisputeTargetReviewId(reviewId);
    setDisputeForm({ reason_category: "", explanation: "", evidence_urls: "" });
    setDisputeDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <Users className="size-12 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium text-muted-foreground">Recruiter not found</p>
        <Link href="/"><Button variant="outline" size="sm" className="mt-3"><ArrowLeft className="size-4 mr-2" />Back to Home</Button></Link>
      </div>
    );
  }

  const { recruiter, reputation, reviews, public_jobs: jobs } = data;
  const fullName = recruiter.full_name;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="size-16 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-2xl font-bold">
                  {fullName[0]?.toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{fullName}</h1>
                  <p className="text-sm text-muted-foreground">{recruiter.role}{recruiter.organization ? ` · ${recruiter.organization}` : ""}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating score={reputation.overall_score} />
                    <span className="text-sm font-semibold">{reputation.overall_score.toFixed(1)}/10</span>
                    <span className="text-xs text-muted-foreground">({reputation.total_reviews} review{reputation.total_reviews !== 1 ? "s" : ""})</span>
                    {reputation.is_top_recruiter && <Badge className="bg-amber-100 text-amber-700 border-amber-200">⭐ Top Recruiter</Badge>}
                    {reputation.is_verified_recruiter && !reputation.is_top_recruiter && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">✓ Verified</Badge>}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={() => setReviewDialogOpen(true)}><Star className="size-4 mr-1" />Write a Review</Button>
              <Button variant="outline" size="sm" onClick={() => setReportDialogOpen(true)}><Flag className="size-4 mr-1" />Report</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <CheckCircle2 className="size-5 text-emerald-600 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Placements</p>
          <p className="text-lg font-bold">{reputation.total_placements ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Clock className="size-5 text-blue-600 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Avg Fill Time</p>
          <p className="text-lg font-bold">{reputation.avg_time_to_fill_days ? `${reputation.avg_time_to_fill_days.toFixed(0)}d` : "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <TrendingUp className="size-5 text-purple-600 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Retention</p>
          <p className="text-lg font-bold">{reputation.candidate_retention_pct ? `${reputation.candidate_retention_pct.toFixed(0)}%` : "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <ShieldCheck className="size-5 text-amber-600 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Verified</p>
          <p className="text-lg font-bold">{reputation.verified_reviews}</p>
        </CardContent></Card>
      </div>

      {/* Score breakdown */}
      {reputation.professionalism_avg !== undefined && (
        <Card>
          <CardHeader><CardTitle className="text-base">Score Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <ScoreBar label="Professionalism" score={reputation.professionalism_avg ?? 0} />
            <ScoreBar label="Communication" score={reputation.communication_avg ?? 0} />
            <ScoreBar label="Job Match Accuracy" score={reputation.job_match_avg ?? 0} />
            <ScoreBar label="Process Speed" score={reputation.process_speed_avg ?? 0} />
            <ScoreBar label="Post-Placement Support" score={reputation.post_placement_avg ?? 0} />
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Reviews ({reviews.length})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border-b last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StarRating score={parseFloat(r.avg_score)} />
                    <span className="text-sm font-semibold">{r.avg_score}/10</span>
                    {r.is_verified_placement && <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-[10px]">Verified</Badge>}
                    {r.has_dispute && r.dispute_status && (
                      <Badge variant="outline" className={
                        r.dispute_status === "pending" ? "text-amber-700 border-amber-300 bg-amber-50 text-[10px]"
                        : r.dispute_status === "upheld" || r.dispute_status === "review_removed" ? "text-rose-700 border-rose-300 bg-rose-50 text-[10px]"
                        : "text-slate-700 border-slate-300 bg-slate-50 text-[10px]"
                      }>
                        Dispute: {r.dispute_status.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.comment && <p className="text-sm text-foreground mb-2">{r.comment}</p>}
                {/* Recruiter reply */}
                {r.recruiter_reply && (
                  <div className="ml-4 border-l-2 border-border pl-3 py-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-0.5">Recruiter's reply:</p>
                    <p className="text-sm text-muted-foreground">{r.recruiter_reply}</p>
                  </div>
                )}
                {/* Admin annotation */}
                {r.admin_annotation && (
                  <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2">
                    <p className="text-xs text-amber-800"><strong>Platform note:</strong> {r.admin_annotation}</p>
                  </div>
                )}

                {/* Recruiter-only action buttons (reply + dispute) */}
                {data.viewer_is_recruiter && (r.viewer_can_reply || r.viewer_can_dispute) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.viewer_can_reply && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReplyDialog(r.id)}
                      >
                        <MessageCircle className="size-3.5" />
                        Reply to review
                      </Button>
                    )}
                    {r.viewer_can_dispute && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDisputeDialog(r.id)}
                        className="text-amber-700 border-amber-300 hover:bg-amber-50"
                      >
                        <AlertTriangle className="size-3.5" />
                        Dispute this review
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active jobs */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Active Job Listings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {jobs.map((j) => (
              <Link key={j.id} href={`/browse-jobs/${j.id}`}>
                <div className="rounded-lg border p-3 hover:border-emerald-300 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{j.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {j.is_remote ? "Remote" : [j.city, j.state].filter(Boolean).join(", ")}
                        {j.salary_display ? ` · ${j.salary_display}` : ""}
                      </p>
                    </div>
                    {j.employment_type && <Badge variant="outline">{j.employment_type}</Badge>}
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review {fullName}</DialogTitle>
            <DialogDescription>Rate this recruiter across 5 dimensions. Your feedback helps other candidates make informed decisions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { key: "professionalism", label: "Professionalism" },
              { key: "communication", label: "Communication" },
              { key: "job_match", label: "Job Match Accuracy" },
              { key: "process_speed", label: "Process Speed" },
              { key: "post_placement", label: "Post-Placement Support" },
            ].map((dim) => (
              <div key={dim.key} className="space-y-1">
                <Label>{dim.label}</Label>
                <div className="flex items-center gap-2">
                  <input type="range" min={1} max={10} value={reviewForm[dim.key as keyof typeof reviewForm] as number}
                    onChange={(e) => setReviewForm({ ...reviewForm, [dim.key]: parseInt(e.target.value, 10) })}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold w-8">{reviewForm[dim.key as keyof typeof reviewForm] as number}/10</span>
                </div>
              </div>
            ))}
            <div>
              <Label htmlFor="comment">Comment (optional, max 500 chars)</Label>
              <Textarea id="comment" value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value.substring(0, 500) })} rows={4} placeholder="Share your experience..." />
              <p className="text-xs text-muted-foreground mt-1">{reviewForm.comment.length}/500</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="anon" checked={reviewForm.is_anonymous} onCheckedChange={(v) => setReviewForm({ ...reviewForm, is_anonymous: v === true })} />
              <Label htmlFor="anon" className="text-sm cursor-pointer">Submit anonymously</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleReviewSubmit} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="size-4 mr-2 animate-spin" />Submitting...</> : <><Send className="size-4 mr-2" />Submit Review</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {fullName}</DialogTitle>
            <DialogDescription>File a formal complaint. This goes to our platform admins for review. Please provide detailed information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Select value={reportForm.reason_category} onValueChange={(v) => setReportForm({ ...reportForm, reason_category: v })}>
                <SelectTrigger id="reason"><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="misrepresentation">Misrepresentation</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="fee_dispute">Fee Dispute</SelectItem>
                  <SelectItem value="rtr_violation">RTR Violation</SelectItem>
                  <SelectItem value="data_misuse">Data Misuse</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="desc">Description (min 50 chars)</Label>
              <Textarea id="desc" value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} rows={5} placeholder="Provide detailed description of the issue..." />
              <p className="text-xs text-muted-foreground mt-1">{reportForm.description.length} characters</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="report-anon" checked={reportForm.is_anonymous} onCheckedChange={(v) => setReportForm({ ...reportForm, is_anonymous: v === true })} />
              <Label htmlFor="report-anon" className="text-sm cursor-pointer">Submit anonymously</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleReportSubmit} disabled={isSubmitting || !reportForm.reason_category || reportForm.description.length < 50}>
              {isSubmitting ? <><Loader2 className="size-4 mr-2 animate-spin" />Submitting...</> : <><Flag className="size-4 mr-2" />File Report</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog (recruiter replying to their own review) */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reply to this review</DialogTitle>
            <DialogDescription>
              Your reply will appear publicly under the review. Glassdoor-style — one reply per review, no editing.
              Be professional. Your response reflects on your reputation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="reply-text">Your reply (10–300 characters)</Label>
              <Textarea
                id="reply-text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value.substring(0, 300))}
                rows={5}
                placeholder="Thank you for the feedback. I'm glad the placement went smoothly…"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {replyText.length}/300 {replyText.trim().length < 10 && replyText.length > 0 && "· at least 10 characters required"}
              </p>
            </div>
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> Acknowledge the feedback, address specific concerns, and stay
                professional — even for negative reviews. Your reply is visible to anyone viewing your profile.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button
              onClick={handleReplySubmit}
              disabled={isSubmitting || replyText.trim().length < 10 || replyText.length > 300}
            >
              {isSubmitting
                ? <><Loader2 className="size-4 mr-2 animate-spin" />Posting…</>
                : <><MessageCircle className="size-4 mr-2" />Post Reply</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog (recruiter disputing a negative review) */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Dispute this review</DialogTitle>
            <DialogDescription>
              Disputes go to the platform admin moderation queue. Provide a clear, factual explanation
              and any evidence links. Frivolous disputes may hurt your reputation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="dispute-reason">Reason category</Label>
              <Select
                value={disputeForm.reason_category}
                onValueChange={(v) => setDisputeForm({ ...disputeForm, reason_category: v })}
              >
                <SelectTrigger id="dispute-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false_claim">False claim — the reviewer stated something untrue</SelectItem>
                  <SelectItem value="wrong_recruiter">Wrong recruiter — review was meant for someone else</SelectItem>
                  <SelectItem value="vindictive">Vindictive — retaliatory review unrelated to actual service</SelectItem>
                  <SelectItem value="factually_incorrect">Factually incorrect — verifiable facts are wrong</SelectItem>
                  <SelectItem value="policy_violation">Policy violation — review violates platform policy</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dispute-explanation">Explanation (min 100 chars, max 1000)</Label>
              <Textarea
                id="dispute-explanation"
                value={disputeForm.explanation}
                onChange={(e) => setDisputeForm({ ...disputeForm, explanation: e.target.value.substring(0, 1000) })}
                rows={6}
                placeholder="Provide a detailed, factual explanation of why this review should be removed or annotated. Include dates, communications, and any evidence you have."
              />
              <p className="text-xs text-muted-foreground mt-1">
                {disputeForm.explanation.length}/1000 {disputeForm.explanation.trim().length < 100 && disputeForm.explanation.length > 0 && "· at least 100 characters required"}
              </p>
            </div>
            <div>
              <Label htmlFor="dispute-evidence">Evidence URLs (optional, one per line)</Label>
              <Textarea
                id="dispute-evidence"
                value={disputeForm.evidence_urls}
                onChange={(e) => setDisputeForm({ ...disputeForm, evidence_urls: e.target.value })}
                rows={3}
                placeholder={"https://example.com/email-thread.pdf\nhttps://example.com/contract.pdf"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Links to documents, screenshots, or communications that support your dispute.
              </p>
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800">
                <strong>Heads up:</strong> Disputes are reviewed by platform admins. If your dispute is
                upheld, the review may be removed or annotated with a platform note. If dismissed, the
                review stays as-is. Filing frivolous disputes may negatively impact your reputation score.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button
              onClick={handleDisputeSubmit}
              disabled={
                isSubmitting ||
                !disputeForm.reason_category ||
                disputeForm.explanation.trim().length < 100
              }
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmitting
                ? <><Loader2 className="size-4 mr-2 animate-spin" />Filing…</>
                : <><AlertTriangle className="size-4 mr-2" />File Dispute</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

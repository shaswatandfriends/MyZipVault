"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Star, Users, Briefcase, MapPin, DollarSign, TrendingUp, Clock,
  ShieldCheck, MessageSquare, Flag, ArrowLeft, CheckCircle2,
  Loader2, Send,
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
    created_at: string;
  }>;
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
              <Link key={j.id} href={`/jobs/${j.id}`}>
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
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Star, Phone, Mail, MapPin, Building2, Calendar, ChevronRight,
  ShieldCheck, MessageSquare, ArrowDown, ArrowLeft, Loader2, Send,
  CheckCircle2, TrendingUp,
} from "@/lib/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Review {
  id: number;
  reviewer_role: string;
  reviewer_name?: string;
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
  created_at: string;
}

interface RecruiterProfile {
  recruiter: {
    public_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    recruiter_type: string;
    organization: string | null;
    account_status: string;
    verification_status: string;
    is_verified: boolean;
    certification_tags: string[];
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
    badge_tier?: string;
    is_top_recruiter?: boolean;
  };
  reviews: Review[];
  viewer_is_recruiter: boolean;
}

const CERT_TAG_LABELS: Record<string, string> = {
  allied: "Allied Health",
  nursing: "Nursing",
  locums: "Locums",
  non_clinical: "Non-Clinical",
};

function StarRating({ value, max = 5, size = "sm" }: { value: number; max?: number; size?: "sm" | "md" | "lg" }) {
  const starSize = size === "lg" ? "size-5" : size === "md" ? "size-4" : "size-3.5";
  const stars = [];
  for (let i = 1; i <= max; i++) {
    const filled = value >= i;
    const half = !filled && value >= i - 0.5;
    stars.push(
      <Star
        key={i}
        className={cn(starSize, filled || half ? "fill-amber-400 text-amber-400" : "text-gray-300")}
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

function InteractiveStarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-0.5"
        >
          <Star
            className={cn("size-5 transition-colors", (hover || value) >= i ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300")}
          />
        </button>
      ))}
      <span className="ml-1 text-sm font-medium text-[#5C6B66]">{value > 0 ? `${value}.0` : ""}</span>
    </div>
  );
}

export default function PublicRecruiterProfilePage() {
  const params = useParams();
  const publicId = (params?.publicId as string) || "";
  const [data, setData] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Feedback form state
  const [feedback, setFeedback] = useState({
    professionalism: 0,
    response_time: 0,
    overall: 0,
    comment: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/recruiter/${publicId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load recruiter profile");
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.professionalism === 0 || feedback.response_time === 0 || feedback.overall === 0) {
      toast.error("Please rate all categories");
      return;
    }
    if (feedback.comment.trim().length < 10) {
      toast.error("Please write at least 10 characters in your comment");
      return;
    }

    setSubmitting(true);
    try {
      // Convert 5-star ratings to 1-10 scale for the DB
      const res = await fetch(`/api/recruiter/${publicId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalism: feedback.professionalism * 2,
          communication: feedback.response_time * 2,
          job_match: feedback.overall * 2,
          process_speed: feedback.response_time * 2,
          post_placement: feedback.overall * 2,
          comment: feedback.comment.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to submit feedback");
        return;
      }

      toast.success("Feedback submitted! Thank you for sharing.");
      setFeedback({ professionalism: 0, response_time: 0, overall: 0, comment: "" });
      setShowFeedbackForm(false);
      fetchProfile(); // refresh reviews
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3E8]">
        <Loader2 className="size-8 animate-spin text-[#174A43]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3E8]">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#174A43]">Recruiter not found</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { recruiter, reputation, reviews } = data;
  const overallScore = reputation.overall_score ? (reputation.overall_score / 2).toFixed(1) : "0.0";
  const professionalismScore = reputation.professionalism_avg ? (reputation.professionalism_avg / 2).toFixed(1) : "0.0";
  const responseTimeScore = reputation.communication_avg ? (reputation.communication_avg / 2).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-[#F7F3E8]">
      {/* Top Banner */}
      <div className="bg-[#174A43] text-white py-3 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/80 hover:text-white">
            <ArrowLeft className="size-4" />
            Back to MyZipVault
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MyZipVault" className="h-6 w-auto brightness-0 invert" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ─── Profile Header Card ─── */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* Left: Photo + Contact */}
              <div className="p-6 border-r border-[#E5DFCF]">
                <div className="flex flex-col items-center text-center">
                  {/* Photo */}
                  <div className="size-24 rounded-full bg-[#174A43]/10 flex items-center justify-center mb-3">
                    <span className="text-3xl font-bold text-[#174A43]">
                      {recruiter.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Name */}
                  <h1 className="text-xl font-bold text-[#174A43] font-heading">
                    {recruiter.full_name}
                  </h1>

                  {/* Recruiter type */}
                  <p className="text-sm text-[#5C6B66] mt-0.5">
                    {recruiter.recruiter_type}
                  </p>

                  {/* Verified badge */}
                  {recruiter.is_verified && (
                    <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                      <ShieldCheck className="size-3" />
                      Verified
                    </Badge>
                  )}

                  {/* Certification tags */}
                  {recruiter.certification_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 justify-center">
                      {recruiter.certification_tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] border-[#174A43]/30 text-[#174A43]">
                          {CERT_TAG_LABELS[tag] || tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="mt-4 space-y-2 text-sm text-left w-full">
                    {recruiter.phone && (
                      <div className="flex items-center gap-2 text-[#5C6B66]">
                        <Phone className="size-3.5 shrink-0" />
                        <span className="truncate">{recruiter.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[#5C6B66]">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{recruiter.email}</span>
                    </div>
                    {recruiter.organization && (
                      <div className="flex items-center gap-2 text-[#5C6B66]">
                        <Building2 className="size-3.5 shrink-0" />
                        <span className="truncate">{recruiter.organization}</span>
                      </div>
                    )}
                  </div>

                  {/* Schedule Call button */}
                  <Button asChild className="w-full mt-4 gap-2" size="sm">
                    <a href="#calendar">
                      <Calendar className="size-4" />
                      Schedule a Call
                    </a>
                  </Button>
                </div>
              </div>

              {/* Center: Quote + Comment preview */}
              <div className="p-6 border-r border-[#E5DFCF] flex flex-col justify-center">
                <div className="text-center">
                  <div className="text-6xl text-[#174A43]/20 font-serif leading-none">&ldquo;</div>
                  <p className="text-sm text-[#263633] italic mt-2">
                    {reviews[0]?.comment || "No reviews yet. Be the first to share your experience!"}
                  </p>
                  {reviews[0] && (
                    <p className="text-xs text-[#5C6B66] mt-2">— {recruiter.full_name}</p>
                  )}
                </div>

                {/* Blinking arrow + click to view */}
                <button
                  onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                  className="mt-6 flex flex-col items-center gap-1 text-[#174A43] hover:text-[#0f3e37] transition-colors"
                >
                  <span className="text-xs font-medium">
                    {showFeedbackForm ? "Hide feedback form" : "Click to view full feedback"}
                  </span>
                  <ArrowDown className={cn("size-4 animate-bounce", showFeedbackForm && "rotate-180")} />
                </button>
              </div>

              {/* Right: Calendar + Performance Report */}
              <div className="p-6 space-y-4">
                {/* Calendar */}
                <div id="calendar">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-[#174A43] flex items-center gap-1.5">
                      <Calendar className="size-4" />
                      Book a Call
                    </h3>
                    <ChevronRight className="size-4 text-[#5C6B66]" />
                  </div>
                  <div className="rounded-lg border border-[#E5DFCF] p-3">
                    <p className="text-xs text-center text-[#5C6B66] mb-2">
                      {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#5C6B66] mb-1">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                        <div key={i}>{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                        const today = new Date().getDate();
                        const isWeekend = (day - 1) % 7 === 0 || (day - 1) % 7 === 6;
                        return (
                          <div
                            key={day}
                            className={cn(
                              "py-1 rounded cursor-pointer transition-colors",
                              day === today
                                ? "bg-[#174A43] text-white font-bold"
                                : isWeekend
                                ? "bg-[#174A43]/10 text-[#174A43] hover:bg-[#174A43]/20"
                                : "text-[#5C6B66] cursor-not-allowed opacity-50"
                            )}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-center text-[#5C6B66] mt-2">
                      Weekends only (Sat & Sun)
                    </p>
                  </div>
                </div>

                {/* Performance Report */}
                <div>
                  <h3 className="text-sm font-semibold text-[#174A43] flex items-center gap-1.5 mb-2">
                    <TrendingUp className="size-4" />
                    Performance Report
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#5C6B66]">Professionalism</span>
                      <div className="flex items-center gap-2">
                        <StarRating value={parseFloat(professionalismScore)} />
                        <span className="text-xs font-semibold text-[#174A43]">{professionalismScore}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#5C6B66]">Response Time</span>
                      <div className="flex items-center gap-2">
                        <StarRating value={parseFloat(responseTimeScore)} />
                        <span className="text-xs font-semibold text-[#174A43]">{responseTimeScore}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#5C6B66]">Overall Rating</span>
                      <div className="flex items-center gap-2">
                        <StarRating value={parseFloat(overallScore)} />
                        <span className="text-xs font-semibold text-[#174A43]">{overallScore}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#5C6B66] mt-2">
                    Based on {reputation.total_reviews} review{reputation.total_reviews !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Social proof banner ─── */}
        <div className="rounded-lg bg-[#174A43]/5 border border-[#E5DFCF] p-4 flex items-center gap-3">
          <MessageSquare className="size-5 text-[#174A43] shrink-0" />
          <p className="text-sm text-[#5C6B66] flex-1 truncate">
            {reviews[0]?.comment || "No reviews yet"}
          </p>
          <ChevronRight className="size-4 text-[#5C6B66]" />
        </div>

        {/* ─── Feedback Form (collapsible) ─── */}
        {showFeedbackForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-[#174A43]">Share Your Feedback</CardTitle>
              <p className="text-xs text-[#5C6B66]">
                Your feedback helps us improve and ensures a better experience for everyone.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-[#5C6B66]">Professionalism</Label>
                    <div className="mt-1">
                      <InteractiveStarRating
                        value={feedback.professionalism}
                        onChange={(v) => setFeedback({ ...feedback, professionalism: v })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-[#5C6B66]">Response Time</Label>
                    <div className="mt-1">
                      <InteractiveStarRating
                        value={feedback.response_time}
                        onChange={(v) => setFeedback({ ...feedback, response_time: v })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-[#5C6B66]">Overall Rating</Label>
                    <div className="mt-1">
                      <InteractiveStarRating
                        value={feedback.overall}
                        onChange={(v) => setFeedback({ ...feedback, overall: v })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="comment" className="text-xs font-semibold text-[#5C6B66]">
                    Comment
                  </Label>
                  <Textarea
                    id="comment"
                    placeholder="Tell us about your experience..."
                    value={feedback.comment}
                    onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                    maxLength={500}
                    className="mt-1"
                    rows={4}
                  />
                  <p className="text-[10px] text-[#5C6B66] text-right mt-0.5">
                    {feedback.comment.length}/500
                  </p>
                </div>

                <Button type="submit" disabled={submitting} className="w-full gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ─── Reviews List ─── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-[#174A43]">Feedback & Comments</CardTitle>
              <Badge variant="outline" className="text-xs">
                {reputation.total_reviews} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="size-10 text-[#5C6B66]/40 mx-auto mb-2" />
                <p className="text-sm text-[#5C6B66]">No feedback yet</p>
                <p className="text-xs text-[#5C6B66]/70 mt-1">
                  Be the first to share your experience with this recruiter.
                </p>
              </div>
            ) : (
              reviews.map((review) => {
                const avg = parseFloat(review.avg_score) / 2;
                return (
                  <div key={review.id} className="border-b border-[#E5DFCF] pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="size-10 rounded-full bg-[#174A43]/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-[#174A43]">
                          {review.is_anonymous ? "?" : review.reviewer_role.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#174A43]">
                            {review.is_anonymous ? "Anonymous" : `${review.reviewer_role}`}
                          </span>
                          {review.is_verified_placement && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-emerald-300 text-emerald-700">
                              <CheckCircle2 className="size-2.5" />
                              Verified
                            </Badge>
                          )}
                          <span className="text-xs text-[#5C6B66]">
                            {new Date(review.created_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <StarRating value={avg} />
                          <span className="text-xs font-semibold text-[#174A43]">{avg.toFixed(1)}</span>
                        </div>

                        {review.comment && (
                          <p className="text-sm text-[#263633] mt-2">{review.comment}</p>
                        )}

                        {/* Recruiter reply */}
                        {review.recruiter_reply && (
                          <div className="mt-2 rounded-lg bg-[#174A43]/5 p-3 border-l-2 border-[#174A43]">
                            <p className="text-xs font-semibold text-[#174A43] mb-1">
                              Recruiter replied
                              {review.recruiter_replied_at && (
                                <span className="font-normal text-[#5C6B66] ml-1">
                                  · {new Date(review.recruiter_replied_at).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-[#263633]">{review.recruiter_reply}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

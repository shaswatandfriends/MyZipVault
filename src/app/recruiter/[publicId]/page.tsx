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
  Star, Phone, Mail, Building2, Calendar, ChevronRight,
  ShieldCheck, ArrowLeft, Loader2, Send, CheckCircle2, User,
} from "@/lib/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Review {
  id: number;
  reviewer_role: string;
  avg_score: string;
  comment: string | null;
  is_anonymous: boolean;
  is_verified_placement: boolean;
  recruiter_reply: string | null;
  created_at: string;
}

interface RecruiterProfile {
  recruiter: {
    public_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    recruiter_type: string;
    organization: string | null;
    is_verified: boolean;
    certification_tags: string[];
  };
  reputation: {
    overall_score: number;
    professionalism_avg?: number;
    communication_avg?: number;
    total_reviews: number;
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

const AVAILABLE_TIMES = ["9:00 AM", "10:30 AM", "1:00 PM", "3:30 PM"];

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn("size-4", value >= i + 1 ? "fill-amber-400 text-amber-400" : "text-gray-300")}
        />
      ))}
    </div>
  );
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
            className={cn("size-6 transition-colors", (hover || value) >= i ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300")}
          />
        </button>
      ))}
    </div>
  );
}

export default function PublicRecruiterProfilePage() {
  const params = useParams();
  const publicId = (params?.publicId as string) || "";
  const [data, setData] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  // Feedback form state
  const [feedback, setFeedback] = useState({ professionalism: 0, response_time: 0, overall: 0, comment: "" });
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

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }
    setBooking(true);
    try {
      const now = new Date();
      const scheduledAt = new Date(now.getFullYear(), now.getMonth(), selectedDate);
      const [time, period] = selectedTime.split(" ");
      const [hours, minutes] = time.split(":");
      let hour24 = parseInt(hours);
      if (period === "PM" && hour24 !== 12) hour24 += 12;
      if (period === "AM" && hour24 === 12) hour24 = 0;
      scheduledAt.setHours(hour24, parseInt(minutes), 0, 0);

      const res = await fetch(`/api/recruiter/${publicId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: scheduledAt.toISOString() }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Failed to book");
        return;
      }
      toast.success("Call booked! The recruiter will be notified.");
      setSelectedDate(null);
      setSelectedTime(null);
    } catch {
      toast.error("Network error");
    } finally {
      setBooking(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.professionalism === 0 || feedback.response_time === 0 || feedback.overall === 0) {
      toast.error("Please rate all categories");
      return;
    }
    if (feedback.comment.trim().length < 10) {
      toast.error("Please write at least 10 characters");
      return;
    }
    setSubmitting(true);
    try {
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
        toast.error(err.error || "Failed to submit");
        return;
      }
      toast.success("Feedback submitted! Thank you.");
      setFeedback({ professionalism: 0, response_time: 0, overall: 0, comment: "" });
      fetchProfile();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3E8]">
        <Loader2 className="size-8 animate-spin text-[#0D3B2E]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3E8]">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#0D3B2E]">Recruiter not found</p>
          <Button asChild variant="outline" className="mt-4"><Link href="/">Go Home</Link></Button>
        </div>
      </div>
    );
  }

  const { recruiter, reputation, reviews } = data;
  const hasReviews = reviews.length > 0 && reputation.total_reviews > 0;
  const profScore = reputation.professionalism_avg ? (reputation.professionalism_avg / 2).toFixed(1) : null;
  const respScore = reputation.communication_avg ? (reputation.communication_avg / 2).toFixed(1) : null;
  const overallScore = reputation.overall_score ? (reputation.overall_score / 2).toFixed(1) : null;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();

  return (
    <div className="min-h-screen bg-[#F7F3E8]">
      {/* Top Banner */}
      <div className="bg-[#0D3B2E] text-white py-3 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/80 hover:text-white">
            <ArrowLeft className="size-4" /> Back to MyZipVault
          </Link>
          <img src="/logo.png" alt="MyZipVault" className="h-6 w-auto brightness-0 invert" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* UPPER SECTION: Identity (left) + Calendar (right)              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT — Recruiter Identity */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Photo */}
                <div className="size-20 rounded-full bg-[#0D3B2E]/10 flex items-center justify-center shrink-0">
                  <span className="text-3xl font-bold text-[#0D3B2E]">
                    {recruiter.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name + Verified */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-[#0D3B2E] font-heading">{recruiter.full_name}</h1>
                    {recruiter.is_verified && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                        <ShieldCheck className="size-3" /> Verified
                      </Badge>
                    )}
                  </div>

                  {/* Recruiter type */}
                  <p className="text-sm text-[#5C6B66] mt-0.5">{recruiter.recruiter_type}</p>

                  {/* Certification tags */}
                  {recruiter.certification_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recruiter.certification_tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] border-[#0D3B2E]/30 text-[#0D3B2E]">
                          {CERT_TAG_LABELS[tag] || tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-[#5C6B66]">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{recruiter.email}</span>
                    </div>
                    {recruiter.phone && (
                      <div className="flex items-center gap-2 text-[#5C6B66]">
                        <Phone className="size-3.5 shrink-0" />
                        <span>{recruiter.phone}</span>
                      </div>
                    )}
                    {recruiter.organization && (
                      <div className="flex items-center gap-2 text-[#5C6B66]">
                        <Building2 className="size-3.5 shrink-0" />
                        <span>{recruiter.organization}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT — Calendar (full focus) */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-[#0D3B2E] flex items-center gap-2 mb-4">
                <Calendar className="size-5" />
                Book a Call
              </h3>

              <p className="text-xs text-[#5C6B66] mb-3">Select a date</p>

              {/* Calendar */}
              <div className="rounded-lg border border-[#E5DFCF] p-3 mb-4">
                <p className="text-xs text-center text-[#5C6B66] mb-2 font-medium">
                  {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#5C6B66] mb-1">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const dayOfWeek = new Date(now.getFullYear(), now.getMonth(), day).getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isPast = day < today;
                    const isSelected = selectedDate === day;
                    return (
                      <button
                        key={day}
                        disabled={!isWeekend || isPast}
                        onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                        className={cn(
                          "py-1.5 rounded transition-colors",
                          isSelected
                            ? "bg-[#0D3B2E] text-white font-bold"
                            : isWeekend && !isPast
                            ? "bg-[#0D3B2E]/10 text-[#0D3B2E] hover:bg-[#0D3B2E]/20 cursor-pointer"
                            : "text-[#5C6B66]/40 cursor-not-allowed"
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-center text-[#5C6B66] mt-2">Weekends only (Sat & Sun)</p>
              </div>

              {/* Available Times */}
              {selectedDate && (
                <>
                  <p className="text-xs text-[#5C6B66] mb-2">Available Times</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {AVAILABLE_TIMES.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "py-2 rounded-lg text-sm font-medium border transition-colors",
                          selectedTime === time
                            ? "bg-[#0D3B2E] text-white border-[#0D3B2E]"
                            : "border-[#E5DFCF] text-[#0D3B2E] hover:bg-[#0D3B2E]/5"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Book button */}
              <Button
                onClick={handleBook}
                disabled={!selectedDate || !selectedTime || booking}
                className="w-full gap-2"
              >
                {booking ? (
                  <><Loader2 className="size-4 animate-spin" /> Booking...</>
                ) : (
                  <>Book This Time</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LOWER SECTION: Performance (left) + Comments (middle) +        */}
        {/*              Feedback form (right)                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT — Performance Report */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-[#0D3B2E]">Recruiter Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasReviews ? (
                <>
                  <div>
                    <p className="text-xs text-[#5C6B66] mb-1">Professionalism</p>
                    <div className="flex items-center gap-2">
                      <StarRating value={parseFloat(profScore || "0")} />
                      <span className="text-sm font-semibold text-[#0D3B2E]">{profScore} / 5</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#5C6B66] mb-1">Response Time</p>
                    <div className="flex items-center gap-2">
                      <StarRating value={parseFloat(respScore || "0")} />
                      <span className="text-sm font-semibold text-[#0D3B2E]">{respScore} / 5</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#5C6B66] mb-1">Overall Experience</p>
                    <div className="flex items-center gap-2">
                      <StarRating value={parseFloat(overallScore || "0")} />
                      <span className="text-sm font-semibold text-[#0D3B2E]">{overallScore} / 5</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#E5DFCF]">
                    <p className="text-xs text-[#5C6B66]">
                      Based on {reputation.total_reviews} healthcare professional review{reputation.total_reviews !== 1 ? "s" : ""}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-[#5C6B66]">Not yet rated</p>
                  <p className="text-xs text-[#5C6B66]/70 mt-1">0 reviews</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* MIDDLE — Comments */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base text-[#0D3B2E]">What Healthcare Professionals Say</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasReviews ? (
                <>
                  {reviews.slice(0, 5).map((review) => {
                    const avg = parseFloat(review.avg_score) / 2;
                    return (
                      <div key={review.id} className="border-b border-[#E5DFCF] pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="size-8 rounded-full bg-[#0D3B2E]/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-[#0D3B2E]">
                              {review.is_anonymous ? "?" : review.reviewer_role.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0D3B2E]">
                              {review.is_anonymous ? "Anonymous" : review.reviewer_role}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <StarRating value={avg} />
                              <span className="text-xs font-semibold text-[#0D3B2E]">{avg.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-[#263633] mt-1.5">{review.comment}</p>
                        )}
                      </div>
                    );
                  })}
                  {reputation.total_reviews > 5 && (
                    <Button variant="outline" size="sm" className="w-full gap-1">
                      View all {reputation.total_reviews} reviews
                      <ChevronRight className="size-3" />
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-[#5C6B66]">No reviews yet</p>
                  <p className="text-xs text-[#5C6B66]/70 mt-1">
                    Be the first healthcare professional to share your experience with this recruiter.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT — Give Your Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-[#0D3B2E]">Give Your Feedback</CardTitle>
              <p className="text-xs text-[#5C6B66]">How was your experience?</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-[#5C6B66]">Professionalism</Label>
                  <div className="mt-1"><InteractiveStarRating value={feedback.professionalism} onChange={(v) => setFeedback({ ...feedback, professionalism: v })} /></div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#5C6B66]">Response Time</Label>
                  <div className="mt-1"><InteractiveStarRating value={feedback.response_time} onChange={(v) => setFeedback({ ...feedback, response_time: v })} /></div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#5C6B66]">Overall Experience</Label>
                  <div className="mt-1"><InteractiveStarRating value={feedback.overall} onChange={(v) => setFeedback({ ...feedback, overall: v })} /></div>
                </div>
                <div>
                  <Label htmlFor="comment" className="text-xs font-semibold text-[#5C6B66]">Tell us about your experience</Label>
                  <Textarea
                    id="comment"
                    placeholder="Write your comment..."
                    value={feedback.comment}
                    onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                    maxLength={500}
                    className="mt-1"
                    rows={4}
                  />
                  <p className="text-[10px] text-[#5C6B66] text-right mt-0.5">{feedback.comment.length}/500</p>
                </div>
                <Button type="submit" disabled={submitting} className="w-full gap-2">
                  {submitting ? <><Loader2 className="size-4 animate-spin" /> Submitting...</> : <><Send className="size-4" /> Submit Feedback</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

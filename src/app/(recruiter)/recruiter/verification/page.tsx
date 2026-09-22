"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, ExternalLink, CheckCircle2, XCircle, Clock, Award } from "@/lib/icons";
import { toast } from "sonner";

interface VerificationData {
  verification_status: string; // unverified|pending|verified|failed|cooldown
  verification_completed_at: string | null;
  verification_expires_at: string | null;
  verification_failed_at: string | null;
  certification_tags: string[];
}

const VERIFICATION_PORTAL_URL = process.env.NEXT_PUBLIC_VERIFICATION_PORTAL_URL || "https://verify.myzipvault.com";

const STATUS_CONFIG = {
  unverified: {
    label: "Not Verified",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: XCircle,
    description: "You are not verified yet. Get verified to unlock 5x more credits and a verified badge.",
  },
  pending: {
    label: "Pending Review",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
    description: "Your verification is being reviewed. This usually takes 2-3 business days.",
  },
  verified: {
    label: "Verified",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    description: "You are a verified recruiter. You get 50 credits/day and 500 credits/month.",
  },
  failed: {
    label: "Verification Failed",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    description: "Your verification attempt failed. You can reapply after 45 days.",
  },
  cooldown: {
    label: "Cooldown Period",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
    description: "You are in a 45-day cooldown period before you can reapply for verification.",
  },
};

const CERTIFICATION_TAG_LABELS: Record<string, string> = {
  allied: "Allied Health",
  nursing: "Nursing",
  locums: "Locums",
  non_clinical: "Non-Clinical",
};

export default function RecruiterVerificationPage() {
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recruiter/verification-status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.verification_status) {
          setData({
            ...d,
            certification_tags: typeof d.certification_tags === "string"
              ? JSON.parse(d.certification_tags)
              : d.certification_tags || [],
          });
        }
      })
      .catch(() => toast.error("Failed to load verification status"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-[#0D3B2E]" />
      </div>
    );
  }

  const status = data?.verification_status || "unverified";
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unverified;
  const StatusIcon = config.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0D3B2E] font-heading flex items-center gap-2">
          <ShieldCheck className="size-6" />
          Recruiter Certification
        </h1>
        <p className="text-sm text-[#5C6B66] mt-1">
          Get certified to unlock 5x more credits, a verified badge, and certification tags.
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Verification Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`size-12 rounded-full flex items-center justify-center ${config.color}`}>
              <StatusIcon className="size-6" />
            </div>
            <div>
              <Badge className={config.color}>{config.label}</Badge>
              <p className="text-sm text-[#5C6B66] mt-1">{config.description}</p>
            </div>
          </div>

          {/* Verified — show expiry + certification tags */}
          {status === "verified" && data?.verification_expires_at && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-800 font-medium">Verified on</span>
                <span className="text-emerald-900">
                  {data.verification_completed_at
                    ? new Date(data.verification_completed_at).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-800 font-medium">Expires on</span>
                <span className="text-emerald-900">
                  {new Date(data.verification_expires_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Certification Tags */}
          {status === "verified" && data?.certification_tags?.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#0D3B2E] flex items-center gap-1.5">
                <Award className="size-4" />
                Certification Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {data.certification_tags.map((tag) => (
                  <Badge key={tag} className="bg-[#0D3B2E] text-white">
                    {CERTIFICATION_TAG_LABELS[tag] || tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Failed — show cooldown end date */}
          {status === "failed" && data?.verification_failed_at && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                <strong>Failed on:</strong>{" "}
                {new Date(data.verification_failed_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-amber-800 mt-1">
                <strong>Can reapply on:</strong>{" "}
                {new Date(new Date(data.verification_failed_at).getTime() + 45 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Action button */}
          {status === "unverified" && (
            <Button asChild className="w-full gap-2" size="lg">
              <a href={VERIFICATION_PORTAL_URL} target="_blank" rel="noopener noreferrer">
                <ShieldCheck className="size-4" />
                Start Verification
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}

          {status === "failed" && (
            <Button asChild variant="outline" className="w-full gap-2" size="lg" disabled>
              <span>
                <Clock className="size-4" />
                In 45-day cooldown period
              </span>
            </Button>
          )}

          {status === "pending" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
              <Clock className="size-8 text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-amber-800">
                Your verification is being reviewed. Check back in 2-3 business days.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefits Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Benefits of Certification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Unverified</p>
              <p className="text-lg font-bold text-[#0D3B2E]">10 credits/day</p>
              <p className="text-xs text-muted-foreground">100 credits/month</p>
            </div>
            <div className="rounded-lg border border-[#0D3B2E] bg-[#0D3B2E]/5 p-3 space-y-1">
              <p className="text-xs text-[#0D3B2E] font-medium">Verified (Certified)</p>
              <p className="text-lg font-bold text-[#0D3B2E]">50 credits/day</p>
              <p className="text-xs text-[#0D3B2E]">500 credits/month</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-[#5C6B66]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#0D3B2E]" />
              <span>Verified badge on your profile</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#0D3B2E]" />
              <span>Certification tags (Allied, Nursing, Locums, Non-clinical)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#0D3B2E]" />
              <span>Higher visibility in candidate searches</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#0D3B2E]" />
              <span>Trust and credibility with healthcare professionals</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Free until Dec 31 notice */}
      {status === "unverified" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-sm text-blue-900">
            <strong>FREE until December 31, 2026</strong>
          </p>
          <p className="text-xs text-blue-700 mt-1">
            After January 1, 2027, verification will cost ₹99/year.
          </p>
        </div>
      )}
    </div>
  );
}

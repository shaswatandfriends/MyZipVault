"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, FileText, ShieldCheck, ArrowRight, Download, Eye, FileDown, Sparkles, PartyPopper } from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";
import { FadeIn, ScaleIn } from "@/components/motion";

interface ProfileData {
  profile: {
    firstName: string;
    lastName: string;
    profileCompletionPct: number;
  } | null;
}

export default function ChecklistThankYouPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checklistId, setChecklistId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setChecklistId(p.id));
  }, [params]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/candidate/dashboard");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setProfileData(data);
      } catch {
        toast.error("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Skeleton className="size-20 rounded-2xl mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    );
  }

  const profileCompletion = profileData?.profile?.profileCompletionPct ?? 0;
  const firstName = profileData?.profile?.firstName || "there";
  const pdfPreviewUrl = `/api/candidate/checklists/${checklistId}/pdf?mode=preview`;
  const pdfDownloadUrl = `/api/candidate/checklists/${checklistId}/pdf?mode=download`;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Success header */}
      <FadeIn className="text-center space-y-5">
        <ScaleIn delay={0.2}>
          <div className="size-20 rounded-2xl mx-auto flex items-center justify-center animate-glow-pulse"
            style={{ background: 'var(--gradient-primary-gloss)' }}
          >
            <CheckCircle2 className="size-9 text-white" />
          </div>
        </ScaleIn>

        {profileCompletion < 25 ? (
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading tracking-tight">
              Great job, {firstName}!
            </h1>
            <p className="text-text-secondary mt-2 max-w-md mx-auto">
              Your checklist has been submitted successfully. Keep building your profile to make it visible to recruiters.
            </p>
          </div>
        ) : profileCompletion < 100 ? (
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading tracking-tight">
              Checklist Submitted!
            </h1>
            <p className="text-text-secondary mt-2 max-w-md mx-auto">
              Your profile is {profileCompletion}% complete. Keep going to unlock full access for recruiters.
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading tracking-tight">
              You&apos;re All Set!
            </h1>
            <p className="text-text-secondary mt-2 max-w-md mx-auto">
              Your profile is complete and ready for recruiters. Your verified credentials and checklists are now accessible.
            </p>
          </div>
        )}
      </FadeIn>

      {/* PDF Preview & Download */}
      {checklistId && (
        <FadeIn delay={0.3}>
          <div className="glass-card-static overflow-hidden">
            <div className="relative z-10">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-surface-2/50">
                <div className="flex items-center gap-2">
                  <FileDown className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Your Completed Checklist</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="btn-outline-premium gap-1.5 text-xs rounded-lg"
                    onClick={() => window.open(pdfPreviewUrl, '_blank')}
                  >
                    <Eye className="size-3.5" /> Preview
                  </Button>
                  <Button
                    size="sm"
                    className="btn-gradient gap-1.5 text-xs rounded-lg font-semibold"
                    onClick={() => window.open(pdfDownloadUrl, '_blank')}
                  >
                    <Download className="size-3.5" /> Download PDF
                  </Button>
                </div>
              </div>
              <iframe
                src={pdfPreviewUrl}
                className="w-full border-0"
                style={{ height: '60vh' }}
                title="Checklist PDF Preview"
              />
            </div>
          </div>
        </FadeIn>
      )}

      {/* Next steps */}
      {profileCompletion < 100 && (
        <FadeIn delay={0.4}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/vault/resume">
              <Button className="btn-gradient gap-2 w-full sm:w-auto rounded-xl font-semibold h-11">
                <FileText className="size-4" />
                Upload Resume
              </Button>
            </Link>
            <Link href="/vault/credentials">
              <Button variant="outline" className="btn-outline-premium gap-2 w-full sm:w-auto rounded-xl h-11">
                <ShieldCheck className="size-4" />
                Add Credential
              </Button>
            </Link>
          </div>
        </FadeIn>
      )}

      {/* Go to Dashboard */}
      <FadeIn delay={0.5}>
        <div className="flex justify-center">
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2 text-text-secondary hover:text-foreground rounded-xl">
              <ArrowRight className="size-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </FadeIn>
    </div>
  );
}

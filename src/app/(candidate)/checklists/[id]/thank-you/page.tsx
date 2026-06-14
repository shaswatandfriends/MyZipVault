"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, FileText, ShieldCheck, ArrowRight, Download, Eye, FileDown } from "@/lib/icons";
import { toast } from "sonner";
import Link from "next/link";

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
          <Skeleton className="size-20 rounded-full mx-auto" />
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
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Success header */}
      <div className="text-center space-y-4">
        <div className="size-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-emerald-600" />
        </div>

        {profileCompletion < 25 ? (
          <>
            <div>
              <h1 className="text-2xl font-bold">Great job, {firstName}!</h1>
              <p className="text-muted-foreground mt-2">
                Your checklist has been submitted successfully. Keep building your profile to make it visible to recruiters.
              </p>
            </div>
          </>
        ) : profileCompletion < 100 ? (
          <>
            <div>
              <h1 className="text-2xl font-bold">Checklist Submitted!</h1>
              <p className="text-muted-foreground mt-2">
                Your profile is {profileCompletion}% complete. Keep going to unlock full access for recruiters.
              </p>
            </div>
          </>
        ) : (
          <div>
            <h1 className="text-2xl font-bold">You&apos;re All Set!</h1>
            <p className="text-muted-foreground mt-2">
              Your profile is complete and ready for recruiters. Your verified credentials and checklists are now accessible.
            </p>
          </div>
        )}
      </div>

      {/* PDF Preview & Download */}
      {checklistId && (
        <Card className="border-[#BBF7D0] overflow-hidden">
          <CardHeader className="px-5 py-3 border-b border-[#E5E7EB] bg-[#FAFAF8]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileDown className="size-4 text-[#166534]" />
                <span className="text-sm font-semibold text-[#111827]">Your Completed Checklist</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-[#166534]/30 text-[#166534] hover:bg-[#DCFCE7] text-xs"
                  onClick={() => window.open(pdfPreviewUrl, '_blank')}
                >
                  <Eye className="size-3.5" /> Preview
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-[#166534] hover:bg-[#14532D] text-xs"
                  onClick={() => window.open(pdfDownloadUrl, '_blank')}
                >
                  <Download className="size-3.5" /> Download PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              src={pdfPreviewUrl}
              className="w-full border-0"
              style={{ height: '60vh' }}
              title="Checklist PDF Preview"
            />
          </CardContent>
        </Card>
      )}

      {/* Next steps */}
      {profileCompletion < 100 && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/vault/resume">
            <Button className="gap-2 w-full sm:w-auto">
              <FileText className="size-4" />
              Upload Resume
            </Button>
          </Link>
          <Link href="/vault/credentials">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <ShieldCheck className="size-4" />
              Add Credential
            </Button>
          </Link>
        </div>
      )}

      {/* Go to Dashboard */}
      <div className="flex justify-center">
        <Link href="/dashboard">
          <Button variant="ghost" className="gap-2">
            <ArrowRight className="size-4" />
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, FileText, ShieldCheck, ArrowRight } from "lucide-react";
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

  useEffect(() => {
    // Just to satisfy the params requirement
    params.then(() => {});
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

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6 max-w-md">
        {/* Green circle with check */}
        <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>

        {/* Conditional messaging */}
        {profileCompletion < 25 ? (
          <>
            <div>
              <h1 className="text-2xl font-bold">Great job, {firstName}!</h1>
              <p className="text-muted-foreground mt-2">
                Your checklist has been submitted successfully. Keep building your profile to make it visible to recruiters.
              </p>
            </div>
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
          </>
        ) : profileCompletion < 100 ? (
          <>
            <div>
              <h1 className="text-2xl font-bold">Checklist Saved!</h1>
              <p className="text-muted-foreground mt-2">
                Your profile is {profileCompletion}% complete. Keep going to unlock full access for recruiters.
              </p>
            </div>
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
          </>
        ) : (
          <div>
            <h1 className="text-2xl font-bold">You&apos;re All Set!</h1>
            <p className="text-muted-foreground mt-2">
              Your profile is complete and ready for recruiters. Your verified credentials and checklists are now accessible.
            </p>
          </div>
        )}

        {/* Go to Dashboard */}
        <Link href="/dashboard">
          <Button variant="ghost" className="gap-2 mt-4">
            <ArrowRight className="size-4" />
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Gift, Save, Loader2 } from "@/lib/icons";
import { toast } from "sonner";

interface Rewards {
  referral_recruiter: number;
  referral_employer: number;
  verification_completed: number;
  first_job_posted: number;
  first_candidate_submitted: number;
  monthly_active: number;
  profile_complete: number;
}

const REWARD_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  referral_recruiter: {
    label: "Referral Bonus — Recruiter",
    description: "Credits granted when a new recruiter signs up via a referral link",
  },
  referral_employer: {
    label: "Referral Bonus — Employer",
    description: "Credits granted when a new employer signs up via a referral link",
  },
  verification_completed: {
    label: "Verification Completed",
    description: "Credits granted when a recruiter completes certification (verified by external portal)",
  },
  first_job_posted: {
    label: "First Job Posted",
    description: "Credits granted when an employer posts their first job",
  },
  first_candidate_submitted: {
    label: "First Candidate Submitted",
    description: "Credits granted when a recruiter makes their first candidate submission",
  },
  monthly_active: {
    label: "Monthly Active Reward",
    description: "Credits granted on the 1st of each month to users who were active the previous month",
  },
  profile_complete: {
    label: "Profile Completion",
    description: "Credits granted when a candidate reaches 100% profile completion",
  },
};

export default function CreditsRewardsPage() {
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/superadmin/credits/rewards", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.rewards) setRewards(d.rewards);
      })
      .catch(() => toast.error("Failed to load reward config"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!rewards) return;
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/credits/rewards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewards }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
        return;
      }
      toast.success("Reward configuration saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!rewards) {
    return <p className="text-sm text-muted-foreground">Failed to load config.</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Reward Config Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-Credit Rewards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(REWARD_DESCRIPTIONS).map(([key, info]) => (
            <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pb-4 border-b last:border-0 last:pb-0">
              <div className="sm:col-span-2">
                <Label className="text-sm font-semibold text-[#0D3B2E]">{info.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="10000"
                    value={rewards[key as keyof Rewards]}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) {
                        setRewards({ ...rewards, [key]: v });
                      }
                    }}
                    className="text-right"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">credits</span>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

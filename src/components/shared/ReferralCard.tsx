"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Handshake, Copy, Check, Users, Star, Gift, ChevronRight,
  CreditCard, Sparkles, Loader2,
} from "@/lib/icons";

// ─── Types ──────────────────────────────────────────────────────────
interface ReferralData {
  referral_code: string;
  referral_links: {
    candidate: string;
    recruiter: string;
    employer: string;
  };
  stats: {
    total_referrals: number;
    qualified_referrals: number;
    credits_earned: number;
  };
  reward_config: {
    candidate_verified: number;
    recruiter_approved: number;
    employer_first_job: number;
  };
  can_earn_credits: boolean;
  user_role: string;
}

// ─── Component ──────────────────────────────────────────────────────
/**
 * Shared referral card — used on candidate, recruiter, and employer
 * dashboards.
 *
 * Shows:
 *   - The user's referral link (copyable)
 *   - Three links (candidate / recruiter / employer) — collapsible
 *   - Stats: total referrals, qualified, credits earned (recruiters/employers only)
 *   - Reward table (5/25/50 credits per qualifying action)
 *
 * Fetches data from /api/referrals/status on mount.
 */
export function ReferralCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<"candidate" | "recruiter" | "employer" | null>(null);
  const [showAllLinks, setShowAllLinks] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/referrals/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const json = (await res.json()) as ReferralData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyLink = async (key: "candidate" | "recruiter" | "employer") => {
    if (!data) return;
    const link = data.referral_links[key];
    try {
      await navigator.clipboard.writeText(link);
      setCopiedKey(key);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("Failed to copy", { description: "Copy the link manually from the text field." });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-10 w-full mb-3" />
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-amber-50">
              <Handshake className="size-4 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Refer a friend</p>
              <p className="text-xs text-text-muted">Couldn&apos;t load your referral link.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // Default to the candidate link (most common referral type)
  const defaultLink = data.referral_links.candidate;
  const defaultKey: "candidate" | "recruiter" | "employer" = "candidate";

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex size-10 items-center justify-center rounded-xl flex-shrink-0"
            style={{
              background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
              color: "#fff",
              boxShadow: "0 4px 10px rgba(10,102,194,0.25)",
            }}
          >
            <Handshake className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">Refer a friend</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {data.can_earn_credits
                ? "Earn credits for every qualifying signup."
                : "Share MyZipVault with your network."}
            </p>
          </div>
          <Link
            href="/referral-program"
            className="text-text-muted hover:text-foreground transition-colors"
            aria-label="Referral program details"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>

        {/* Default link (copyable) */}
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-1.5">
            Your referral link
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={defaultLink}
              className="flex-1 bg-white border border-border rounded-md px-2 py-1.5 text-xs text-foreground font-mono truncate"
              aria-label="Your referral link"
            />
            <Button
              size="sm"
              variant={copiedKey === defaultKey ? "default" : "outline"}
              onClick={() => copyLink(defaultKey)}
              className="flex-shrink-0"
            >
              {copiedKey === defaultKey
                ? <><Check className="size-3.5" /> Copied</>
                : <><Copy className="size-3.5" /> Copy</>}
            </Button>
          </div>
        </div>

        {/* "Show all 3 links" toggle */}
        <button
          type="button"
          onClick={() => setShowAllLinks(!showAllLinks)}
          className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
        >
          {showAllLinks ? "Hide other links" : "Show recruiter & employer links"}
          <ChevronRight
            className="size-3"
            style={{ transform: showAllLinks ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
          />
        </button>

        {showAllLinks && (
          <div className="mt-2 space-y-2">
            {(["recruiter", "employer"] as const).map((key) => (
              <div key={key} className="rounded-lg border border-border p-2">
                <p className="text-xs font-semibold text-text-secondary mb-1 capitalize">
                  {key} signup link
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={data.referral_links[key]}
                    className="flex-1 bg-white border border-border rounded-md px-2 py-1 text-[11px] text-foreground font-mono truncate"
                    aria-label={`${key} signup link`}
                  />
                  <Button
                    size="sm"
                    variant={copiedKey === key ? "default" : "outline"}
                    onClick={() => copyLink(key)}
                    className="flex-shrink-0 h-7"
                  >
                    {copiedKey === key
                      ? <><Check className="size-3" /></>
                      : <><Copy className="size-3" /></>}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-surface p-2.5 text-center">
            <Users className="size-3.5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground leading-none">{data.stats.total_referrals}</p>
            <p className="text-[10px] text-text-muted mt-0.5">Total referrals</p>
          </div>
          <div className="rounded-lg bg-surface p-2.5 text-center">
            <Star className="size-3.5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground leading-none">{data.stats.qualified_referrals}</p>
            <p className="text-[10px] text-text-muted mt-0.5">Qualified</p>
          </div>
          <div className="rounded-lg bg-surface p-2.5 text-center">
            <CreditCard className="size-3.5 text-violet-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground leading-none">
              {data.can_earn_credits ? data.stats.credits_earned : "—"}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              {data.can_earn_credits ? "Credits earned" : "Free for you"}
            </p>
          </div>
        </div>

        {/* Reward info (recruiters/employers only) */}
        {data.can_earn_credits && (
          <div className="mt-3 rounded-md bg-primary-light/40 border border-primary/20 p-2.5">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Gift className="size-3.5 text-primary" />
              Rewards per qualifying signup
            </p>
            <ul className="space-y-1 text-[11px] text-text-secondary">
              <li className="flex items-center justify-between">
                <span>Candidate verifies email</span>
                <span className="font-semibold text-foreground">+{data.reward_config.candidate_verified} credits</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Recruiter approved + first submission</span>
                <span className="font-semibold text-foreground">+{data.reward_config.recruiter_approved} credits</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Employer posts first job with commission</span>
                <span className="font-semibold text-foreground">+{data.reward_config.employer_first_job} credits</span>
              </li>
            </ul>
          </div>
        )}

        {/* Footer link */}
        <Link
          href="/referral-program"
          className="mt-3 block text-center text-xs text-primary hover:underline"
        >
          How referrals work →
        </Link>
      </CardContent>
    </Card>
  );
}

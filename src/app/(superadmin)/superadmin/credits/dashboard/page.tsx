"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Coins, TrendingUp, TrendingDown, ArrowRight, Building2,
  Activity, Gift, Settings,
} from "@/lib/icons";
import { toast } from "sonner";

interface DashboardData {
  totalCreditsInSystem: number;
  totalOrgs: number;
  totalTransactions: number;
  transactionsThisMonth: number;
  creditsGrantedThisMonth: number;
  creditsSpentThisMonth: number;
  recentTransactions: Array<{
    id: number;
    organization_name: string;
    transaction_type: string;
    credit_amount: number;
    description: string;
    created_at: string;
  }>;
  topOrgsByBalance: Array<{
    org_id: number;
    name: string;
    credits_balance: number;
  }>;
  rewardConfig: Record<string, number>;
}

const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  credit: "bg-emerald-100 text-emerald-700",
  debit: "bg-red-100 text-red-700",
  referral_bonus: "bg-blue-100 text-blue-700",
  reward: "bg-purple-100 text-purple-700",
  job_posting: "bg-amber-100 text-amber-700",
  candidate_reveal: "bg-indigo-100 text-indigo-700",
  candidate_submission: "bg-cyan-100 text-cyan-700",
  subscription: "bg-violet-100 text-violet-700",
};

export default function CreditsDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/credits/dashboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => toast.error("Failed to load credits dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Failed to load data.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Credits in System</p>
                <p className="text-2xl font-bold text-[#0D3B2E] mt-1">
                  {data.totalCreditsInSystem.toLocaleString()}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-[#0D3B2E]/10 flex items-center justify-center">
                <Coins className="size-5 text-[#0D3B2E]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Organizations</p>
                <p className="text-2xl font-bold text-[#0D3B2E] mt-1">{data.totalOrgs}</p>
              </div>
              <div className="size-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Building2 className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Granted This Month</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  +{data.creditsGrantedThisMonth.toLocaleString()}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Spent This Month</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  −{data.creditsSpentThisMonth.toLocaleString()}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="size-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
            ) : (
              data.recentTransactions.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${TRANSACTION_TYPE_COLORS[t.transaction_type] || "bg-gray-100 text-gray-700"}`}
                      >
                        {t.transaction_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{t.organization_name}</span>
                    </div>
                    <p className="text-xs text-[#263633] mt-0.5 truncate">{t.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${t.credit_amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {t.credit_amount >= 0 ? "+" : ""}{t.credit_amount}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top Orgs by Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Organizations by Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topOrgsByBalance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No organizations yet</p>
            ) : (
              data.topOrgsByBalance.map((org, i) => (
                <div key={org.org_id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-[#0D3B2E]/10 flex items-center justify-center text-xs font-bold text-[#0D3B2E]">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#263633]">{org.name}</p>
                      <p className="text-xs text-muted-foreground">Org #{org.org_id}</p>
                    </div>
                  </div>
                  <Badge className="bg-[#0D3B2E] text-white">
                    {org.credits_balance.toLocaleString()} credits
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reward Config Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="size-4" />
            Auto-Credit Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(data.rewardConfig).map(([key, value]) => (
              <div key={key} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                <p className="text-lg font-bold text-[#0D3B2E] mt-1">{value}</p>
                <p className="text-[10px] text-muted-foreground">credits</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

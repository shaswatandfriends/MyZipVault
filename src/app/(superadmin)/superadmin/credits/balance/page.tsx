"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Search, Plus, Minus, Loader2, Building2, Wallet } from "@/lib/icons";
import { toast } from "sonner";

interface Org {
  id: number;
  name: string;
  credits_balance: number;
  account_status: string;
  user_count: number;
}

export default function CreditsBalancePage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adjustOrg, setAdjustOrg] = useState<Org | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/superadmin/credits/balance?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrgs(d.organizations || []))
      .catch(() => toast.error("Failed to load organizations"))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(fetchOrgs, 300);
    return () => clearTimeout(timeout);
  }, [fetchOrgs]);

  const handleAdjust = async () => {
    if (!adjustOrg) return;
    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || amount === 0) {
      toast.error("Enter a non-zero amount");
      return;
    }
    if (adjustReason.trim().length < 5) {
      toast.error("Reason must be at least 5 characters");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/credits/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: adjustOrg.id,
          amount,
          reason: adjustReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to adjust");
        return;
      }
      toast.success(`${adjustOrg.name} balance adjusted by ${amount > 0 ? "+" : ""}${amount}`);
      setAdjustOrg(null);
      setAdjustAmount("");
      setAdjustReason("");
      fetchOrgs();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1 mb-2 -ml-2">
          <Link href="/superadmin/credits/dashboard">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-[#174A43] font-heading flex items-center gap-2">
          <Wallet className="size-6" />
          Balance Adjustment
        </h1>
        <p className="text-sm text-[#5C6B66] mt-1">
          Manually add or remove credits from any organization.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Organizations Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No organizations found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Organization</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Users</th>
                    <th className="p-3 font-medium text-right">Balance</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org) => (
                    <tr key={org.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-lg bg-[#174A43]/10 flex items-center justify-center">
                            <Building2 className="size-4 text-[#174A43]" />
                          </div>
                          <span className="font-medium text-[#263633]">{org.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={
                          org.account_status === "active" ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"
                        }>
                          {org.account_status}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{org.user_count}</td>
                      <td className="p-3 text-right">
                        <span className="font-bold text-[#174A43]">{org.credits_balance.toLocaleString()}</span>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAdjustOrg(org);
                            setAdjustAmount("");
                            setAdjustReason("");
                          }}
                          className="gap-1"
                        >
                          <Plus className="size-3" />
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjustment Dialog */}
      <Dialog open={!!adjustOrg} onOpenChange={(v) => !v && setAdjustOrg(null)}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-[#174A43]">Adjust Credits — {adjustOrg?.name}</DialogTitle>
            <DialogDescription>
              Current balance: <strong>{adjustOrg?.credits_balance.toLocaleString()}</strong> credits.
              Enter a positive number to add credits, or negative to remove.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="amount" className="text-xs font-semibold">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g. 100 or -50"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="mt-1"
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => setAdjustAmount("100")}>
                  <Plus className="size-3" /> +100
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAdjustAmount("500")}>
                  <Plus className="size-3" /> +500
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAdjustAmount("-50")}>
                  <Minus className="size-3" /> -50
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="reason" className="text-xs font-semibold">Reason (required)</Label>
              <Textarea
                id="reason"
                placeholder="Why are you adjusting this balance?"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                maxLength={300}
                className="mt-1"
                rows={3}
              />
              <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                {adjustReason.length}/300
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOrg(null)}>Cancel</Button>
            <Button
              onClick={handleAdjust}
              disabled={saving || !adjustAmount || adjustReason.trim().length < 5}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Wallet className="size-4" />
                  Adjust Balance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

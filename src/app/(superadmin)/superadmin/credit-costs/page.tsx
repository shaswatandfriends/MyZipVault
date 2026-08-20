"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  CreditCard, RefreshCw, Save, Loader2, CheckCircle2, AlertTriangle,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CreditCost {
  feature: string;
  label: string;
  cost: number;
  updated_at: string;
}

export default function CreditCostsPage() {
  const [costs, setCosts] = useState<CreditCost[]>([]);
  const [originalCosts, setOriginalCosts] = useState<Record<string, number>>({});
  const [editedCosts, setEditedCosts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/credit-costs");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setCosts(json.costs);
      const map: Record<string, number> = {};
      json.costs.forEach((c: CreditCost) => { map[c.feature] = c.cost; });
      setOriginalCosts(map);
      setEditedCosts({ ...map });
    } catch (err) {
      toast.error("Failed to load credit costs", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCosts(); }, [fetchCosts]);

  const hasChanges = Object.keys(editedCosts).some(
    (k) => editedCosts[k] !== originalCosts[k]
  );

  const handleSave = async () => {
    // Only send changed costs
    const changed: Record<string, number> = {};
    for (const [k, v] of Object.entries(editedCosts)) {
      if (v !== originalCosts[k]) changed[k] = v;
    }
    if (Object.keys(changed).length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/superadmin/credit-costs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costs: changed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Credit costs updated", {
        description: `${Object.keys(changed).length} cost(s) updated. Changes take effect immediately (cache invalidated).`,
      });
      fetchCosts();
    } catch (err) {
      toast.error("Failed to save", { description: err instanceof Error ? err.message : "" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEditedCosts({ ...originalCosts });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit Costs"
        description="Configure how many credits each action costs. Changes take effect immediately across the entire platform."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchCosts} disabled={isLoading}>
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges || isSaving}>
              Reset Changes
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? (
                <><Loader2 className="size-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Save className="size-4 mr-2" />Save Changes</>
              )}
            </Button>
          </div>
        }
      />

      {/* Info banner */}
      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How credit costs work</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Credits are deducted from the organization's balance when a recruiter performs an action</li>
              <li>Cost <code className="bg-muted px-1 py-0.5 rounded">0</code> = free (no deduction)</li>
              <li>Costs are cached for 60 seconds in memory — changes invalidate the cache immediately</li>
              <li>The superadmin can adjust any organization's credit balance via the Companies page</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Costs grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {costs.map((c) => {
            const isEdited = editedCosts[c.feature] !== originalCosts[c.feature];
            const isFree = editedCosts[c.feature] === 0;
            return (
              <Card key={c.feature} className={isEdited ? "border-amber-300 ring-1 ring-amber-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className={`size-4 ${isFree ? "text-emerald-600" : "text-amber-600"}`} />
                      <span className="text-sm font-medium">{c.label}</span>
                    </div>
                    {isEdited && (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px]">
                        Modified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={1000}
                      value={editedCosts[c.feature] ?? 0}
                      onChange={(e) => setEditedCosts({
                        ...editedCosts,
                        [c.feature]: Math.max(0, Math.min(1000, parseInt(e.target.value) || 0)),
                      })}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">
                      {isFree ? "credits (free)" : `credit${editedCosts[c.feature] !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Feature: <code className="bg-muted px-1 rounded">{c.feature}</code>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {!isLoading && hasChanges && (
        <Card className="border-amber-300">
          <CardContent className="p-4 flex items-center gap-2">
            <CheckCircle2 className="size-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              <strong>{Object.keys(editedCosts).filter(k => editedCosts[k] !== originalCosts[k]).length}</strong> cost(s) changed.
              Click "Save Changes" to apply.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

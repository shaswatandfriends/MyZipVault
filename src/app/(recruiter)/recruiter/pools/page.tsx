"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Layers,
  Plus,
  Trash2,
  Users,
  ArrowRight,
  Pencil,
} from "@/lib/icons";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

interface Pool {
  id: number;
  name: string;
  description: string | null;
  color: string;
  recruiter: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  _count: { members: number };
}

const POOL_COLORS = [
  { value: "#059669", label: "Emerald" },
  { value: "#0D9488", label: "Teal" },
  { value: "#2563EB", label: "Blue" },
  { value: "#7C3AED", label: "Purple" },
  { value: "#D97706", label: "Amber" },
  { value: "#DC2626", label: "Red" },
  { value: "#DB2777", label: "Pink" },
  { value: "#0B1F3A", label: "Navy" },
];

export default function PoolsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Pool | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("#059669");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPools = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/recruiter/pools");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPools(data.pools || []);
    } catch {
      toast.error("Failed to load pools");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error("Pool name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/recruiter/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          color: formColor,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Pool created");
        setShowCreateDialog(false);
        setFormName("");
        setFormDescription("");
        setFormColor("#059669");
        fetchPools();
      } else {
        toast.error(data.error || "Failed to create pool");
      }
    } catch {
      toast.error("Failed to create pool");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (poolId: number) => {
    try {
      const res = await fetch(`/api/recruiter/pools/${poolId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Pool deleted");
        setDeleteTarget(null);
        fetchPools();
      } else {
        toast.error("Failed to delete pool");
      }
    } catch {
      toast.error("Failed to delete pool");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidate Pools"
        description="Organize candidates into named groups for easy tracking and bulk actions."
      />

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-sm">
          <Users className="size-3 mr-1" />
          {pools.length} pool{pools.length !== 1 ? "s" : ""}
        </Badge>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="gap-2"
        >
          <Plus className="size-4" />
          Create Pool
        </Button>
      </div>

      {/* Pools grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : pools.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="size-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No pools yet</p>
            <p className="text-xs text-text-secondary mt-1 mb-4">
              Create a pool to organize candidates by specialty, priority, or any criteria you choose.
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="size-4" />
              Create Your First Pool
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pools.map((pool) => {
            const recruiterName =
              `${pool.recruiter.first_name ?? ""} ${pool.recruiter.last_name ?? ""}`.trim() ||
              pool.recruiter.email;

            return (
              <Card
                key={pool.id}
                className="cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => router.push(`/recruiter/pools/${pool.id}`)}
              >
                <CardContent className="p-5">
                  {/* Color bar */}
                  <div
                    className="h-1.5 rounded-full mb-3"
                    style={{ backgroundColor: pool.color }}
                  />

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground truncate flex-1">
                      {pool.name}
                    </h3>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      <Users className="size-3 mr-1" />
                      {pool._count.members}
                    </Badge>
                  </div>

                  {pool.description && (
                    <p className="text-xs text-text-secondary line-clamp-2 mb-3">
                      {pool.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-text-muted">
                      by {recruiterName}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(pool);
                        }}
                      >
                        <Trash2 className="size-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Pool</DialogTitle>
            <DialogDescription>
              Organize candidates into a named group for easy tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Pool Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., ICU Nurses - Q4 2026"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What this pool is for..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {POOL_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormColor(c.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      formColor === c.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !formName.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Pool"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Pool</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
              Candidates in this pool will be removed from the pool but NOT deleted from the platform.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              Delete Pool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

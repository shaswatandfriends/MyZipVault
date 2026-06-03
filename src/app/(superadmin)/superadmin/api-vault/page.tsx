"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  KeyRound,
  Shield,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ──────────────────────────────────────────────────────────
interface ApiService {
  serviceName: string;
  keyStatus: "Set" | "Not Set";
  maskedKey: string | null;
  updatedAt: string | null;
  updatedBy: number | null;
}

interface VaultResponse {
  services: ApiService[];
}

// ─── Service metadata ───────────────────────────────────────────────
const SERVICE_INFO: Record<string, { label: string; description: string; color: string; icon: string }> = {
  stripe: {
    label: "Stripe",
    description: "Payment processing & billing",
    color: "bg-violet-50 text-violet-700 border-violet-200",
    icon: "💳",
  },
  sendgrid: {
    label: "SendGrid",
    description: "Transactional email delivery",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "📧",
  },
  twilio: {
    label: "Twilio",
    description: "SMS & voice communications",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: "📱",
  },
  affinda: {
    label: "Affinda",
    description: "Resume parsing & AI extraction",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    icon: "📄",
  },
  supabase: {
    label: "Supabase / Storage",
    description: "File storage & database",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: "🗄️",
  },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Skeleton ───────────────────────────────────────────────────────
function ServiceSkeleton() {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-8 w-24 rounded" />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminApiVaultPage() {
  const [data, setData] = useState<VaultResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Update key dialog
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState("");
  const [showKeyValue, setShowKeyValue] = useState(false);

  const fetchVault = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/api-vault");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch API vault");
      }
      const json = (await res.json()) as VaultResponse;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load API vault", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  const handleUpdateKey = async () => {
    if (!selectedService || !newKeyValue) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/superadmin/api-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName: selectedService,
          keyValue: newKeyValue,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update key");

      toast.success(`${SERVICE_INFO[selectedService]?.label ?? selectedService} API key updated`);
      setShowUpdateDialog(false);
      setNewKeyValue("");
      setShowKeyValue(false);
      fetchVault();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update key";
      toast.error("Update failed", { description: message });
    } finally {
      setActionLoading(false);
    }
  };

  const openUpdateDialog = (serviceName: string) => {
    setSelectedService(serviceName);
    setNewKeyValue("");
    setShowKeyValue(false);
    setShowUpdateDialog(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Vault"
        description="Manage API keys, webhooks, and third-party integrations."
      />

      {/* ── Security Warning ───────────────────────────────────────── */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="size-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">Security Notice</p>
              <p className="text-xs text-amber-800 mt-0.5">
                API keys are encrypted at rest and never exposed to the frontend. Only masked key
                previews are shown. When updating a key, the new value is transmitted over HTTPS and
                stored encrypted immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── API Services List ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="size-5 text-teal-600" />
                API Services
              </CardTitle>
              <CardDescription className="mt-1">
                Manage integration keys for external services.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchVault} disabled={isLoading}>
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <ServiceSkeleton />
                  {i < 4 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0">
              {(data?.services ?? []).map((service, index) => {
                const info = SERVICE_INFO[service.serviceName];
                const isSet = service.keyStatus === "Set";
                return (
                  <div key={service.serviceName}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`size-10 rounded-lg flex items-center justify-center text-lg shrink-0 border ${info?.color ?? "bg-muted text-muted-foreground border-border"}`}>
                          {info?.icon ?? "🔑"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{info?.label ?? service.serviceName}</p>
                          <p className="text-xs text-muted-foreground">{info?.description ?? service.serviceName}</p>
                          {isSet && service.maskedKey && (
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">
                              {service.maskedKey}
                            </p>
                          )}
                          {service.updatedAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Last updated: {formatDate(service.updatedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isSet ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                            <KeyRound className="size-3 mr-1" />
                            Set
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                            <AlertTriangle className="size-3 mr-1" />
                            Not Set
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUpdateDialog(service.serviceName)}
                        >
                          Update Key
                        </Button>
                      </div>
                    </div>
                    {index < (data?.services?.length ?? 0) - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Service Usage Placeholders ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service Status</CardTitle>
          <CardDescription>Quick overview of integration connectivity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(data?.services ?? []).map((service) => {
              const info = SERVICE_INFO[service.serviceName];
              const isSet = service.keyStatus === "Set";
              return (
                <div
                  key={service.serviceName}
                  className={`p-3 rounded-lg border ${isSet ? "bg-emerald-50/50 border-emerald-200" : "bg-red-50/50 border-red-200"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{info?.icon ?? "🔑"}</span>
                      <span className="text-sm font-medium">{info?.label ?? service.serviceName}</span>
                    </div>
                    <span className={`size-2 rounded-full ${isSet ? "bg-emerald-500" : "bg-red-500"}`} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isSet ? "Connected — key configured" : "Not connected — key required"}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Update Key Dialog ────────────────────────────────────────── */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Update API Key — {selectedService ? SERVICE_INFO[selectedService]?.label ?? selectedService : ""}
            </DialogTitle>
            <DialogDescription>
              Enter the new API key. The key will be encrypted before storage and never shown in full again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New API Key</Label>
              <div className="relative">
                <Input
                  type={showKeyValue ? "text" : "password"}
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="Enter new API key..."
                  className="pr-20 font-mono text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-xs h-7"
                  onClick={() => setShowKeyValue(!showKeyValue)}
                >
                  {showKeyValue ? "Hide" : "Show"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste the full API key from your {selectedService ? SERVICE_INFO[selectedService]?.label ?? selectedService : ""} dashboard.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleUpdateKey}
              disabled={actionLoading || !newKeyValue}
            >
              {actionLoading ? "Saving…" : "Save Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

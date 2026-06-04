"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ToggleLeft,
  AlertTriangle,
  MessageSquare,
  FileText,
  Search,
  CreditCard,
  ClipboardCheck,
  Info,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ──────────────────────────────────────────────────────────
interface FeatureFlag {
  id: number;
  flagName: string;
  isEnabled: boolean;
  updatedBy: number | null;
  updatedAt: string;
}

interface ApiVaultService {
  serviceName: string;
  keyStatus: string;
}

// ─── Flag Metadata ──────────────────────────────────────────────────
interface FlagMeta {
  label: string;
  description: string;
  icon: React.ElementType;
  warningWhenDisabled?: string;
}

const FLAG_META: Record<string, FlagMeta> = {
  sms_notifications: {
    label: "SMS Notifications",
    description: "Send SMS via Twilio for alerts, reminders, and verifications.",
    icon: MessageSquare,
    warningWhenDisabled: "SMS notifications are disabled. Candidates won't receive text alerts.",
  },
  resume_builder: {
    label: "Resume Builder",
    description: "Allow candidates to build and edit resumes within the platform.",
    icon: FileText,
  },
  reference_engine: {
    label: "Reference Engine",
    description: "Enable automated reference requests and manager response forms.",
    icon: Search,
  },
  credit_upsell: {
    label: "Credit Upsell",
    description: "Show credit purchase prompts when organization balances are low.",
    icon: CreditCard,
  },
  document_verification_queue: {
    label: "Document Verification Queue",
    description: "Route uploaded credentials into a manual review queue before approval.",
    icon: ClipboardCheck,
  },
};

const DEFAULT_FLAGS = [
  "sms_notifications",
  "resume_builder",
  "reference_engine",
  "credit_upsell",
  "document_verification_queue",
];

// ─── Skeleton ───────────────────────────────────────────────────────
function FeatureFlagsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [apiServices, setApiServices] = useState<ApiVaultService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [settingsRes, vaultRes] = await Promise.all([
        fetch("/api/superadmin/settings"),
        fetch("/api/superadmin/api-vault"),
      ]);

      if (!settingsRes.ok) {
        const body = await settingsRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch settings");
      }

      const settingsJson = await settingsRes.json();
      const featureFlags: FeatureFlag[] = settingsJson.featureFlags ?? [];

      // Ensure all default flags exist in the list (even if not in DB yet)
      const existingNames = new Set(featureFlags.map((f) => f.flagName));
      for (const name of DEFAULT_FLAGS) {
        if (!existingNames.has(name)) {
          featureFlags.push({
            id: 0,
            flagName: name,
            isEnabled: false,
            updatedBy: null,
            updatedAt: "",
          });
        }
      }

      setFlags(featureFlags);

      if (vaultRes.ok) {
        const vaultJson = await vaultRes.json();
        setApiServices(vaultJson.services ?? []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load feature flags", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const checkTwilioKeys = (): boolean => {
    const twilio = apiServices.find((s) => s.serviceName === "twilio");
    return twilio?.keyStatus === "Set";
  };

  const handleToggle = async (flagName: string, enable: boolean) => {
    // Pre-check: Twilio keys required for sms_notifications
    if (flagName === "sms_notifications" && enable) {
      if (!checkTwilioKeys()) {
        toast.error("Cannot enable SMS Notifications", {
          description: "Twilio API keys are not configured. Add them in the API Vault first.",
        });
        return;
      }
    }

    try {
      setToggling((prev) => ({ ...prev, [flagName]: true }));
      const res = await fetch("/api/superadmin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagName, isEnabled: enable }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to toggle flag");

      toast.success(`"${FLAG_META[flagName]?.label ?? flagName}" ${enable ? "enabled" : "disabled"}`);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle flag";
      toast.error("Toggle failed", { description: message });
    } finally {
      setToggling((prev) => ({ ...prev, [flagName]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Flags"
        description="Toggle platform features on or off. Changes take effect immediately."
      />

      {isLoading ? (
        <FeatureFlagsSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <ToggleLeft className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Platform Features</CardTitle>
                <CardDescription>
                  Control which features are available across the platform.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Feature</TableHead>
                  <TableHead className="w-[20%]">Status</TableHead>
                  <TableHead className="w-[30%] text-right">Toggle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEFAULT_FLAGS.map((flagName) => {
                  const flag = flags.find((f) => f.flagName === flagName);
                  const meta = FLAG_META[flagName];
                  const isEnabled = flag?.isEnabled ?? false;
                  const Icon = meta?.icon ?? ToggleLeft;
                  const isSmsFlag = flagName === "sms_notifications";
                  const twilioConfigured = isSmsFlag ? checkTwilioKeys() : true;
                  const smsDisabled = isSmsFlag && !twilioConfigured;

                  return (
                    <TableRow key={flagName} className={smsDisabled ? "bg-muted/30" : ""}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 size-8 rounded-lg flex items-center justify-center shrink-0 ${smsDisabled ? "bg-amber-50" : "bg-muted"}`}>
                            <Icon className={`size-4 ${smsDisabled ? "text-amber-500" : "text-muted-foreground"}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{meta?.label ?? flagName}</p>
                              {isSmsFlag && !twilioConfigured && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-50 gap-1 text-xs">
                                        <AlertTriangle className="size-3" />
                                        Setup Required
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Add Twilio API keys in the API Vault to enable SMS notifications.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {isSmsFlag && twilioConfigured && !isEnabled && (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                  <AlertTriangle className="size-3" />
                                  SMS Off
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {meta?.description ?? flagName}
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">
                              {flagName}
                            </p>
                            {isSmsFlag && !twilioConfigured && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <Info className="size-3 shrink-0" />
                                Requires Twilio API keys in API Vault
                              </p>
                            )}
                            {meta?.warningWhenDisabled && !isEnabled && !smsDisabled && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <AlertTriangle className="size-3 shrink-0" />
                                {meta.warningWhenDisabled}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEnabled ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100">
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0}>
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={(checked) => handleToggle(flagName, checked)}
                                  disabled={toggling[flagName] || smsDisabled}
                                  className={smsDisabled ? "opacity-50" : ""}
                                />
                              </span>
                            </TooltipTrigger>
                            {smsDisabled && (
                              <TooltipContent>
                                <p>Configure Twilio API keys in the API Vault to enable this toggle.</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

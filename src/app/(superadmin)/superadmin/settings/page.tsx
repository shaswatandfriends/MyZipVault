"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Settings,
  Save,
  ToggleLeft,
  ListChecks,
  Link2,
  CreditCard,
  Phone,
  Bell,
  BellRing,
  Loader2,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────────────
interface Setting {
  id: number;
  settingKey: string;
  settingValue: string;
  updatedBy: number | null;
  updatedAt: string;
}

interface FeatureFlag {
  id: number;
  flagName: string;
  isEnabled: boolean;
  updatedBy: number | null;
  updatedAt: string;
}

interface SettingsResponse {
  settings: Setting[];
  featureFlags: FeatureFlag[];
}

// ─── Helpers ────────────────────────────────────────────────────────
function getSettingValue(settings: Setting[], key: string): string {
  return settings.find((s) => s.settingKey === key)?.settingValue ?? "";
}

// ─── Skeleton ───────────────────────────────────────────────────────
function SettingsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminSettingsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Form states
  const [checklistValidityDays, setChecklistValidityDays] = useState("");
  const [shareLinkExpiryDays, setShareLinkExpiryDays] = useState("");
  const [creditCostResume, setCreditCostResume] = useState("");
  const [creditCostCredential, setCreditCostCredential] = useState("");
  const [creditCostReference, setCreditCostReference] = useState("");
  const [creditCostChecklist, setCreditCostChecklist] = useState("");
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [triggeringNotifications, setTriggeringNotifications] = useState(false);
  const [notificationResult, setNotificationResult] = useState<Record<string, number> | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/settings");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch settings");
      }
      const json = (await res.json()) as SettingsResponse;
      setData(json);

      // Populate form states
      setChecklistValidityDays(getSettingValue(json.settings, "checklist_validity_days"));
      setShareLinkExpiryDays(getSettingValue(json.settings, "share_link_expiry_days"));
      setCreditCostResume(getSettingValue(json.settings, "credit_cost_resume"));
      setCreditCostCredential(getSettingValue(json.settings, "credit_cost_credential"));
      setCreditCostReference(getSettingValue(json.settings, "credit_cost_reference"));
      setCreditCostChecklist(getSettingValue(json.settings, "credit_cost_checklist"));

      const flags: Record<string, boolean> = {};
      for (const f of json.featureFlags) {
        flags[f.flagName] = f.isEnabled;
      }
      setFeatureFlags(flags);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load settings", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSetting = async (settingKey: string, settingValue: string, sectionName: string) => {
    try {
      setSaving((prev) => ({ ...prev, [sectionName]: true }));
      const res = await fetch("/api/superadmin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "update-setting", settingKey, settingValue }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      toast.success(`${sectionName} saved`);
      fetchSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error("Save failed", { description: message });
    } finally {
      setSaving((prev) => ({ ...prev, [sectionName]: false }));
    }
  };

  const toggleFeatureFlag = async (flagName: string, isEnabled: boolean) => {
    try {
      setSaving((prev) => ({ ...prev, [`flag-${flagName}`]: true }));
      const res = await fetch("/api/superadmin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "toggle-feature-flag", flagName, isEnabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to toggle flag");
      toast.success(`Feature flag "${flagName}" ${isEnabled ? "enabled" : "disabled"}`);
      fetchSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle flag";
      toast.error("Toggle failed", { description: message });
    } finally {
      setSaving((prev) => ({ ...prev, [`flag-${flagName}`]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure global platform settings, feature flags, and system preferences."
      />

      {isLoading ? (
        <div className="space-y-6">
          <SettingsSkeleton />
          <SettingsSkeleton />
          <SettingsSkeleton />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Checklist Validity ────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <ListChecks className="size-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Checklist Validity</CardTitle>
                  <CardDescription>Configure how long completed checklists remain valid.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="checklist-validity">Validity Window (days)</Label>
                <Input
                  id="checklist-validity"
                  type="number"
                  min="1"
                  value={checklistValidityDays}
                  onChange={(e) => setChecklistValidityDays(e.target.value)}
                  placeholder="365"
                />
                <p className="text-xs text-muted-foreground">
                  Number of days a completed checklist remains valid before it needs renewal.
                </p>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={() => saveSetting("checklist_validity_days", checklistValidityDays, "Checklist Validity")}
                disabled={saving["Checklist Validity"]}
              >
                <Save className="size-4" />
                {saving["Checklist Validity"] ? "Saving…" : "Save"}
              </Button>
            </CardContent>
          </Card>

          {/* ── Share Link Expiry ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Link2 className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Share Link Expiry</CardTitle>
                  <CardDescription>Default expiry options for consent share links.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-expiry">Expiry Days (comma-separated)</Label>
                <Input
                  id="share-expiry"
                  value={shareLinkExpiryDays}
                  onChange={(e) => setShareLinkExpiryDays(e.target.value)}
                  placeholder="7, 14, 30, 90"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of days. These become the available expiry options when candidates share their data.
                </p>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={() => saveSetting("share_link_expiry_days", shareLinkExpiryDays, "Share Link Expiry")}
                disabled={saving["Share Link Expiry"]}
              >
                <Save className="size-4" />
                {saving["Share Link Expiry"] ? "Saving…" : "Save"}
              </Button>
            </CardContent>
          </Card>

          {/* ── Credit Cost Matrix ────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <CreditCard className="size-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Credit Cost Matrix</CardTitle>
                  <CardDescription>Configure how many credits each item type costs to unlock.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost-resume">Resume Unlock Cost</Label>
                  <Input
                    id="cost-resume"
                    type="number"
                    min="0"
                    value={creditCostResume}
                    onChange={(e) => setCreditCostResume(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost-credential">Credential Unlock Cost</Label>
                  <Input
                    id="cost-credential"
                    type="number"
                    min="0"
                    value={creditCostCredential}
                    onChange={(e) => setCreditCostCredential(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost-reference">Reference Unlock Cost</Label>
                  <Input
                    id="cost-reference"
                    type="number"
                    min="0"
                    value={creditCostReference}
                    onChange={(e) => setCreditCostReference(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost-checklist">Checklist Unlock Cost</Label>
                  <Input
                    id="cost-checklist"
                    type="number"
                    min="0"
                    value={creditCostChecklist}
                    onChange={(e) => setCreditCostChecklist(e.target.value)}
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={async () => {
                    setSaving((prev) => ({ ...prev, credits: true }));
                    try {
                      await Promise.all([
                        fetch("/api/superadmin/settings", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ type: "update-setting", settingKey: "credit_cost_resume", settingValue: creditCostResume }),
                        }),
                        fetch("/api/superadmin/settings", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ type: "update-setting", settingKey: "credit_cost_credential", settingValue: creditCostCredential }),
                        }),
                        fetch("/api/superadmin/settings", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ type: "update-setting", settingKey: "credit_cost_reference", settingValue: creditCostReference }),
                        }),
                        fetch("/api/superadmin/settings", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ type: "update-setting", settingKey: "credit_cost_checklist", settingValue: creditCostChecklist }),
                        }),
                      ]);
                      toast.success("Credit costs saved");
                      fetchSettings();
                    } catch {
                      toast.error("Failed to save credit costs");
                    } finally {
                      setSaving((prev) => ({ ...prev, credits: false }));
                    }
                  }}
                  disabled={saving.credits}
                >
                  <Save className="size-4" />
                  {saving.credits ? "Saving…" : "Save All Credit Costs"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Call Notification Engine ───────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <BellRing className="size-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Call Notification Engine</CardTitle>
                  <CardDescription>Manually trigger the call notification cron job for testing.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This runs the same logic as the daily 8 AM UTC cron job. It creates notifications for:
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 ml-2">
                  <li><strong>Day-before</strong> reminders for calls scheduled tomorrow</li>
                  <li><strong>Day-of</strong> reminders for calls scheduled today</li>
                  <li><strong>30-min follow-ups</strong> for missed calls with no log</li>
                  <li><strong>Day-after follow-ups</strong> for yesterday&apos;s calls with no log</li>
                  <li><strong>Month-range reminders</strong> on 1st, 15th, and last day of month</li>
                </ul>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                  onClick={async () => {
                    setTriggeringNotifications(true);
                    setNotificationResult(null);
                    try {
                      const res = await fetch("/api/cron/call-notifications/trigger", {
                        method: "POST",
                      });
                      const json = await res.json();
                      if (!res.ok) throw new Error(json.error || "Trigger failed");
                      setNotificationResult(json.notifications);
                      toast.success("Call notifications triggered", {
                        description: `${json.notifications.total} notification(s) created`,
                      });
                    } catch (err) {
                      const message = err instanceof Error ? err.message : "Trigger failed";
                      toast.error("Trigger failed", { description: message });
                    } finally {
                      setTriggeringNotifications(false);
                    }
                  }}
                  disabled={triggeringNotifications}
                >
                  {triggeringNotifications ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Phone className="size-4" />
                  )}
                  {triggeringNotifications ? "Running…" : "Trigger Now"}
                </Button>
              </div>
              {notificationResult && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">Last run result:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Day Before</span>
                      <p className="font-semibold">{notificationResult.day_before}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Day Of</span>
                      <p className="font-semibold">{notificationResult.day_of}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">30min Follow-up</span>
                      <p className="font-semibold">{notificationResult.follow_up_30min}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Day After Follow-up</span>
                      <p className="font-semibold">{notificationResult.follow_up_day_after}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Month Reminder</span>
                      <p className="font-semibold">{notificationResult.month_reminder}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Month Half</span>
                      <p className="font-semibold">{notificationResult.month_half_reminder}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Month Urgent</span>
                      <p className="font-semibold">{notificationResult.month_urgent}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total</span>
                      <p className="font-semibold text-emerald-600">{notificationResult.total}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Feature Flags ─────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ToggleLeft className="size-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Feature Flags</CardTitle>
                  <CardDescription>Toggle platform features on or off.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(featureFlags).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ToggleLeft className="size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No feature flags configured yet</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {Object.entries(featureFlags).map(([flagName, isEnabled], index) => (
                    <div key={flagName}>
                      <div className="flex items-center justify-between py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{flagName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                          <p className="text-xs text-muted-foreground">Flag: {flagName}</p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => toggleFeatureFlag(flagName, checked)}
                          disabled={saving[`flag-${flagName}`]}
                        />
                      </div>
                      {index < Object.keys(featureFlags).length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Notification Defaults Panel ─── */}
      <NotificationDefaultsPanel />
    </div>
  );
}

// ─── Notification Defaults Panel ─────────────────────────────────────
function NotificationDefaultsPanel() {
  const [defaults, setDefaults] = useState<Array<{
    id: number;
    category: string;
    email_enabled: boolean;
    in_app_enabled: boolean;
    sms_enabled: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchDefaults();
  }, []);

  async function fetchDefaults() {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/notification-defaults");
      if (res.ok) {
        const data = await res.json();
        setDefaults(data.defaults || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  async function updateDefault(category: string, field: "email_enabled" | "in_app_enabled" | "sms_enabled", value: boolean) {
    setSaving(category + field);
    try {
      const res = await fetch("/api/superadmin/notification-defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, [field]: value }),
      });
      if (res.ok) {
        setDefaults((prev) =>
          prev.map((d) => (d.category === category ? { ...d, [field]: value } : d))
        );
        toast.success(`${category} ${field.replace("_enabled", "")} ${value ? "enabled" : "disabled"}`);
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(null);
    }
  }

  const CATEGORY_LABELS: Record<string, string> = {
    rtr: "RTR & Signatures",
    document: "Documents",
    status: "Status Changes",
    calendar: "Calendar",
    credit: "Credits",
    compliance: "Compliance",
    system: "System",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5" /> Notification Defaults
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Control which notification categories send email, in-app, and SMS for ALL users platform-wide.
          Urgent priority always sends email regardless of these settings.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 px-3 font-medium text-muted-foreground">Category</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground text-center">Email</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground text-center">In-App</th>
                  <th className="py-2 px-3 font-medium text-muted-foreground text-center">SMS (future)</th>
                </tr>
              </thead>
              <tbody>
                {defaults.map((d) => (
                  <tr key={d.id} className="border-b border-border/60">
                    <td className="py-3 px-3 font-medium">{CATEGORY_LABELS[d.category] || d.category}</td>
                    <td className="py-3 px-3 text-center">
                      <Switch
                        checked={d.email_enabled}
                        onCheckedChange={(checked) => updateDefault(d.category, "email_enabled", checked)}
                        disabled={saving === d.category + "email_enabled"}
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Switch
                        checked={d.in_app_enabled}
                        onCheckedChange={(checked) => updateDefault(d.category, "in_app_enabled", checked)}
                        disabled={saving === d.category + "in_app_enabled"}
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Switch
                        checked={d.sms_enabled}
                        onCheckedChange={(checked) => updateDefault(d.category, "sms_enabled", checked)}
                        disabled={saving === d.category + "sms_enabled"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">
              Note: SMS is architecture-only and not currently wired to any provider. Toggling SMS will have no effect until a provider (e.g. Twilio) is configured.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

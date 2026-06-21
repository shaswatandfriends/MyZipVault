"use client";

/**
 * Organization Settings — top-level page for recruiters/admins.
 *
 * Replaces the old "Org Settings" dialog that was hidden inside the VaultSign page.
 * Lets recruiters/admins edit:
 *   - Company logo (upload only, any aspect ratio via LogoUploader)
 *   - Company address, phone, email, website
 *
 * These values appear in VaultSign document headers/footers.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Building2, Save, Loader2, Globe, Phone, Mail, MapPin, Calendar } from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoUploader } from "@/components/vaultsign/logo-uploader";
import { useAuth } from "@/components/providers/auth-provider";

interface OrgSettings {
  id: number;
  name: string;
  company_logo_url: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_website: string | null;
  date_format: string | null;
  show_billing_to_recruiters: boolean;
  allow_credit_requests: boolean;
  allow_recruiter_csv_export: boolean;
}

export default function OrgSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const res = await fetch("/api/vaultsign/organization");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        setSettings(data);
      } catch (err: any) {
        toast.error(err.message || "Failed to load organization settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vaultsign/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_logo_url: settings.company_logo_url,
          company_address: settings.company_address,
          company_phone: settings.company_phone,
          company_email: settings.company_email,
          company_website: settings.company_website,
          date_format: settings.date_format,
          show_billing_to_recruiters: settings.show_billing_to_recruiters,
          allow_credit_requests: settings.allow_credit_requests,
          allow_recruiter_csv_export: settings.allow_recruiter_csv_export,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      toast.success("Organization settings saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <p className="text-sm text-text-muted">Could not load organization settings.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <PageHeader
        title="Organization Settings"
        description="These details appear on VaultSign document headers and footers when you send documents to candidates."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo uploader */}
          <LogoUploader
            value={settings.company_logo_url}
            onChange={(url) => setSettings({ ...settings, company_logo_url: url })}
            onUpload={async (file) => {
              const formData = new FormData();
              formData.append("file", file);
              const res = await fetch("/api/vaultsign/documents/upload", {
                method: "POST",
                body: formData,
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Upload failed");
              }
              const data = await res.json();
              toast.success("Logo uploaded");
              return data.document_url;
            }}
          />

          {/* Address */}
          <div>
            <Label htmlFor="address" className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Company Address
            </Label>
            <Textarea
              id="address"
              value={settings.company_address || ""}
              onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
              placeholder="123 Main St, Suite 100, City, State, ZIP"
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Phone
              </Label>
              <Input
                id="phone"
                value={settings.company_phone || ""}
                onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                value={settings.company_email || ""}
                onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                placeholder="contact@yourcompany.com"
                className="mt-1"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="website" className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" /> Website
            </Label>
            <Input
              id="website"
              value={settings.company_website || ""}
              onChange={(e) => setSettings({ ...settings, company_website: e.target.value })}
              placeholder="https://yourcompany.com"
              className="mt-1"
            />
          </div>

          {/* Date Format */}
          <div>
            <Label htmlFor="date_format" className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Date Format
            </Label>
            <p className="text-xs text-text-muted mt-0.5 mb-1">
              Controls how dates appear throughout the platform for your organization.
            </p>
            <Select
              value={settings.date_format || "MM/DD/YYYY"}
              onValueChange={(val) => setSettings({ ...settings, date_format: val })}
            >
              <SelectTrigger id="date_format" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US default)</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (European)</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Permission Toggles (admin only) — hidden for regular recruiters */}
          {user?.role === "client_admin" && (
          <div className="pt-4 border-t border-border space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Recruiter Permissions</h3>
            <p className="text-xs text-text-muted">Control what recruiters in your organization can see and do.</p>

            {/* Billing visibility */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
              <div>
                <p className="text-sm font-medium">Show Billing to recruiters</p>
                <p className="text-xs text-text-muted">When off, recruiters won't see the Billing page in their sidebar.</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, show_billing_to_recruiters: !settings.show_billing_to_recruiters })}
                className="w-9 h-5 rounded-full transition-colors shrink-0"
                style={{ background: settings.show_billing_to_recruiters ? "var(--primary)" : "var(--border)" }}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${settings.show_billing_to_recruiters ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>

            {/* Credit requests */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
              <div>
                <p className="text-sm font-medium">Allow credit requests</p>
                <p className="text-xs text-text-muted">When on, recruiters can request more credits from you.</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, allow_credit_requests: !settings.allow_credit_requests })}
                className="w-9 h-5 rounded-full transition-colors shrink-0"
                style={{ background: settings.allow_credit_requests ? "var(--primary)" : "var(--border)" }}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${settings.allow_credit_requests ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>

            {/* CSV export */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
              <div>
                <p className="text-sm font-medium">Allow CSV export</p>
                <p className="text-xs text-text-muted">When on, recruiters can export their BOB leads as CSV.</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, allow_recruiter_csv_export: !settings.allow_recruiter_csv_export })}
                className="w-9 h-5 rounded-full transition-colors shrink-0"
                style={{ background: settings.allow_recruiter_csv_export ? "var(--primary)" : "var(--border)" }}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${settings.allow_recruiter_csv_export ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
          )}

          {/* Save button */}
          <div className="pt-4 border-t border-border">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

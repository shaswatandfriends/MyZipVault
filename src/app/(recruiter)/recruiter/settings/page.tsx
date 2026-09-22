"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2, Save, Loader2, Globe, Phone, Mail, MapPin, Calendar,
  User, Linkedin, Twitter, Instagram, Facebook, Eye, EyeOff,
} from "@/lib/icons";
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

interface ProfileSettings {
  bio: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  show_phone_publicly: boolean;
  show_email_publicly: boolean;
}

export default function RecruiterSettingsPage() {
  const { user } = useAuth();
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [profile, setProfile] = useState<ProfileSettings>({
    bio: "", linkedin_url: "", twitter_url: "", instagram_url: "", facebook_url: "",
    show_phone_publicly: true, show_email_publicly: true,
  });
  const [loading, setLoading] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/vaultsign/organization").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/recruiter/profile-settings", { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([org, prof]) => {
      if (org) setOrgSettings(org);
      if (prof) setProfile(prof);
    }).finally(() => setLoading(false));
  }, []);

  async function saveOrg() {
    if (!orgSettings) return;
    setSavingOrg(true);
    try {
      const res = await fetch("/api/vaultsign/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_logo_url: orgSettings.company_logo_url,
          company_address: orgSettings.company_address,
          company_phone: orgSettings.company_phone,
          company_email: orgSettings.company_email,
          company_website: orgSettings.company_website,
          date_format: orgSettings.date_format,
          show_billing_to_recruiters: orgSettings.show_billing_to_recruiters,
          allow_credit_requests: orgSettings.allow_credit_requests,
          allow_recruiter_csv_export: orgSettings.allow_recruiter_csv_export,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Organization settings saved");
    } catch { toast.error("Failed to save"); }
    finally { setSavingOrg(false); }
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/recruiter/profile-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Profile settings saved");
    } catch { toast.error("Failed to save"); }
    finally { setSavingProfile(false); }
  }

  if (loading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-2 gap-6"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader title="Recruiter Settings" description="Manage your organization details and public recruiter profile." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ LEFT: Organization Settings ═══ */}
        {orgSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" /> Organization Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <LogoUploader
                value={orgSettings.company_logo_url}
                onChange={(url) => setOrgSettings({ ...orgSettings, company_logo_url: url })}
                onUpload={async (file) => {
                  const formData = new FormData();
                  formData.append("file", file);
                  const res = await fetch("/api/vaultsign/documents/upload", { method: "POST", body: formData });
                  if (!res.ok) throw new Error("Upload failed");
                  const data = await res.json();
                  return data.document_url;
                }}
              />
              <div>
                <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Address</Label>
                <Textarea value={orgSettings.company_address || ""} onChange={(e) => setOrgSettings({ ...orgSettings, company_address: e.target.value })} placeholder="123 Main St, Suite 100, City, State, ZIP" rows={2} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone</Label>
                  <Input value={orgSettings.company_phone || ""} onChange={(e) => setOrgSettings({ ...orgSettings, company_phone: e.target.value })} placeholder="+1 (555) 000-0000" className="mt-1" />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</Label>
                  <Input type="email" value={orgSettings.company_email || ""} onChange={(e) => setOrgSettings({ ...orgSettings, company_email: e.target.value })} placeholder="contact@company.com" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Website</Label>
                <Input value={orgSettings.company_website || ""} onChange={(e) => setOrgSettings({ ...orgSettings, company_website: e.target.value })} placeholder="https://company.com" className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Date Format</Label>
                <Select value={orgSettings.date_format || "MM/DD/YYYY"} onValueChange={(val) => setOrgSettings({ ...orgSettings, date_format: val })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (European)</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin-only permissions */}
              {user?.role === "client_admin" && (
                <div className="pt-4 border-t space-y-3">
                  <h3 className="text-sm font-semibold">Recruiter Permissions</h3>
                  {[
                    { key: "show_billing_to_recruiters", label: "Show Billing to recruiters", desc: "Recruiters can see the Billing page" },
                    { key: "allow_credit_requests", label: "Allow credit requests", desc: "Recruiters can request more credits" },
                    { key: "allow_recruiter_csv_export", label: "Allow CSV export", desc: "Recruiters can export BOB leads" },
                  ].map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">{perm.desc}</p>
                      </div>
                      <button
                        onClick={() => setOrgSettings({ ...orgSettings, [perm.key]: !orgSettings[perm.key as keyof OrgSettings] })}
                        className="w-9 h-5 rounded-full transition-colors shrink-0"
                        style={{ background: orgSettings[perm.key as keyof OrgSettings] ? "var(--primary)" : "var(--border)" }}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${orgSettings[perm.key as keyof OrgSettings] ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={saveOrg} disabled={savingOrg} className="gap-2">
                {savingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Organization
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══ RIGHT: Recruiter Profile Settings ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> Recruiter Profile
            </CardTitle>
            <p className="text-xs text-muted-foreground">These appear on your public profile page.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Bio */}
            <div>
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea
                id="bio"
                value={profile.bio || ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="A brief professional bio that candidates will see on your profile..."
                rows={3}
                maxLength={500}
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground text-right mt-0.5">{(profile.bio || "").length}/500</p>
            </div>

            {/* Social Media */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Social Media</h3>
              <div>
                <Label className="flex items-center gap-1.5 text-xs"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</Label>
                <Input value={profile.linkedin_url || ""} onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/yourname" className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 text-xs"><Twitter className="h-3.5 w-3.5" /> Twitter / X</Label>
                <Input value={profile.twitter_url || ""} onChange={(e) => setProfile({ ...profile, twitter_url: e.target.value })} placeholder="https://twitter.com/yourname" className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 text-xs"><Instagram className="h-3.5 w-3.5" /> Instagram</Label>
                <Input value={profile.instagram_url || ""} onChange={(e) => setProfile({ ...profile, instagram_url: e.target.value })} placeholder="https://instagram.com/yourname" className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 text-xs"><Facebook className="h-3.5 w-3.5" /> Facebook</Label>
                <Input value={profile.facebook_url || ""} onChange={(e) => setProfile({ ...profile, facebook_url: e.target.value })} placeholder="https://facebook.com/yourpage" className="mt-1" />
              </div>
            </div>

            {/* Display Preferences */}
            <div className="pt-4 border-t space-y-3">
              <h3 className="text-sm font-semibold">Profile Display</h3>
              <p className="text-xs text-muted-foreground">Control what contact info is visible on your public profile.</p>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  {profile.show_phone_publicly ? <Eye className="size-4 text-emerald-600" /> : <EyeOff className="size-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium">Show Phone Number</p>
                    <p className="text-xs text-muted-foreground">Candidates can see your phone</p>
                  </div>
                </div>
                <button
                  onClick={() => setProfile({ ...profile, show_phone_publicly: !profile.show_phone_publicly })}
                  className="w-9 h-5 rounded-full transition-colors shrink-0"
                  style={{ background: profile.show_phone_publicly ? "var(--primary)" : "var(--border)" }}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${profile.show_phone_publicly ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  {profile.show_email_publicly ? <Eye className="size-4 text-emerald-600" /> : <EyeOff className="size-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium">Show Email</p>
                    <p className="text-xs text-muted-foreground">Candidates can see your email</p>
                  </div>
                </div>
                <button
                  onClick={() => setProfile({ ...profile, show_email_publicly: !profile.show_email_publicly })}
                  className="w-9 h-5 rounded-full transition-colors shrink-0"
                  style={{ background: profile.show_email_publicly ? "var(--primary)" : "var(--border)" }}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${profile.show_email_publicly ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>

            <Button onClick={saveProfile} disabled={savingProfile} className="gap-2">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Loader2, Lock, User, Mail, Phone } from "@/lib/icons";

/**
 * CandidateProfileInfoCard
 *
 * Phase 4.2 — Healthcare Professional Information card shown at the top
 * of the redesigned checklist list page.
 *
 * Layout reference: healthcareskillschecklist.com/checklist/rn
 *
 * Behavior:
 *   - Pre-filled by recruiter (read-only): Full Name, Email, Phone
 *   - Candidate-fillable (auto-save on blur): City, State, Zip, Years
 *     Experience (total + specialty), SSN (encrypted at rest)
 *   - SSN field shows "On file" badge if has_ssn=true; candidate can
 *     re-enter to update (the API encrypts the new value).
 */

const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }, { code: "DC", name: "District of Columbia" },
];

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  years_experience_total: number | null;
  years_experience_specialty: number | null;
  has_ssn: boolean;
}

export function CandidateProfileInfoCard() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/candidate/profile-fields")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile);
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const saveField = useCallback(async (fieldName: string, value: string | number | null) => {
    if (!profile) return;
    setSavingField(fieldName);
    setSavedFields((prev) => {
      const next = new Set(prev);
      next.delete(fieldName);
      return next;
    });
    try {
      const res = await fetch("/api/candidate/profile-fields", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldName]: value }),
      });
      const data = await res.json();
      if (res.ok && data.updated_fields?.includes(fieldName === "ssn" ? "ssn_encrypted" : fieldName)) {
        setSavedFields((prev) => new Set(prev).add(fieldName));
        setTimeout(() => {
          setSavedFields((prev) => {
            const next = new Set(prev);
            next.delete(fieldName);
            return next;
          });
        }, 2000);
      }
    } catch (e: any) {
      toast.error(`Failed to save ${fieldName}`);
    } finally {
      setSavingField(null);
    }
  }, [profile]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-2">Loading profile…</p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Profile not found. Please complete onboarding first.</p>
        </CardContent>
      </Card>
    );
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="size-4" /> Healthcare Professional Information
        </CardTitle>
        <CardDescription>
          Pre-filled by recruiter. Complete your details below — these are stored permanently on your profile
          and auto-shared with recruiters when they request your checklist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Provided by Recruiter
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ReadOnlyField label="Full Name" value={fullName} icon={<User className="size-3" />} />
            <ReadOnlyField label="Email" value={profile.email} icon={<Mail className="size-3" />} />
            <ReadOnlyField label="Phone" value={profile.phone} icon={<Phone className="size-3" />} />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Complete These (auto-saved on blur)
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <EditableField
              label="City"
              value={profile.city ?? ""}
              onChange={(v) => setProfile({ ...profile, city: v })}
              onBlur={(v) => saveField("city", v)}
              placeholder="e.g., Portland"
              saving={savingField === "city"}
              saved={savedFields.has("city")}
            />
            <EditableSelect
              label="State"
              value={profile.state ?? ""}
              onChange={(v) => setProfile({ ...profile, state: v })}
              onBlur={(v) => saveField("state", v)}
              options={US_STATES.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` }))}
              placeholder="Select state"
              saving={savingField === "state"}
              saved={savedFields.has("state")}
            />
            <EditableField
              label="Zip Code"
              value={profile.zip_code ?? ""}
              onChange={(v) => setProfile({ ...profile, zip_code: v })}
              onBlur={(v) => saveField("zip_code", v)}
              placeholder="e.g., 97201"
              maxLength={10}
              saving={savingField === "zip_code"}
              saved={savedFields.has("zip_code")}
            />
            <EditableField
              label="Total Years of Experience"
              type="number"
              value={profile.years_experience_total?.toString() ?? ""}
              onChange={(v) => setProfile({ ...profile, years_experience_total: v ? parseInt(v, 10) : null })}
              onBlur={(v) => saveField("years_experience_total", v ? parseInt(v, 10) : null)}
              placeholder="e.g., 5"
              saving={savingField === "years_experience_total"}
              saved={savedFields.has("years_experience_total")}
            />
            <EditableField
              label="Years in This Specialty"
              type="number"
              value={profile.years_experience_specialty?.toString() ?? ""}
              onChange={(v) => setProfile({ ...profile, years_experience_specialty: v ? parseInt(v, 10) : null })}
              onBlur={(v) => saveField("years_experience_specialty", v ? parseInt(v, 10) : null)}
              placeholder="e.g., 3"
              saving={savingField === "years_experience_specialty"}
              saved={savedFields.has("years_experience_specialty")}
            />
            <EditableField
              label="SSN"
              type="password"
              value={profile.has_ssn ? "•••-••-••••" : ""}
              placeholder={profile.has_ssn ? "On file — re-enter to update" : "xxx-xx-xxxx"}
              onChange={() => {}}
              onBlur={(v) => v && saveField("ssn", v)}
              maxLength={11}
              saving={savingField === "ssn"}
              saved={savedFields.has("ssn")}
              icon={<Lock className="size-3" />}
              badge={profile.has_ssn ? <Badge variant="secondary" className="text-[10px]">On file</Badge> : null}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReadOnlyField({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
        {icon}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function EditableField({
  label, value, onChange, onBlur, placeholder, type = "text", maxLength,
  saving, saved, icon, badge,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  saving: boolean;
  saved: boolean;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {badge}
        {saving ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> :
         saved ? <Check className="size-3 text-emerald-600" /> : null}
      </div>
      <div className="relative">
        {icon && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={icon ? "pl-8" : ""}
        />
      </div>
    </div>
  );
}

function EditableSelect({
  label, value, onChange, onBlur, options, placeholder, saving, saved,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {saving ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> :
         saved ? <Check className="size-3 text-emerald-600" /> : null}
      </div>
      <Select
        value={value}
        onValueChange={(v) => { onChange(v); onBlur(v); }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

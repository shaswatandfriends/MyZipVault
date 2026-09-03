"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Trash2, MapPin, Briefcase, Search } from "@/lib/icons";
import { toast } from "sonner";

interface Subscription {
  id: number;
  specialty: string | null;
  state: string | null;
  city: string | null;
  employment_type: string | null;
  is_remote: boolean;
  keywords: string | null;
  email_frequency: string;
  is_active: boolean;
}

const SPECIALTIES = [
  "ICU / Critical Care", "ER / Emergency", "OR / Operating Room",
  "MedSurg", "Labor & Delivery", "Cath Lab", "NICU", "Telemetry",
  "Psychiatric", "Oncology", "Pediatrics", "Home Health",
];

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const EMPLOYMENT_TYPES = [
  { value: "travel", label: "Travel" },
  { value: "permanent", label: "Permanent" },
  { value: "contract", label: "Contract" },
  { value: "per_diem", label: "Per Diem" },
  { value: "locum", label: "Locum" },
];

export function JobAlertManager() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [specialty, setSpecialty] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [frequency, setFrequency] = useState("instant");

  useEffect(() => { fetchSubscriptions(); }, []);

  async function fetchSubscriptions() {
    try {
      const res = await fetch("/api/candidate/job-alerts");
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleCreate() {
    if (!specialty && !state && !city && !employmentType && !isRemote && !keywords) {
      toast.error("Select at least one filter");
      return;
    }
    try {
      const res = await fetch("/api/candidate/job-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialty, state, city, employment_type: employmentType, is_remote: isRemote, keywords, email_frequency: frequency }),
      });
      if (res.ok) {
        toast.success("Job alert created");
        setShowForm(false);
        setSpecialty(""); setState(""); setCity(""); setEmploymentType(""); setIsRemote(false); setKeywords(""); setFrequency("instant");
        fetchSubscriptions();
      } else {
        toast.error("Failed to create alert");
      }
    } catch { toast.error("Failed to create alert"); }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/candidate/job-alerts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Alert deleted");
        setSubscriptions(subscriptions.filter(s => s.id !== id));
      }
    } catch { toast.error("Failed to delete"); }
  }

  async function handleToggle(id: number) {
    try {
      const res = await fetch(`/api/candidate/job-alerts?id=${id}`, { method: "PUT" });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(subscriptions.map(s => s.id === id ? { ...s, is_active: data.subscription.is_active } : s));
      }
    } catch { toast.error("Failed to toggle"); }
  }

  if (loading) return <div className="animate-pulse h-48 rounded-xl bg-muted" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4" /> Job Alerts
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="size-3.5 mr-1" /> New Alert
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Create form */}
        {showForm && (
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Specialty</label>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">State</label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">City</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g., Dallas" className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Employment Type</label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Keywords</label>
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., night shift" className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email Frequency</label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isRemote} onCheckedChange={setIsRemote} />
              <span className="text-sm">Remote / Telehealth only</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate}>Create Alert</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Existing subscriptions */}
        {subscriptions.length === 0 && !showForm ? (
          <div className="text-center py-8">
            <Search className="size-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No job alerts yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Create an alert to get notified when matching jobs are posted</p>
          </div>
        ) : (
          subscriptions.map((sub) => (
            <div key={sub.id} className="flex items-start justify-between rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {sub.specialty && <Badge variant="secondary" className="text-xs gap-1"><Briefcase className="size-3" />{sub.specialty}</Badge>}
                  {sub.state && <Badge variant="secondary" className="text-xs gap-1"><MapPin className="size-3" />{sub.state}</Badge>}
                  {sub.city && <Badge variant="secondary" className="text-xs">{sub.city}</Badge>}
                  {sub.employment_type && <Badge variant="secondary" className="text-xs">{sub.employment_type}</Badge>}
                  {sub.is_remote && <Badge variant="secondary" className="text-xs">Remote</Badge>}
                  {sub.keywords && <Badge variant="secondary" className="text-xs">"{sub.keywords}"</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {sub.email_frequency === "instant" ? "Instant alerts" : sub.email_frequency === "daily" ? "Daily digest" : "Weekly digest"}
                  {" · "}
                  {sub.is_active ? "Active" : "Paused"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={sub.is_active} onCheckedChange={() => handleToggle(sub.id)} />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(sub.id)}>
                  <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

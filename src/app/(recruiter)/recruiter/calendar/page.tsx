"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Star,
  Phone,
  Clock,
  Search,
  Download,
  MoreHorizontal,
  User,
  Mail,
  Briefcase,
  Stethoscope,
  MessageSquare,
  Calendar,
  List,
  X,
  Loader2,
  Eye,
  Trash2,
  Sparkles,
  UserCheck,
  Send,
  Printer,
  FileDown,
  GripVertical,
} from "@/lib/icons";

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ALL_STATUSES, STATUS_META, type CandidateStatus } from "@/lib/bob/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ──────────────────────────────────────────────────────────────

interface CallSchedule {
  id: number;
  lead_id: number;
  recruiter_user_id: number;
  scheduled_date: string | null;
  scheduled_month: string | null;
  status: string;
  created_at: string;
  lead?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    specialty: string | null;
    pipeline_stage: string;
    star_rating: number | null;
  };
}

interface CallLog {
  id: number;
  lead_id: number;
  call_schedule_id: number | null;
  recruiter_user_id: number;
  call_date: string;
  outcome: string;
  remark: string | null;
  next_action: string | null;
  created_at: string;
}

interface Lead {
  id: number;
  recruiter_user_id: number;
  organization_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  specialty: string | null;
  reached_for: string | null;
  remark: string | null;
  source: string;
  pipeline_stage: string;
  star_rating: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  call_schedules: CallSchedule[];
  call_logs: CallLog[];
}

interface CandidateCalendar {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  specialty: string | null;
  availabilities: CandidateAvailability[];
}

interface CandidateAvailability {
  id: number;
  candidate_user_id: number;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  is_recurring: boolean;
  label: string | null;
  availability_status: string;
}

interface AvailabilitySlot {
  id: number;
  recruiter_user_id: number;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  is_recurring: boolean;
  label: string | null;
  created_at: string;
}

interface ShiftRequest {
  id: number;
  recruiter_user_id: number;
  candidate_user_id: number;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  position: string | null;
  facility_name: string | null;
  notes: string | null;
  status: string;
  responded_at: string | null;
  response_note: string | null;
  created_at: string;
  candidate_user?: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

interface AutoMatchResult {
  candidateId: number;
  candidateName: string;
  specialty: string | null;
  availabilityStatus: string;
  matchScore: number;
  matchReasons: string[];
  leadId: number;
  leadName: string;
  leadSpecialty: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────

// ─── Unified pipeline stages (sourced from BOB STATUS_META) ─────────
// Single source of truth — same statuses as Book of Business.
// If you change a status here, it changes everywhere.
// We use STATUS_META directly for colors (inline styles) because Tailwind
// JIT can't see dynamic class names.
const PIPELINE_STAGES = ALL_STATUSES.map((status) => ({
  value: status,
  label: STATUS_META[status].label,
}));

const SOURCE_OPTIONS = [
  { value: "cold_call", label: "Cold Call" },
  { value: "referral", label: "Referral" },
  { value: "job_board", label: "Job Board" },
  { value: "walk_in", label: "Walk-in" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "other", label: "Other" },
] as const;

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getStageLabel(stage: string): string {
  return STATUS_META[stage as CandidateStatus]?.label ?? PIPELINE_STAGES.find((s) => s.value === stage)?.label ?? stage;
}

function getStageBadge(stage: string) {
  const meta = STATUS_META[stage as CandidateStatus];
  if (!meta) return <Badge variant="outline">{stage}</Badge>;
  return (
    <Badge
      style={{
        backgroundColor: meta.bgColor,
        color: meta.color,
        border: `1px solid ${meta.borderColor}`,
      }}
      className="border hover:opacity-80"
    >
      {meta.icon} {meta.label}
    </Badge>
  );
}

function getSourceLabel(source: string): string {
  return SOURCE_OPTIONS.find((s) => s.value === source)?.label ?? source;
}

function getCalendarBlockColor(schedule: CallSchedule, leads: Lead[]): string {
  if (schedule.status === "no_answer") return "bg-red-100 border-red-300 text-red-900";
  const lead = leads.find((l) => l.id === schedule.lead_id);
  if (schedule.scheduled_month && !schedule.scheduled_date) return "bg-orange-100 border-orange-300 text-orange-900";
  if (schedule.status === "scheduled") {
    const now = new Date();
    const schedDate = schedule.scheduled_date ? new Date(schedule.scheduled_date) : null;
    if (schedDate && schedDate < now && schedule.status === "scheduled") {
      const hasLog = lead?.call_logs?.some((cl) => cl.call_schedule_id === schedule.id);
      if (!hasLog) return "bg-red-100 border-red-300 text-red-900";
    }
    if (lead?.pipeline_stage === "interview_stage") return "bg-teal-100 border-teal-300 text-teal-900";
    return "bg-blue-100 border-blue-300 text-blue-900";
  }
  return "bg-blue-100 border-blue-300 text-blue-900";
}

function getCalendarBlockIcon(schedule: CallSchedule, leads: Lead[]): string {
  if (schedule.scheduled_month && !schedule.scheduled_date) return "🟠";
  if (schedule.status === "no_answer") return "🔴";
  const lead = leads.find((l) => l.id === schedule.lead_id);
  const now = new Date();
  const schedDate = schedule.scheduled_date ? new Date(schedule.scheduled_date) : null;
  if (schedDate && schedDate < now && schedule.status === "scheduled") {
    const hasLog = lead?.call_logs?.some((cl) => cl.call_schedule_id === schedule.id);
    if (!hasLog) return "🔴";
  }
  if (schedule.status === "scheduled") return "🔵";
  if (schedule.status === "completed") return "🟢";
  return "🔵";
}

function getCalendarBlockLabel(schedule: CallSchedule): string {
  const leadName = schedule.lead
    ? `${schedule.lead.first_name} ${schedule.lead.last_name}`
    : "Unknown";
  if (schedule.scheduled_date) {
    return `${leadName} @ ${formatTime(schedule.scheduled_date)}`;
  }
  if (schedule.scheduled_month) {
    return `${leadName} (${schedule.scheduled_month})`;
  }
  return leadName;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Fill in previous month's days for the first week
  const startDow = firstDay.getDay();
  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Fill next month's days for the last week
  const remaining = 42 - days.length; // 6 rows * 7 = 42
  for (let d = 1; d <= remaining; d++) {
    days.push(new Date(year, month + 1, d));
  }

  return days;
}

function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getHours(): string[] {
  return Array.from({ length: 24 }, (_, i) => {
    const h = i % 12 === 0 ? 12 : i % 12;
    const ampm = i < 12 ? "AM" : "PM";
    return `${h}:00 ${ampm}`;
  });
}

// ─── Star Rating Component ──────────────────────────────────────────────

function StarRatingInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="p-0.5"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(value === star ? null : star)}
        >
          <Star
            className={`size-5 transition-colors ${
              (hover || (value ?? 0)) >= star
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
      {value && (
        <button type="button" onClick={() => onChange(null)} className="ml-1">
          <X className="size-3.5 text-gray-400 hover:text-gray-600" />
        </button>
      )}
    </div>
  );
}

function StarRatingDisplay({ value }: { value: number | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${
            i < value ? "fill-amber-400 text-amber-400" : "text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Add New Lead Dialog ────────────────────────────────────────────────

function AddNewLeadDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    specialty: "",
    reachedFor: "",
    remark: "",
    source: "cold_call",
    starRating: null as number | null,
    scheduleType: "none" as "none" | "specific" | "month",
    scheduledDate: "",
    scheduledMonth: "",
  });

  const resetForm = () => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      jobTitle: "",
      specialty: "",
      reachedFor: "",
      remark: "",
      source: "cold_call",
      starRating: null,
      scheduleType: "none",
      scheduledDate: "",
      scheduledMonth: "",
    });
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/recruiter/calendar/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          jobTitle: form.jobTitle || undefined,
          specialty: form.specialty || undefined,
          reachedFor: form.reachedFor || undefined,
          remark: form.remark || undefined,
          source: form.source,
          starRating: form.starRating || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create lead");
      }
      const data = await res.json();

      // If schedule was specified, create it too
      if (form.scheduleType === "specific" && form.scheduledDate) {
        await fetch("/api/recruiter/calendar/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: data.lead.id,
            scheduledDate: form.scheduledDate,
          }),
        });
      } else if (form.scheduleType === "month" && form.scheduledMonth) {
        await fetch("/api/recruiter/calendar/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: data.lead.id,
            scheduledMonth: form.scheduledMonth,
          }),
        });
      }

      toast.success("Lead created successfully");
      resetForm();
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            Add New Lead
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input
                value={form.jobTitle}
                onChange={(e) => updateField("jobTitle", e.target.value)}
                placeholder="RN"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Specialty</Label>
              <Input
                value={form.specialty}
                onChange={(e) => updateField("specialty", e.target.value)}
                placeholder="ICU, ER, Med-Surg..."
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reached For</Label>
            <Input
              value={form.reachedFor}
              onChange={(e) => updateField("reachedFor", e.target.value)}
              placeholder="What position/role"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Remark</Label>
            <Textarea
              value={form.remark}
              onChange={(e) => updateField("remark", e.target.value)}
              placeholder="How the call went..."
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={form.source} onValueChange={(v) => updateField("source", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Schedule Next</Label>
            <Select value={form.scheduleType} onValueChange={(v) => updateField("scheduleType", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No schedule</SelectItem>
                <SelectItem value="specific">Specific Date/Time</SelectItem>
                <SelectItem value="month">Month Range</SelectItem>
              </SelectContent>
            </Select>
            {form.scheduleType === "specific" && (
              <Input
                type="datetime-local"
                value={form.scheduledDate}
                onChange={(e) => updateField("scheduledDate", e.target.value)}
                className="mt-1.5"
              />
            )}
            {form.scheduleType === "month" && (
              <Select value={form.scheduledMonth} onValueChange={(v) => updateField("scheduledMonth", v)} >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + i);
                    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    return (
                      <SelectItem key={val} value={val}>
                        {MONTH_NAMES[d.getMonth()]} {d.getFullYear()}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Star Rating</Label>
            <StarRatingInput value={form.starRating} onChange={(v) => updateField("starRating", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary-hover text-white"
          >
            {saving && <Loader2 className="size-4 animate-spin mr-1" />}
            Save Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Schedule Call Dialog ───────────────────────────────────────────────

function ScheduleCallDialog({
  open,
  onOpenChange,
  leads,
  preselectedLeadId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leads: Lead[];
  preselectedLeadId?: number | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [leadId, setLeadId] = useState<string>(preselectedLeadId ? String(preselectedLeadId) : "");
  const [scheduleType, setScheduleType] = useState<"specific" | "month">("specific");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledMonth, setScheduledMonth] = useState("");

  useEffect(() => {
    if (preselectedLeadId) setLeadId(String(preselectedLeadId));
  }, [preselectedLeadId]);

  const handleSchedule = async () => {
    if (!leadId) {
      toast.error("Please select a lead");
      return;
    }
    if (scheduleType === "specific" && !scheduledDate) {
      toast.error("Please select a date and time");
      return;
    }
    if (scheduleType === "month" && !scheduledMonth) {
      toast.error("Please select a month");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/recruiter/calendar/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: Number(leadId),
          scheduledDate: scheduleType === "specific" ? scheduledDate : undefined,
          scheduledMonth: scheduleType === "month" ? scheduledMonth : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to schedule call");
      }
      toast.success("Call scheduled successfully");
      onOpenChange(false);
      setLeadId("");
      setScheduledDate("");
      setScheduledMonth("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule call");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            Schedule Call
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Lead *</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lead..." />
              </SelectTrigger>
              <SelectContent>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.first_name} {l.last_name}
                    {l.specialty ? ` — ${l.specialty}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Schedule Type</Label>
            <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as "specific" | "month")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="specific">Specific Date/Time</SelectItem>
                <SelectItem value="month">Month Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scheduleType === "specific" && (
            <div className="space-y-1.5">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          )}
          {scheduleType === "month" && (
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={scheduledMonth} onValueChange={setScheduledMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + i);
                    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    return (
                      <SelectItem key={val} value={val}>
                        {MONTH_NAMES[d.getMonth()]} {d.getFullYear()}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={saving}
            className="bg-primary hover:bg-primary-hover text-white"
          >
            {saving && <Loader2 className="size-4 animate-spin mr-1" />}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Call Outcome Dialog ────────────────────────────────────────────────

function CallOutcomeDialog({
  open,
  onOpenChange,
  schedule,
  lead,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schedule: CallSchedule | null;
  lead: Lead | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState("good");
  const [remark, setRemark] = useState("");
  const [nextAction, setNextAction] = useState<"schedule" | "not_interested" | "none">("none");
  const [rescheduleType, setRescheduleType] = useState<"specific" | "month">("specific");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleMonth, setRescheduleMonth] = useState("");

  const handleSubmit = async () => {
    if (!schedule || !lead) return;
    setSaving(true);
    try {
      const res = await fetch("/api/recruiter/calendar/call-outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callScheduleId: schedule.id,
          leadId: lead.id,
          outcome,
          remark: remark || undefined,
          nextAction: nextAction === "schedule" ? "reschedule" : nextAction === "not_interested" ? "mark_not_interested" : "none",
          rescheduleDate: nextAction === "schedule" && rescheduleType === "specific" ? rescheduleDate : undefined,
          rescheduleMonth: nextAction === "schedule" && rescheduleType === "month" ? rescheduleMonth : undefined,
          pipelineStage: outcome === "not_interested" ? "not_interested" : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to record outcome");
      }
      toast.success("Call outcome recorded");
      onOpenChange(false);
      setRemark("");
      setOutcome("good");
      setNextAction("none");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record outcome");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            Call Outcome
            {lead && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                — {lead.first_name} {lead.last_name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Outcome</Label>
            <RadioGroup value={outcome} onValueChange={setOutcome}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="good" id="outcome-good" />
                <Label htmlFor="outcome-good" className="cursor-pointer font-normal">Good</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no_answer" id="outcome-noanswer" />
                <Label htmlFor="outcome-noanswer" className="cursor-pointer font-normal">No Answer</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="voicemail" id="outcome-voicemail" />
                <Label htmlFor="outcome-voicemail" className="cursor-pointer font-normal">Left Voicemail</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="not_interested" id="outcome-notinterested" />
                <Label htmlFor="outcome-notinterested" className="cursor-pointer font-normal">Not Interested</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label>New Remark</Label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="How did the call go..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Next Action</Label>
            <RadioGroup value={nextAction} onValueChange={(v) => setNextAction(v as typeof nextAction)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="schedule" id="next-schedule" />
                <Label htmlFor="next-schedule" className="cursor-pointer font-normal">Schedule another call</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="not_interested" id="next-notinterested" />
                <Label htmlFor="next-notinterested" className="cursor-pointer font-normal">Mark as Not Interested</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="none" id="next-none" />
                <Label htmlFor="next-none" className="cursor-pointer font-normal">No further action needed</Label>
              </div>
            </RadioGroup>
          </div>
          {nextAction === "schedule" && (
            <div className="space-y-3 pl-2 border-l-2 border-primary/20 ml-1">
              <div className="space-y-1.5">
                <Label>Schedule Type</Label>
                <Select value={rescheduleType} onValueChange={(v) => setRescheduleType(v as "specific" | "month")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="specific">Specific Date/Time</SelectItem>
                    <SelectItem value="month">Month Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {rescheduleType === "specific" ? (
                <Input
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              ) : (
                <Select value={rescheduleMonth} onValueChange={setRescheduleMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + i);
                      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                      return (
                        <SelectItem key={val} value={val}>
                          {MONTH_NAMES[d.getMonth()]} {d.getFullYear()}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-primary hover:bg-primary-hover text-white"
          >
            {saving && <Loader2 className="size-4 animate-spin mr-1" />}
            Save Outcome
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Lead Detail Dialog ─────────────────────────────────────────────────

function LeadDetailDialog({
  open,
  onOpenChange,
  lead,
  onSaved,
  onScheduleCall,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead | null;
  onSaved: () => void;
  onScheduleCall: (leadId: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    specialty: "",
    reachedFor: "",
    remark: "",
    source: "cold_call",
    pipelineStage: "new_lead",
    starRating: null as number | null,
  });

  useEffect(() => {
    if (lead) {
      setForm({
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        jobTitle: lead.job_title ?? "",
        specialty: lead.specialty ?? "",
        reachedFor: lead.reached_for ?? "",
        remark: lead.remark ?? "",
        source: lead.source,
        pipelineStage: lead.pipeline_stage,
        starRating: lead.star_rating,
      });
      setEditing(false);
    }
  }, [lead]);

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/recruiter/calendar/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email || null,
          phone: form.phone || null,
          jobTitle: form.jobTitle || null,
          specialty: form.specialty || null,
          reachedFor: form.reachedFor || null,
          remark: form.remark || null,
          source: form.source,
          pipelineStage: form.pipelineStage,
          starRating: form.starRating,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update lead");
      }
      toast.success("Lead updated");
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  const updateField = (field: string, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-3" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            {editing ? "Edit Lead" : `${lead.first_name} ${lead.last_name}`}
            {!editing && <StarRatingDisplay value={lead.star_rating} />}
          </DialogTitle>
        </DialogHeader>

        {editing ? (
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Job Title</Label>
                <Input value={form.jobTitle} onChange={(e) => updateField("jobTitle", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Specialty</Label>
                <Input value={form.specialty} onChange={(e) => updateField("specialty", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reached For</Label>
              <Input value={form.reachedFor} onChange={(e) => updateField("reachedFor", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Remark</Label>
              <Textarea value={form.remark} onChange={(e) => updateField("remark", e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => updateField("source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pipeline Stage</Label>
                <Select value={form.pipelineStage} onValueChange={(v) => updateField("pipelineStage", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Star Rating</Label>
              <StarRatingInput value={form.starRating} onChange={(v) => updateField("starRating", v)} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary-light text-lg font-semibold text-primary">
                {lead.first_name[0]}{lead.last_name[0]}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{lead.first_name} {lead.last_name}</h3>
                <div className="flex items-center gap-2">
                  {getStageBadge(lead.pipeline_stage)}
                  <StarRatingDisplay value={lead.star_rating} />
                </div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-gray-400" />
                <span className="text-gray-600">{lead.email || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-gray-400" />
                <span className="text-gray-600">{lead.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-gray-400" />
                <span className="text-gray-600">{lead.job_title || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="size-4 text-gray-400" />
                <span className="text-gray-600">{lead.specialty || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="size-4 text-gray-400" />
                <span className="text-gray-600">Reached for: {lead.reached_for || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-gray-400" />
                <span className="text-gray-600">Source: {getSourceLabel(lead.source)}</span>
              </div>
            </div>
            {lead.remark && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                <span className="font-medium">Remark:</span> {lead.remark}
              </div>
            )}

            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Call History</h4>
              {lead.call_logs.length === 0 ? (
                <p className="text-sm text-gray-400">No call history yet</p>
              ) : (
                <ScrollArea className="max-h-40">
                  <div className="space-y-2">
                    {lead.call_logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-sm">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {log.outcome === "good" ? "✅" : log.outcome === "no_answer" ? "📵" : log.outcome === "voicemail" ? "📞" : "❌"}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-gray-700">{log.remark || log.outcome}</p>
                          <p className="text-xs text-gray-400">{formatDate(log.call_date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onScheduleCall(lead.id)}
              >
                <Phone className="size-3.5 mr-1" />
                Schedule Call
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit Lead
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary-hover text-white">
                {saving && <Loader2 className="size-4 animate-spin mr-1" />}
                Save
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shift Request Dialog ───────────────────────────────────────────────

function ShiftRequestDialog({
  open,
  onOpenChange,
  candidate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidate: CandidateCalendar | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shiftDate: "",
    startTime: "",
    endTime: "",
    position: "",
    facilityName: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) {
      setForm({ shiftDate: "", startTime: "", endTime: "", position: "", facilityName: "", notes: "" });
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!candidate || !form.shiftDate) {
      toast.error("Date is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/recruiter/calendar/shift-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateUserId: candidate.userId,
          shiftDate: form.shiftDate,
          startTime: form.startTime || undefined,
          endTime: form.endTime || undefined,
          position: form.position || undefined,
          facilityName: form.facilityName || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to send shift request");
      }
      toast.success("Shift request sent");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send shift request");
    } finally {
      setSaving(false);
    }
  };

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            Send Shift Request
            <span className="text-sm font-normal text-gray-500 ml-2">
              — {candidate.firstName} {candidate.lastName}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Input type="date" value={form.shiftDate} onChange={(e) => setForm((p) => ({ ...p, shiftDate: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Position</Label>
            <Input value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} placeholder="e.g. RN - ICU" />
          </div>
          <div className="space-y-1.5">
            <Label>Facility</Label>
            <Input value={form.facilityName} onChange={(e) => setForm((p) => ({ ...p, facilityName: e.target.value }))} placeholder="Facility name" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-primary-hover text-white">
            {saving && <Loader2 className="size-4 animate-spin mr-1" />}
            <Send className="size-4 mr-1" />
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab 1: My Calendar ─────────────────────────────────────────────────

function MyCalendarTab({
  leads,
  schedules,
  onAddLead,
  onScheduleCall,
  refresh,
}: {
  leads: Lead[];
  schedules: CallSchedule[];
  onAddLead: () => void;
  onScheduleCall: (leadId: number) => void;
  refresh: () => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [selectedSchedule, setSelectedSchedule] = useState<CallSchedule | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleBlockClick = (schedule: CallSchedule) => {
    const lead = leads.find((l) => l.id === schedule.lead_id) ?? null;
    setSelectedSchedule(schedule);
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  const handleOutcomeClick = (schedule: CallSchedule) => {
    const lead = leads.find((l) => l.id === schedule.lead_id) ?? null;
    setSelectedSchedule(schedule);
    setSelectedLead(lead);
    setOutcomeOpen(true);
  };

  const handlePrintCallSheet = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/recruiter/calendar/daily-call-sheet?date=${today}`);
      if (!res.ok) throw new Error("Failed to fetch call sheet");
      const data = await res.json();

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups to print the call sheet");
        return;
      }

      // Dynamically resolve CSS variable values from the current theme
      // so the print template never holds hardcoded hex colors
      const cs = getComputedStyle(document.documentElement);
      const pv = (v: string) => cs.getPropertyValue(v).trim();
      const printVars = {
        border: pv("--border"),
        foreground: pv("--foreground"),
        textMuted: pv("--text-muted"),
        surface2: pv("--surface-2"),
        textSecondary: pv("--text-secondary"),
        statusGreenDark: pv("--status-green-dark"),
        statusGreenDarker: pv("--status-green-darker"),
      };

      const rows = data.calls.map((call: {
        leadName: string;
        phone: string;
        email: string;
        specialty: string;
        scheduledTime: string;
        pipelineStage: string;
        remark: string;
        starRating: number | null;
      }, i: number) => `
        <tr>
          <td style="padding:8px;border:1px solid var(--border);">${i + 1}</td>
          <td style="padding:8px;border:1px solid var(--border);font-weight:600;">${call.leadName}</td>
          <td style="padding:8px;border:1px solid var(--border);">${call.phone || "—"}</td>
          <td style="padding:8px;border:1px solid var(--border);">${call.email || "—"}</td>
          <td style="padding:8px;border:1px solid var(--border);">${call.specialty || "—"}</td>
          <td style="padding:8px;border:1px solid var(--border);font-weight:500;">${call.scheduledTime || "TBD"}</td>
          <td style="padding:8px;border:1px solid var(--border);">${call.pipelineStage ? call.pipelineStage.replace(/_/g, " ") : "—"}</td>
          <td style="padding:8px;border:1px solid var(--border);">${call.starRating ? "★".repeat(call.starRating) : "—"}</td>
          <td style="padding:8px;border:1px solid var(--border);">${call.remark || "—"}</td>
        </tr>
      `).join("");

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Call Sheet — ${data.date}</title>
  <style>
    :root {
      --border: ${printVars.border};
      --foreground: ${printVars.foreground};
      --text-muted: ${printVars.textMuted};
      --surface-2: ${printVars.surface2};
      --text-secondary: ${printVars.textSecondary};
      --status-green-dark: ${printVars.statusGreenDark};
      --status-green-darker: ${printVars.statusGreenDarker};
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: var(--foreground); padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 14px; color: var(--text-muted); font-weight: normal; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { background: var(--surface-2); padding: 8px; border: 1px solid var(--border); text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .meta { display: flex; gap: 24px; margin-top: 8px; font-size: 13px; color: var(--text-secondary); }
    .meta span { font-weight: 500; }
    .print-btn { margin-top: 16px; padding: 8px 16px; background: var(--status-green-dark); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .print-btn:hover { background: var(--status-green-darker); }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 12px;">
    <button class="print-btn" onclick="window.print()">Print Call Sheet</button>
  </div>
  <h1>Call Sheet — ${data.date}</h1>
  <div class="meta">
    <div>Recruiter: <span>${data.recruiterName}</span></div>
    <div>Organization: <span>${data.organizationName}</span></div>
  </div>
  ${data.calls.length === 0 ? '<p style="margin-top:24px;color:var(--text-muted);">No scheduled calls for today.</p>' : `
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Lead Name</th>
        <th>Phone</th>
        <th>Email</th>
        <th>Specialty</th>
        <th>Scheduled Time</th>
        <th>Pipeline Stage</th>
        <th>Rating</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`}
</body>
</html>`);
      printWindow.document.close();
    } catch {
      toast.error("Failed to generate call sheet");
    }
  };

  const handleExportCallSheetCSV = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/recruiter/calendar/daily-call-sheet?date=${today}`);
      if (!res.ok) throw new Error("Failed to fetch call sheet");
      const data = await res.json();

      const headers = ["#", "Lead Name", "Phone", "Email", "Specialty", "Scheduled Time", "Pipeline Stage", "Star Rating", "Remarks"];
      const rows = data.calls.map((call: {
        leadName: string;
        phone: string;
        email: string;
        specialty: string;
        scheduledTime: string;
        pipelineStage: string;
        remark: string;
        starRating: number | null;
      }, i: number) => [
        i + 1,
        call.leadName,
        call.phone || "",
        call.email || "",
        call.specialty || "",
        call.scheduledTime || "TBD",
        call.pipelineStage ? call.pipelineStage.replace(/_/g, " ") : "",
        call.starRating?.toString() || "",
        call.remark || "",
      ]);

      const csv = [headers, ...rows]
        .map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `call_sheet_${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Call sheet exported");
    } catch {
      toast.error("Failed to export call sheet");
    }
  };

  // Get schedules for a specific day
  const getSchedulesForDay = (date: Date) => {
    return schedules.filter((s) => {
      if (s.scheduled_date && isSameDay(new Date(s.scheduled_date), date)) return true;
      if (s.scheduled_month) {
        const d = new Date(s.scheduled_date ?? "");
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (s.scheduled_month === monthStr) return true;
      }
      return false;
    });
  };

  const goToToday = () => setCurrentDate(new Date());
  const goToPrev = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const goToNext = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  // Month view
  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
        {/* Day headers */}
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-600">
            {d}
          </div>
        ))}
        {/* Day cells */}
        {days.map((day, i) => {
          const daySchedules = getSchedulesForDay(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={i}
              className={`min-h-[5.5rem] bg-white p-1.5 transition-colors ${
                !isCurrentMonth ? "bg-gray-50/50" : ""
              }`}
            >
              <div className={`text-xs font-medium mb-1 ${
                isToday
                  ? "flex size-6 items-center justify-center rounded-full bg-primary text-white"
                  : isCurrentMonth
                  ? "text-gray-900"
                  : "text-gray-400"
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {daySchedules.slice(0, 3).map((s) => (
                  <TooltipProvider key={s.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleBlockClick(s)}
                          className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded border truncate ${getCalendarBlockColor(s, leads)}`}
                        >
                          {getCalendarBlockIcon(s, leads)} {getCalendarBlockLabel(s)}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="text-xs">
                          <p className="font-semibold">{s.lead ? `${s.lead.first_name} ${s.lead.last_name}` : "Unknown"}</p>
                          {s.scheduled_date && <p>{formatDate(s.scheduled_date)} {formatTime(s.scheduled_date)}</p>}
                          {s.scheduled_month && <p>Month: {s.scheduled_month}</p>}
                          <p>Status: {s.status}</p>
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOutcomeClick(s); }}
                              className="px-1.5 py-0.5 bg-primary text-white rounded text-[10px]"
                            >
                              Log Outcome
                            </button>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {daySchedules.length > 3 && (
                  <p className="text-[10px] text-gray-400">+{daySchedules.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Week view
  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
        {weekDays.map((day, i) => {
          const daySchedules = getSchedulesForDay(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={i} className="bg-white">
              <div className={`px-2 py-2 text-center border-b border-gray-100 ${
                isToday ? "bg-primary-light" : "bg-gray-50"
              }`}>
                <div className="text-xs text-gray-500">{DAYS_OF_WEEK[day.getDay()]}</div>
                <div className={`text-lg font-semibold ${isToday ? "text-primary" : "text-gray-900"}`}>
                  {day.getDate()}
                </div>
              </div>
              <div className="p-1.5 space-y-1 min-h-[12rem]">
                {daySchedules.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleBlockClick(s)}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded border ${getCalendarBlockColor(s, leads)}`}
                  >
                    <div className="font-medium truncate">
                      {s.lead ? `${s.lead.first_name} ${s.lead.last_name}` : "Unknown"}
                    </div>
                    {s.scheduled_date && (
                      <div className="text-[10px] opacity-75">{formatTime(s.scheduled_date)}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Day view
  const renderDayView = () => {
    const daySchedules = getSchedulesForDay(currentDate);
    const hours = getHours();
    return (
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-center">
          <div className="text-xs text-gray-500">{DAYS_OF_WEEK[currentDate.getDay()]}</div>
          <div className="text-xl font-semibold text-primary">{currentDate.getDate()} {MONTH_NAMES[currentDate.getMonth()]}</div>
        </div>
        <div className="max-h-[28rem] overflow-y-auto">
          {hours.map((hour, hi) => {
            const hourSchedules = daySchedules.filter((s) => {
              if (!s.scheduled_date) return false;
              const d = new Date(s.scheduled_date);
              return d.getHours() === hi;
            });
            return (
              <div key={hour} className="flex border-b border-gray-100">
                <div className="w-20 shrink-0 px-2 py-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-100">
                  {hour}
                </div>
                <div className="flex-1 p-1.5 min-h-[2.5rem]">
                  {hourSchedules.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleBlockClick(s)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded border mb-1 ${getCalendarBlockColor(s, leads)}`}
                    >
                      <div className="font-medium">
                        {s.lead ? `${s.lead.first_name} ${s.lead.last_name}` : "Unknown"}
                      </div>
                      <div className="text-[10px] opacity-75">{formatTime(s.scheduled_date!)}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={goToPrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={goToNext}>
            <ChevronRight className="size-4" />
          </Button>
          <h3 className="text-lg font-semibold text-foreground">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === v
                    ? "bg-primary text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <Button onClick={onAddLead} className="bg-primary hover:bg-primary-hover text-white">
            <Plus className="size-4 mr-1" />
            Add New Lead
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FileDown className="size-3.5 mr-1" />
                Call Sheet
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handlePrintCallSheet}>
                <Printer className="size-3.5 mr-2" />
                Print Call Sheet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCallSheetCSV}>
                <Download className="size-3.5 mr-2" />
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-blue-200 border border-blue-300" /> Scheduled Call</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-green-200 border border-green-300" /> Accepted / Completed</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-yellow-200 border border-yellow-300" /> Pending Follow-up</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-orange-200 border border-orange-300" /> Month Range</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-red-200 border border-red-300" /> Overdue</span>
      </div>

      {/* Calendar */}
      {view === "month" && renderMonthView()}
      {view === "week" && renderWeekView()}
      {view === "day" && renderDayView()}

      {/* Dialogs */}
      <CallOutcomeDialog
        open={outcomeOpen}
        onOpenChange={setOutcomeOpen}
        schedule={selectedSchedule}
        lead={selectedLead}
        onSaved={refresh}
      />
      <LeadDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        lead={selectedLead}
        onSaved={refresh}
        onScheduleCall={onScheduleCall}
      />
    </div>
  );
}

// ─── Tab 2: Candidates Calendar ─────────────────────────────────────────

function CandidatesCalendarTab({ refreshKey }: { refreshKey: number }) {
  const [candidates, setCandidates] = useState<CandidateCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [shiftDialogCandidate, setShiftDialogCandidate] = useState<CandidateCalendar | null>(null);

  // Auto-Match state
  const [autoMatches, setAutoMatches] = useState<AutoMatchResult[]>([]);
  const [autoMatchLoading, setAutoMatchLoading] = useState(false);
  const [showAutoMatch, setShowAutoMatch] = useState(false);

  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (specialtyFilter) params.set("specialty", specialtyFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/recruiter/calendar/candidates-calendars?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCandidates(data.candidates ?? []);
    } catch {
      toast.error("Failed to load candidate calendars");
    } finally {
      setIsLoading(false);
    }
  }, [search, specialtyFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates, refreshKey]);

  // Auto-match: when date range + specialty are set, highlight matching candidates
  const specialties = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => { if (c.specialty) set.add(c.specialty); });
    return Array.from(set).sort();
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    let filtered = candidates;
    if (statusFilter) {
      filtered = filtered.filter((c) =>
        c.availabilities.some((a) => a.availability_status === statusFilter)
      );
    }
    return filtered;
  }, [candidates, statusFilter]);

  const handleFindMatches = async () => {
    setAutoMatchLoading(true);
    setShowAutoMatch(true);
    try {
      const res = await fetch("/api/recruiter/calendar/auto-match");
      if (!res.ok) throw new Error("Failed to fetch matches");
      const data = await res.json();
      setAutoMatches(data.matches ?? []);
    } catch {
      toast.error("Failed to find matches");
    } finally {
      setAutoMatchLoading(false);
    }
  };

  const handleScheduleMatchCall = (match: AutoMatchResult) => {
    // Create a minimal candidate object for the shift dialog
    const candidate: CandidateCalendar = {
      userId: match.candidateId,
      firstName: match.candidateName.split(" ")[0] || null,
      lastName: match.candidateName.split(" ").slice(1).join(" ") || null,
      email: "",
      phone: null,
      specialty: match.specialty,
      availabilities: [],
    };
    setShiftDialogCandidate(candidate);
  };

  const handleSendShiftRequest = (match: AutoMatchResult) => {
    const candidate: CandidateCalendar = {
      userId: match.candidateId,
      firstName: match.candidateName.split(" ")[0] || null,
      lastName: match.candidateName.split(" ").slice(1).join(" ") || null,
      email: "",
      phone: null,
      specialty: match.specialty,
      availabilities: [],
    };
    setShiftDialogCandidate(candidate);
  };

  const getWeeklyAvailabilityGrid = (availabilities: CandidateAvailability[]) => {
    const days = [0, 1, 2, 3, 4, 5, 6];
    return days.map((dow) => {
      const slots = availabilities.filter((a) => a.day_of_week === dow && a.is_recurring);
      const hasAvailable = slots.some((s) => s.is_available);
      const hasBlocked = slots.some((s) => !s.is_available);
      if (hasAvailable && !hasBlocked) return "available";
      if (hasAvailable && hasBlocked) return "mixed";
      if (hasBlocked) return "blocked";
      return "none";
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Search by Name</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                <Input
                  className="pl-8 h-9 text-sm"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Specialty</Label>
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All specialties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All specialties</SelectItem>
                  {specialties.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date Range</Label>
              <div className="flex gap-1.5">
                <Input type="date" className="h-9 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <Input type="date" className="h-9 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Availability Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All statuses</SelectItem>
                  <SelectItem value="actively_looking">Actively Looking</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="not_available">Not Available</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Match indicator */}
      {dateFrom && dateTo && specialtyFilter && (
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="size-4 text-accent-teal" />
          <span className="text-sm text-accent-teal font-medium">
            Auto-Match: Showing candidates matching &ldquo;{specialtyFilter}&rdquo; for {formatDate(dateFrom)} — {formatDate(dateTo)}
          </span>
        </div>
      )}

      {/* Auto-Match Section */}
      <Card className="border-accent-teal/20 bg-gradient-to-r from-teal-50/50 to-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-accent-teal" />
              <h3 className="font-semibold text-foreground">Auto-Match</h3>
              <span className="text-xs text-gray-500">Match candidates to your open positions</span>
            </div>
            <div className="flex items-center gap-2">
              {showAutoMatch && (
                <Button variant="ghost" size="sm" onClick={() => setShowAutoMatch(false)} className="text-gray-500">
                  <X className="size-3.5 mr-1" />
                  Hide
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleFindMatches}
                disabled={autoMatchLoading}
                className="bg-accent-teal hover:bg-accent-teal-hover text-white"
              >
                {autoMatchLoading ? (
                  <Loader2 className="size-3.5 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5 mr-1" />
                )}
                Find Matches
              </Button>
            </div>
          </div>

          {showAutoMatch && (
            autoMatchLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ) : autoMatches.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">No matches found. Add more leads and connect with candidates to see matches.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {autoMatches.map((match, i) => (
                  <div key={`${match.candidateId}-${match.leadId}-${i}`} className="rounded-lg border border-teal-200 bg-white p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm text-foreground">{match.candidateName}</p>
                        {match.specialty && (
                          <p className="text-xs text-gray-500">{match.specialty}</p>
                        )}
                      </div>
                      <Badge className={`text-[10px] shrink-0 ${
                        match.matchScore >= 70
                          ? "bg-green-100 text-green-800"
                          : match.matchScore >= 40
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-600"
                      } border-0`}>
                        {match.matchScore}% match
                      </Badge>
                    </div>
                    <div className="mb-2">
                      <p className="text-[10px] text-gray-400">Matched to lead:</p>
                      <p className="text-xs text-primary font-medium">{match.leadName} {match.leadSpecialty ? `(${match.leadSpecialty})` : ""}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {match.matchReasons.map((reason, ri) => (
                        <Badge key={ri} variant="outline" className="text-[9px] h-5 px-1.5">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className={`text-[10px] border-0 ${
                        match.availabilityStatus === "actively_looking"
                          ? "bg-green-100 text-green-700"
                          : match.availabilityStatus === "open"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {match.availabilityStatus === "actively_looking"
                          ? "Actively Looking"
                          : match.availabilityStatus === "open"
                          ? "Open"
                          : "Unknown"}
                      </Badge>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => handleScheduleMatchCall(match)}
                      >
                        <Phone className="size-3 mr-1" />
                        Schedule Call
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs bg-accent-teal hover:bg-accent-teal-hover text-white"
                        onClick={() => handleSendShiftRequest(match)}
                      >
                        <Send className="size-3 mr-1" />
                        Send Shift Request
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Candidates grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-32 mb-3" />
                <Skeleton className="h-3 w-20 mb-4" />
                <div className="flex gap-1">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton key={j} className="size-8 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <CalendarDays className="size-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No candidate calendars</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Candidates who share their calendar with you will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map((c) => {
            const weekGrid = getWeeklyAvailabilityGrid(c.availabilities);
            return (
              <Card key={c.userId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800">
                          {c.firstName?.[0]}{c.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {c.firstName} {c.lastName}
                          </p>
                          {c.specialty && (
                            <p className="text-xs text-gray-500">{c.specialty}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      className={`text-[10px] ${
                        c.availabilities.some((a) => a.availability_status === "actively_looking")
                          ? "bg-green-100 text-green-800"
                          : c.availabilities.some((a) => a.availability_status === "open")
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-600"
                      } border-0`}
                    >
                      {c.availabilities.some((a) => a.availability_status === "actively_looking")
                        ? "Actively Looking"
                        : c.availabilities.some((a) => a.availability_status === "open")
                        ? "Open"
                        : "Unknown"}
                    </Badge>
                  </div>

                  {/* Weekly availability visual */}
                  <div className="mb-3">
                    <p className="text-[10px] text-gray-400 mb-1">Weekly Availability</p>
                    <div className="flex gap-1">
                      {DAYS_OF_WEEK.map((day, i) => {
                        const status = weekGrid[i];
                        return (
                          <TooltipProvider key={day}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`flex-1 h-7 rounded text-[9px] flex items-center justify-center font-medium ${
                                    status === "available"
                                      ? "bg-green-200 text-green-800"
                                      : status === "mixed"
                                      ? "bg-yellow-200 text-yellow-800"
                                      : status === "blocked"
                                      ? "bg-red-200 text-red-800"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  {day[0]}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{day}: {status === "available" ? "Available" : status === "mixed" ? "Mixed" : status === "blocked" ? "Blocked" : "Not set"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-accent-teal hover:bg-accent-teal-hover text-white"
                    onClick={() => setShiftDialogCandidate(c)}
                  >
                    <Send className="size-3.5 mr-1" />
                    Send Shift Request
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ShiftRequestDialog
        open={!!shiftDialogCandidate}
        onOpenChange={(v) => { if (!v) setShiftDialogCandidate(null); }}
        candidate={shiftDialogCandidate}
        onSaved={() => {}}
      />
    </div>
  );
}

// ─── Tab 3: Pipeline (Kanban) ───────────────────────────────────────────

function PipelineTab({
  leads,
  refresh,
  onScheduleCall,
}: {
  leads: Lead[];
  refresh: () => void;
  onScheduleCall: (leadId: number) => void;
}) {
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [changingStage, setChangingStage] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showActivityPanel, setShowActivityPanel] = useState(true);

  // Drag-and-drop state
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Filter leads by search
  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter((l) =>
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
      (l.email ?? "").toLowerCase().includes(q) ||
      (l.phone ?? "").toLowerCase().includes(q) ||
      (l.specialty ?? "").toLowerCase().includes(q)
    );
  }, [leads, search]);

  // Compute KPI counts
  const kpis = useMemo(() => {
    const active = leads.filter((l) => l.is_active).length;
    const hot = leads.filter((l) => (l as any).tag === "hot").length;
    const cold = leads.filter((l) => (l as any).tag === "cold").length;
    const submitted = leads.filter((l) => l.pipeline_stage === "submitted").length;
    const interested = leads.filter((l) => l.pipeline_stage === "interested").length;
    const docPending = leads.filter((l) => l.pipeline_stage === "doc_pending").length;
    const newLead = leads.filter((l) => l.pipeline_stage === "new_lead").length;
    return { active, hot, cold, submitted, interested, docPending, newLead, total: leads.length };
  }, [leads]);

  // Today's follow-ups — leads with call schedules today
  const todaysFollowUps = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return leads.filter((l) =>
      l.call_schedules.some((s) => s.scheduled_date?.slice(0, 10) === today && s.status === "scheduled")
    ).slice(0, 5);
  }, [leads]);

  // Recent activity — from call_logs
  const recentActivity = useMemo(() => {
    const allLogs: { leadName: string; outcome: string; date: string }[] = [];
    leads.forEach((l) => {
      l.call_logs.forEach((log) => {
        allLogs.push({
          leadName: `${l.first_name} ${l.last_name}`,
          outcome: log.outcome,
          date: log.call_date,
        });
      });
    });
    return allLogs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [leads]);

  // Hot leads
  const hotLeads = useMemo(() => {
    return leads.filter((l) => (l as any).tag === "hot").slice(0, 5);
  }, [leads]);

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    PIPELINE_STAGES.forEach((s) => { map[s.value] = []; });
    filteredLeads.forEach((l) => {
      if (map[l.pipeline_stage]) {
        map[l.pipeline_stage].push(l);
      } else {
        map["new_lead"].push(l);
      }
    });
    return map;
  }, [filteredLeads]);

  const handleStageChange = async (leadId: number, newStage: string) => {
    setChangingStage(leadId);
    try {
      const res = await fetch(`/api/recruiter/calendar/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: newStage }),
      });
      if (!res.ok) throw new Error("Failed to update stage");
      toast.success("Pipeline stage updated");
      refresh();
    } catch {
      toast.error("Failed to update stage");
    } finally {
      setChangingStage(null);
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(leadId));
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLeadId(null);
    setDragOverStage(null);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "1";
  };

  const handleDragOver = (e: React.DragEvent, stageValue: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageValue);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = Number(e.dataTransfer.getData("text/plain"));
    if (!leadId) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    if (lead.pipeline_stage === targetStage) {
      setDraggedLeadId(null);
      return;
    }
    await handleStageChange(leadId, targetStage);
    setDraggedLeadId(null);
  };

  const getLastContact = (lead: Lead): string => {
    if (lead.call_logs.length > 0) return formatDate(lead.call_logs[0].call_date);
    if (lead.call_schedules.length > 0) return formatDate(lead.call_schedules[0].created_at);
    return formatDate(lead.updated_at);
  };

  // Compact KPI card
  const KpiCard = ({ value, label, color }: { value: number; label: string; color: string }) => (
    <div
      className="flex flex-col items-center justify-center px-3 py-2 rounded-[12px] shrink-0"
      style={{
        background: "var(--material-thin-bg)",
        backdropFilter: "var(--material-thin-blur)",
        WebkitBackdropFilter: "var(--material-thin-blur)",
        border: "0.5px solid var(--material-thin-border)",
        boxShadow: "var(--specular-top), var(--depth-1)",
        minWidth: "90px",
      }}
    >
      <span className="text-xl font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── KPI Cards Row (compact, single row, horizontal scroll) ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
        <KpiCard value={kpis.total} label="Total" color="var(--text-primary)" />
        <KpiCard value={kpis.active} label="Active" color="var(--primary)" />
        <KpiCard value={kpis.newLead} label="New Lead" color="var(--primary)" />
        <KpiCard value={kpis.docPending} label="Doc Pend" color="var(--status-amber)" />
        <KpiCard value={kpis.interested} label="Interest" color="var(--primary-vivid)" />
        <KpiCard value={kpis.submitted} label="Submit" color="var(--terra)" />
        <KpiCard value={kpis.hot} label="Hot" color="var(--status-red)" />
        <KpiCard value={kpis.cold} label="Cold" color="var(--status-blue)" />
      </div>

      {/* ── Toolbar: prominent search + actions ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4" style={{ color: "var(--text-muted)" }} />
          <Input
            placeholder="Search leads, name, email, phone, specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <Button onClick={() => { /* trigger add lead */ }} size="default">
          <Plus className="size-4 mr-1" />
          Add Lead
        </Button>
        <Button
          variant="outline"
          size="default"
          onClick={() => setShowActivityPanel(!showActivityPanel)}
        >
          {showActivityPanel ? "◀ Hide Panel" : "▶ Show Panel"}
        </Button>
      </div>

      {/* ── 70/30 Layout: Kanban + Activity Panel ── */}
      <div className={`flex gap-4 ${showActivityPanel ? "flex-col lg:flex-row" : ""}`}>
        {/* Kanban Pipeline (70% or 100%) */}
        <div className={showActivityPanel ? "lg:w-[70%] min-w-0" : "w-full"}>
          {/* Drag hint */}
          <div className="flex items-center gap-2 text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            <GripVertical className="size-3.5" />
            <span>Drag cards between columns to change pipeline stage</span>
          </div>
          <div className="overflow-x-auto pb-4 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            <div className="flex gap-3 min-w-max">
              {PIPELINE_STAGES.map((stage) => (
                <div
                  key={stage.value}
                  className={`shrink-0 transition-all rounded-[16px] ${
                    dragOverStage === stage.value
                      ? "ring-2 ring-[var(--primary)]/40"
                      : ""
                  }`}
                  style={{ width: "300px" }}
                  onDragOver={(e) => handleDragOver(e, stage.value)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.value)}
                >
                  {/* Column header — spatial glass */}
                  <div className={`rounded-t-[16px] px-3 py-2.5 ${stage.headerBg}`}
                    style={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{stage.label}</h4>
                      <Badge variant="secondary" className="text-[10px] h-5 px-2 tabular-nums">
                        {leadsByStage[stage.value]?.length ?? 0}
                      </Badge>
                    </div>
                  </div>

                  {/* Cards drop zone — spatial material-thin */}
                  <div
                    className="rounded-b-[16px] p-2 space-y-2 min-h-[12rem] max-h-[28rem] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border transition-colors"
                    style={{
                      background: "var(--material-thin-bg)",
                      backdropFilter: "var(--material-thin-blur)",
                      WebkitBackdropFilter: "var(--material-thin-blur)",
                    }}
                  >
                    {(leadsByStage[stage.value] ?? []).map((lead) => (
                      <Card
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className={`cursor-grab transition-shadow py-0 active:cursor-grabbing ${
                          draggedLeadId === lead.id ? "opacity-50 ring-2 ring-[var(--primary)]/30" : ""
                        }`}
                        onClick={() => { setDetailLead(lead); setDetailOpen(true); }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <GripVertical className="size-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                              <p className="font-medium text-sm text-foreground truncate">
                                {lead.first_name} {lead.last_name}
                              </p>
                            </div>
                            <StarRatingDisplay value={lead.star_rating} />
                          </div>
                          {lead.specialty && (
                            <p className="text-xs mb-1.5 pl-5" style={{ color: "var(--text-secondary)" }}>{lead.specialty}</p>
                          )}
                          <p className="text-[10px] mb-2 pl-5" style={{ color: "var(--text-muted)" }}>
                            Last contact: {getLastContact(lead)}
                          </p>
                          <div className="pl-5" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={lead.pipeline_stage}
                              onValueChange={(v) => handleStageChange(lead.id, v)}
                              disabled={changingStage === lead.id}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PIPELINE_STAGES.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {leadsByStage[stage.value]?.length === 0 && (
                      <div className="text-center py-6" style={{ color: "var(--text-muted)" }}>
                        <p className="text-xs">
                          {dragOverStage === stage.value ? "Drop here" : "No leads"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Panel (30%) — collapsible */}
        {showActivityPanel && (
          <div className="lg:w-[30%] shrink-0 space-y-4">
            {/* Today's Follow-Ups */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text-secondary)" }}>
                  📋 Today's Follow-Ups
                </h4>
                {todaysFollowUps.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No follow-ups due today</p>
                ) : (
                  <div className="space-y-2">
                    {todaysFollowUps.map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between gap-2 p-2 rounded-[10px]"
                        style={{ background: "var(--material-thin-bg)" }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{lead.first_name} {lead.last_name}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{lead.specialty ?? "—"}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
                          onClick={() => onScheduleCall(lead.id)}
                        >
                          📞 Call
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text-secondary)" }}>
                  📊 Recent Activity
                </h4>
                {recentActivity.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No recent activity</p>
                ) : (
                  <div className="space-y-2">
                    {recentActivity.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="size-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "var(--primary)" }} />
                        <div className="min-w-0">
                          <p className="truncate" style={{ color: "var(--text-secondary)" }}>
                            <span className="font-medium">{log.leadName}</span> — {log.outcome}
                          </p>
                          <p style={{ color: "var(--text-muted)" }}>{formatDate(log.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hot Leads */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text-secondary)" }}>
                  🔥 Hot Leads ({hotLeads.length})
                </h4>
                {hotLeads.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No hot leads</p>
                ) : (
                  <div className="space-y-2">
                    {hotLeads.map((lead) => (
                      <div key={lead.id} className="flex items-center gap-2 p-2 rounded-[10px] cursor-pointer"
                        style={{ background: "var(--material-thin-bg)" }}
                        onClick={() => { setDetailLead(lead); setDetailOpen(true); }}
                      >
                        <div className="flex size-7 items-center justify-center rounded-full shrink-0"
                          style={{ background: "linear-gradient(180deg, #E08862 0%, #C97B54 60%, #A0522D 100%)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}
                        >
                          <span className="text-[10px] font-bold">{lead.first_name[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{lead.first_name} {lead.last_name}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{lead.specialty ?? "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <LeadDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        lead={detailLead}
        onSaved={refresh}
        onScheduleCall={onScheduleCall}
      />
    </div>
  );
}

// ─── Tab 4: Leads List ──────────────────────────────────────────────────

function LeadsListTab({
  leads,
  onAddLead,
  onScheduleCall,
  refresh,
}: {
  leads: Lead[];
  onAddLead: () => void;
  onScheduleCall: (leadId: number) => void;
  refresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [starFilter, setStarFilter] = useState("");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scheduleLeadId, setScheduleLeadId] = useState<number | null>(null);
  const [editingRatingId, setEditingRatingId] = useState<number | null>(null);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch =
        !search ||
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (l.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (l.specialty?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesStage = !stageFilter || l.pipeline_stage === stageFilter;
      const matchesSource = !sourceFilter || l.source === sourceFilter;
      const matchesDateFrom = !dateFrom || new Date(l.created_at) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(l.created_at) <= new Date(dateTo);
      const matchesStar = !starFilter || starFilter === "_all" || (starFilter === "none" ? !l.star_rating : l.star_rating === Number(starFilter));
      return matchesSearch && matchesStage && matchesSource && matchesDateFrom && matchesDateTo && matchesStar;
    });
  }, [leads, search, stageFilter, sourceFilter, dateFrom, dateTo, starFilter]);

  const handleDelete = async (leadId: number) => {
    try {
      const res = await fetch(`/api/recruiter/calendar/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Lead deleted");
      refresh();
    } catch {
      toast.error("Failed to delete lead");
    }
  };

  const handleInlineStarRating = async (leadId: number, rating: number | null) => {
    setEditingRatingId(null);
    try {
      const res = await fetch(`/api/recruiter/calendar/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starRating: rating }),
      });
      if (!res.ok) throw new Error("Failed to update rating");
      toast.success("Rating updated");
      refresh();
    } catch {
      toast.error("Failed to update rating");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Job Title", "Specialty", "Source", "Pipeline Stage", "Star Rating", "Last Contact"];
    const rows = filteredLeads.map((l) => [
      `${l.first_name} ${l.last_name}`,
      l.email ?? "",
      l.phone ?? "",
      l.job_title ?? "",
      l.specialty ?? "",
      getSourceLabel(l.source),
      getStageLabel(l.pipeline_stage),
      l.star_rating?.toString() ?? "",
      formatDate(l.updated_at),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                <Input
                  className="pl-8 h-9 text-sm"
                  placeholder="Name, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pipeline Stage</Label>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All stages</SelectItem>
                  {PIPELINE_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All sources</SelectItem>
                  {SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Star Rating</Label>
              <Select value={starFilter} onValueChange={setStarFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All ratings</SelectItem>
                  <SelectItem value="5">★★★★★ (5)</SelectItem>
                  <SelectItem value="4">★★★★ (4)</SelectItem>
                  <SelectItem value="3">★★★ (3)</SelectItem>
                  <SelectItem value="2">★★ (2)</SelectItem>
                  <SelectItem value="1">★ (1)</SelectItem>
                  <SelectItem value="none">No rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date From</Label>
              <Input type="date" className="h-9 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date To</Label>
              <Input type="date" className="h-9 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="size-3.5 mr-1" />
            Export CSV
          </Button>
          <Button size="sm" onClick={onAddLead} className="bg-primary hover:bg-primary-hover text-white">
            <Plus className="size-3.5 mr-1" />
            Add New Lead
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[28rem] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Last Contact</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-gray-400">
                      No leads found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((l) => (
                    <TableRow key={l.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
                            {l.first_name[0]}{l.last_name[0]}
                          </div>
                          <span className="font-medium text-sm">{l.first_name} {l.last_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{l.email || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{l.phone || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{l.job_title || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{l.specialty || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{getSourceLabel(l.source)}</TableCell>
                      <TableCell>{getStageBadge(l.pipeline_stage)}</TableCell>
                      <TableCell>
                        {editingRatingId === l.id ? (
                          <StarRatingInput
                            value={l.star_rating}
                            onChange={(v) => handleInlineStarRating(l.id, v)}
                          />
                        ) : (
                          <button
                            onClick={() => setEditingRatingId(l.id)}
                            className="hover:opacity-70 transition-opacity"
                            title="Click to edit rating"
                          >
                            {l.star_rating ? (
                              <StarRatingDisplay value={l.star_rating} />
                            ) : (
                              <span className="text-xs text-gray-400 hover:text-gray-600">— rate —</span>
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(l.updated_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setDetailLead(l); setDetailOpen(true); }}>
                              <Eye className="size-3.5 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onScheduleCall(l.id)}>
                              <Phone className="size-3.5 mr-2" /> Schedule Call
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setDetailLead(l); setDetailOpen(true); }}>
                              <MessageSquare className="size-3.5 mr-2" /> Add Remark
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(l.id)}
                            >
                              <Trash2 className="size-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <LeadDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        lead={detailLead}
        onSaved={refresh}
        onScheduleCall={onScheduleCall}
      />
      <ScheduleCallDialog
        open={!!scheduleLeadId}
        onOpenChange={(v) => { if (!v) setScheduleLeadId(null); }}
        leads={leads}
        preselectedLeadId={scheduleLeadId}
        onSaved={refresh}
      />
    </div>
  );
}

// ─── My Availability Section ────────────────────────────────────────────

function MyAvailabilitySection() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [newSlot, setNewSlot] = useState({
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "17:00",
    isAvailable: true,
    isRecurring: true,
    label: "",
  });

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch("/api/recruiter/calendar/availability");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      toast.error("Failed to load availability");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleAddSlot = async () => {
    try {
      const res = await fetch("/api/recruiter/calendar/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: [{
            dayOfWeek: Number(newSlot.dayOfWeek),
            startTime: newSlot.startTime,
            endTime: newSlot.endTime,
            isAvailable: newSlot.isAvailable,
            isRecurring: newSlot.isRecurring,
            label: newSlot.label || undefined,
          }],
        }),
      });
      if (!res.ok) throw new Error("Failed to add slot");
      toast.success("Availability slot added");
      setNewSlot({ dayOfWeek: "1", startTime: "09:00", endTime: "17:00", isAvailable: true, isRecurring: true, label: "" });
      fetchSlots();
    } catch {
      toast.error("Failed to add availability slot");
    }
  };

  const handleDeleteSlot = async (id: number) => {
    try {
      const res = await fetch("/api/recruiter/calendar/availability", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Slot removed");
      fetchSlots();
    } catch {
      toast.error("Failed to remove slot");
    }
  };

  const getDayName = (dow: number | null) => {
    if (dow === null) return "Specific date";
    return DAYS_OF_WEEK[dow];
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="size-5 text-accent-teal" />
                My Availability
              </CardTitle>
              <ChevronRight className={`size-4 text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Set your weekly availability — candidates see this when viewing your calendar
            </p>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Add slot form */}
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Day</Label>
                <Select value={newSlot.dayOfWeek} onValueChange={(v) => setNewSlot((p) => ({ ...p, dayOfWeek: v }))}>
                  <SelectTrigger className="h-9 w-28 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input
                  type="time"
                  className="h-9 w-28 text-sm"
                  value={newSlot.startTime}
                  onChange={(e) => setNewSlot((p) => ({ ...p, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input
                  type="time"
                  className="h-9 w-28 text-sm"
                  value={newSlot.endTime}
                  onChange={(e) => setNewSlot((p) => ({ ...p, endTime: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  className="h-9 w-32 text-sm"
                  placeholder="e.g. Available"
                  value={newSlot.label}
                  onChange={(e) => setNewSlot((p) => ({ ...p, label: e.target.value }))}
                />
              </div>
              <Button size="sm" onClick={handleAddSlot} className="bg-accent-teal hover:bg-accent-teal-hover text-white h-9">
                <Plus className="size-3.5 mr-1" />
                Add Slot
              </Button>
            </div>

            {/* Existing slots */}
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No availability slots set</p>
            ) : (
              <div className="space-y-1.5">
                {slots.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {getDayName(slot.day_of_week)}
                      </Badge>
                      <span className="text-sm text-gray-700">
                        {slot.start_time ?? "All day"} — {slot.end_time ?? "All day"}
                      </span>
                      {slot.label && (
                        <span className="text-xs text-gray-400">({slot.label})</span>
                      )}
                      {slot.is_recurring && (
                        <Badge className="bg-teal-50 text-teal-700 border-0 text-[10px]">Recurring</Badge>
                      )}
                      <Badge className={`${slot.is_available ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"} border-0 text-[10px]`}>
                        {slot.is_available ? "Available" : "Blocked"}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-red-500" onClick={() => handleDeleteSlot(slot.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────

export default function RecruiterCalendarPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [schedules, setSchedules] = useState<CallSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my-calendar");

  // Dialog states
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [scheduleCallOpen, setScheduleCallOpen] = useState(false);
  const [scheduleLeadId, setScheduleLeadId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [leadsRes, schedulesRes] = await Promise.all([
        fetch("/api/recruiter/calendar/leads"),
        fetch("/api/recruiter/calendar/schedule"),
      ]);
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(leadsData.leads ?? []);
      }
      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchedules(schedulesData.schedules ?? []);
      }
    } catch {
      toast.error("Failed to load calendar data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
    setRefreshKey((k) => k + 1);
  }, [fetchData]);

  const handleAddLead = () => setAddLeadOpen(true);

  const handleScheduleCall = (leadId: number) => {
    setScheduleLeadId(leadId);
    setScheduleCallOpen(true);
  };

  return (
    <div className="space-y-6 min-h-screen">
      <PageHeader
        title="Calendar & Scheduler"
        description="Manage your calls, pipeline, candidates, and availability in one place."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200 rounded-lg p-1 h-auto">
          <TabsTrigger value="my-calendar" className="data-[state=active]:bg-primary data-[state=active]:text-white text-sm">
            <Calendar className="size-4 mr-1.5" />
            My Calendar
          </TabsTrigger>
          <TabsTrigger value="candidates" className="data-[state=active]:bg-accent-teal data-[state=active]:text-white text-sm">
            <UserCheck className="size-4 mr-1.5" />
            Candidates
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="data-[state=active]:bg-primary data-[state=active]:text-white text-sm">
            <Briefcase className="size-4 mr-1.5" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="leads" className="data-[state=active]:bg-primary data-[state=active]:text-white text-sm">
            <List className="size-4 mr-1.5" />
            Leads List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-calendar" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-8" />
              </div>
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
          ) : (
            <MyCalendarTab
              leads={leads}
              schedules={schedules}
              onAddLead={handleAddLead}
              onScheduleCall={handleScheduleCall}
              refresh={refresh}
            />
          )}
        </TabsContent>

        <TabsContent value="candidates" className="mt-4">
          <CandidatesCalendarTab refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          {isLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-80 w-64 shrink-0 rounded-lg" />
              ))}
            </div>
          ) : (
            <PipelineTab
              leads={leads}
              refresh={refresh}
              onScheduleCall={handleScheduleCall}
            />
          )}
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          ) : (
            <LeadsListTab
              leads={leads}
              onAddLead={handleAddLead}
              onScheduleCall={handleScheduleCall}
              refresh={refresh}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* My Availability Section (collapsible, below tabs) */}
      <MyAvailabilitySection />

      {/* Shared dialogs */}
      <AddNewLeadDialog
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        onSaved={refresh}
      />
      <ScheduleCallDialog
        open={scheduleCallOpen}
        onOpenChange={(v) => {
          setScheduleCallOpen(v);
          if (!v) setScheduleLeadId(null);
        }}
        leads={leads}
        preselectedLeadId={scheduleLeadId}
        onSaved={refresh}
      />
    </div>
  );
}

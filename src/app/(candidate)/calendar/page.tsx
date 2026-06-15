"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarDays,
  Clock,
  Plus,
  Trash2,
  Share2,
  Link2,
  Copy,
  Ban,
  Check,
  X,
  Loader2,
  Users,
  Filter,
  Phone,
  Zap,
  Sun,
  Moon,
  Calendar as CalendarIcon,
  Sparkles,
  Settings2,
  Building2,
  User,
  ListChecks,
  ClipboardList,
} from "@/lib/icons";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────────────────────── */

interface AvailabilitySlot {
  id: number;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  is_recurring: boolean;
  label: string | null;
  template_name: string | null;
  min_notice_hours: number;
  shift_duration_pref: string | null;
  availability_status: string;
}

interface Recruiter {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  organization: { id: number; name: string } | null;
}

interface CalendarShare {
  id: number;
  candidate_user_id: number;
  recruiter_user_id: number | null;
  share_token: string | null;
  share_type: string;
  expiry_type: string;
  expires_at: string | null;
  is_revoked: boolean;
  created_at: string;
  recruiter_user?: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    organization: { id: number; name: string } | null;
  } | null;
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
  response_deadline: string | null;
  responded_at: string | null;
  response_note: string | null;
  created_at: string;
  recruiter_user: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    organization: { id: number; name: string } | null;
  };
}

interface SharedAvailability {
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
  recruiter_user: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    organization: { id: number; name: string } | null;
  };
}

/* ─── Constants ─────────────────────────────────────────────────────── */

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 ... Sun=0 (DB convention)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return `${h}:00`;
});

const STATUS_CONFIG = {
  actively_looking: {
    label: "Actively Looking",
    emoji: "🟢",
    color: "var(--primary)",
    bgColor: "var(--primary-light)",
    borderColor: "#86EFAC",
  },
  open: {
    label: "Open to Opportunities",
    emoji: "🟡",
    color: "#92400E",
    bgColor: "#FEF9C3",
    borderColor: "#FDE047",
  },
  not_available: {
    label: "Not Available Right Now",
    emoji: "🔴",
    color: "#991B1B",
    bgColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
} as const;

type AvailabilityStatus = keyof typeof STATUS_CONFIG;

const TEMPLATES = [
  {
    name: "Morning Person",
    icon: Sun,
    description: "6AM–2PM, Mon–Fri",
    slots: DAY_VALUES.slice(0, 5).map((d) => ({
      dayOfWeek: d,
      startTime: "06:00",
      endTime: "14:00",
    })),
  },
  {
    name: "Night Owl",
    icon: Moon,
    description: "10PM–6AM, Mon–Fri",
    slots: DAY_VALUES.slice(0, 5).map((d) => ({
      dayOfWeek: d,
      startTime: "22:00",
      endTime: "06:00",
    })),
  },
  {
    name: "Weekends Only",
    icon: CalendarIcon,
    description: "8AM–8PM, Sat–Sun",
    slots: DAY_VALUES.slice(5).map((d) => ({
      dayOfWeek: d,
      startTime: "08:00",
      endTime: "20:00",
    })),
  },
  {
    name: "Flexible",
    icon: Sparkles,
    description: "7AM–9PM, Mon–Sun",
    slots: DAY_VALUES.map((d) => ({
      dayOfWeek: d,
      startTime: "07:00",
      endTime: "21:00",
    })),
  },
];

/* ─── Helper: format time for display ──────────────────────────────── */
function formatTimeDisplay(time: string | null): string {
  if (!time) return "All day";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

/* ─── Component ─────────────────────────────────────────────────────── */
export default function CalendarPage() {
  /* ─── State ───────────────────────────────────────────────────────── */
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("actively_looking");
  const [minNoticeHours, setMinNoticeHours] = useState(24);
  const [shiftDurationPref, setShiftDurationPref] = useState<string | null>(null);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [shares, setShares] = useState<CalendarShare[]>([]);
  const [shiftRequests, setShiftRequests] = useState<ShiftRequest[]>([]);
  const [sharedAvailability, setSharedAvailability] = useState<SharedAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [shareRecruiterDialogOpen, setShareRecruiterDialogOpen] = useState(false);
  const [shareLinkDialogOpen, setShareLinkDialogOpen] = useState(false);
  const [blockDatesDialogOpen, setBlockDatesDialogOpen] = useState(false);

  // Add availability form
  const [addDayOfWeek, setAddDayOfWeek] = useState<string>("1");
  const [addUseSpecificDate, setAddUseSpecificDate] = useState(false);
  const [addSpecificDate, setAddSpecificDate] = useState<Date | undefined>(undefined);
  const [addStartTime, setAddStartTime] = useState("09:00");
  const [addEndTime, setAddEndTime] = useState("17:00");
  const [addIsAvailable, setAddIsAvailable] = useState(true);
  const [addIsRecurring, setAddIsRecurring] = useState(false);
  const [addLabel, setAddLabel] = useState("");

  // Share form
  const [shareRecruiterId, setShareRecruiterId] = useState("");
  const [shareExpiry, setShareExpiry] = useState<"1_day" | "1_month" | "1_year" | "never">("1_month");
  const [linkExpiry, setLinkExpiry] = useState<"1_day" | "1_month" | "1_year" | "never">("1_month");
  const [generatedLink, setGeneratedLink] = useState("");

  // Block dates
  const [blockDates, setBlockDates] = useState<Date[]>([]);

  // Others calendar filter
  const [recruiterFilter, setRecruiterFilter] = useState("all");

  // Loading states for actions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isRevoking, setIsRevoking] = useState<number | null>(null);
  const [isRespondingToShift, setIsRespondingToShift] = useState<number | null>(null);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  /* ─── Data fetching ───────────────────────────────────────────────── */
  const fetchAvailability = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/calendar/availability");
      if (!res.ok) throw new Error("Failed to fetch availability");
      const data = await res.json();
      setSlots(data.slots || []);
      setAvailabilityStatus(data.availabilityStatus || "actively_looking");
      setMinNoticeHours(data.minNoticeHours || 24);
      setShiftDurationPref(data.shiftDurationPref || null);
    } catch {
      setError("Failed to load availability data");
    }
  }, []);

  const fetchRecruiters = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/recruiters");
      if (!res.ok) throw new Error("Failed to fetch recruiters");
      const data = await res.json();
      setRecruiters(data.recruiters || []);
    } catch {
      // Silently fail — recruiters list is optional
    }
  }, []);

  const fetchShares = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/calendar/shares");
      if (!res.ok) throw new Error("Failed to fetch shares");
      const data = await res.json();
      setShares(data.shares || []);
    } catch {
      // Silently fail
    }
  }, []);

  const fetchShiftRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/calendar/shift-requests");
      if (!res.ok) throw new Error("Failed to fetch shift requests");
      const data = await res.json();
      setShiftRequests(data.shiftRequests || []);
    } catch {
      // Silently fail
    }
  }, []);

  const fetchSharedAvailability = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/calendar/shared-availability");
      if (!res.ok) throw new Error("Failed to fetch shared availability");
      const data = await res.json();
      setSharedAvailability(data.availability || []);
    } catch {
      // Silently fail
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    await Promise.all([
      fetchAvailability(),
      fetchRecruiters(),
      fetchShares(),
      fetchShiftRequests(),
      fetchSharedAvailability(),
    ]);
    setIsLoading(false);
  }, [fetchAvailability, fetchRecruiters, fetchShares, fetchShiftRequests, fetchSharedAvailability]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  /* ─── Actions ─────────────────────────────────────────────────────── */

  // Cycle availability status
  const cycleStatus = async () => {
    const statuses: AvailabilityStatus[] = ["actively_looking", "open", "not_available"];
    const currentIndex = statuses.indexOf(availabilityStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    try {
      const res = await fetch("/api/candidate/calendar/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityStatus: nextStatus,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update status");
      }
      setAvailabilityStatus(nextStatus);
      toast.success(`Status updated to ${STATUS_CONFIG[nextStatus].label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update availability status");
    }
  };

  // Add availability slot
  const handleAddSlot = async () => {
    setIsSubmitting(true);
    try {
      const dayOfWeek = addUseSpecificDate ? null : parseInt(addDayOfWeek);
      const specificDate = addUseSpecificDate && addSpecificDate ? addSpecificDate.toISOString() : null;

      const res = await fetch("/api/candidate/calendar/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: [{
            dayOfWeek,
            specificDate,
            startTime: addStartTime,
            endTime: addEndTime,
            isAvailable: addIsAvailable,
            isRecurring: addIsRecurring,
            label: addLabel || null,
          }],
        }),
      });
      if (!res.ok) throw new Error("Failed to add availability");
      toast.success("Availability slot added");
      setAddDialogOpen(false);
      resetAddForm();
      fetchAvailability();
    } catch {
      toast.error("Failed to add availability slot");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete availability slot
  const handleDeleteSlot = async (id: number) => {
    try {
      const res = await fetch("/api/candidate/calendar/availability", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to delete slot");
      }
      toast.success("Slot removed");
      fetchAvailability();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove slot");
    }
  };

  // Apply quick template
  const handleApplyTemplate = async (template: typeof TEMPLATES[number]) => {
    setIsApplyingTemplate(template.name);
    try {
      const res = await fetch("/api/candidate/calendar/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: template.slots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            specificDate: null,
            startTime: s.startTime,
            endTime: s.endTime,
            isAvailable: true,
            isRecurring: true,
            label: template.name,
          })),
          templateName: template.name,
        }),
      });
      if (!res.ok) throw new Error("Failed to apply template");
      toast.success(`"${template.name}" template applied`);
      fetchAvailability();
    } catch {
      toast.error("Failed to apply template");
    } finally {
      setIsApplyingTemplate(null);
    }
  };

  // Block out dates
  const handleBlockDates = async () => {
    if (blockDates.length === 0) {
      toast.error("Please select at least one date to block");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/candidate/calendar/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: blockDates.map((date) => ({
            dayOfWeek: null,
            specificDate: date.toISOString(),
            startTime: null,
            endTime: null,
            isAvailable: false,
            isRecurring: false,
            label: "Blocked",
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to block dates");
      toast.success(`${blockDates.length} date(s) blocked`);
      setBlockDatesDialogOpen(false);
      setBlockDates([]);
      fetchAvailability();
    } catch {
      toast.error("Failed to block dates");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save preferences
  const handleSavePrefs = async () => {
    setIsSavingPrefs(true);
    try {
      const res = await fetch("/api/candidate/calendar/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minNoticeHours,
          shiftDurationPref,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save preferences");
      }
      toast.success("Preferences saved");
      fetchAvailability();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // Share with recruiter
  const handleShareWithRecruiter = async () => {
    if (!shareRecruiterId) {
      toast.error("Please select a recruiter");
      return;
    }
    setIsSharing(true);
    try {
      const res = await fetch("/api/candidate/calendar/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareType: "direct",
          recruiterUserId: parseInt(shareRecruiterId),
          expiryType: shareExpiry,
        }),
      });
      if (!res.ok) throw new Error("Failed to share calendar");
      toast.success("Calendar shared with recruiter");
      setShareRecruiterDialogOpen(false);
      setShareRecruiterId("");
      fetchShares();
    } catch {
      toast.error("Failed to share calendar");
    } finally {
      setIsSharing(false);
    }
  };

  // Generate share link
  const handleGenerateLink = async () => {
    setIsSharing(true);
    try {
      const res = await fetch("/api/candidate/calendar/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareType: "link",
          expiryType: linkExpiry,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate link");
      const data = await res.json();
      const token = data.share?.share_token;
      if (token) {
        setGeneratedLink(`${window.location.origin}/shared/calendar/${token}`);
      }
      fetchShares();
    } catch {
      toast.error("Failed to generate share link");
    } finally {
      setIsSharing(false);
    }
  };

  // Copy link
  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success("Link copied to clipboard");
    }
  };

  // Revoke share
  const handleRevokeShare = async (shareId: number) => {
    setIsRevoking(shareId);
    try {
      const res = await fetch("/api/candidate/calendar/shares", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId }),
      });
      if (!res.ok) throw new Error("Failed to revoke share");
      toast.success("Share revoked");
      fetchShares();
    } catch {
      toast.error("Failed to revoke share");
    } finally {
      setIsRevoking(null);
    }
  };

  // Respond to shift request
  const handleShiftResponse = async (shiftRequestId: number, status: "accepted" | "declined") => {
    setIsRespondingToShift(shiftRequestId);
    try {
      const res = await fetch("/api/candidate/calendar/shift-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftRequestId, status }),
      });
      if (!res.ok) throw new Error("Failed to respond to shift request");
      toast.success(`Shift ${status === "accepted" ? "accepted" : "declined"}`);
      fetchShiftRequests();
    } catch {
      toast.error("Failed to respond to shift request");
    } finally {
      setIsRespondingToShift(null);
    }
  };

  // Request a call with recruiter
  const handleRequestCall = async (recruiterUserId: number) => {
    try {
      const res = await fetch("/api/candidate/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "call_request",
          message: "A candidate has requested a call with you.",
          relatedEntityId: recruiterUserId,
        }),
      });
      if (!res.ok) throw new Error("Failed to request call");
      toast.success("Call request sent to recruiter");
    } catch {
      toast.error("Failed to send call request");
    }
  };

  /* ─── Helpers ─────────────────────────────────────────────────────── */

  const resetAddForm = () => {
    setAddDayOfWeek("1");
    setAddUseSpecificDate(false);
    setAddSpecificDate(undefined);
    setAddStartTime("09:00");
    setAddEndTime("17:00");
    setAddIsAvailable(true);
    setAddIsRecurring(false);
    setAddLabel("");
  };

  // Group availability slots by day of week
  const getSlotsForDay = (dayOfWeek: number) => {
    return slots.filter(
      (s) => s.day_of_week === dayOfWeek && s.specific_date === null
    );
  };

  // Get blocked dates
  const blockedDates = slots
    .filter((s) => s.specific_date !== null && !s.is_available)
    .map((s) => new Date(s.specific_date!));

  // Group shared availability by recruiter
  const groupedSharedAvail = sharedAvailability.reduce(
    (acc, item) => {
      const key = item.recruiter_user_id;
      if (!acc[key]) {
        acc[key] = {
          recruiter: item.recruiter_user,
          slots: [],
        };
      }
      acc[key].slots.push(item);
      return acc;
    },
    {} as Record<number, { recruiter: SharedAvailability["recruiter_user"]; slots: SharedAvailability[] }>
  );

  const filteredRecruiterIds =
    recruiterFilter === "all"
      ? Object.keys(groupedSharedAvail)
      : [recruiterFilter];

  const statusConfig = STATUS_CONFIG[availabilityStatus];

  const pendingShiftRequests = shiftRequests.filter((r) => r.status === "pending");
  const respondedShiftRequests = shiftRequests.filter((r) => r.status !== "pending");

  /* ─── Loading ─────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calendar & Scheduler" description="Manage your availability, share your calendar, and handle shift requests." />
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calendar & Scheduler" />
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadAllData} variant="outline">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar & Scheduler"
        description="Manage your availability, share your calendar, and handle shift requests."
      />

      <Tabs defaultValue="my-calendar" className="space-y-6">
        <TabsList className="bg-[#F3F4F6]">
          <TabsTrigger value="my-calendar" className="gap-1.5 data-[state=active]:bg-white">
            <CalendarDays className="size-4" />
            My Calendar
          </TabsTrigger>
          <TabsTrigger value="others-calendar" className="gap-1.5 data-[state=active]:bg-white">
            <Users className="size-4" />
            Others Calendar
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 1: My Calendar
        ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="my-calendar" className="space-y-6">

          {/* ── Availability Status Toggle ──────────────────────────── */}
          <Card
            className="cursor-pointer transition-all hover:shadow-md"
            style={{
              borderColor: statusConfig.borderColor,
              backgroundColor: statusConfig.bgColor,
            }}
            onClick={cycleStatus}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{statusConfig.emoji}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: statusConfig.color }}>
                    {statusConfig.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click to change your availability status
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div
                    key={key}
                    className={`size-3 rounded-full transition-all ${
                      availabilityStatus === key ? "ring-2 ring-offset-1 scale-125" : "opacity-40"
                    }`}
                    style={{
                      backgroundColor: cfg.color,
                      ringColor: cfg.color,
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Main Grid ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Availability Grid + Add Button */}
            <div className="lg:col-span-2 space-y-4">

              {/* Availability Grid Header */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="size-5 text-primary" />
                      Weekly Availability
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Dialog open={blockDatesDialogOpen} onOpenChange={setBlockDatesDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                            <Ban className="size-3.5" />
                            Block Dates
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Block Out Dates</DialogTitle>
                            <DialogDescription>
                              Select specific dates to override your recurring availability. These dates will be marked as unavailable.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Calendar
                              mode="multiple"
                              selected={blockDates}
                              onSelect={(dates) => setBlockDates(dates || [])}
                              className="rounded-md border mx-auto"
                            />
                            {blockDates.length > 0 && (
                              <p className="text-sm text-muted-foreground text-center">
                                {blockDates.length} date(s) selected
                              </p>
                            )}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setBlockDatesDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button
                              onClick={handleBlockDates}
                              disabled={isSubmitting || blockDates.length === 0}
                              className="gap-1.5 bg-primary hover:bg-primary-hover"
                            >
                              {isSubmitting ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Ban className="size-4" />
                              )}
                              Block {blockDates.length} Date(s)
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetAddForm(); }}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary-hover">
                            <Plus className="size-3.5" />
                            Add Availability
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Add Availability</DialogTitle>
                            <DialogDescription>
                              Set when you&apos;re available or unavailable for shifts.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Day of week vs specific date */}
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={addUseSpecificDate}
                                onCheckedChange={setAddUseSpecificDate}
                              />
                              <Label className="text-sm">Use specific date instead of day of week</Label>
                            </div>

                            {addUseSpecificDate ? (
                              <div className="space-y-2">
                                <Label>Date</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                      <CalendarIcon className="size-4 mr-2" />
                                      {addSpecificDate ? addSpecificDate.toLocaleDateString() : "Pick a date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={addSpecificDate}
                                      onSelect={setAddSpecificDate}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label>Day of Week</Label>
                                <Select value={addDayOfWeek} onValueChange={setAddDayOfWeek}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DAYS_OF_WEEK.map((day, idx) => (
                                      <SelectItem key={DAY_VALUES[idx]} value={String(DAY_VALUES[idx])}>
                                        {day}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Time pickers */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input
                                  type="time"
                                  value={addStartTime}
                                  onChange={(e) => setAddStartTime(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input
                                  type="time"
                                  value={addEndTime}
                                  onChange={(e) => setAddEndTime(e.target.value)}
                                />
                              </div>
                            </div>

                            {/* Available / Not Available */}
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={addIsAvailable}
                                onCheckedChange={setAddIsAvailable}
                              />
                              <Label className="text-sm">
                                {addIsAvailable ? "Available" : "Not Available"}
                              </Label>
                              <Badge
                                variant={addIsAvailable ? "default" : "destructive"}
                                className="text-[10px] ml-auto"
                              >
                                {addIsAvailable ? "Available" : "Blocked"}
                              </Badge>
                            </div>

                            {/* Recurring */}
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={addIsRecurring}
                                onCheckedChange={setAddIsRecurring}
                              />
                              <Label className="text-sm">Recurring (weekly)</Label>
                            </div>

                            {/* Label */}
                            <div className="space-y-2">
                              <Label>Label (optional)</Label>
                              <Input
                                placeholder="e.g., Lunch break, Night shift available"
                                value={addLabel}
                                onChange={(e) => setAddLabel(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetAddForm(); }}>
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAddSlot}
                              disabled={isSubmitting}
                              className="gap-1.5 bg-primary hover:bg-primary-hover"
                            >
                              {isSubmitting ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Plus className="size-4" />
                              )}
                              Add Slot
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Weekly Grid */}
                  <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                      {/* Day headers */}
                      <div className="grid grid-cols-8 gap-1 mb-2">
                        <div className="text-xs font-medium text-muted-foreground text-center py-1">
                          Time
                        </div>
                        {DAYS_OF_WEEK.map((day, idx) => (
                          <div
                            key={day}
                            className="text-xs font-medium text-center py-1 rounded-md bg-background"
                            style={{ color: idx >= 5 ? "var(--accent-teal)" : "var(--primary)" }}
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Time slots */}
                      {TIME_SLOTS.filter((_, i) => i >= 6 && i <= 22).map((timeSlot) => {
                        const hour = parseInt(timeSlot.split(":")[0]);
                        return (
                          <div key={timeSlot} className="grid grid-cols-8 gap-1 mb-0.5">
                            <div className="text-[10px] text-muted-foreground text-center py-2 flex items-center justify-center">
                              {formatTimeDisplay(timeSlot)}
                            </div>
                            {DAY_VALUES.map((dayVal) => {
                              const daySlots = getSlotsForDay(dayVal);
                              const matchingSlots = daySlots.filter((s) => {
                                if (!s.start_time || !s.end_time) return false;
                                const startH = parseInt(s.start_time.split(":")[0]);
                                const endH = s.end_time === "00:00" ? 24 : parseInt(s.end_time.split(":")[0]);
                                return hour >= startH && hour < endH;
                              });
                              const isAvailable = matchingSlots.some((s) => s.is_available);
                              const isBlocked = matchingSlots.some((s) => !s.is_available);
                              const hasSlot = matchingSlots.length > 0;

                              return (
                                <div
                                  key={dayVal}
                                  className={`
                                    h-8 rounded text-[9px] flex items-center justify-center transition-colors
                                    ${hasSlot ? "" : "bg-[#FAFAFA]"}
                                    ${isAvailable ? "bg-emerald-100 text-emerald-800 font-medium" : ""}
                                    ${isBlocked ? "bg-red-100 text-red-800 font-medium" : ""}
                                  `}
                                >
                                  {matchingSlots.length > 0 && matchingSlots[0].label && (
                                    <span className="truncate px-0.5">{matchingSlots[0].label}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded bg-emerald-100 border border-emerald-300" />
                      <span className="text-xs text-muted-foreground">Available</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded bg-red-100 border border-red-300" />
                      <span className="text-xs text-muted-foreground">Blocked</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded bg-[#FAFAFA] border border-gray-200" />
                      <span className="text-xs text-muted-foreground">Not Set</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Existing Availability Slots List */}
              {slots.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ListChecks className="size-5 text-accent-teal" />
                      Current Availability Slots
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                      <div className="space-y-2">
                        {slots.map((slot) => {
                          const dayLabel = slot.day_of_week !== null
                            ? DAYS_OF_WEEK[DAY_VALUES.indexOf(slot.day_of_week)]
                            : slot.specific_date
                              ? new Date(slot.specific_date).toLocaleDateString()
                              : "Unset";
                          return (
                            <div
                              key={slot.id}
                              className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-background transition-colors"
                            >
                              <div
                                className={`size-2.5 rounded-full shrink-0 ${
                                  slot.is_available ? "bg-emerald-500" : "bg-red-500"
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{dayLabel}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {slot.start_time && slot.end_time
                                      ? `${formatTimeDisplay(slot.start_time)} – ${formatTimeDisplay(slot.end_time)}`
                                      : "All day"}
                                  </span>
                                  {slot.label && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      {slot.label}
                                    </Badge>
                                  )}
                                  {slot.is_recurring && (
                                    <Badge className="text-[10px] bg-accent-teal/10 text-accent-teal border-accent-teal/20">
                                      Recurring
                                    </Badge>
                                  )}
                                  {slot.template_name && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {slot.template_name}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                                onClick={() => handleDeleteSlot(slot.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Templates */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="size-5 text-primary" />
                    Quick Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TEMPLATES.map((template) => {
                      const IconComp = template.icon;
                      return (
                        <Button
                          key={template.name}
                          variant="outline"
                          className="h-auto py-3 px-3 flex flex-col items-center gap-2 hover:bg-background hover:border-primary/30"
                          onClick={() => handleApplyTemplate(template)}
                          disabled={isApplyingTemplate !== null}
                        >
                          {isApplyingTemplate === template.name ? (
                            <Loader2 className="size-5 animate-spin text-primary" />
                          ) : (
                            <IconComp className="size-5 text-primary" />
                          )}
                          <span className="text-xs font-medium">{template.name}</span>
                          <span className="text-[10px] text-muted-foreground">{template.description}</span>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">

              {/* Blocked Dates Preview */}
              {blockedDates.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Ban className="size-5 text-red-500" />
                      Blocked Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-40">
                      <div className="space-y-1.5">
                        {blockedDates
                          .sort((a, b) => a.getTime() - b.getTime())
                          .map((date, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div className="size-2 rounded-full bg-red-500 shrink-0" />
                              <span>{date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Preferences Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="size-5 text-primary" />
                    Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Minimum Notice</Label>
                    <Select
                      value={String(minNoticeHours)}
                      onValueChange={(val) => setMinNoticeHours(parseInt(val))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="48">48 hours</SelectItem>
                        <SelectItem value="72">72 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Shift Duration Preference</Label>
                    <Select
                      value={shiftDurationPref || "no_preference"}
                      onValueChange={(val) => setShiftDurationPref(val === "no_preference" ? null : val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4hr_min">4hr minimum</SelectItem>
                        <SelectItem value="8hr">8 hours</SelectItem>
                        <SelectItem value="12hr">12 hours</SelectItem>
                        <SelectItem value="no_preference">No preference</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleSavePrefs}
                    disabled={isSavingPrefs}
                    className="w-full gap-1.5 bg-primary hover:bg-primary-hover"
                    size="sm"
                  >
                    {isSavingPrefs ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>

              {/* Share Calendar */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Share2 className="size-5 text-accent-teal" />
                    Share Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Dialog open={shareRecruiterDialogOpen} onOpenChange={setShareRecruiterDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-1.5" size="sm">
                        <User className="size-4" />
                        Share with Recruiter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Share with Recruiter</DialogTitle>
                        <DialogDescription>
                          Allow a recruiter to view your availability calendar.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Select Recruiter</Label>
                          <Select value={shareRecruiterId} onValueChange={setShareRecruiterId}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose a recruiter..." />
                            </SelectTrigger>
                            <SelectContent>
                              {recruiters.map((r) => (
                                <SelectItem key={r.id} value={String(r.id)}>
                                  {r.first_name || ""} {r.last_name || ""}
                                  {r.organization ? ` — ${r.organization.name}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Access Expires</Label>
                          <Select value={shareExpiry} onValueChange={(val) => setShareExpiry(val as typeof shareExpiry)}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1_day">1 Day</SelectItem>
                              <SelectItem value="1_month">1 Month</SelectItem>
                              <SelectItem value="1_year">1 Year</SelectItem>
                              <SelectItem value="never">Never</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShareRecruiterDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleShareWithRecruiter}
                          disabled={isSharing || !shareRecruiterId}
                          className="gap-1.5 bg-primary hover:bg-primary-hover"
                        >
                          {isSharing ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
                          Share
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={shareLinkDialogOpen} onOpenChange={(open) => { setShareLinkDialogOpen(open); if (!open) setGeneratedLink(""); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-1.5" size="sm">
                        <Link2 className="size-4" />
                        Generate Share Link
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate Share Link</DialogTitle>
                        <DialogDescription>
                          Create a shareable link that allows anyone to view your availability.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Link Expires</Label>
                          <Select value={linkExpiry} onValueChange={(val) => setLinkExpiry(val as typeof linkExpiry)}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1_day">1 Day</SelectItem>
                              <SelectItem value="1_month">1 Month</SelectItem>
                              <SelectItem value="1_year">1 Year</SelectItem>
                              <SelectItem value="never">Never</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {generatedLink && (
                          <div className="space-y-2">
                            <Label>Generated Link</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                value={generatedLink}
                                readOnly
                                className="text-xs bg-muted"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyLink}
                                className="shrink-0 gap-1"
                              >
                                <Copy className="size-3.5" />
                                Copy
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShareLinkDialogOpen(false)}>
                          {generatedLink ? "Close" : "Cancel"}
                        </Button>
                        {!generatedLink && (
                          <Button
                            onClick={handleGenerateLink}
                            disabled={isSharing}
                            className="gap-1.5 bg-primary hover:bg-primary-hover"
                          >
                            {isSharing ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                            Generate
                          </Button>
                        )}
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Active Shares List */}
                  {shares.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Active Shares ({shares.length})
                      </p>
                      <ScrollArea className="max-h-48">
                        <div className="space-y-2">
                          {shares.map((share) => {
                            const isExpired = share.expires_at && new Date(share.expires_at) < new Date();
                            const recruiterName = share.recruiter_user
                              ? `${share.recruiter_user.first_name || ""} ${share.recruiter_user.last_name || ""}`.trim() || share.recruiter_user.email
                              : null;
                            const agencyName = share.recruiter_user?.organization?.name;

                            return (
                              <div
                                key={share.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border border-border ${
                                  isExpired || share.is_revoked ? "opacity-50" : ""
                                }`}
                              >
                                <div className={`size-6 rounded flex items-center justify-center shrink-0 ${
                                  share.share_type === "link" ? "bg-blue-100" : "bg-emerald-100"
                                }`}>
                                  {share.share_type === "link" ? (
                                    <Link2 className="size-3 text-blue-600" />
                                  ) : (
                                    <User className="size-3 text-emerald-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {recruiterName || "Link share"}
                                  </p>
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    {agencyName && <span>{agencyName} · </span>}
                                    <span>
                                      {share.is_revoked
                                        ? "Revoked"
                                        : isExpired
                                          ? "Expired"
                                          : share.expiry_type === "never"
                                            ? "Never expires"
                                            : `Expires ${new Date(share.expires_at!).toLocaleDateString()}`}
                                    </span>
                                  </div>
                                </div>
                                {!share.is_revoked && !isExpired && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-0 shrink-0"
                                    disabled={isRevoking === share.id}
                                    onClick={() => handleRevokeShare(share.id)}
                                  >
                                    {isRevoking === share.id ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      <X className="size-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Shift Requests Section ──────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="size-5 text-primary" />
                  Shift Requests
                  {pendingShiftRequests.length > 0 && (
                    <Badge className="bg-primary text-[10px]">{pendingShiftRequests.length} pending</Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {shiftRequests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="size-12 rounded-full bg-background flex items-center justify-center mx-auto mb-3">
                    <ClipboardList className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No shift requests yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When recruiters send you shift requests, they&apos;ll appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pending */}
                  {pendingShiftRequests.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground">Pending</h4>
                      {pendingShiftRequests.map((req) => {
                        const recruiterName = `${req.recruiter_user.first_name || ""} ${req.recruiter_user.last_name || ""}`.trim();
                        const agency = req.recruiter_user.organization?.name;
                        return (
                          <div
                            key={req.id}
                            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-border bg-[#FAFAFA]"
                          >
                            <div className="size-10 rounded-lg bg-accent-teal/10 flex items-center justify-center shrink-0">
                              <Building2 className="size-5 text-accent-teal" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {req.position || "Shift"}
                                {req.facility_name && <span className="text-muted-foreground"> at {req.facility_name}</span>}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="size-3" />
                                  {new Date(req.shift_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                </span>
                                {req.start_time && req.end_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {formatTimeDisplay(req.start_time)} – {formatTimeDisplay(req.end_time)}
                                  </span>
                                )}
                                <span>·</span>
                                <span>{recruiterName}{agency ? ` (${agency})` : ""}</span>
                              </div>
                              {req.notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{req.notes}&rdquo;</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                className="gap-1 bg-primary hover:bg-primary-hover"
                                disabled={isRespondingToShift === req.id}
                                onClick={() => handleShiftResponse(req.id, "accepted")}
                              >
                                {isRespondingToShift === req.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Check className="size-3" />
                                )}
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                                disabled={isRespondingToShift === req.id}
                                onClick={() => handleShiftResponse(req.id, "declined")}
                              >
                                <X className="size-3" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* History */}
                  {respondedShiftRequests.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground">History</h4>
                      <ScrollArea className="max-h-48">
                        <div className="space-y-2">
                          {respondedShiftRequests.map((req) => {
                            const isAccepted = req.status === "accepted";
                            return (
                              <div
                                key={req.id}
                                className="flex items-center gap-3 p-2.5 rounded-lg border border-border opacity-70"
                              >
                                <div className={`size-6 rounded flex items-center justify-center shrink-0 ${
                                  isAccepted ? "bg-emerald-100" : "bg-red-100"
                                }`}>
                                  {isAccepted ? (
                                    <Check className="size-3 text-emerald-600" />
                                  ) : (
                                    <X className="size-3 text-red-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {req.position || "Shift"} at {req.facility_name || "TBD"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {new Date(req.shift_date).toLocaleDateString()}
                                    {req.start_time ? ` · ${formatTimeDisplay(req.start_time)}` : ""}
                                    {" · "}
                                    {isAccepted ? "Accepted" : "Declined"}
                                    {req.responded_at ? ` on ${new Date(req.responded_at).toLocaleDateString()}` : ""}
                                  </p>
                                </div>
                                <Badge
                                  variant={isAccepted ? "default" : "destructive"}
                                  className="text-[10px]"
                                >
                                  {isAccepted ? "Accepted" : "Declined"}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2: Others Calendar
        ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="others-calendar" className="space-y-6">

          {/* Recruiter filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="size-4 text-accent-teal" />
                  <Label className="text-sm font-medium">Filter by Recruiter</Label>
                </div>
                <Select value={recruiterFilter} onValueChange={setRecruiterFilter}>
                  <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue placeholder="All recruiters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Recruiters</SelectItem>
                    {Object.values(groupedSharedAvail).map(({ recruiter }) => (
                      <SelectItem key={recruiter.id} value={String(recruiter.id)}>
                        {recruiter.first_name || ""} {recruiter.last_name || ""}
                        {recruiter.organization ? ` — ${recruiter.organization.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {filteredRecruiterIds.length === 0 || sharedAvailability.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="size-14 rounded-full bg-accent-teal/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="size-7 text-accent-teal" />
                </div>
                <h3 className="text-lg font-medium">No shared calendars yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  When recruiters share their availability with you, it will appear here.
                  Share your calendar with recruiters to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRecruiterIds.map((recruiterIdKey) => {
                const group = groupedSharedAvail[Number(recruiterIdKey)];
                if (!group) return null;
                const { recruiter, slots: recruiterSlots } = group;
                const recruiterName = `${recruiter.first_name || ""} ${recruiter.last_name || ""}`.trim() || "Unknown";
                const agencyName = recruiter.organization?.name;

                return (
                  <Card key={recruiterIdKey}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-accent-teal/10 flex items-center justify-center">
                            <User className="size-5 text-accent-teal" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{recruiterName}</CardTitle>
                            {agencyName && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Building2 className="size-3" />
                                {agencyName}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleRequestCall(recruiter.id)}
                        >
                          <Phone className="size-3.5" />
                          Request a Call
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Weekly schedule for this recruiter */}
                      <div className="overflow-x-auto">
                        <div className="min-w-[520px]">
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {DAYS_OF_WEEK.map((day, idx) => (
                              <div
                                key={day}
                                className="text-xs font-medium text-center py-1 rounded-md bg-background"
                                style={{ color: idx >= 5 ? "var(--accent-teal)" : "var(--primary)" }}
                              >
                                {day}
                              </div>
                            ))}
                          </div>

                          {/* Time rows */}
                          {TIME_SLOTS.filter((_, i) => i >= 7 && i <= 20).map((timeSlot) => {
                            const hour = parseInt(timeSlot.split(":")[0]);
                            return (
                              <div key={timeSlot} className="grid grid-cols-7 gap-1 mb-0.5">
                                {DAY_VALUES.map((dayVal) => {
                                  const matching = recruiterSlots.filter((s) => {
                                    if (s.day_of_week !== dayVal) return false;
                                    if (!s.start_time || !s.end_time) return false;
                                    const startH = parseInt(s.start_time.split(":")[0]);
                                    const endH = s.end_time === "00:00" ? 24 : parseInt(s.end_time.split(":")[0]);
                                    return hour >= startH && hour < endH;
                                  });

                                  return (
                                    <div
                                      key={dayVal}
                                      className={`h-7 rounded text-[9px] flex items-center justify-center ${
                                        matching.length > 0
                                          ? matching.some((s) => s.is_available)
                                            ? "bg-teal-100 text-teal-800 font-medium"
                                            : "bg-red-100 text-red-800"
                                          : "bg-[#FAFAFA]"
                                      }`}
                                    >
                                      {matching.length > 0 && matching[0].label && (
                                        <span className="truncate px-0.5">{matching[0].label}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Slots detail */}
                      {recruiterSlots.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex flex-wrap gap-2">
                            {recruiterSlots.map((slot) => {
                              const dayLabel = slot.day_of_week !== null
                                ? DAYS_OF_WEEK[DAY_VALUES.indexOf(slot.day_of_week)]
                                : slot.specific_date
                                  ? new Date(slot.specific_date).toLocaleDateString()
                                  : "Unset";
                              return (
                                <Badge
                                  key={slot.id}
                                  variant="outline"
                                  className={`text-[10px] ${
                                    slot.is_available
                                      ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                                      : "border-red-300 text-red-700 bg-red-50"
                                  }`}
                                >
                                  {dayLabel} {slot.start_time && slot.end_time
                                    ? `${formatTimeDisplay(slot.start_time)}–${formatTimeDisplay(slot.end_time)}`
                                    : "All day"}
                                  {slot.label && ` · ${slot.label}`}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Upcoming Calls / Meetings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="size-5 text-accent-teal" />
                    Upcoming Calls & Meetings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* We check if there are any accepted shift requests that could be upcoming */}
                  {(() => {
                    const upcoming = shiftRequests.filter(
                      (r) => r.status === "accepted" && new Date(r.shift_date) >= new Date(new Date().toDateString())
                    );
                    if (upcoming.length === 0) {
                      return (
                        <div className="text-center py-6">
                          <div className="size-10 rounded-full bg-background flex items-center justify-center mx-auto mb-2">
                            <Phone className="size-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">No upcoming calls or meetings</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {upcoming
                          .sort((a, b) => new Date(a.shift_date).getTime() - new Date(b.shift_date).getTime())
                          .map((req) => {
                            const recruiterName = `${req.recruiter_user.first_name || ""} ${req.recruiter_user.last_name || ""}`.trim();
                            const agency = req.recruiter_user.organization?.name;
                            const isToday = new Date(req.shift_date).toDateString() === new Date().toDateString();
                            return (
                              <div
                                key={req.id}
                                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-background transition-colors"
                              >
                                <div className="size-8 rounded-lg bg-accent-teal/10 flex items-center justify-center shrink-0">
                                  <Phone className="size-4 text-accent-teal" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {req.position || "Shift"} at {req.facility_name || "TBD"}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {recruiterName}{agency ? ` (${agency})` : ""}
                                    {" · "}
                                    {isToday ? "Today" : new Date(req.shift_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                    {req.start_time && ` · ${formatTimeDisplay(req.start_time)}`}
                                  </p>
                                </div>
                                <Badge className="text-[10px] bg-accent-teal/10 text-accent-teal border-accent-teal/20">
                                  {isToday ? "Today" : "Upcoming"}
                                </Badge>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}



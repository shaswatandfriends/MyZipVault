"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  Shield,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Timer,
  Ban,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lock,
  Eye,
} from "@/lib/icons";

/* ─── Types ─────────────────────────────────────────────────────────── */

interface AvailabilitySlot {
  id: number;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean;
  isRecurring: boolean;
  label: string | null;
  templateName: string | null;
  minNoticeHours: number;
  shiftDurationPref: string | null;
  availabilityStatus: string;
}

interface SharedCalendarData {
  candidate: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    displayName: string;
  };
  share: {
    id: number;
    shareType: string;
    expiryType: string;
    expiresAt: string | null;
    createdAt: string;
  };
  availability: AvailabilitySlot[];
  preferences: {
    availabilityStatus: string;
    minNoticeHours: number;
    shiftDurationPrefs: string[];
  };
}

type PageState = "loading" | "error" | "revoked" | "expired" | "valid";

/* ─── Constants ─────────────────────────────────────────────────────── */

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; dotColor: string }> = {
  actively_looking: {
    label: "Actively Looking",
    color: "var(--primary)",
    bgColor: "var(--primary-light)",
    borderColor: "var(--status-green-border)",
    dotColor: "var(--primary-vivid)",
  },
  open: {
    label: "Open to Opportunities",
    color: "var(--status-amber-dark)",
    bgColor: "var(--badge-yellow-bg)",
    borderColor: "var(--badge-yellow-border)",
    dotColor: "var(--badge-yellow)",
  },
  not_available: {
    label: "Not Available",
    color: "var(--status-red-dark)",
    bgColor: "var(--badge-red-bg)",
    borderColor: "var(--status-red-border)",
    dotColor: "var(--badge-red)",
  },
};

/* ─── Helpers ───────────────────────────────────────────────────────── */

function formatTimeDisplay(time: string | null): string {
  if (!time) return "All day";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatExpiryLabel(expiryType: string, expiresAt: string | null): string {
  if (expiryType === "never") return "Never expires";
  if (!expiresAt) return "No expiration";
  const exp = new Date(expiresAt);
  const now = new Date();
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Expired";
  if (diffDays === 1) return "Expires tomorrow";
  if (diffDays <= 7) return `Expires in ${diffDays} days`;
  if (diffDays <= 30) return `Expires in ${Math.ceil(diffDays / 7)} weeks`;
  return `Expires ${formatDate(exp)}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/* ─── Component ─────────────────────────────────────────────────────── */

export default function SharedCalendarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  /* ─── State ───────────────────────────────────────────────────────── */
  const [token, setToken] = useState<string>("");
  const [pageState, setPageState] = useState<PageState>("loading");
  const [data, setData] = useState<SharedCalendarData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Calendar navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  /* ─── Resolve token from params ─────────────────────────────────── */
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  /* ─── Fetch data ──────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!token) return;
    setPageState("loading");
    try {
      const res = await fetch(`/api/shared/calendar/${token}`);
      const json = await res.json();

      if (!res.ok) {
        if (json.code === "REVOKED") {
          setErrorMessage(json.error);
          setPageState("revoked");
          return;
        }
        if (json.code === "EXPIRED") {
          setErrorMessage(json.error);
          setPageState("expired");
          return;
        }
        if (json.code === "NOT_FOUND" || res.status === 404) {
          setErrorMessage("This share link does not exist or is invalid.");
          setPageState("error");
          return;
        }
        setErrorMessage(json.error || "Failed to load shared calendar.");
        setPageState("error");
        return;
      }

      setData(json);
      setPageState("valid");
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setPageState("error");
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Derived calendar data ───────────────────────────────────────── */
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get recurring availability by day of week
  const recurringByDay = useMemo(() => {
    const map: Record<number, AvailabilitySlot[]> = {};
    for (const slot of data?.availability ?? []) {
      if (slot.dayOfWeek !== null && slot.isRecurring) {
        if (!map[slot.dayOfWeek]) map[slot.dayOfWeek] = [];
        map[slot.dayOfWeek].push(slot);
      }
    }
    return map;
  }, [data?.availability]);

  // Get specific date overrides
  const specificDateMap = useMemo(() => {
    const map: Record<string, AvailabilitySlot[]> = {};
    for (const slot of data?.availability ?? []) {
      if (slot.specificDate) {
        const dateKey = new Date(slot.specificDate).toDateString();
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(slot);
      }
    }
    return map;
  }, [data?.availability]);

  // Determine what kind of day each day in the current month is
  const dayStatuses = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const statuses: {
      day: number;
      status: "available" | "blocked" | "mixed" | "none";
      slots: AvailabilitySlot[];
      hasSpecificOverride: boolean;
    }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay(); // 0=Sun
      const dateKey = date.toDateString();

      // Check for specific date overrides first
      const specificSlots = specificDateMap[dateKey] || [];
      const recurringSlots = recurringByDay[dayOfWeek] || [];

      const allSlots = specificSlots.length > 0 ? specificSlots : recurringSlots;
      const hasSpecificOverride = specificSlots.length > 0;

      const hasAvailable = allSlots.some((s) => s.is_available);
      const hasBlocked = allSlots.some((s) => !s.is_available);

      let status: "available" | "blocked" | "mixed" | "none" = "none";
      if (hasAvailable && hasBlocked) status = "mixed";
      else if (hasAvailable) status = "available";
      else if (hasBlocked) status = "blocked";

      statuses.push({
        day: d,
        status,
        slots: allSlots,
        hasSpecificOverride,
      });
    }

    return { days: statuses, firstDay };
  }, [year, month, recurringByDay, specificDateMap]);

  /* ─── Navigation ──────────────────────────────────────────────────── */
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  /* ─── Selected day detail ─────────────────────────────────────────── */
  const [selectedDay, setSelectedDay] = useState<{
    day: number;
    status: string;
    slots: AvailabilitySlot[];
    hasSpecificOverride: boolean;
  } | null>(null);

  const selectedDaySlots = selectedDay?.slots ?? [];
  const isToday = (day: number) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
  };

  /* ─── Loading ─────────────────────────────────────────────────────── */
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  /* ─── Error: Not Found ────────────────────────────────────────────── */
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="size-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Share Link Not Found</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              {errorMessage || "This calendar share link is invalid or does not exist. Please request a new link from the candidate."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Error: Revoked ──────────────────────────────────────────────── */
  if (pageState === "revoked") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="size-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="size-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Share Link Revoked</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              {errorMessage || "The candidate has revoked access to this shared calendar. Please contact them directly for an updated link."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Error: Expired ──────────────────────────────────────────────── */
  if (pageState === "expired") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="size-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="size-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Share Link Expired</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              {errorMessage || "This calendar share link has expired. Please request a new link from the candidate."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Valid: Render Calendar ──────────────────────────────────────── */
  const statusConfig = STATUS_CONFIG[data?.preferences.availabilityStatus ?? "actively_looking"] ?? STATUS_CONFIG.actively_looking;

  // Get recurring weekly schedule summary
  const weeklyRecurringSlots = (data?.availability ?? []).filter(
    (s) => s.isRecurring && s.dayOfWeek !== null
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Stethoscope className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">MyZipVault</h1>
            <p className="text-xs text-muted-foreground">Shared Calendar Availability</p>
          </div>
        </div>

        {/* ── Candidate Info Card ──────────────────────────────────── */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="size-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {data?.candidate.displayName}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Shared Calendar Availability
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Availability Status Badge */}
                <Badge
                  className="border-0 text-xs font-medium px-3 py-1"
                  style={{
                    backgroundColor: statusConfig.bgColor,
                    color: statusConfig.color,
                  }}
                >
                  <span
                    className="size-2 rounded-full mr-1.5 inline-block"
                    style={{ backgroundColor: statusConfig.dotColor }}
                  />
                  {statusConfig.label}
                </Badge>
              </div>
            </div>

            {/* Preferences row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50">
                <Timer className="size-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Min Notice</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {data?.preferences.minNoticeHours ?? 24} hours
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50">
                <Clock className="size-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Shift Duration</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {data?.preferences.shiftDurationPrefs.length
                      ? data.preferences.shiftDurationPrefs.join(", ")
                      : "No preference"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50">
                <Shield className="size-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Link Expires</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {data?.share
                      ? formatExpiryLabel(data.share.expiryType, data.share.expiresAt)
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Main Content Grid ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Monthly Calendar ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="size-5 text-primary" />
                    Monthly Calendar
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="size-8" onClick={goToPrevMonth}>
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium" onClick={goToToday}>
                      <RefreshCw className="size-3" />
                      Today
                    </Button>
                    <Button variant="outline" size="icon" className="size-8" onClick={goToNextMonth}>
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  {MONTH_NAMES[month]} {year}
                </p>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day headers */}
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="text-xs font-semibold text-center py-2 text-gray-500"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Empty cells before month starts */}
                  {Array.from({ length: dayStatuses.firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-12 sm:h-16" />
                  ))}

                  {/* Day cells */}
                  {dayStatuses.days.map(({ day, status, slots, hasSpecificOverride }) => {
                    const today = isToday(day);
                    const isSelected = selectedDay?.day === day;

                    let bgClass = "bg-white";
                    let dotColor = "";
                    let borderClass = "border-gray-100";

                    if (status === "available") {
                      bgClass = "bg-emerald-50";
                      dotColor = "var(--primary-vivid)";
                      borderClass = "border-emerald-200";
                    } else if (status === "blocked") {
                      bgClass = "bg-red-50";
                      dotColor = "var(--badge-red)";
                      borderClass = "border-red-200";
                    } else if (status === "mixed") {
                      bgClass = "bg-amber-50";
                      dotColor = "var(--badge-yellow)";
                      borderClass = "border-amber-200";
                    }

                    if (today) {
                      borderClass = "border-primary";
                    }

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay({ day, status, slots, hasSpecificOverride })}
                        className={`
                          h-12 sm:h-16 rounded-lg border text-sm font-medium relative
                          transition-all hover:shadow-md hover:scale-[1.03] cursor-pointer
                          focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40
                          ${bgClass} ${borderClass}
                          ${isSelected ? "ring-2 ring-[var(--primary)] shadow-md" : ""}
                          ${today ? "ring-1 ring-[var(--primary)]" : ""}
                        `}
                      >
                        <span className={`${today ? "text-primary font-bold" : "text-gray-700"}`}>
                          {day}
                        </span>
                        {/* Status dot */}
                        {dotColor && (
                          <span
                            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 size-1.5 rounded-full"
                            style={{ backgroundColor: dotColor }}
                          />
                        )}
                        {/* Override indicator */}
                        {hasSpecificOverride && (
                          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500" />
                        )}
                        {/* Recurring indicator */}
                        {slots.some((s) => s.isRecurring) && !hasSpecificOverride && status !== "none" && (
                          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary/40" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-3 rounded-full bg-emerald-500" />
                    Available
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-3 rounded-full bg-red-500" />
                    Blocked
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-3 rounded-full bg-amber-500" />
                    Mixed
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    Override
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-primary/40" />
                    Recurring
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Day Detail Panel ──────────────────────────────────── */}
            {selectedDay && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {DAYS_OF_WEEK[new Date(year, month, selectedDay.day).getDay()]},{" "}
                      {MONTH_NAMES[month]} {selectedDay.day}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        selectedDay.status === "available"
                          ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                          : selectedDay.status === "blocked"
                          ? "border-red-300 text-red-700 bg-red-50"
                          : selectedDay.status === "mixed"
                          ? "border-amber-300 text-amber-700 bg-amber-50"
                          : "border-gray-200 text-gray-500"
                      }
                    >
                      {selectedDay.status === "available"
                        ? "Available"
                        : selectedDay.status === "blocked"
                        ? "Blocked"
                        : selectedDay.status === "mixed"
                        ? "Mixed"
                        : "No Data"}
                    </Badge>
                  </div>
                  {selectedDay.hasSpecificOverride && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                      <Ban className="size-3" />
                      This day has a specific date override
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {selectedDaySlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No availability data for this day.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDaySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg text-sm
                            ${slot.isAvailable ? "bg-emerald-50" : "bg-red-50"}
                          `}
                        >
                          <div
                            className={`
                              size-8 rounded-full flex items-center justify-center shrink-0
                              ${slot.isAvailable ? "bg-emerald-200" : "bg-red-200"}
                            `}
                          >
                            {slot.isAvailable ? (
                              <CheckCircle2 className="size-4 text-emerald-700" />
                            ) : (
                              <XCircle className="size-4 text-red-700" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {slot.isAvailable ? "Available" : "Unavailable"}
                              </span>
                              {slot.isRecurring && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                                  Recurring
                                </Badge>
                              )}
                              {slot.label && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {slot.label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {slot.startTime && slot.endTime
                                ? `${formatTimeDisplay(slot.startTime)} – ${formatTimeDisplay(slot.endTime)}`
                                : "All day"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right: Sidebar ──────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Weekly Recurring Pattern */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <RefreshCw className="size-4 text-primary" />
                  Recurring Weekly Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyRecurringSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No recurring schedule set.
                  </p>
                ) : (
                  <ScrollArea className="max-h-80">
                    <div className="space-y-3">
                      {weeklyRecurringSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`
                            flex items-start gap-2.5 p-2.5 rounded-lg text-sm
                            ${slot.isAvailable ? "bg-emerald-50" : "bg-red-50"}
                          `}
                        >
                          <div
                            className={`
                              size-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
                              ${slot.isAvailable ? "bg-emerald-200" : "bg-red-200"}
                            `}
                          >
                            {slot.isAvailable ? (
                              <CheckCircle2 className="size-3 text-emerald-700" />
                            ) : (
                              <XCircle className="size-3 text-red-700" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {slot.dayOfWeek !== null ? DAYS_OF_WEEK[slot.dayOfWeek] : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {slot.startTime && slot.endTime
                                ? `${formatTimeDisplay(slot.startTime)} – ${formatTimeDisplay(slot.endTime)}`
                                : "All day"}
                            </p>
                            {slot.label && (
                              <p className="text-[11px] text-gray-500 mt-0.5">{slot.label}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Specific Date Overrides */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Ban className="size-4 text-red-600" />
                  Date Overrides
                </CardTitle>
                <CardDescription className="text-xs">
                  Specific dates that override recurring patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const overrides = (data?.availability ?? []).filter(
                    (s) => s.specificDate !== null
                  );
                  if (overrides.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground py-2">
                        No date overrides.
                      </p>
                    );
                  }
                  return (
                    <ScrollArea className="max-h-64">
                      <div className="space-y-2">
                        {overrides.map((slot) => {
                          const overrideDate = slot.specificDate
                            ? new Date(slot.specificDate)
                            : null;
                          return (
                            <div
                              key={slot.id}
                              className={`
                                flex items-start gap-2.5 p-2.5 rounded-lg text-sm
                                ${slot.isAvailable ? "bg-emerald-50" : "bg-red-50"}
                              `}
                            >
                              <div
                                className={`
                                  size-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
                                  ${slot.isAvailable ? "bg-emerald-200" : "bg-red-200"}
                                `}
                              >
                                {slot.isAvailable ? (
                                  <CheckCircle2 className="size-3 text-emerald-700" />
                                ) : (
                                  <XCircle className="size-3 text-red-700" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {overrideDate ? formatDate(overrideDate) : "Date"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {slot.isAvailable ? "Available" : "Blocked"}
                                  {slot.startTime && slot.endTime
                                    ? ` · ${formatTimeDisplay(slot.startTime)} – ${formatTimeDisplay(slot.endTime)}`
                                    : " · All day"}
                                </p>
                                {slot.label && (
                                  <p className="text-[11px] text-gray-500 mt-0.5">{slot.label}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Privacy Notice */}
            <Card className="border-primary/10 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-2.5">
                  <Lock className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-primary">Privacy Notice</p>
                    <p className="text-[11px] text-primary/70 mt-1 leading-relaxed">
                      This link provides view-only access to the candidate&apos;s availability calendar.
                      The link expires {data?.share ? formatExpiryLabel(data.share.expiryType, data.share.expiresAt).toLowerCase() : "per schedule"}.
                      Do not share this link with unauthorized parties.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* View-only badge */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="size-3" />
              View-only access · Powered by MyZipVault
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

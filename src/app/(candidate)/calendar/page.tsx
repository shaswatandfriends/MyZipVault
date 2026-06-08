"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  ClipboardCheck,
  ShieldCheck,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "@/lib/icons";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  status: string;
  description: string;
  href: string;
}

/* ─── Event type config ─────────────────────────────────────────────── */
const EVENT_CONFIG: Record<string, { icon: typeof ClipboardCheck; label: string; color: string; bgColor: string }> = {
  checklist: { icon: ClipboardCheck, label: "Checklist", color: "#166534", bgColor: "#DCFCE7" },
  checklist_urgent: { icon: AlertTriangle, label: "Checklist Expiring", color: "#DC2626", bgColor: "#FEE2E2" },
  credential: { icon: ShieldCheck, label: "Credential", color: "#2563EB", bgColor: "#DBEAFE" },
  credential_urgent: { icon: AlertTriangle, label: "Credential Expiring", color: "#DC2626", bgColor: "#FEE2E2" },
  reference: { icon: Users, label: "Reference", color: "#7C3AED", bgColor: "#EDE9FE" },
};

/* ─── Helper: get days in month ─────────────────────────────────────── */
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ─── Component ─────────────────────────────────────────────────────── */
export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Calendar navigation
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/calendar");
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      setError("Failed to load calendar events. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Navigation
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(new Date());
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter((e) => isSameDay(new Date(e.date), date));
  };

  // Get selected date events
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Get upcoming events (next 14 days)
  const upcomingEvents = events.filter((e) => {
    const eventDate = new Date(e.date);
    const now = new Date();
    const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 14;
  });

  // Calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const prevMonthDays = currentMonth === 0
    ? getDaysInMonth(currentYear - 1, 11)
    : getDaysInMonth(currentYear, currentMonth - 1);

  /* ─── Loading ─────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calendar" description="Track your deadlines, expirations, and important dates." />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[500px] w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-60 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calendar" />
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchEvents} variant="outline">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Track your deadlines, expirations, and important dates."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Calendar Grid ────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="sm" onClick={goToPrevMonth} className="gap-1">
                  <ChevronLeft className="size-4" /> Prev
                </Button>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">
                    {MONTHS[currentMonth]} {currentYear}
                  </h2>
                  <Button variant="outline" size="sm" onClick={goToToday} className="text-xs">
                    Today
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={goToNextMonth} className="gap-1">
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-[#6B7280] py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Previous month trailing days */}
                {Array.from({ length: firstDay }).map((_, i) => {
                  const day = prevMonthDays - firstDay + i + 1;
                  return (
                    <div
                      key={`prev-${i}`}
                      className="aspect-square rounded-lg flex items-center justify-center text-sm text-[#9CA3AF]"
                    >
                      {day}
                    </div>
                  );
                })}

                {/* Current month days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(currentYear, currentMonth, day);
                  const dayEvents = getEventsForDate(date);
                  const isToday = isSameDay(date, today);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const hasUrgent = dayEvents.some((e) => e.type.includes("urgent"));
                  const hasEvents = dayEvents.length > 0;

                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center text-sm
                        transition-all duration-150 relative
                        ${isToday ? "bg-[#166534] text-white font-bold" : ""}
                        ${isSelected && !isToday ? "bg-[#DCFCE7] text-[#166534] font-semibold ring-2 ring-[#166534]" : ""}
                        ${!isToday && !isSelected ? "hover:bg-[#F3F4F6] text-[#111827]" : ""}
                      `}
                    >
                      <span>{day}</span>
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((evt) => {
                            const config = EVENT_CONFIG[evt.type] ?? EVENT_CONFIG.checklist;
                            return (
                              <div
                                key={evt.id}
                                className="size-1.5 rounded-full"
                                style={{
                                  backgroundColor: hasUrgent ? "#DC2626" : config.color,
                                }}
                              />
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="size-1.5 rounded-full bg-[#9CA3AF]" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Next month leading days */}
                {Array.from({ length: 42 - firstDay - daysInMonth }).map((_, i) => (
                  <div
                    key={`next-${i}`}
                    className="aspect-square rounded-lg flex items-center justify-center text-sm text-[#9CA3AF]"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[#E5E7EB]">
                {Object.entries(EVENT_CONFIG).map(([type, config]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="size-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                    <span className="text-xs text-[#6B7280]">{config.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar: Events ─────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Selected Date Events */}
          {selectedDate && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-[#9CA3AF] py-4 text-center">
                    No events on this date
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((evt) => {
                      const config = EVENT_CONFIG[evt.type] ?? EVENT_CONFIG.checklist;
                      const IconComp = config.icon;
                      return (
                        <Link key={evt.id} href={evt.href}>
                          <div className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F8F7F4] transition-colors">
                            <div
                              className="size-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: config.bgColor }}
                            >
                              <IconComp className="size-4" style={{ color: config.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{evt.title}</p>
                              <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{evt.description}</p>
                              <Badge
                                variant={evt.type.includes("urgent") ? "destructive" : "secondary"}
                                className="text-[10px] mt-1.5"
                              >
                                {config.label}
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Events */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="size-4 text-[#166534]" />
                <h3 className="text-sm font-semibold">Upcoming (14 days)</h3>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-[#9CA3AF] py-4 text-center">
                  No upcoming events
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {upcomingEvents.map((evt) => {
                    const config = EVENT_CONFIG[evt.type] ?? EVENT_CONFIG.checklist;
                    const IconComp = config.icon;
                    const eventDate = new Date(evt.date);
                    const now = new Date();
                    const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isOverdue = diffDays < 0;

                    return (
                      <Link key={evt.id} href={evt.href}>
                        <div className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-[#F3F4F6] transition-colors">
                          <div
                            className="size-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: config.bgColor }}
                          >
                            <IconComp className="size-3.5" style={{ color: config.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{evt.title}</p>
                            <p className="text-[11px] text-[#6B7280] mt-0.5">
                              {isOverdue
                                ? "Overdue"
                                : diffDays === 0
                                  ? "Today"
                                  : diffDays === 1
                                    ? "Tomorrow"
                                    : `In ${diffDays} days`}
                            </p>
                          </div>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-[10px] shrink-0">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">At a Glance</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-[#166534]" />
                    <span className="text-xs text-[#6B7280]">Pending Checklists</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {events.filter((e) => e.type === "checklist").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-[#2563EB]" />
                    <span className="text-xs text-[#6B7280]">Credential Expirations</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {events.filter((e) => e.type.startsWith("credential")).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-[#7C3AED]" />
                    <span className="text-xs text-[#6B7280]">Reference Follow-ups</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {events.filter((e) => e.type === "reference").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-[#DC2626]" />
                    <span className="text-xs text-[#6B7280]">Urgent Items</span>
                  </div>
                  <span className="text-sm font-semibold text-[#DC2626]">
                    {events.filter((e) => e.type.includes("urgent")).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

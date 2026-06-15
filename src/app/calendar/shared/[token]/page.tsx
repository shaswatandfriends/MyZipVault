"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, startOfWeek, addDays, isSameMonth, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { CalendarDays, AlertCircle, Clock, Shield } from "@/lib/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface SharedAvailability {
  id: number;
  availability_type: string;
  date?: string;
  day_of_week?: number;
  start_time: string;
  end_time: string;
  availability_status: string;
  notes?: string;
}

interface SharedCalendarData {
  owner_name: string;
  availability_status: string;
  expires_at?: string;
  expiry_type: string;
  availability: SharedAvailability[];
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SharedCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SharedCalendarData | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    async function fetchShared() {
      try {
        const res = await fetch(`/api/calendar/shared/${token}`);
        if (res.status === 401) {
          router.push(`/login?callbackUrl=/calendar/shared/${token}`);
          return;
        }
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || "This calendar link is no longer valid or has expired.");
          return;
        }
        const d = await res.json();
        setData(d);
      } catch {
        setError("Failed to load calendar data.");
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchShared();
  }, [token, router]);

  // Build day availability map
  const getAvailabilityForDate = (date: Date): SharedAvailability[] => {
    if (!data?.availability) return [];
    return data.availability.filter((slot) => {
      if (slot.availability_type === "specific_date" && slot.date) {
        return format(new Date(slot.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
      }
      if (slot.availability_type === "recurring" && slot.day_of_week != null) {
        return slot.day_of_week === date.getDay();
      }
      return false;
    });
  };

  const getDateColor = (date: Date): string => {
    const slots = getAvailabilityForDate(date);
    if (slots.length === 0) return "";
    if (slots.some((s) => s.availability_status === "blocked")) return "bg-red-100 text-red-700";
    if (slots.some((s) => s.availability_status === "free")) return "bg-green-100 text-green-700";
    if (slots.some((s) => s.availability_status === "working")) return "bg-gray-100 text-gray-600";
    return "";
  };

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-[800px] space-y-4 p-8">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md border-border">
          <CardContent className="py-12 text-center">
            <AlertCircle className="size-12 mx-auto text-red-400 mb-4" />
            <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>Link Expired or Invalid</h2>
            <p className="text-sm text-text-secondary mt-2">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const weeks: Date[][] = [];
  let current = calStart;
  while (current <= monthEnd || weeks.length < 1) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(addDays(current, i));
    }
    weeks.push(week);
    current = addDays(current, 7);
    if (weeks.length > 6) break;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[800px] mx-auto space-y-6">
        {/* Header */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary">
                {data.owner_name.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                  {data.owner_name}&apos;s Availability
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={
                    data.availability_status === "actively_looking" ? "border-green-300 text-green-600" :
                    data.availability_status === "open_to_opportunities" ? "border-yellow-300 text-yellow-600" :
                    "border-red-300 text-red-600"
                  }>
                    {data.availability_status === "actively_looking" ? "Actively Looking" :
                     data.availability_status === "open_to_opportunities" ? "Open to Opportunities" : "Not Available"}
                  </Badge>
                  {data.expires_at && (
                    <span className="text-xs text-text-muted">Valid until {format(new Date(data.expires_at), "MMM d, yyyy")}</span>
                  )}
                  {data.expiry_type === "never" && (
                    <span className="text-xs text-text-muted">Never expires</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-border" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                  &larr; Prev
                </Button>
                <Button variant="outline" size="sm" className="border-border" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                <Button variant="outline" size="sm" className="border-border" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                  Next &rarr;
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="flex gap-4 mb-3 text-xs text-text-secondary">
              <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-green-400" /> Available</span>
              <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-gray-300" /> Working</span>
              <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-red-400" /> Blocked</span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-px bg-surface-3 rounded-lg overflow-hidden">
              {DAY_NAMES.map((d) => (
                <div key={d} className="bg-background p-2 text-center text-xs font-semibold text-text-secondary">{d}</div>
              ))}
              {weeks.flat().map((date, idx) => {
                const inMonth = isSameMonth(date, currentMonth);
                const isToday = isSameDay(date, new Date());
                const colorClass = getDateColor(date);
                const slots = getAvailabilityForDate(date);
                return (
                  <button key={idx} type="button"
                    onClick={() => setSelectedDate(selectedDate && isSameDay(selectedDate, date) ? null : date)}
                    className={`p-2 min-h-[60px] text-left transition-colors ${inMonth ? "bg-white" : "bg-surface-2"} ${isToday ? "ring-2 ring-[var(--primary)] ring-inset" : ""} ${colorClass} ${selectedDate && isSameDay(selectedDate, date) ? "ring-2 ring-[var(--primary)] ring-inset" : ""} hover:bg-surface-2`}>
                    <div className={`text-xs font-medium ${inMonth ? "text-foreground" : "text-text-muted"}`}>{format(date, "d")}</div>
                    {slots.length > 0 && inMonth && (
                      <div className="mt-1 space-y-0.5">
                        {slots.slice(0, 2).map((s, si) => (
                          <div key={si} className={`text-[10px] leading-tight rounded px-0.5 ${s.availability_status === "free" ? "bg-green-100 text-green-700" : s.availability_status === "blocked" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                            {s.start_time}-{s.end_time}
                          </div>
                        ))}
                        {slots.length > 2 && <div className="text-[10px] text-text-secondary">+{slots.length - 2} more</div>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Detail */}
        {selectedDate && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getAvailabilityForDate(selectedDate).length === 0 ? (
                <p className="text-sm text-text-muted">No availability data for this day.</p>
              ) : (
                <div className="space-y-2">
                  {getAvailabilityForDate(selectedDate).map((slot) => (
                    <div key={slot.id} className="flex items-center gap-3 p-2 rounded-lg bg-background">
                      <Badge variant="outline" className={slot.availability_status === "free" ? "border-green-300 text-green-600" : slot.availability_status === "blocked" ? "border-red-300 text-red-600" : "border-gray-300 text-gray-600"}>
                        {slot.availability_status}
                      </Badge>
                      <span className="text-sm text-foreground">{slot.start_time} - {slot.end_time}</span>
                      {slot.notes && <span className="text-xs text-text-secondary">{slot.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer Note */}
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-text-muted">
          <Shield className="size-3.5" />
          <span>You are viewing availability only. To access full profile and credentials, request access through MyZipVault.</span>
        </div>
      </div>
    </div>
  );
}

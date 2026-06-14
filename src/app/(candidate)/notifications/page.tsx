"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  Clock,
  CheckCircle2,
  Inbox,
  FileText,
  ClipboardCheck,
  Users,
  Share2,
  ShieldCheck,
  CalendarDays,
  FileSignature,
} from "@/lib/icons";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ──────────────────────────────────────────────────────────

interface NotificationItem {
  id: number;
  title: string | null;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "credential":
      return <ShieldCheck className="size-4" />;
    case "checklist":
      return <ClipboardCheck className="size-4" />;
    case "reference":
      return <Users className="size-4" />;
    case "sharing":
      return <Share2 className="size-4" />;
    case "calendar":
    case "calendar_reminder":
      return <CalendarDays className="size-4" />;
    case "vaultsign":
      return <FileSignature className="size-4" />;
    case "resume":
      return <FileText className="size-4" />;
    default:
      return <Bell className="size-4" />;
  }
}

function getNotificationIconBg(type: string) {
  switch (type) {
    case "credential":
      return "bg-emerald-100 text-emerald-700";
    case "checklist":
      return "bg-blue-100 text-blue-700";
    case "reference":
      return "bg-purple-100 text-purple-700";
    case "sharing":
      return "bg-amber-100 text-amber-700";
    case "calendar":
    case "calendar_reminder":
      return "bg-teal-100 text-teal-700";
    case "vaultsign":
      return "bg-indigo-100 text-indigo-700";
    case "resume":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getNotificationTypeLabel(type: string): string {
  switch (type) {
    case "credential": return "Credential";
    case "checklist": return "Checklist";
    case "reference": return "Reference";
    case "sharing": return "Sharing";
    case "calendar": return "Calendar";
    case "calendar_reminder": return "Reminder";
    case "vaultsign": return "VaultSign";
    case "resume": return "Resume";
    case "system": return "System";
    default: return type;
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────

function NotificationCardSkeleton() {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="size-10 rounded-lg bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-gray-100 animate-pulse" />
            <div className="h-3 w-72 rounded bg-gray-100 animate-pulse" />
            <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Notification Card ──────────────────────────────────────────────

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: NotificationItem;
  onMarkRead: (id: number) => void;
}) {
  return (
    <Card
      className={`mb-3 transition-all duration-200 hover:shadow-md ${
        notification.is_read ? "opacity-70" : "border-l-4 border-l-[#166534]"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Icon */}
          <div
            className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${getNotificationIconBg(
              notification.type
            )}`}
          >
            {getNotificationIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-[#111827] truncate">
                    {notification.title || notification.message}
                  </h3>
                  {!notification.is_read && (
                    <span className="size-2 rounded-full bg-[#166534] shrink-0" />
                  )}
                </div>
                {notification.title && (
                  <p className="text-sm text-[#6B7280] line-clamp-2 mb-1">
                    {notification.message}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                  <Clock className="size-3" />
                  <span>{formatRelativeTime(notification.created_at)}</span>
                  <span>·</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 font-normal"
                  >
                    {getNotificationTypeLabel(notification.type)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {!notification.is_read && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 text-[#166534] border-[#166534]/30 hover:bg-[#DCFCE7]"
                  onClick={() => onMarkRead(notification.id)}
                >
                  <CheckCircle2 className="size-3" />
                  Mark as Read
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function CandidateNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/candidate/notifications");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch notifications");
      }
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load notifications", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (notificationId: number) => {
    try {
      const res = await fetch("/api/candidate/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to mark as read");
      }
      toast.success("Marked as read");
      await fetchNotifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Action failed", { description: message });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/candidate/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to mark all as read");
      }
      toast.success("All notifications marked as read");
      await fetchNotifications();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to mark all as read", { description: message });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold text-[#111827]"
            style={{ fontFamily: "'Clash Display', sans-serif" }}
          >
            Notifications
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Stay updated on your credentials, checklists, and references.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge className="bg-[#166534] text-white border-[#14532D] hover:bg-[#14532D] text-sm px-2.5">
              {unreadCount} unread
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || isLoading}
            className="gap-1.5 text-[#166534] border-[#166534]/30 hover:bg-[#DCFCE7]"
          >
            <CheckCircle2 className="size-3.5" />
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* ── Notification List ─────────────────────────────────────── */}
      {isLoading ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <NotificationCardSkeleton key={i} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-16 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-4">
            <Inbox className="size-8 text-[#166534]" />
          </div>
          <h3 className="text-lg font-semibold mb-1 text-[#111827]">No notifications</h3>
          <p className="text-sm text-[#6B7280] max-w-sm">
            You&apos;re all caught up! New notifications about your credentials, checklists, and references will appear here.
          </p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}

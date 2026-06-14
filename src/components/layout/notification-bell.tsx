"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellRing } from "@/lib/icons";
import { useAuth } from "@/components/providers/auth-provider";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UserRole } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────

interface QuickNotification {
  id: number;
  title: string | null;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// ─── Role → API endpoint mapping ────────────────────────────────────

function getApiEndpoint(role: UserRole): string {
  switch (role) {
    case "candidate":
      return "/api/candidate/notifications";
    case "client_recruiter":
    case "client_admin":
      return "/api/recruiter/notifications?type=all&limit=5";
    default:
      // platform_admin, super_admin — use generic endpoint
      return "/api/notifications?limit=5";
  }
}

function getMarkReadEndpoint(role: UserRole): string {
  switch (role) {
    case "candidate":
      return "/api/candidate/notifications";
    case "client_recruiter":
    case "client_admin":
      return "/api/recruiter/notifications";
    default:
      return "/api/notifications";
  }
}

function getViewAllHref(role: UserRole): string {
  switch (role) {
    case "candidate":
      return "/notifications";
    case "client_recruiter":
    case "client_admin":
      return "/recruiter/notifications";
    default:
      return "#";
  }
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

// ─── Component ──────────────────────────────────────────────────────

interface NotificationBellProps {
  /** "header" renders as an icon button (for top bars), "sidebar" renders as a full-width sidebar row */
  variant?: "header" | "sidebar";
}

export function NotificationBell({ variant = "header" }: NotificationBellProps) {
  const { role } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<QuickNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const apiEndpoint = role ? getApiEndpoint(role) : "";
  const markReadEndpoint = role ? getMarkReadEndpoint(role) : "";
  const viewAllHref = role ? getViewAllHref(role) : "#";

  const poll = useCallback(async () => {
    if (!apiEndpoint) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(apiEndpoint, {
        signal: controller.signal,
      });
      if (res.ok && !controller.signal.aborted) {
        const data = await res.json();
        const notifications = (data.notifications || []).slice(0, 5);
        // Recruiter API returns unreadCount, others don't — calculate from data
        const count = data.unreadCount ?? notifications.filter((n: QuickNotification) => !n.is_read).length;
        setUnreadCount(count);
        setRecentNotifications(notifications);
      }
    } catch {
      // Silently fail — this is a background poll
    }
  }, [apiEndpoint]);

  useEffect(() => {
    // Initial fetch
    poll();
    // Poll every 30 seconds
    const interval = setInterval(poll, 30000);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [poll]);

  const handleMarkAllRead = async () => {
    if (!markReadEndpoint) return;
    try {
      const res = await fetch(markReadEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setRecentNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
      }
    } catch {
      // Silently fail
    }
  };

  const BellIcon = unreadCount > 0 ? BellRing : Bell;

  // ── Sidebar variant ──
  if (variant === "sidebar") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#6B7280] transition-all duration-200 ease-in-out hover:bg-[#F3F4F6] hover:text-[#111827]">
            <BellIcon className="size-5 shrink-0" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-[#166534] text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          className="w-80 p-0 rounded-xl shadow-lg border-[#E5E7EB]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[#E5E7EB]">
            <h4
              className="text-sm font-semibold text-[#111827]"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              Notifications
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-[#166534] hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <ScrollArea className="max-h-80">
            {recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="size-10 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-2">
                  <Bell className="size-5 text-[#166534]" />
                </div>
                <p className="text-sm text-[#6B7280]">No new notifications</p>
              </div>
            ) : (
              <div>
                {recentNotifications.map((notification, idx) => (
                  <div key={notification.id}>
                    <div
                      className={`flex items-start gap-2.5 p-3 hover:bg-[#F8F7F4] transition-colors cursor-pointer ${
                        !notification.is_read ? "bg-[#DCFCE7]/30" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#111827] truncate">
                          {notification.title || notification.message}
                        </p>
                        {notification.title && (
                          <p className="text-xs text-[#6B7280] truncate mt-0.5">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-[10px] text-[#9CA3AF] mt-1">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="size-2 rounded-full bg-[#166534] shrink-0 mt-1.5" />
                      )}
                    </div>
                    {idx < recentNotifications.length - 1 && (
                      <Separator className="bg-[#E5E7EB]" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-[#E5E7EB] p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[#166534] hover:bg-[#DCFCE7] text-xs font-medium"
              asChild
              onClick={() => setIsOpen(false)}
            >
              <Link href={viewAllHref}>
                View All Notifications
              </Link>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // ── Header variant (icon button style) ──
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-[#6B7280] hover:text-[#166534] hover:bg-[#DCFCE7] h-9 w-9"
        >
          <BellIcon className="size-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center bg-[#166534] text-white text-[10px] font-bold border-2 border-white rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 rounded-xl shadow-lg border-[#E5E7EB]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#E5E7EB]">
          <h4
            className="text-sm font-semibold text-[#111827]"
            style={{ fontFamily: "'Clash Display', sans-serif" }}
          >
            Notifications
          </h4>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-[#166534] hover:underline font-medium"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-80">
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="size-10 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-2">
                <Bell className="size-5 text-[#166534]" />
              </div>
              <p className="text-sm text-[#6B7280]">No new notifications</p>
            </div>
          ) : (
            <div>
              {recentNotifications.map((notification, idx) => (
                <div key={notification.id}>
                  <div
                    className={`flex items-start gap-2.5 p-3 hover:bg-[#F8F7F4] transition-colors cursor-pointer ${
                      !notification.is_read ? "bg-[#DCFCE7]/30" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#111827] truncate">
                        {notification.title || notification.message}
                      </p>
                      {notification.title && (
                        <p className="text-xs text-[#6B7280] truncate mt-0.5">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-[10px] text-[#9CA3AF] mt-1">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <span className="size-2 rounded-full bg-[#166534] shrink-0 mt-1.5" />
                    )}
                  </div>
                  {idx < recentNotifications.length - 1 && (
                    <Separator className="bg-[#E5E7EB]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-[#E5E7EB] p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[#166534] hover:bg-[#DCFCE7] text-xs font-medium"
            asChild
            onClick={() => setIsOpen(false)}
          >
            <Link href={viewAllHref}>
              View All Notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

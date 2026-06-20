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
  related_entity_id?: number | null;
  related_entity_type?: string | null;
}

// ─── Role → API endpoint mapping ────────────────────────────────────
// Now uses the UNIFIED /api/notifications endpoint for ALL roles.

function getApiEndpoint(role: UserRole): string {
  // All roles use the same unified endpoint
  return "/api/notifications?limit=5";
}

function getMarkReadEndpoint(role: UserRole): string {
  // All roles use the same unified endpoint
  return "/api/notifications";
}

function getViewAllHref(role: UserRole): string {
  // All roles use the same notification center page
  return "/notifications";
}

// ─── SSE: Real-time notification push ────────────────────────────────
// Opens an EventSource connection to /api/notifications/stream.
// When new notifications arrive, the bell updates instantly (no polling).

function useNotificationStream(
  onNewNotification: (data: any) => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    let es: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    function connect() {
      try {
        es = new EventSource("/api/notifications/stream");

        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            onNewNotification(data);
          } catch {
            // Ignore parse errors
          }
        };

        es.onerror = () => {
          es?.close();
          // Auto-reconnect after 3 seconds (EventSource does this natively,
          // but we handle it explicitly to avoid duplicate connections)
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connect, 3000);
        };
      } catch {
        // EventSource not available (older browsers) — fall back to polling
      }
    }

    connect();

    return () => {
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [enabled, onNewNotification]);
}

// ─── Helpers ────────────────────────────────────────────────────────

function getNotificationActionLink(notification: QuickNotification, role: UserRole | null): string | null {
  if (!role) return null;

  // Candidate notifications — actionable
  if (role === "candidate") {
    if (notification.related_entity_type === "vaultsign_document") {
      // Pending RTR/offer to sign → link to VaultSign page
      return "/vaultsign";
    }
    if (notification.related_entity_type === "checklist_request") {
      // Document/checklist request → link to dashboard (where RequestedDocuments is)
      return "/dashboard";
    }
    if (notification.related_entity_type === "lead") {
      // Contact request (email/phone/calendar) → link to settings
      return "/settings";
    }
  }

  // Recruiter notifications — actionable
  if (role === "client_recruiter" || role === "client_admin") {
    if (notification.related_entity_type === "lead") {
      // Lead status change → link to candidate profile
      return `/recruiter/candidates/${notification.related_entity_id}`;
    }
    if (notification.related_entity_type === "vaultsign_document") {
      // Document status change → link to document
      return `/recruiter/vaultsign/${notification.related_entity_id}`;
    }
  }

  return null;
}

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

  // SSE: real-time notification push
  const handleSSEEvent = useCallback((data: any) => {
    if (data.type === "connected" || data.type === "read_update" || data.type === "notification") {
      if (typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
      if (data.type === "notification") {
        // Refresh the notification list when a new one arrives
        poll();
      }
    }
  }, []);

  useNotificationStream(handleSSEEvent, !!role);

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
          <button className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 ease-in-out hover:bg-surface-2 hover:text-foreground">
            <BellIcon className="size-5 shrink-0" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          className="w-96 p-0 rounded-xl shadow-lg border-[var(--border)]"
          style={{ maxWidth: " calc(100vw - 32px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
            <h4
              className="text-sm font-semibold text-[var(--foreground)]"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              Notifications
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-[var(--primary)] hover:underline font-medium whitespace-nowrap shrink-0"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <ScrollArea className="max-h-80">
            {recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="size-10 rounded-full bg-[var(--primary-light)] flex items-center justify-center mb-2">
                  <Bell className="size-5 text-[var(--primary)]" />
                </div>
                <p className="text-sm text-[var(--text-secondary)]">No new notifications</p>
              </div>
            ) : (
              <div>
                {recentNotifications.map((notification, idx) => {
                  const actionLink = getNotificationActionLink(notification, role);
                  const isActionable = !!actionLink;

                  // Priority + category metadata
                  const priority = (notification as any).priority || "info";
                  const category = (notification as any).category || "system";
                  const priorityColor = priority === "urgent" ? "#DC2626" : priority === "important" ? "#D97706" : "#2563EB";
                  const priorityBg = priority === "urgent" ? "#FEE2E2" : priority === "important" ? "#FEF3C7" : "#DBEAFE";
                  const catIcon = category === "rtr" ? "✍️" : category === "document" ? "📄" : category === "status" ? "📊" : category === "calendar" ? "📅" : category === "credit" ? "💳" : category === "compliance" ? "🛡️" : "⚙️";

                  return (
                  <div key={notification.id}>
                    <div
                      className={`flex items-start gap-2.5 p-3 hover:bg-[var(--background)] transition-colors ${isActionable ? "cursor-pointer" : ""} ${
                        !notification.is_read ? "" : ""
                      }`}
                      style={!notification.is_read ? { borderLeft: `3px solid ${priorityColor}`, backgroundColor: priorityBg + "40" } : { borderLeft: "3px solid transparent" }}
                      onClick={() => {
                        if (actionLink) {
                          window.location.href = actionLink;
                        }
                      }}
                    >
                      {/* Category icon */}
                      <span className="text-base shrink-0 mt-0.5">{catIcon}</span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">
                            {notification.title || notification.message}
                          </p>
                          {/* Priority dot */}
                          {!notification.is_read && (
                            <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: priorityColor }} />
                          )}
                        </div>
                        {notification.title && (
                          <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                            {notification.message}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {formatRelativeTime(notification.created_at)}
                          </p>
                          {isActionable && (
                            <span className="text-[10px] font-medium text-[var(--primary)] flex items-center gap-0.5">
                              {notification.related_entity_type === "vaultsign_document" ? "Sign now →" : "View →"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {idx < recentNotifications.length - 1 && (
                      <Separator className="bg-[var(--border)]" />
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-[var(--border)] p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[var(--primary)] hover:bg-[var(--primary-light)] text-xs font-medium whitespace-nowrap"
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
          className="relative text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] h-9 w-9"
        >
          <BellIcon className="size-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center bg-[var(--primary)] text-white text-[10px] font-bold border-2 border-white rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 p-0 rounded-xl shadow-lg border-[var(--border)]"
        style={{ maxWidth: "calc(100vw - 32px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
          <h4
            className="text-sm font-semibold text-[var(--foreground)]"
            style={{ fontFamily: "'Satoshi', sans-serif" }}
          >
            Notifications
          </h4>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-[var(--primary)] hover:underline font-medium whitespace-nowrap shrink-0"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-80">
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="size-10 rounded-full bg-[var(--primary-light)] flex items-center justify-center mb-2">
                <Bell className="size-5 text-[var(--primary)]" />
              </div>
              <p className="text-sm text-[var(--text-secondary)]">No new notifications</p>
            </div>
          ) : (
            <div>
              {recentNotifications.map((notification, idx) => {
                const actionLink = getNotificationActionLink(notification, role);
                const priority = (notification as any).priority || "info";
                const category = (notification as any).category || "system";
                const priorityColor = priority === "urgent" ? "#DC2626" : priority === "important" ? "#D97706" : "#2563EB";
                const priorityBg = priority === "urgent" ? "#FEE2E2" : priority === "important" ? "#FEF3C7" : "#DBEAFE";
                const catIcon = category === "rtr" ? "✍️" : category === "document" ? "📄" : category === "status" ? "📊" : category === "calendar" ? "📅" : category === "credit" ? "💳" : category === "compliance" ? "🛡️" : "⚙️";

                return (
                <div key={notification.id}>
                  <div
                    className={`flex items-start gap-2.5 p-3 hover:bg-[var(--background)] transition-colors overflow-hidden ${actionLink ? "cursor-pointer" : ""}`}
                    style={!notification.is_read ? { borderLeft: `3px solid ${priorityColor}`, backgroundColor: priorityBg + "40" } : { borderLeft: "3px solid transparent" }}
                    onClick={() => {
                      if (actionLink) {
                        window.location.href = actionLink;
                      }
                    }}
                  >
                    <span className="text-base shrink-0 mt-0.5">{catIcon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {notification.title || notification.message}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: priorityColor }} />
                        )}
                      </div>
                      {notification.title && (
                        <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                  {idx < recentNotifications.length - 1 && (
                    <Separator className="bg-[var(--border)]" />
                  )}
                </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-[var(--border)] p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[var(--primary)] hover:bg-[var(--primary-light)] text-xs font-medium whitespace-nowrap"
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

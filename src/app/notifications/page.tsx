"use client";

/**
 * Notification Center — shared page for ALL roles.
 *
 * Shows all notifications with:
 *   - Filter tabs: All | Unread | Urgent
 *   - Category filter dropdown
 *   - Priority icons + category icons
 *   - Action buttons ("View", "Sign now", etc.)
 *   - Mark all read / Mark individual read
 *   - Pagination (load more)
 *
 * Each role sees only their own notifications (enforced by the API).
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell, CheckCheck, Loader2, AlertCircle, ChevronDown,
  FileSignature, FileText, Calendar, CreditCard, ShieldCheck,
  TrendingUp, Settings as SettingsIcon,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NotificationItem {
  id: number;
  title: string | null;
  message: string;
  type: string;
  category: string;
  priority: string;
  is_read: boolean;
  is_emailed: boolean;
  action_url: string | null;
  action_label: string | null;
  related_entity_id: number | null;
  related_entity_type: string | null;
  created_at: string;
}

type FilterTab = "all" | "unread" | "urgent";

// Category metadata (icon + label)
const CATEGORY_META: Record<string, { icon: any; label: string; color: string }> = {
  rtr:         { icon: FileSignature,  label: "RTR & Signatures", color: "#8B5CF6" },
  document:    { icon: FileText,       label: "Documents",        color: "#0EA5E9" },
  status:      { icon: TrendingUp,     label: "Status Changes",   color: "#10B981" },
  calendar:    { icon: Calendar,       label: "Calendar",         color: "#F59E0B" },
  credit:      { icon: CreditCard,     label: "Credits",          color: "#EF4444" },
  compliance:  { icon: ShieldCheck,    label: "Compliance",       color: "#6366F1" },
  system:      { icon: SettingsIcon,   label: "System",           color: "#6B7280" },
};

// Priority metadata
const PRIORITY_META: Record<string, { color: string; bg: string; label: string }> = {
  urgent:    { color: "#DC2626", bg: "#FEE2E2", label: "🔴 Urgent" },
  important: { color: "#D97706", bg: "#FEF3C7", label: "🟡 Important" },
  info:      { color: "#2563EB", bg: "#DBEAFE", label: "🔵 Info" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationCenterPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [markingRead, setMarkingRead] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const fetchNotifications = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("filter", activeTab);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      params.set("limit", String(LIMIT));
      params.set("offset", String(reset ? 0 : offset));

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      if (reset) {
        setNotifications(data.notifications || []);
        setOffset(LIMIT);
      } else {
        setNotifications((prev) => [...prev, ...(data.notifications || [])]);
        setOffset((prev) => prev + LIMIT);
      }
      setUnreadCount(data.unreadCount ?? 0);
      setTotalCount(data.totalCount ?? 0);
      setCategories(data.categories ?? {});
    } catch (err: any) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [activeTab, categoryFilter, offset]);

  useEffect(() => {
    fetchNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, categoryFilter]);

  async function handleMarkAllRead() {
    setMarkingRead(true);
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setCategories({});
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark as read");
    } finally {
      setMarkingRead(false);
    }
  }

  async function handleMarkRead(id: number) {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silent fail
    }
  }

  function handleClick(notification: NotificationItem) {
    // Mark as read
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }
    // Navigate to action URL
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  }

  const hasMore = notifications.length < totalCount;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread of ${totalCount} total`}
      />

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Filter tabs */}
        <div className="flex items-center bg-surface-2 rounded-md p-0.5">
          {(["all", "unread", "urgent"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-text-secondary hover:text-foreground"
              }`}
            >
              {tab}
              {tab === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 text-xs bg-primary text-white px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <SelectItem key={key} value={key}>
                  {meta.label} {categories[key] ? `(${categories[key]})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Mark all read */}
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={handleMarkAllRead} disabled={markingRead}>
              {markingRead ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5 mr-1" />}
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      {loading && notifications.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Bell className="h-10 w-10 text-text-muted mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              {activeTab === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {activeTab === "unread"
                ? "You're all caught up! New notifications will appear here."
                : "Notifications about RTRs, documents, status changes, and more will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const catMeta = CATEGORY_META[notification.category] || CATEGORY_META.system;
            const priMeta = PRIORITY_META[notification.priority] || PRIORITY_META.info;
            const CatIcon = catMeta.icon;

            return (
              <div
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                  !notification.is_read ? "border-l-4" : "border opacity-75"
                }`}
                style={{
                  borderLeftColor: !notification.is_read ? priMeta.color : undefined,
                  backgroundColor: !notification.is_read ? priMeta.bg + "40" : undefined,
                }}
              >
                {/* Category icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: catMeta.color + "20" }}
                >
                  <CatIcon className="h-4 w-4" style={{ color: catMeta.color }} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!notification.is_read ? "font-semibold" : "font-medium"} text-foreground`}>
                      {notification.title || notification.message}
                    </p>
                    <span className="text-[10px] text-text-muted shrink-0">
                      {timeAgo(notification.created_at)}
                    </span>
                  </div>
                  {notification.title && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{notification.message}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    {/* Priority badge */}
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: priMeta.bg, color: priMeta.color }}
                    >
                      {priMeta.label}
                    </span>
                    {/* Category label */}
                    <span className="text-[10px] text-text-muted">{catMeta.label}</span>
                    {/* Action button */}
                    {notification.action_url && notification.action_label && (
                      <span className="text-[10px] font-medium text-primary hover:underline">
                        {notification.action_label} →
                      </span>
                    )}
                  </div>
                </div>

                {/* Unread dot */}
                {!notification.is_read && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </div>
            );
          })}

          {/* Load more */}
          {hasMore && !loading && (
            <div className="text-center py-4">
              <Button variant="outline" size="sm" onClick={() => fetchNotifications(false)}>
                Load more
              </Button>
            </div>
          )}

          {loading && notifications.length > 0 && (
            <div className="text-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted mx-auto" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

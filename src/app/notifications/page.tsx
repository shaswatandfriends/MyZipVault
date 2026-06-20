"use client";

/**
 * Notification Center — shared page for ALL roles.
 * Shows all notifications with filters, priority colors, category icons.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell, CheckCheck, Loader2,
  FileSignature, FileText, TrendingUp, Calendar as CalIcon,
  CreditCard, ShieldCheck, Settings as SettingsIcon,
} from "@/lib/icons";
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
  action_url: string | null;
  action_label: string | null;
  related_entity_id: number | null;
  related_entity_type: string | null;
  created_at: string;
}

type FilterTab = "all" | "unread" | "urgent";

const CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
  rtr:        { icon: "✍️", label: "RTR & Signatures", color: "#8B5CF6" },
  document:   { icon: "📄", label: "Documents",        color: "#0EA5E9" },
  status:     { icon: "📊", label: "Status Changes",   color: "#10B981" },
  calendar:   { icon: "📅", label: "Calendar",         color: "#F59E0B" },
  credit:     { icon: "💳", label: "Credits",          color: "#EF4444" },
  compliance: { icon: "🛡️", label: "Compliance",       color: "#6366F1" },
  system:     { icon: "⚙️", label: "System",           color: "#6B7280" },
};

const PRIORITY_META: Record<string, { color: string; bg: string; label: string }> = {
  urgent:    { color: "#DC2626", bg: "#FEE2E2", label: "Urgent" },
  important: { color: "#D97706", bg: "#FEF3C7", label: "Important" },
  info:      { color: "#2563EB", bg: "#DBEAFE", label: "Info" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
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
    } catch {
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
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  }

  function handleClick(notification: NotificationItem) {
    if (!notification.is_read) handleMarkRead(notification.id);
    if (notification.action_url) router.push(notification.action_url);
  }

  const hasMore = notifications.length < totalCount;

  return (
    <div className="p-4 md:p-6 space-y-4" style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread of ${totalCount} total` : `${totalCount} total`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={handleMarkAllRead} disabled={markingRead}>
            {markingRead ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5 mr-1" />}
            Mark all read
          </Button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
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
                <span className="ml-1.5 text-xs bg-primary text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[170px] h-8 text-xs">
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
      </div>

      {/* Notifications list */}
      {loading && notifications.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
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
                ? "You're all caught up!"
                : "Notifications about RTRs, documents, status changes, and more will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const catMeta = CATEGORY_META[notification.category] || CATEGORY_META.system;
            const priMeta = PRIORITY_META[notification.priority] || PRIORITY_META.info;

            return (
              <div
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm w-full box-border ${
                  notification.action_url ? "" : "cursor-default"
                }`}
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: notification.is_read ? "transparent" : priMeta.color,
                  backgroundColor: notification.is_read ? "transparent" : priMeta.bg + "30",
                }}
              >
                {/* Category icon */}
                <span className="text-lg shrink-0" style={{ lineHeight: 1 }}>{catMeta.icon}</span>

                {/* Content */}
                <div className="flex-1 min-w-0" style={{ minWidth: 0 }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm truncate ${notification.is_read ? "font-normal text-text-secondary" : "font-semibold text-foreground"}`} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {notification.title || notification.message}
                    </p>
                    <span className="text-[10px] text-text-muted shrink-0">{timeAgo(notification.created_at)}</span>
                  </div>
                  {notification.title && (
                    <p className="text-xs text-text-secondary mt-0.5" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {notification.message}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: priMeta.bg, color: priMeta.color }}>
                      {priMeta.label}
                    </span>
                    <span className="text-[10px] text-text-muted">{catMeta.label}</span>
                    {notification.action_url && notification.action_label && (
                      <span className="text-[10px] font-medium text-primary">{notification.action_label} →</span>
                    )}
                  </div>
                </div>

                {/* Unread dot */}
                {!notification.is_read && (
                  <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: priMeta.color }} />
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
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * Notification Center — Spatial UI redesign
 *
 * 3-column layout on desktop (>1440px):
 *   Left (20%):  Illustration + useful stats (expiring creds, pending verifications)
 *   Center (60%): Notification list with filters, tabs, cards
 *   Right (20%): "You're all caught up" + recent activity + quick actions
 *
 * Spatial UI:
 *   - mesh-background orbs
 *   - material-thin glass panels
 *   - pill-shaped filter tabs with gradient active state
 *   - forest-green + terracotta palette (no teal)
 *   - depth-2 shadows + specular highlights
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CheckCheck, Loader2, Trash2, Shield, Lock,
  Send, Sparkles,
} from "@/lib/icons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Types ──────────────────────────────────────────────────────────
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

// ─── Constants — Spatial UI palette ─────────────────────────────────
const CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
  rtr:        { icon: "✍️", label: "RTR & Signatures", color: "#0A66C2" },     // terra
  document:   { icon: "📄", label: "Documents",        color: "#3B82F6" },     // blue
  status:     { icon: "📊", label: "Status Changes",   color: "#0A66C2" },     // primary
  calendar:   { icon: "📅", label: "Calendar",         color: "#D97706" },     // amber
  credit:     { icon: "💳", label: "Credits",          color: "#B84040" },     // red
  compliance: { icon: "🛡️", label: "Compliance",       color: "#70B5F9" },     // primary-vivid
  system:     { icon: "⚙️", label: "System",           color: "#6B7280" },     // text-secondary
};

const PRIORITY_META: Record<string, { color: string; bg: string; label: string }> = {
  urgent:    { color: "#B84040", bg: "rgba(184,64,64,0.1)", label: "Urgent" },
  important: { color: "#D97706", bg: "rgba(217,119,6,0.12)", label: "Important" },
  info:      { color: "#0A66C2", bg: "rgba(45,90,61,0.08)", label: "Info" },
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

// ─── Main Component ─────────────────────────────────────────────────
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
    } catch {
      toast.error("Failed to mark notification as read");
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      const wasUnread = notifications.find((n) => n.id === id)?.is_read === false;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete notification");
    }
  }

  function handleClick(notification: NotificationItem) {
    if (!notification.is_read) handleMarkRead(notification.id);
    if (notification.action_url) router.push(notification.action_url);
  }

  const hasMore = notifications.length < totalCount;

  const urgentCount = categories["rtr"] || 0;
  const docCount = categories["document"] || 0;
  const complianceCount = categories["compliance"] || 0;

  return (
    <div className="min-h-screen relative">
      <div className="mesh-background" />

      <div className="mx-auto relative z-10" style={{ maxWidth: "1440px" }}>
        {/* 3-column layout */}
        <div className="flex gap-6 p-4 md:p-6">

          {/* ─── LEFT PANEL (hidden below 1440px) ─── */}
          <div className="hidden 2xl:block w-[240px] shrink-0 space-y-4">
            <LeftPanel
              unreadCount={unreadCount}
              urgentCount={urgentCount}
              docCount={docCount}
              complianceCount={complianceCount}
            />
          </div>

          {/* ─── CENTER: Notifications List ─── */}
          <div className="flex-1 min-w-0 space-y-4" style={{ maxWidth: "700px" }}>

            {/* Title — spatial */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="hidden sm:block w-1 rounded-full shrink-0 min-h-[2.5rem]"
                  style={{
                    background: "linear-gradient(180deg, var(--terra) 0%, var(--terra-light) 100%)",
                    boxShadow: "0 0 8px rgba(201,123,84,0.3)",
                  }}
                />
                <div>
                  <h1
                    className="text-xl font-bold font-heading tracking-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Notifications
                  </h1>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {unreadCount > 0 ? `${unreadCount} unread of ${totalCount} total` : `${totalCount} total`}
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <Button size="sm" variant="outline" onClick={handleMarkAllRead} disabled={markingRead}>
                  {markingRead ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5 mr-1" />}
                  Mark all read
                </Button>
              )}
            </div>

            {/* Filters — spatial pill segment + Select */}
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="flex items-center rounded-full p-1 gap-1"
                style={{
                  background: "var(--material-thin-bg)",
                  backdropFilter: "var(--material-thin-blur)",
                  WebkitBackdropFilter: "var(--material-thin-blur)",
                  border: "0.5px solid var(--material-thin-border)",
                  boxShadow: "var(--specular-top), var(--depth-1)",
                }}
              >
                {(["all", "unread", "urgent"] as FilterTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="px-3.5 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] capitalize"
                    style={
                      activeTab === tab
                        ? {
                            background: "linear-gradient(180deg, var(--primary-vivid) 0%, var(--primary) 100%)",
                            color: "#fff",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(45,90,61,0.24)",
                          }
                        : { color: "var(--text-secondary)" }
                    }
                  >
                    {tab}
                    {tab === "unread" && unreadCount > 0 && (
                      <span
                        className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full text-white"
                        style={{
                          background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 100%)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
                        }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[170px] h-8 text-xs">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.icon} {meta.label} {categories[key] ? `(${categories[key]})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notification cards — spatial */}
            {loading && notifications.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-[20px]" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <Card className="border-dashed" style={{ borderColor: "var(--border-strong)", background: "transparent" }}>
                <CardContent className="py-16 text-center">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-block mb-3"
                  >
                    <div
                      className="w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto"
                      style={{
                        background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(45,90,61,0.32)",
                        color: "#fff",
                      }}
                    >
                      <Bell className="h-8 w-8" />
                    </div>
                  </motion.div>
                  <p className="text-sm font-semibold font-heading" style={{ color: "var(--text-primary)" }}>
                    {activeTab === "unread" ? "You're all caught up!" : "No notifications yet"}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    {activeTab === "unread"
                      ? "We'll notify you here when something new arrives."
                      : "Document shares, credential expirations, and team activities will appear here."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {notifications.map((notification) => {
                    const catMeta = CATEGORY_META[notification.category] || CATEGORY_META.system;
                    const priMeta = PRIORITY_META[notification.priority] || PRIORITY_META.info;

                    return (
                      <motion.div
                        key={notification.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ y: -2 }}
                        onClick={() => handleClick(notification)}
                        className="flex items-start gap-3 p-4 cursor-pointer transition-all w-full box-border"
                        style={{
                          background: notification.is_read
                            ? "var(--material-regular-bg)"
                            : "var(--material-thick-bg)",
                          backdropFilter: notification.is_read
                            ? "var(--material-regular-blur)"
                            : "var(--material-thick-blur)",
                          WebkitBackdropFilter: notification.is_read
                            ? "var(--material-regular-blur)"
                            : "var(--material-thick-blur)",
                          border: "0.5px solid " + (notification.is_read ? "var(--material-regular-border)" : "var(--material-thick-border)"),
                          borderRadius: "var(--radius-concentric-3)",
                          boxShadow: notification.is_read
                            ? "var(--specular-top), var(--depth-1)"
                            : "var(--specular-vibrant), var(--depth-2)",
                          borderLeftWidth: "3px",
                          borderLeftColor: notification.is_read ? "var(--border)" : priMeta.color,
                        }}
                      >
                        {/* Category icon — spatial gradient container */}
                        <div
                          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                          style={{
                            background: `linear-gradient(180deg, ${catMeta.color}dd 0%, ${catMeta.color}99 60%, ${catMeta.color}77 100%)`,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px ${catMeta.color}44`,
                          }}
                        >
                          <span className="text-base">{catMeta.icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm truncate ${notification.is_read ? "font-normal" : "font-semibold"}`}
                              style={{
                                color: notification.is_read ? "var(--text-secondary)" : "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {notification.title || notification.message}
                            </p>
                            <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                              {timeAgo(notification.created_at)}
                            </span>
                          </div>
                          {notification.title && (
                            <p
                              className="text-xs mt-0.5"
                              style={{
                                color: "var(--text-secondary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {notification.message}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: priMeta.bg, color: priMeta.color, border: `0.5px solid ${priMeta.color}33` }}
                            >
                              {priMeta.label}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{catMeta.label}</span>
                            {notification.action_url && notification.action_label && (
                              <span className="text-[10px] font-semibold" style={{ color: "var(--primary)" }}>
                                {notification.action_label} →
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Unread dot + delete */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          {!notification.is_read && (
                            <motion.span
                              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: priMeta.color }}
                            />
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                            className="p-1 rounded-full transition-colors"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--status-red)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

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

            {/* ─── Bottom Trust Banner — spatial glass ─── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -2 }}
              className="mt-8 rounded-[20px] p-5 flex items-center gap-4"
              style={{
                background: "var(--material-regular-bg)",
                backdropFilter: "var(--material-regular-blur)",
                WebkitBackdropFilter: "var(--material-regular-blur)",
                border: "0.5px solid var(--material-regular-border)",
                boxShadow: "var(--specular-top), var(--depth-2)",
              }}
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(45,90,61,0)",
                    "0 0 0 8px rgba(45,90,61,0.1)",
                    "0 0 0 0 rgba(45,90,61,0)",
                  ],
                }}
                transition={{ duration: 8, repeat: Infinity }}
                className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(45,90,61,0.28)",
                  color: "#fff",
                }}
              >
                <Lock className="h-5 w-5" />
              </motion.div>
              <div>
                <p className="text-sm font-semibold font-heading" style={{ color: "var(--text-primary)" }}>
                  Your data is safe and secure
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Protected by enterprise-grade encryption and secure document storage.
                </p>
              </div>
              <Shield className="h-5 w-5 ml-auto shrink-0" style={{ color: "var(--primary)" }} />
            </motion.div>
          </div>

          {/* ─── RIGHT PANEL (hidden below 1440px) ─── */}
          <div className="hidden 2xl:block w-[240px] shrink-0 space-y-4">
            <RightPanel notifications={notifications} unreadCount={unreadCount} onMarkAllRead={handleMarkAllRead} />
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Left Panel: Illustration + Stats — Spatial UI ──────────────────
function LeftPanel({
  unreadCount, urgentCount, docCount, complianceCount,
}: {
  unreadCount: number;
  urgentCount: number;
  docCount: number;
  complianceCount: number;
}) {
  return (
    <div className="space-y-4 sticky top-6">
      {/* Illustration card — spatial material-regular */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-[20px] p-5 relative overflow-hidden"
        style={{
          background: "var(--material-regular-bg)",
          backdropFilter: "var(--material-regular-blur)",
          WebkitBackdropFilter: "var(--material-regular-blur)",
          border: "0.5px solid var(--material-regular-border)",
          boxShadow: "var(--specular-top), var(--depth-2)",
        }}
      >
        {/* Floating dots */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10"
        >
          <div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-3"
            style={{
              background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(45,90,61,0.32)",
              color: "#fff",
            }}
          >
            <Bell className="h-6 w-6" />
          </div>
        </motion.div>

        {/* Unread badge pulse — terra */}
        {unreadCount > 0 && (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white z-20"
            style={{
              background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(201,123,84,0.4)",
            }}
          >
            {unreadCount}
          </motion.div>
        )}

        <h3 className="text-sm font-bold font-heading relative z-10" style={{ color: "var(--text-primary)" }}>
          Stay updated, never miss what matters
        </h3>
        <p className="text-xs mt-1.5 relative z-10" style={{ color: "var(--text-secondary)" }}>
          Document shares, credential expirations, verification updates and team activities appear here.
        </p>

        {/* Decorative shapes — terra/primary */}
        <div
          className="absolute bottom-0 right-0 w-20 h-20 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, var(--terra), transparent)" }}
        />
        <div className="absolute top-8 right-8 w-3 h-3 rounded-full" style={{ background: "var(--terra)", opacity: 0.3 }} />
        <div className="absolute bottom-8 left-4 w-2 h-2 rounded-full" style={{ background: "var(--primary)", opacity: 0.2 }} />
      </motion.div>

      {/* Quick stats */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-wider px-1" style={{ color: "var(--text-muted)" }}>
          Quick Stats
        </h4>

        <StatCard icon="✍️" label="RTR & Signature" count={urgentCount} color="#0A66C2" />
        <StatCard icon="📄" label="Documents" count={docCount} color="#3B82F6" />
        <StatCard icon="🛡️" label="Compliance" count={complianceCount} color="#70B5F9" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, count, color }: { icon: string; label: string; count: number; color: string }) {
  return (
    <div
      className="flex items-center gap-2.5 p-2.5 rounded-[12px] transition-all"
      style={{ background: "transparent" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--material-thin-bg)";
        e.currentTarget.style.backdropFilter = "var(--material-thin-blur)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.backdropFilter = "none";
      }}
    >
      <span className="text-base shrink-0">{icon}</span>
      <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ background: color + "15", color, border: `0.5px solid ${color}33` }}
      >
        {count}
      </span>
    </div>
  );
}

// ─── Right Panel — Spatial UI ───────────────────────────────────────
function RightPanel({ notifications, unreadCount, onMarkAllRead }: { notifications: NotificationItem[]; unreadCount: number; onMarkAllRead: () => void }) {
  const recent = notifications.slice(0, 5);

  return (
    <div className="space-y-4 sticky top-6">
      {/* "You're all caught up" illustration — spatial */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-[20px] p-5 relative overflow-hidden text-center"
        style={{
          background: "var(--material-regular-bg)",
          backdropFilter: "var(--material-regular-blur)",
          WebkitBackdropFilter: "var(--material-regular-blur)",
          border: "0.5px solid var(--material-regular-border)",
          boxShadow: "var(--specular-top), var(--depth-2)",
        }}
      >
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block mb-2"
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(45,90,61,0.28)",
              color: "#fff",
            }}
          >
            <Send className="h-5 w-5" />
          </div>
        </motion.div>

        <h3 className="text-sm font-bold font-heading" style={{ color: "var(--text-primary)" }}>
          You're all caught up
        </h3>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          We'll notify you here when something new arrives.
        </p>

        {/* Dotted flight path — terra */}
        <svg className="absolute bottom-0 left-0 w-full h-8 opacity-20" viewBox="0 0 200 30">
          <path d="M0,15 Q50,5 100,15 T200,15" fill="none" stroke="var(--terra)" strokeWidth="1" strokeDasharray="3,3" />
        </svg>
      </motion.div>

      {/* Recent activity */}
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-wider px-1 mb-2" style={{ color: "var(--text-muted)" }}>
          Recent Activity
        </h4>
        {recent.length === 0 ? (
          <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>No recent activity.</p>
        ) : (
          <div className="space-y-1.5">
            {recent.map((n) => {
              const catMeta = CATEGORY_META[n.category] || CATEGORY_META.system;
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-2 p-2 rounded-[10px] transition-all"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--material-thin-bg)";
                    e.currentTarget.style.backdropFilter = "var(--material-thin-blur)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.backdropFilter = "none";
                  }}
                >
                  <span className="text-xs shrink-0 mt-0.5">{catMeta.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-secondary)" }}>
                      {n.title || n.message}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-wider px-1 mb-2" style={{ color: "var(--text-muted)" }}>
          Quick Actions
        </h4>
        <div className="space-y-1">
          <QuickAction icon={<CheckCheck className="h-3.5 w-3.5" />} label="Mark all read" onClick={onMarkAllRead} />
          <QuickAction icon={<Sparkles className="h-3.5 w-3.5" />} label="Notification settings" onClick={() => window.location.href = "/settings"} />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 p-2 rounded-[10px] text-xs font-medium transition-all"
      style={{ color: "var(--text-secondary)", background: "transparent" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--material-thin-bg)";
        e.currentTarget.style.backdropFilter = "var(--material-thin-blur)";
        e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.backdropFilter = "none";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      <span style={{ color: "var(--primary)" }}>{icon}</span>
      {label}
    </button>
  );
}

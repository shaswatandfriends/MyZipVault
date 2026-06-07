"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Megaphone,
  Plus,
  Trash2,
  Send,
  Eye,
  Mail,
  ToggleLeft,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ──────────────────────────────────────────────────────────
interface Announcement {
  id: number;
  message: string;
  targetRole: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────
function getTargetBadge(targetRole: string) {
  switch (targetRole) {
    case "all":
      return <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100">All</Badge>;
    case "candidate":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Candidates</Badge>;
    case "client_recruiter":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Recruiters</Badge>;
    default:
      return <Badge variant="outline">{targetRole}</Badge>;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Skeleton ───────────────────────────────────────────────────────
function AnnouncementSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="size-8 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form state
  const [formMessage, setFormMessage] = useState("");
  const [formTargetRole, setFormTargetRole] = useState("all");
  const [formIsActive, setFormIsActive] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Email section
  const [emailSegment, setEmailSegment] = useState("all_candidates");
  const [emailTemplate, setEmailTemplate] = useState("");

  const fetchAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/announcements");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch announcements");
      }
      const json = await res.json();
      setAnnouncements(json.announcements);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load announcements", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const resetForm = () => {
    setFormMessage("");
    setFormTargetRole("all");
    setFormIsActive(false);
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setFormMessage(a.message);
    setFormTargetRole(a.targetRole);
    setFormIsActive(a.isActive);
    setEditId(a.id);
    setCreateOpen(true);
  };

  const handleSave = async () => {
    if (!formMessage.trim()) {
      toast.error("Message is required");
      return;
    }
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        action: editId ? "update" : "create",
        message: formMessage,
        targetRole: formTargetRole,
        isActive: formIsActive,
      };
      if (editId) payload.id = editId;

      const res = await fetch("/api/superadmin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      toast.success(editId ? "Announcement updated" : "Announcement created");
      setCreateOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error("Save failed", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      const res = await fetch("/api/superadmin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id, isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to toggle");
      toast.success(isActive ? "Announcement enabled" : "Announcement disabled");
      fetchAnnouncements();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle";
      toast.error("Toggle failed", { description: message });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch("/api/superadmin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: deleteId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete");
      toast.success("Announcement deleted");
      setDeleteId(null);
      fetchAnnouncements();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast.error("Delete failed", { description: message });
    }
  };

  const activeCount = announcements.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements & Communication"
        description="Send in-app banners and targeted emails to user segments."
        actions={
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Create Announcement
          </Button>
        }
      />

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Announcements</CardTitle>
            <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <Megaphone className="size-4 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements.length}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ToggleLeft className="size-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{activeCount}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
              <Megaphone className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements.length - activeCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Announcements List ──────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <AnnouncementSkeleton />
              ) : announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Megaphone className="size-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No announcements</h3>
                  <p className="text-sm text-muted-foreground">Create your first announcement to get started.</p>
                </div>
              ) : (
                <div className="max-h-[28rem] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border space-y-0">
                  {announcements.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 py-3 border-b last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getTargetBadge(a.targetRole)}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(a.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={a.isActive}
                          onCheckedChange={(checked) => handleToggle(a.id, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => openEdit(a)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => setDeleteId(a.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Send Email Section ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                <Mail className="size-4 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-base">Send Email</CardTitle>
                <CardDescription>Targeted email campaigns</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Target Segment</Label>
              <Select value={emailSegment} onValueChange={setEmailSegment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_candidates">All Candidates</SelectItem>
                  <SelectItem value="expiring_credentials">Candidates with Expiring Credentials</SelectItem>
                  <SelectItem value="all_recruiters">All Recruiters</SelectItem>
                  <SelectItem value="inactive_users">Inactive Users (30d+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Email Template</Label>
              <Select value={emailTemplate} onValueChange={setEmailTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credential_expiry_reminder">Credential Expiry Reminder</SelectItem>
                  <SelectItem value="profile_completion">Profile Completion Nudge</SelectItem>
                  <SelectItem value="new_features">New Features Announcement</SelectItem>
                  <SelectItem value="monthly_digest">Monthly Digest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="rounded-lg border border-dashed p-4 text-center">
              <Mail className="size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Email Preview</p>
              <p className="text-xs text-muted-foreground mt-1">
                {emailSegment === "all_candidates"
                  ? "All candidates on the platform"
                  : emailSegment === "expiring_credentials"
                  ? "Candidates with credentials expiring in 30 days"
                  : emailSegment === "all_recruiters"
                  ? "All recruiters on the platform"
                  : "Users inactive for 30+ days"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Template: {emailTemplate || "None selected"}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                disabled={!emailTemplate}
                onClick={() => toast.info("Preview would open in a new window")}
              >
                <Eye className="size-4" />
                Preview
              </Button>
              <Button
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
                disabled={!emailTemplate}
                onClick={() => toast.success("Email campaign queued (placeholder)")}
              >
                <Send className="size-4" />
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Create / Edit Announcement Dialog ─────────────────────── */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setCreateOpen(open);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
            <DialogDescription>
              {editId ? "Modify the announcement details." : "Create a new in-app banner announcement."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-message">Message</Label>
              <Textarea
                id="announcement-message"
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Enter announcement message…"
                className="min-h-[6rem]"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Role</Label>
              <Select value={formTargetRole} onValueChange={setFormTargetRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="candidate">Candidates</SelectItem>
                  <SelectItem value="client_recruiter">Recruiters</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="announcement-active">Active</Label>
              <Switch
                id="announcement-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setCreateOpen(false); }}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleSave}
              disabled={saving || !formMessage.trim()}
            >
              <Plus className="size-4" />
              {saving ? "Saving…" : editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

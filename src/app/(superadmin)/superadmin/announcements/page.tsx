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
  Loader2,
  CheckCircle2,
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

// ─── Segment label map ─────────────────────────────────────────────
const segmentLabels: Record<string, string> = {
  all_candidates: "All Candidates",
  expiring_credentials: "Candidates with Expiring Credentials",
  all_recruiters: "All Recruiters",
  inactive_users: "Inactive Users (30d+)",
};

const templateLabels: Record<string, string> = {
  credential_expiry_reminder: "Credential Expiry Reminder",
  profile_completion: "Complete Your Profile",
  new_features: "New Features on MyZipVault",
  monthly_digest: "Monthly Digest",
};

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
  const [emailAnnouncementId, setEmailAnnouncementId] = useState<number | null>(null);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [campaignResult, setCampaignResult] = useState<{
    sentCount: number;
    failedCount: number;
    totalTargets: number;
    notificationsCreated: number;
  } | null>(null);

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

  const handleSendCampaign = async () => {
    if (!emailTemplate) {
      toast.error("Please select an email template");
      return;
    }
    try {
      setSendingCampaign(true);
      setCampaignResult(null);

      const res = await fetch("/api/superadmin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_campaign",
          announcementId: emailAnnouncementId,
          targetRoles: [emailSegment],
          sendEmail: true,
          emailTemplate,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send campaign");

      setCampaignResult({
        sentCount: json.sentCount,
        failedCount: json.failedCount,
        totalTargets: json.totalTargets,
        notificationsCreated: json.notificationsCreated,
      });

      if (json.failedCount > 0) {
        toast.warning("Campaign partially sent", {
          description: `${json.sentCount} emails sent, ${json.failedCount} failed. ${json.notificationsCreated} notifications created.`,
          duration: 6000,
        });
      } else {
        toast.success("Email campaign sent!", {
          description: `${json.sentCount} emails sent. ${json.notificationsCreated} in-app notifications created.`,
          duration: 5000,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send campaign";
      toast.error("Campaign failed", { description: message });
    } finally {
      setSendingCampaign(false);
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

            <div className="space-y-2">
              <Label className="text-xs font-medium">Attach Announcement (Optional)</Label>
              <Select
                value={emailAnnouncementId ? String(emailAnnouncementId) : "none"}
                onValueChange={(val) => setEmailAnnouncementId(val === "none" ? null : parseInt(val, 10))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Announcement</SelectItem>
                  {announcements.filter((a) => a.isActive).map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.message.slice(0, 50)}{a.message.length > 50 ? "…" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="rounded-lg border border-dashed p-4 text-center">
              <Mail className="size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Email Preview</p>
              <p className="text-xs text-muted-foreground mt-1">
                {segmentLabels[emailSegment] || emailSegment}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Template: {emailTemplate ? emailTemplate.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "None selected"}
              </p>
              {emailAnnouncementId && (
                <p className="text-xs text-teal-600 mt-1">
                  + Announcement attached
                </p>
              )}
            </div>

            {/* Campaign Result */}
            {campaignResult && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <CheckCircle2 className="size-4" />
                  Campaign Sent
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-emerald-600 font-semibold">{campaignResult.sentCount}</span>
                    <span className="text-emerald-700"> emails sent</span>
                  </div>
                  <div>
                    <span className="text-emerald-600 font-semibold">{campaignResult.notificationsCreated}</span>
                    <span className="text-emerald-700"> notifications</span>
                  </div>
                  {campaignResult.failedCount > 0 && (
                    <div>
                      <span className="text-red-600 font-semibold">{campaignResult.failedCount}</span>
                      <span className="text-red-700"> failed</span>
                    </div>
                  )}
                  <div>
                    <span className="text-emerald-600 font-semibold">{campaignResult.totalTargets}</span>
                    <span className="text-emerald-700"> total targets</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                disabled={!emailTemplate}
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="size-4" />
                Preview
              </Button>
              <Button
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
                disabled={!emailTemplate || sendingCampaign}
                onClick={handleSendCampaign}
              >
                {sendingCampaign ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {sendingCampaign ? "Sending…" : "Send"}
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

      {/* ── Email Preview Dialog ──────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview of the email that will be sent to the selected segment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Subject & Segment Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground font-medium">Subject:</span>
                <span className="font-semibold">
                  {emailTemplate
                    ? templateLabels[emailTemplate] || emailTemplate
                    : "No template selected"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground font-medium">Segment:</span>
                <Badge variant="outline">{segmentLabels[emailSegment] || emailSegment}</Badge>
              </div>
            </div>

            <Separator />

            {/* Email Body Card */}
            <Card className="border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                    <Mail className="size-4 text-teal-600" />
                  </div>
                  <CardTitle className="text-sm">MyZipVault</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <h3 className="text-base font-semibold">
                  {emailTemplate
                    ? templateLabels[emailTemplate] || emailTemplate
                    : "No template selected"}
                </h3>

                {emailTemplate === "credential_expiry_reminder" && (
                  <p className="text-sm text-muted-foreground">
                    This is a reminder that some of your credentials are expiring soon.
                    Please log in to review your credentials and take action before they expire.
                  </p>
                )}
                {emailTemplate === "profile_completion" && (
                  <p className="text-sm text-muted-foreground">
                    Your profile is almost complete! Finish setting up your account to unlock
                    all features and get the most out of MyZipVault.
                  </p>
                )}
                {emailTemplate === "new_features" && (
                  <p className="text-sm text-muted-foreground">
                    We\u2019ve added new features to MyZipVault! Check out the latest updates
                    and improvements to enhance your experience.
                  </p>
                )}
                {emailTemplate === "monthly_digest" && (
                  <p className="text-sm text-muted-foreground">
                    Here\u2019s your monthly digest of activity and highlights from MyZipVault.
                    Stay informed with the latest updates and insights.
                  </p>
                )}
                {!emailTemplate && (
                  <p className="text-sm text-muted-foreground italic">
                    Select a template to see the email body content.
                  </p>
                )}

                {emailAnnouncementId && (() => {
                  const announcement = announcements.find((a) => a.id === emailAnnouncementId);
                  if (!announcement) return null;
                  return (
                    <div className="mt-3 rounded-md border border-dashed bg-muted/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Attached Announcement</p>
                      <p className="text-sm">{announcement.message}</p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
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

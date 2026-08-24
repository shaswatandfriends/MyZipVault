"use client";

import { useCallback, useEffect, useState, useRef } from "react";
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
  ImagePlus,
  ExternalLink,
  Pin,
  Clock,
  Pencil,
  Copy,
  Upload,
  X,
  AlertTriangle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────
interface EmailCampaignListItem {
  id: number;
  name: string;
  subject: string;
  body: string;
  target_role: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  creator: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  _count: { recipients: number };
}

interface EmailCampaignRecipient {
  id: number;
  recipient_email: string;
  recipient_name: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  brevo_message_id: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  delivered_at: string | null;
}

interface EmailCampaignDetail extends EmailCampaignListItem {
  recipients: EmailCampaignRecipient[];
  target_filter: string | null;
  from_name: string | null;
  reply_to: string | null;
  logo_url: string | null;
  accent_color: string | null;
}

interface CampaignAnalytics {
  campaign: {
    id: number;
    name: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
  };
  summary: {
    total_recipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    complained: number;
    unsubscribed: number;
  };
  rates: {
    open_rate: number;
    click_rate: number;
    bounce_rate: number;
    delivery_rate: number;
    conversion_rate?: number;
  };
  funnel: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  };
  conversion?: {
    new_signups: number;
    opened_but_not_active: number;
    opened_and_clicked: number;
    conversion_rate: number;
  };
  recipients: Array<{
    id: number;
    email: string;
    name: string | null;
    status: string;
    sent_at: string | null;
    delivered_at: string | null;
    opened_at: string | null;
    clicked_at: string | null;
    error: string | null;
  }>;
}


interface Announcement {
  id: number;
  message: string;
  targetRole: string;
  isActive: boolean;
  createdAt: string;
}

interface Banner {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  targetRole: string;
  isActive: boolean;
  isPinned: boolean;
  expiresAt: string | null;
  carouselDuration: number;
  createdBy: number | null;
  creatorName: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────
const roleLabels: Record<string, string> = {
  all: "All Users",
  candidate: "Candidates",
  client_recruiter: "Recruiters",
  client_admin: "Agencies/Admins",
  all_candidates: "All Candidates",
  all_recruiters: "All Recruiters & Agencies",
  expiring_credentials: "Expiring Credentials",
  inactive_users: "Inactive Users",
};

const bannerRoleLabels: Record<string, string> = {
  candidate: "Candidates",
  client_recruiter: "Recruiters",
  client_admin: "Agencies/Admins",
};

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isBannerExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// ─── Banner Channel Tabs Config ─────────────────────────────────────
const bannerChannels = [
  { key: "candidate", label: "Candidates", value: "candidate" },
  { key: "client_recruiter", label: "Recruiters", value: "client_recruiter" },
  { key: "client_admin", label: "Agencies/Admins", value: "client_admin" },
] as const;

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function AnnouncementsPage() {
  const [activeTab, setActiveTab] = useState("banners");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements & Communication"
        description="Send in-app banners and targeted emails to user segments."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-surface-2 p-1 rounded-lg">
          <TabsTrigger
            value="banners"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-4"
          >
            <Megaphone className="size-4 mr-2" />
            In-App Banners
          </TabsTrigger>
          <TabsTrigger
            value="campaigns"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md px-4"
          >
            <Mail className="size-4 mr-2" />
            Email Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="banners" className="mt-6">
          <BannersTab />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <CampaignsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BANNERS TAB
// ═══════════════════════════════════════════════════════════════════
function BannersTab() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string>("candidate");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

  const fetchBanners = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/banners");
      if (res.ok) {
        const data = await res.json();
        setBanners(data.banners || []);
      }
    } catch {
      toast.error("Failed to load banners");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const filteredBanners = banners.filter((b) => b.targetRole === activeChannel);

  const activeCount = filteredBanners.filter((b) => b.isActive && !isBannerExpired(b.expiresAt)).length;
  const expiredCount = filteredBanners.filter((b) => isBannerExpired(b.expiresAt)).length;
  const inactiveCount = filteredBanners.filter((b) => !b.isActive && !isBannerExpired(b.expiresAt)).length;

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      const res = await fetch("/api/superadmin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id, isActive }),
      });
      if (res.ok) {
        setBanners((prev) =>
          prev.map((b) => (b.id === id ? { ...b, isActive } : b))
        );
        toast.success(isActive ? "Banner activated" : "Banner deactivated");
      }
    } catch {
      toast.error("Failed to toggle banner");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch("/api/superadmin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (res.ok) {
        setBanners((prev) => prev.filter((b) => b.id !== id));
        toast.success("Banner deleted");
      }
    } catch {
      toast.error("Failed to delete banner");
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Megaphone className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{filteredBanners.length}</p>
              <p className="text-xs text-text-secondary">Total Banners</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{activeCount}</p>
              <p className="text-xs text-text-secondary">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <ToggleLeft className="size-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{inactiveCount}</p>
              <p className="text-xs text-text-secondary">Inactive</p>
            </div>
          </CardContent>
        </Card>
        {expiredCount > 0 && (
          <Card className="border-amber-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-amber-700">{expiredCount}</p>
                <p className="text-xs text-amber-600">Expired</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Channel Tabs + Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg bg-surface-2 p-1">
          {bannerChannels.map((ch) => (
            <button
              key={ch.key}
              onClick={() => setActiveChannel(ch.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                activeChannel === ch.value
                  ? "bg-background shadow-sm text-primary"
                  : "text-text-secondary hover:text-foreground"
              )}
            >
              {ch.label}
            </button>
          ))}
        </div>
        <Button
          onClick={() => {
            setEditingBanner(null);
            setShowCreateDialog(true);
          }}
          className="gap-2 bg-primary hover:bg-primary-hover"
        >
          <Plus className="size-4" />
          Create Banner
        </Button>
      </div>

      {/* Banner List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredBanners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="size-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No banners for {bannerRoleLabels[activeChannel]}</p>
            <p className="text-xs text-text-secondary mt-1">Create your first banner to display in-app for this audience.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBanners.map((banner) => {
            const expired = isBannerExpired(banner.expiresAt);
            return (
            <Card key={banner.id} className={cn(
              !banner.isActive && !expired && "opacity-60",
              expired && "border-amber-300 bg-amber-50/50"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="size-16 rounded-lg bg-surface-2 border border-border overflow-hidden shrink-0">
                    {banner.imageUrl ? (
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className={cn("size-full object-cover", expired && "opacity-50")}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <ImagePlus className="size-5 text-text-muted" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{banner.title}</p>
                      {banner.isPinned && (
                        <Badge className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                          <Pin className="size-3 mr-0.5" /> Pinned
                        </Badge>
                      )}
                      {expired ? (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertTriangle className="size-3" />
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant={banner.isActive ? "default" : "secondary"} className="text-xs">
                          {banner.isActive ? "Active" : "Inactive"}
                        </Badge>
                      )}
                    </div>
                    {banner.description && (
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{banner.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {banner.carouselDuration}s per slide
                      </span>
                      {banner.expiresAt && (
                        <span className={cn("flex items-center gap-1", expired && "text-amber-600 font-medium")}>
                          {expired && <AlertTriangle className="size-3" />}
                          {expired ? "Expired" : "Expires"} {formatDate(banner.expiresAt)}
                        </span>
                      )}
                      {banner.ctaText && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="size-3" />
                          {banner.ctaText}
                        </span>
                      )}
                      <span>Created {formatDate(banner.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={banner.isActive}
                      onCheckedChange={(checked) => handleToggle(banner.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingBanner(banner);
                        setShowCreateDialog(true);
                      }}
                    >
                      <Pencil className="size-4 text-text-secondary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(banner)}
                    >
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}

      {/* Create/Edit Banner Dialog */}
      <BannerFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        editingBanner={editingBanner}
        defaultChannel={activeChannel}
        onSuccess={fetchBanners}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BANNER FORM DIALOG (Create / Edit)
// ═══════════════════════════════════════════════════════════════════
function BannerFormDialog({
  open,
  onOpenChange,
  editingBanner,
  defaultChannel,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBanner: Banner | null;
  defaultChannel: string;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [targetRole, setTargetRole] = useState(defaultChannel);
  const [isActive, setIsActive] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [carouselDuration, setCarouselDuration] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (editingBanner) {
      setTitle(editingBanner.title);
      setDescription(editingBanner.description || "");
      setImageUrl(editingBanner.imageUrl || "");
      setCtaText(editingBanner.ctaText || "");
      setCtaLink(editingBanner.ctaLink || "");
      setTargetRole(editingBanner.targetRole);
      setIsActive(editingBanner.isActive);
      setIsPinned(editingBanner.isPinned);
      setExpiresAt(editingBanner.expiresAt ? new Date(editingBanner.expiresAt).toISOString().slice(0, 16) : "");
      setCarouselDuration(editingBanner.carouselDuration);
    } else {
      setTitle("");
      setDescription("");
      setImageUrl("");
      setCtaText("");
      setCtaLink("");
      setTargetRole(defaultChannel);
      setIsActive(true);
      setIsPinned(false);
      setExpiresAt("");
      setCarouselDuration(5);
    }
  }, [editingBanner, defaultChannel, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch("/api/superadmin/banners/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: base64,
            filename: `banner-${Date.now()}.${file.name.split(".").pop()}`,
            contentType: file.type,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setImageUrl(data.url);
          toast.success("Image uploaded");
        } else {
          toast.error("Failed to upload image");
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to upload image");
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const action = editingBanner ? "update" : "create";
      const body: Record<string, unknown> = {
        action,
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        ctaText: ctaText || null,
        ctaLink: ctaLink || null,
        targetRole,
        isActive,
        isPinned,
        expiresAt: expiresAt || null,
        carouselDuration,
      };

      if (editingBanner) {
        body.id = editingBanner.id;
      }

      const res = await fetch("/api/superadmin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingBanner ? "Banner updated" : "Banner created");
        onOpenChange(false);
        onSuccess();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save banner");
      }
    } catch {
      toast.error("Failed to save banner");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Satoshi', sans-serif" }}>
            {editingBanner ? "Edit Banner" : "Create Banner"}
          </DialogTitle>
          <DialogDescription>
            {editingBanner
              ? "Update this in-app banner announcement."
              : "Create a new in-app banner that will be displayed on the dashboard for the selected audience."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target Role */}
          <div className="space-y-1.5">
            <Label>Target Audience *</Label>
            <Select value={targetRole} onValueChange={setTargetRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="candidate">Candidates</SelectItem>
                <SelectItem value="client_recruiter">Recruiters</SelectItem>
                <SelectItem value="client_admin">Agencies/Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New Feature Release"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the announcement..."
              rows={3}
            />
          </div>

          {/* Image Upload — with live preview at actual banner aspect ratio */}
          <div className="space-y-2">
            <Label>Banner Image</Label>

            {imageUrl ? (
              <div className="space-y-3">
                {/* Live preview at the ACTUAL banner aspect ratio (3.5:1) */}
                <div className="relative w-full overflow-hidden rounded-lg border border-border bg-gray-100" style={{ aspectRatio: "3.5 / 1" }}>
                  <img
                    src={imageUrl}
                    alt="Banner preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* Gradient overlay matching the dashboard display */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  {/* Title overlay preview */}
                  {title && (
                    <div className="absolute inset-0 flex items-center p-4">
                      <div className="max-w-xl">
                        <h3 className="text-lg font-semibold text-white drop-shadow-sm line-clamp-1">{title}</h3>
                        {description && (
                          <p className="text-sm text-white/80 line-clamp-1 mt-0.5">{description}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Remove button */}
                  <button
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2 size-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                    title="Remove image"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Upload className="size-3.5 mr-1.5" />}
                    Replace image
                  </Button>
                  <span className="text-xs text-text-muted">
                    Preview shows actual banner dimensions. Image is cropped to fill (object-cover).
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    // Simulate the input change event
                    const input = fileInputRef.current;
                    if (input) {
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      input.files = dt.files;
                      input.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                  }
                }}
                className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors py-8 px-4"
              >
                {isUploading ? (
                  <Loader2 className="size-6 text-text-muted animate-spin" />
                ) : (
                  <Upload className="size-6 text-text-muted" />
                )}
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {isUploading ? "Uploading..." : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Recommended: <strong>1200×340px</strong> (3.5:1 ratio) · Max 5MB · PNG, JPG, WebP
                  </p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CTA Button Text</Label>
              <Input
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="e.g. Learn More"
              />
            </div>
            <div className="space-y-1.5">
              <Label>CTA Link URL</Label>
              <Input
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Expires At */}
          <div className="space-y-1.5">
            <Label>Expiry Date (optional)</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-[11px] text-text-muted">Banner will auto-hide after this date. Leave empty for no expiry.</p>
          </div>

          {/* Carousel Duration */}
          <div className="space-y-1.5">
            <Label>Carousel Duration (seconds)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={carouselDuration}
              onChange={(e) => setCarouselDuration(parseInt(e.target.value) || 5)}
            />
            <p className="text-[11px] text-text-muted">How long this banner displays before auto-advancing. Default: 5 seconds.</p>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Active</Label>
              <p className="text-[11px] text-text-muted">Banner is visible to the target audience</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Pinned / Sticky</Label>
              <p className="text-[11px] text-text-muted">Always shows first in the carousel</p>
            </div>
            <Switch checked={isPinned} onCheckedChange={setIsPinned} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="bg-primary hover:bg-primary-hover"
          >
            {isSubmitting && <Loader2 className="size-4 mr-1 animate-spin" />}
            {editingBanner ? "Update Banner" : "Create Banner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL CAMPAIGNS TAB (preserved from original)
// ═══════════════════════════════════════════════════════════════════
function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<EmailCampaignListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<EmailCampaignDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [sendTarget, setSendTarget] = useState<EmailCampaignListItem | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmailCampaignListItem | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"recipients" | "analytics">("recipients");

  // Create form state
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formTargetRole, setFormTargetRole] = useState("all");
  const [formFromName, setFormFromName] = useState("MyZipVault");
  const [formReplyTo, setFormReplyTo] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [formAccentColor, setFormAccentColor] = useState("#0A66C2");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/email-campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      } else {
        toast.error("Failed to load email campaigns");
      }
    } catch {
      toast.error("Failed to load email campaigns");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!formName.trim() || !formSubject.trim() || !formBody.trim()) {
      toast.error("All fields are required");
      return;
    }
    setIsSubmitting(true);
    try {
      // If editing an existing draft, use PATCH; otherwise create new
      if (editCampaignId) {
        const res = await fetch(`/api/superadmin/email-campaigns/${editCampaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            subject: formSubject,
            body: formBody,
            target_role: formTargetRole,
            from_name: formFromName || undefined,
            reply_to: formReplyTo || undefined,
            logo_url: formLogoUrl || undefined,
            accent_color: formAccentColor || undefined,
          }),
        });
        if (res.ok) {
          toast.success("Campaign updated.");
          setShowCreateDialog(false);
          setEditCampaignId(null);
          setFormName("");
          setFormSubject("");
          setFormBody("");
          setFormTargetRole("all");
          setFormFromName("MyZipVault");
          setFormReplyTo("");
          setFormLogoUrl("");
          setFormAccentColor("#0A66C2");
          fetchCampaigns();
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || "Failed to update campaign");
        }
      } else {
        // Create new campaign
        const res = await fetch("/api/superadmin/email-campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            subject: formSubject,
            body: formBody,
            targetRole: formTargetRole,
            from_name: formFromName || undefined,
            reply_to: formReplyTo || undefined,
            logo_url: formLogoUrl || undefined,
            accent_color: formAccentColor || undefined,
          }),
        });
        if (res.ok) {
          toast.success("Campaign created as draft. Click 'Send' to deliver to recipients.");
          setShowCreateDialog(false);
          setFormName("");
          setFormSubject("");
          setFormBody("");
          setFormTargetRole("all");
          setFormFromName("MyZipVault");
          setFormReplyTo("");
          setFormLogoUrl("");
          setFormAccentColor("#0A66C2");
          fetchCampaigns();
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || "Failed to create campaign");
        }
      }
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = async (campaign: EmailCampaignListItem) => {
    setIsSending(true);
    setSendTarget(campaign);
    try {
      const res = await fetch(`/api/superadmin/email-campaigns/${campaign.id}/send`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(
          `Campaign sent \u2014 ${data.sentCount} delivered, ${data.failedCount} failed.`,
          { description: `Total recipients: ${data.totalRecipients}` }
        );
        fetchCampaigns();
      } else {
        toast.error(data.error || "Failed to send campaign");
      }
    } catch {
      toast.error("Failed to send campaign");
    } finally {
      setIsSending(false);
      setSendTarget(null);
    }
  };

  const handleSendTest = async (campaignId: number) => {
    try {
      const res = await fetch(`/api/superadmin/email-campaigns/${campaignId}/send-test`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Test email sent!", {
          description: "Check your inbox for the preview.",
        });
      } else {
        toast.error("Failed to send test", {
          description: data.error || "Unknown error",
        });
      }
    } catch {
      toast.error("Failed to send test email");
    }
  };

  // ─── Edit draft: loads campaign data into the create dialog form ──
  const [editCampaignId, setEditCampaignId] = useState<number | null>(null);

  const handleEditDraft = async (campaign: EmailCampaignListItem) => {
    try {
      const res = await fetch(`/api/superadmin/email-campaigns/${campaign.id}?recipientLimit=5`);
      if (res.ok) {
        const data = await res.json();
        const c = data.campaign;
        setFormName(c.name || "");
        setFormSubject(c.subject || "");
        setFormBody(c.body || "");
        setFormTargetRole(c.target_role || "all");
        setFormFromName(c.from_name || "MyZipVault");
        setFormReplyTo(c.reply_to || "");
        setFormLogoUrl(c.logo_url || "");
        setFormAccentColor(c.accent_color || "#0A66C2");
        setEditCampaignId(campaign.id);
        setShowCreateDialog(true);
      } else {
        toast.error("Failed to load campaign for editing");
      }
    } catch {
      toast.error("Failed to load campaign for editing");
    }
  };

  // ─── Duplicate: creates a new draft with same content ──
  const handleDuplicate = async (campaign: EmailCampaignListItem) => {
    try {
      const res = await fetch(`/api/superadmin/email-campaigns/${campaign.id}?recipientLimit=5`);
      if (!res.ok) throw new Error("Failed to load campaign");
      const data = await res.json();
      const c = data.campaign;

      // Create a new draft with the same content
      const createRes = await fetch("/api/superadmin/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${c.name} (copy)`,
          subject: c.subject,
          body: c.body,
          targetRole: c.target_role,
          from_name: c.from_name,
          reply_to: c.reply_to,
          logo_url: c.logo_url,
          accent_color: c.accent_color,
        }),
      });

      if (createRes.ok) {
        toast.success("Campaign duplicated", {
          description: `"${c.name} (copy)" created as a new draft.`,
        });
        fetchCampaigns();
      } else {
        toast.error("Failed to duplicate campaign");
      }
    } catch {
      toast.error("Failed to duplicate campaign");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/superadmin/email-campaigns/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Campaign deleted");
        fetchCampaigns();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete campaign");
      }
    } catch {
      toast.error("Failed to delete campaign");
    }
    setDeleteTarget(null);
  };

  const openDetail = async (campaign: EmailCampaignListItem) => {
    setDetailCampaign(null);
    setIsDetailLoading(true);
    setAnalytics(null);
    setDetailTab("recipients");
    try {
      const res = await fetch(`/api/superadmin/email-campaigns/${campaign.id}?recipientLimit=100`);
      if (res.ok) {
        const data = await res.json();
        setDetailCampaign(data.campaign);
        // Auto-fetch analytics if campaign has been sent
        if (data.campaign?.status && data.campaign.status !== "draft") {
          fetchAnalytics(campaign.id);
        }
      } else {
        toast.error("Failed to load campaign details");
      }
    } catch {
      toast.error("Failed to load campaign details");
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Fetch analytics with real-time polling support
  const fetchAnalytics = async (campaignId: number) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/superadmin/email-campaigns/${campaignId}/analytics`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {
      // Silent fail — analytics is supplementary
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Real-time polling: refresh analytics every 5s when analytics tab is active
  useEffect(() => {
    if (!detailCampaign || detailTab !== "analytics" || detailCampaign.status === "draft") return;
    const interval = setInterval(() => {
      fetchAnalytics(detailCampaign.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [detailCampaign, detailTab]);

  // ─── Stats ─────────────────────────────────────────────────────────
  const totalCampaigns = campaigns.length;
  const totalEmailsSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
  const totalEmailsFailed = campaigns.reduce((sum, c) => sum + c.failed_count, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{totalCampaigns}</p>
              <p className="text-xs text-text-secondary">Total Campaigns</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{totalEmailsSent}</p>
              <p className="text-xs text-text-secondary">Emails Delivered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{totalEmailsFailed}</p>
              <p className="text-xs text-text-secondary">Failed Deliveries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => {
            setEditCampaignId(null);
            setFormName("");
            setFormSubject("");
            setFormBody("");
            setFormTargetRole("all");
            setFormFromName("MyZipVault");
            setFormReplyTo("");
            setFormLogoUrl("");
            setFormAccentColor("#0A66C2");
            setShowCreateDialog(true);
          }}
          className="gap-2 bg-primary hover:bg-primary-hover"
        >
          <Plus className="size-4" />
          Create Email Campaign
        </Button>
      </div>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="size-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No email campaigns yet</p>
            <p className="text-xs text-text-secondary mt-1">
              Create your first campaign to send batch emails to specific user segments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const statusColor =
              c.status === "sent"
                ? "text-green-600 bg-green-50 border-green-200"
                : c.status === "draft"
                ? "text-amber-600 bg-amber-50 border-amber-200"
                : c.status === "sending"
                ? "text-blue-600 bg-blue-50 border-blue-200"
                : c.status === "partial_failure"
                ? "text-orange-600 bg-orange-50 border-orange-200"
                : c.status === "failed"
                ? "text-red-600 bg-red-50 border-red-200"
                : "text-gray-600 bg-gray-50 border-gray-200";

            return (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-foreground truncate">
                          {c.name}
                        </h3>
                        <Badge variant="outline" className={cn("text-xs", statusColor)}>
                          {c.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary truncate">
                        <span className="font-medium">Subject:</span> {c.subject}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted flex-wrap">
                        <span>
                          Target: <span className="font-medium text-text-secondary">{roleLabels[c.target_role] || c.target_role}</span>
                        </span>
                        <span>\u2022</span>
                        <span>
                          Created: <span className="font-medium text-text-secondary">{formatDate(c.created_at)}</span>
                        </span>
                        {c.creator && (
                          <>
                            <span>\u2022</span>
                            <span>
                              By:{" "}
                              <span className="font-medium text-text-secondary">
                                {[c.creator.first_name, c.creator.last_name].filter(Boolean).join(" ") || c.creator.email}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetail(c)}
                        className="gap-1.5"
                      >
                        <Eye className="size-3.5" />
                        View
                      </Button>
                      {c.status === "draft" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDraft(c)}
                            className="gap-1.5"
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendTest(c.id)}
                            disabled={isSending && sendTarget?.id === c.id}
                            className="gap-1.5"
                          >
                            <Mail className="size-3.5" />
                            Test
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSend(c)}
                            disabled={isSending && sendTarget?.id === c.id}
                            className="gap-1.5 bg-primary hover:bg-primary-hover"
                          >
                            {isSending && sendTarget?.id === c.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Send className="size-3.5" />
                            )}
                            Send
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(c)}
                            className="text-text-muted hover:text-text-secondary"
                            title="Duplicate as new draft"
                          >
                            <Copy className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(c)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
                    <div className="text-center">
                      <p className="text-xs text-text-muted mb-0.5">Recipients</p>
                      <p className="text-lg font-semibold text-foreground">{c.total_recipients}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-text-muted mb-0.5">Delivered</p>
                      <p className="text-lg font-semibold text-green-600">{c.sent_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-text-muted mb-0.5">Failed</p>
                      <p className="text-lg font-semibold text-red-600">{c.failed_count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Create Campaign Dialog ─────────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Satoshi', sans-serif" }}>
              {editCampaignId ? "Edit Campaign" : "Create Email Campaign"}
            </DialogTitle>
            <DialogDescription>
              {editCampaignId
                ? "Update your draft campaign. Changes are saved when you click 'Save Changes'."
                : "Draft a batch email to send to a specific user segment. After creating, you can review and send it."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Campaign Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. New Feature Announcement - June 2026"
              />
              <p className="text-[11px] text-text-muted">Internal name \u2014 not shown to recipients.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Target Audience *</Label>
              <Select value={formTargetRole} onValueChange={setFormTargetRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Active Users</SelectItem>
                  <SelectItem value="candidate">Candidates Only</SelectItem>
                  <SelectItem value="client_recruiter">Recruiters Only</SelectItem>
                  <SelectItem value="client_admin">Agency Admins Only</SelectItem>
                  <SelectItem value="platform_admin">Platform Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Subject Line *</Label>
              <Input
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="e.g. New: VaultSign documents are here"
              />
              <p className="text-[11px] text-text-muted">
                Variables: <code className="text-[10px] bg-muted px-1 rounded">{`{{first_name}}`}</code>,{" "}
                <code className="text-[10px] bg-muted px-1 rounded">{`{{last_name}}`}</code>,{" "}
                <code className="text-[10px] bg-muted px-1 rounded">{`{{name}}`}</code>,{" "}
                <code className="text-[10px] bg-muted px-1 rounded">{`{{email}}`}</code>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Email Body (HTML) *</Label>
              <Textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder={`<h2>Hello {{first_name}},</h2>
<p>We've launched a new feature...</p>
<p><a href="https://myzipvault.com">Log in to try it</a></p>`}
                rows={10}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-text-muted">
                Plain HTML supported. Same variables as subject line. Sent via Brevo from noreply@myzipvault.com.
              </p>
            </div>

            {/* Branding fields */}
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Email Branding (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">From Name</Label>
                  <Input
                    value={formFromName}
                    onChange={(e) => setFormFromName(e.target.value)}
                    placeholder="MyZipVault"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reply-To Email</Label>
                  <Input
                    type="email"
                    value={formReplyTo}
                    onChange={(e) => setFormReplyTo(e.target.value)}
                    placeholder="support@myzipvault.com"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Logo URL</Label>
                  <Input
                    value={formLogoUrl}
                    onChange={(e) => setFormLogoUrl(e.target.value)}
                    placeholder="https://myzipvault.com/logo.png"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formAccentColor}
                      onChange={(e) => setFormAccentColor(e.target.value)}
                      className="size-8 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={formAccentColor}
                      onChange={(e) => setFormAccentColor(e.target.value)}
                      className="text-sm flex-1"
                      placeholder="#0A66C2"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !formName.trim() || !formSubject.trim() || !formBody.trim()}
              className="bg-primary hover:bg-primary-hover"
            >
              {isSubmitting && <Loader2 className="size-4 mr-1 animate-spin" />}
              {editCampaignId ? "Save Changes" : "Save as Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Campaign Detail Dialog ─────────────────────────────────── */}
      <Dialog open={!!detailCampaign || isDetailLoading} onOpenChange={(open) => !open && setDetailCampaign(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Satoshi', sans-serif" }}>
              Campaign Details
            </DialogTitle>
            <DialogDescription>
              View recipient delivery status and campaign metadata.
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-text-muted" />
            </div>
          ) : detailCampaign ? (
            <div className="space-y-4">
              {/* Campaign info */}
              <div className="space-y-2 pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{detailCampaign.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {detailCampaign.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">
                  <span className="font-medium">Subject:</span> {detailCampaign.subject}
                </p>
                <div className="grid grid-cols-4 gap-3 mt-3">
                  <div className="text-center bg-muted/50 rounded-md p-2">
                    <p className="text-[10px] text-text-muted">Recipients</p>
                    <p className="text-base font-semibold text-foreground">{detailCampaign.total_recipients}</p>
                  </div>
                  <div className="text-center bg-green-50 rounded-md p-2">
                    <p className="text-[10px] text-green-700">Delivered</p>
                    <p className="text-base font-semibold text-green-700">{detailCampaign.sent_count}</p>
                  </div>
                  <div className="text-center bg-red-50 rounded-md p-2">
                    <p className="text-[10px] text-red-700">Failed</p>
                    <p className="text-base font-semibold text-red-700">{detailCampaign.failed_count}</p>
                  </div>
                  <div className="text-center bg-muted/50 rounded-md p-2">
                    <p className="text-[10px] text-text-muted">Target</p>
                    <p className="text-xs font-semibold text-foreground mt-1">
                      {roleLabels[detailCampaign.target_role] || detailCampaign.target_role}
                    </p>
                  </div>
                </div>
              </div>

              {/* ─── Tab selector ─── */}
              {detailCampaign.status !== "draft" && (
                <div className="flex gap-2 border-b border-border pb-2">
                  <button
                    onClick={() => setDetailTab("recipients")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                      detailTab === "recipients" ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    Recipients
                  </button>
                  <button
                    onClick={() => { setDetailTab("analytics"); if (!analytics) fetchAnalytics(detailCampaign.id); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                      detailTab === "analytics" ? "text-primary border-b-2 border-primary" : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    Analytics {analytics && `(${analytics.summary.opened} opened, ${analytics.summary.clicked} clicked)`}
                  </button>
                </div>
              )}

              {/* ─── Analytics tab ─── */}
              {detailTab === "analytics" && detailCampaign.status !== "draft" && (
                <div className="space-y-4">
                  {analyticsLoading && !analytics ? (
                    <div className="py-8 flex items-center justify-center">
                      <Loader2 className="size-5 animate-spin text-text-muted" />
                    </div>
                  ) : analytics ? (
                    <>
                      {/* Rate cards */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center bg-blue-50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-blue-700">{analytics.rates.open_rate}%</p>
                          <p className="text-[10px] text-blue-600 mt-0.5">Open Rate</p>
                        </div>
                        <div className="text-center bg-emerald-50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-emerald-700">{analytics.rates.click_rate}%</p>
                          <p className="text-[10px] text-emerald-600 mt-0.5">Click Rate</p>
                        </div>
                        <div className="text-center bg-amber-50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-amber-700">{analytics.rates.delivery_rate}%</p>
                          <p className="text-[10px] text-amber-600 mt-0.5">Delivery Rate</p>
                        </div>
                        <div className="text-center bg-red-50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-red-700">{analytics.rates.bounce_rate}%</p>
                          <p className="text-[10px] text-red-600 mt-0.5">Bounce Rate</p>
                        </div>
                      </div>

                      {/* Funnel */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Funnel</h4>
                        {[
                          { label: "Sent", value: analytics.funnel.sent, color: "bg-blue-500", max: analytics.funnel.sent || 1 },
                          { label: "Delivered", value: analytics.funnel.delivered, color: "bg-emerald-500", max: analytics.funnel.sent || 1 },
                          { label: "Opened", value: analytics.funnel.opened, color: "bg-violet-500", max: analytics.funnel.sent || 1 },
                          { label: "Clicked", value: analytics.funnel.clicked, color: "bg-amber-500", max: analytics.funnel.sent || 1 },
                        ].map((step) => (
                          <div key={step.label} className="flex items-center gap-3">
                            <span className="text-xs font-medium text-text-secondary w-20">{step.label}</span>
                            <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${step.color} rounded-full transition-all duration-500`}
                                style={{ width: `${Math.max((step.value / step.max) * 100, 2)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-foreground w-12 text-right">{step.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Summary stats */}
                      <div className="grid grid-cols-5 gap-2 text-center">
                        <div className="bg-muted/30 rounded-md p-2">
                          <p className="text-[9px] text-text-muted">Bounced</p>
                          <p className="text-sm font-semibold text-red-700">{analytics.summary.bounced}</p>
                        </div>
                        <div className="bg-muted/30 rounded-md p-2">
                          <p className="text-[9px] text-text-muted">Failed</p>
                          <p className="text-sm font-semibold text-red-700">{analytics.summary.failed}</p>
                        </div>
                        <div className="bg-muted/30 rounded-md p-2">
                          <p className="text-[9px] text-text-muted">Complained</p>
                          <p className="text-sm font-semibold text-amber-700">{analytics.summary.complained}</p>
                        </div>
                        <div className="bg-muted/30 rounded-md p-2">
                          <p className="text-[9px] text-text-muted">Unsubscribed</p>
                          <p className="text-sm font-semibold text-text-muted">{analytics.summary.unsubscribed}</p>
                        </div>
                        <div className="bg-muted/30 rounded-md p-2">
                          <p className="text-[9px] text-text-muted">Total</p>
                          <p className="text-sm font-semibold text-foreground">{analytics.summary.total_recipients}</p>
                        </div>
                      </div>

                      {/* Conversion funnel — "Who joined" */}
                      {analytics.conversion && (
                        <div className="space-y-3 pt-2 border-t border-border">
                          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Conversion Funnel</h4>

                          {/* Conversion rate card */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center bg-violet-50 rounded-lg p-3">
                              <p className="text-2xl font-bold text-violet-700">{analytics.conversion.new_signups}</p>
                              <p className="text-[10px] text-violet-600 mt-0.5">New Signups</p>
                            </div>
                            <div className="text-center bg-blue-50 rounded-lg p-3">
                              <p className="text-2xl font-bold text-blue-700">{analytics.conversion.opened_but_not_active}</p>
                              <p className="text-[10px] text-blue-600 mt-0.5">Opened, Not Joined</p>
                            </div>
                            <div className="text-center bg-emerald-50 rounded-lg p-3">
                              <p className="text-2xl font-bold text-emerald-700">{analytics.rates.conversion_rate ?? 0}%</p>
                              <p className="text-[10px] text-emerald-600 mt-0.5">Conversion Rate</p>
                            </div>
                          </div>

                          {/* Conversion funnel bars */}
                          <div className="space-y-2">
                            {[
                              { label: "Sent", value: analytics.funnel.sent, color: "bg-blue-500", max: analytics.funnel.sent || 1 },
                              { label: "Opened", value: analytics.funnel.opened, color: "bg-violet-500", max: analytics.funnel.sent || 1 },
                              { label: "Clicked", value: analytics.funnel.clicked, color: "bg-amber-500", max: analytics.funnel.sent || 1 },
                              { label: "Joined", value: analytics.conversion.new_signups, color: "bg-emerald-500", max: analytics.funnel.sent || 1 },
                            ].map((step) => (
                              <div key={step.label} className="flex items-center gap-3">
                                <span className="text-xs font-medium text-text-secondary w-20">{step.label}</span>
                                <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${step.color} rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.max((step.value / step.max) * 100, 2)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-foreground w-12 text-right">{step.value}</span>
                              </div>
                            ))}
                          </div>

                          <p className="text-[10px] text-text-muted">
                            "New Signups" = users with the same email as a campaign recipient who signed up after the campaign started.
                            "Opened, Not Joined" = recipients who opened the email but don&apos;t have a platform account.
                          </p>
                        </div>
                      )}

                      {/* Recipient event timeline */}
                      <div>
                        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                          Recipient Activity
                        </h4>
                        <div className="max-h-60 overflow-y-auto border border-border rounded-md">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="text-left p-2 font-medium text-text-secondary">Recipient</th>
                                <th className="text-left p-2 font-medium text-text-secondary">Status</th>
                                <th className="text-left p-2 font-medium text-text-secondary">Sent</th>
                                <th className="text-left p-2 font-medium text-text-secondary">Opened</th>
                                <th className="text-left p-2 font-medium text-text-secondary">Clicked</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.recipients.map((r) => (
                                <tr key={r.id} className="border-t border-border">
                                  <td className="p-2 text-text-foreground">{r.name || r.email}</td>
                                  <td className="p-2">
                                    <Badge variant="outline" className={cn(
                                      "text-[10px]",
                                      r.status === "sent" && "text-green-700 bg-green-50 border-green-200",
                                      r.status === "bounced" && "text-red-700 bg-red-50 border-red-200",
                                      r.status === "failed" && "text-red-700 bg-red-50 border-red-200",
                                      r.status === "complained" && "text-amber-700 bg-amber-50 border-amber-200",
                                      r.status === "unsubscribed" && "text-text-muted bg-muted/30",
                                    )}>
                                      {r.status}
                                    </Badge>
                                  </td>
                                  <td className="p-2 text-text-muted">{r.sent_at ? new Date(r.sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</td>
                                  <td className="p-2 text-text-muted">{r.opened_at ? new Date(r.opened_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</td>
                                  <td className="p-2 text-text-muted">{r.clicked_at ? new Date(r.clicked_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <p className="text-[10px] text-text-muted text-center">
                        Auto-refreshing every 5s. <CheckCircle2 className="size-3 inline" style={{ color: "#10b981" }} /> Live
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-text-muted py-4 text-center">
                      Analytics will appear after the campaign is sent.
                    </p>
                  )}
                </div>
              )}

              {/* ─── Recipients tab (existing) ─── */}
              {detailTab === "recipients" && (
                <>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Recipient Delivery Status
                </h4>
                {detailCampaign.recipients.length === 0 ? (
                  <p className="text-xs text-text-muted py-4 text-center">
                    No recipients yet. Send the campaign to populate this list.
                  </p>
                ) : (
                  <div className="max-h-80 overflow-y-auto border border-border rounded-md">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium text-text-secondary">Recipient</th>
                          <th className="text-left p-2 font-medium text-text-secondary">Email</th>
                          <th className="text-left p-2 font-medium text-text-secondary">Status</th>
                          <th className="text-left p-2 font-medium text-text-secondary">Sent At</th>
                          <th className="text-left p-2 font-medium text-text-secondary">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailCampaign.recipients.map((r) => {
                          const statusBadge = (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                r.status === "sent" && "text-green-700 bg-green-50 border-green-200",
                                r.status === "failed" && "text-red-700 bg-red-50 border-red-200",
                                r.status === "pending" && "text-amber-700 bg-amber-50 border-amber-200"
                              )}
                            >
                              {r.status}
                            </Badge>
                          );

                          return (
                            <tr key={r.id} className="border-t border-border">
                              <td className="p-2 text-text-foreground">
                                {r.recipient_name || r.recipient_email}
                              </td>
                              <td className="p-2 text-text-secondary">{r.recipient_email}</td>
                              <td className="p-2">{statusBadge}</td>
                              <td className="p-2 text-text-muted">
                                {r.sent_at ? formatDate(r.sent_at) : "\u2014"}
                              </td>
                              <td className="p-2 text-red-600 text-[10px] max-w-xs truncate" title={r.error_message || ""}>
                                {r.error_message || "\u2014"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {detailCampaign._count.recipients > detailCampaign.recipients.length && (
                  <p className="text-[11px] text-text-muted mt-2">
                    Showing first {detailCampaign.recipients.length} of {detailCampaign._count.recipients} recipients.
                  </p>
                )}
                </>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailCampaign(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
              Only draft campaigns can be deleted; sent campaigns are kept for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
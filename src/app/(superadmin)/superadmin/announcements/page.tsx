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
        <TabsList className="bg-[#F3F4F6] p-1 rounded-lg">
          <TabsTrigger
            value="banners"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4"
          >
            <Megaphone className="size-4 mr-2" />
            In-App Banners
          </TabsTrigger>
          <TabsTrigger
            value="campaigns"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4"
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
            <div className="size-10 rounded-lg bg-[#166534]/10 flex items-center justify-center">
              <Megaphone className="size-5 text-[#166534]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#111827]">{filteredBanners.length}</p>
              <p className="text-xs text-[#6B7280]">Total Banners</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#111827]">{activeCount}</p>
              <p className="text-xs text-[#6B7280]">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <ToggleLeft className="size-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#111827]">{inactiveCount}</p>
              <p className="text-xs text-[#6B7280]">Inactive</p>
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
        <div className="flex items-center gap-1 rounded-lg bg-[#F3F4F6] p-1">
          {bannerChannels.map((ch) => (
            <button
              key={ch.key}
              onClick={() => setActiveChannel(ch.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                activeChannel === ch.value
                  ? "bg-white shadow-sm text-[#166534]"
                  : "text-[#6B7280] hover:text-[#111827]"
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
          className="gap-2 bg-[#166534] hover:bg-[#14532D]"
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
            <Megaphone className="size-10 text-[#9CA3AF] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#111827]">No banners for {bannerRoleLabels[activeChannel]}</p>
            <p className="text-xs text-[#6B7280] mt-1">Create your first banner to display in-app for this audience.</p>
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
                  <div className="size-16 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] overflow-hidden shrink-0">
                    {banner.imageUrl ? (
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className={cn("size-full object-cover", expired && "opacity-50")}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <ImagePlus className="size-5 text-[#9CA3AF]" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#111827] truncate">{banner.title}</p>
                      {banner.isPinned && (
                        <Badge className="bg-[#166534]/10 text-[#166534] text-[10px] px-1.5 py-0">
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
                      <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-1">{banner.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#9CA3AF]">
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
                      <Pencil className="size-4 text-[#6B7280]" />
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
          <DialogTitle style={{ fontFamily: "'Clash Display', sans-serif" }}>
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

          {/* Image Upload */}
          <div className="space-y-1.5">
            <Label>Banner Image</Label>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="relative size-20 rounded-lg overflow-hidden border border-[#E5E7EB]">
                  <img src={imageUrl} alt="Preview" className="size-full object-cover" />
                  <button
                    onClick={() => setImageUrl("")}
                    className="absolute -top-1 -right-1 size-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex size-20 items-center justify-center rounded-lg border-2 border-dashed border-[#E5E7EB] hover:border-[#166534] transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="size-5 text-[#9CA3AF] animate-spin" />
                  ) : (
                    <Upload className="size-5 text-[#9CA3AF]" />
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="text-xs text-[#6B7280]">
                <p>Recommended: 800x400px</p>
                <p>Max 5MB. PNG, JPG, WebP</p>
              </div>
            </div>
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
            <p className="text-[11px] text-[#9CA3AF]">Banner will auto-hide after this date. Leave empty for no expiry.</p>
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
            <p className="text-[11px] text-[#9CA3AF]">How long this banner displays before auto-advancing. Default: 5 seconds.</p>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Active</Label>
              <p className="text-[11px] text-[#9CA3AF]">Banner is visible to the target audience</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Pinned / Sticky</Label>
              <p className="text-[11px] text-[#9CA3AF]">Always shows first in the carousel</p>
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
            className="bg-[#166534] hover:bg-[#14532D]"
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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  // Campaign form state
  const [campaignTargetRoles, setCampaignTargetRoles] = useState<string[]>(["all_candidates"]);
  const [campaignSendEmail, setCampaignSendEmail] = useState(true);
  const [campaignEmailTemplate, setCampaignEmailTemplate] = useState("new_features");
  const [campaignAnnouncementId, setCampaignAnnouncementId] = useState<number | null>(null);
  const [campaignResult, setCampaignResult] = useState<{
    sentCount: number;
    failedCount: number;
    totalTargets: number;
    notificationsCreated: number;
  } | null>(null);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);

  // Create/Edit form state
  const [formMessage, setFormMessage] = useState("");
  const [formTargetRole, setFormTargetRole] = useState("all");
  const [formIsActive, setFormIsActive] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreateOrUpdateAnnouncement = async () => {
    if (!formMessage.trim()) {
      toast.error("Message is required");
      return;
    }

    setIsSubmittingForm(true);
    try {
      const action = editingAnnouncement ? "update" : "create";
      const body: Record<string, unknown> = {
        action,
        message: formMessage,
        targetRole: formTargetRole,
        isActive: formIsActive,
      };
      if (editingAnnouncement) body.id = editingAnnouncement.id;

      const res = await fetch("/api/superadmin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingAnnouncement ? "Announcement updated" : "Announcement created");
        setShowCreateDialog(false);
        fetchAnnouncements();
      } else {
        toast.error("Failed to save announcement");
      }
    } catch {
      toast.error("Failed to save announcement");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      const res = await fetch("/api/superadmin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id, isActive }),
      });
      if (res.ok) {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isActive } : a))
        );
        toast.success(isActive ? "Announcement activated" : "Announcement deactivated");
      }
    } catch {
      toast.error("Failed to toggle announcement");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch("/api/superadmin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        toast.success("Announcement deleted");
      }
    } catch {
      toast.error("Failed to delete announcement");
    }
    setDeleteTarget(null);
  };

  const handleSendCampaign = async () => {
    setIsSendingCampaign(true);
    setCampaignResult(null);
    try {
      const res = await fetch("/api/superadmin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_campaign",
          targetRoles: campaignTargetRoles,
          sendEmail: campaignSendEmail,
          emailTemplate: campaignEmailTemplate,
          announcementId: campaignAnnouncementId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCampaignResult({
          sentCount: data.sentCount,
          failedCount: data.failedCount,
          totalTargets: data.totalTargets,
          notificationsCreated: data.notificationsCreated,
        });
        toast.success(`Campaign sent to ${data.totalTargets} users`);
      } else {
        toast.error("Failed to send campaign");
      }
    } catch {
      toast.error("Failed to send campaign");
    } finally {
      setIsSendingCampaign(false);
    }
  };

  const activeCount = announcements.filter((a) => a.isActive).length;
  const inactiveCount = announcements.filter((a) => !a.isActive).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-[#166534]/10 flex items-center justify-center">
              <Mail className="size-5 text-[#166534]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#111827]">{announcements.length}</p>
              <p className="text-xs text-[#6B7280]">Total Announcements</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#111827]">{activeCount}</p>
              <p className="text-xs text-[#6B7280]">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <ToggleLeft className="size-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#111827]">{inactiveCount}</p>
              <p className="text-xs text-[#6B7280]">Inactive</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => {
            setEditingAnnouncement(null);
            setFormMessage("");
            setFormTargetRole("all");
            setFormIsActive(false);
            setShowCreateDialog(true);
          }}
          className="gap-2 bg-[#166534] hover:bg-[#14532D]"
        >
          <Plus className="size-4" />
          Create Announcement
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setCampaignResult(null);
            setShowCampaignDialog(true);
          }}
          className="gap-2"
        >
          <Send className="size-4" />
          Send Email Campaign
        </Button>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="size-10 text-[#9CA3AF] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#111827]">No announcements yet</p>
            <p className="text-xs text-[#6B7280] mt-1">Create an announcement to send targeted emails and notifications.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <Card key={ann.id} className={cn(!ann.isActive && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#111827]">{ann.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-xs">
                        {roleLabels[ann.targetRole] || ann.targetRole}
                      </Badge>
                      <span className="text-[11px] text-[#9CA3AF]">{formatDate(ann.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={ann.isActive}
                      onCheckedChange={(checked) => handleToggle(ann.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingAnnouncement(ann);
                        setFormMessage(ann.message);
                        setFormTargetRole(ann.targetRole);
                        setFormIsActive(ann.isActive);
                        setShowCreateDialog(true);
                      }}
                    >
                      <Pencil className="size-4 text-[#6B7280]" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(ann)}>
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Announcement Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Clash Display', sans-serif" }}>
              {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
            </DialogTitle>
            <DialogDescription>
              {editingAnnouncement
                ? "Update this announcement message."
                : "Create a new announcement that can be sent as email campaigns and notifications."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Message *</Label>
              <Textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Enter announcement message..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target Role</Label>
              <Select value={formTargetRole} onValueChange={setFormTargetRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="candidate">Candidates</SelectItem>
                  <SelectItem value="client_recruiter">Recruiters & Agencies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrUpdateAnnouncement}
              disabled={isSubmittingForm || !formMessage.trim()}
              className="bg-[#166534] hover:bg-[#14532D]"
            >
              {isSubmittingForm && <Loader2 className="size-4 mr-1 animate-spin" />}
              {editingAnnouncement ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Campaign Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Send Email Campaign
            </DialogTitle>
            <DialogDescription>
              Target specific user segments with email announcements and in-app notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Target Segment *</Label>
              <Select
                value={campaignTargetRoles[0]}
                onValueChange={(val) => setCampaignTargetRoles([val])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="all_candidates">All Candidates</SelectItem>
                  <SelectItem value="all_recruiters">All Recruiters & Agencies</SelectItem>
                  <SelectItem value="expiring_credentials">Expiring Credentials (30 days)</SelectItem>
                  <SelectItem value="inactive_users">Inactive Users (30 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Attach Announcement (optional)</Label>
              <Select
                value={campaignAnnouncementId?.toString() || "none"}
                onValueChange={(val) =>
                  setCampaignAnnouncementId(val === "none" ? null : parseInt(val))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {announcements.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.message.slice(0, 50)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Send Email</Label>
                <p className="text-[11px] text-[#9CA3AF]">Also send via email (Brevo)</p>
              </div>
              <Switch checked={campaignSendEmail} onCheckedChange={setCampaignSendEmail} />
            </div>

            {campaignSendEmail && (
              <div className="space-y-1.5">
                <Label>Email Template</Label>
                <Select value={campaignEmailTemplate} onValueChange={setCampaignEmailTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credential_expiry_reminder">Credential Expiry Reminder</SelectItem>
                    <SelectItem value="profile_completion">Profile Completion</SelectItem>
                    <SelectItem value="new_features">New Features</SelectItem>
                    <SelectItem value="monthly_digest">Monthly Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {campaignResult && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-green-800 mb-2">Campaign Results</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-green-600">Total Targets</p>
                      <p className="font-semibold text-green-800">{campaignResult.totalTargets}</p>
                    </div>
                    <div>
                      <p className="text-green-600">Emails Sent</p>
                      <p className="font-semibold text-green-800">{campaignResult.sentCount}</p>
                    </div>
                    <div>
                      <p className="text-green-600">Failed</p>
                      <p className="font-semibold text-green-800">{campaignResult.failedCount}</p>
                    </div>
                    <div>
                      <p className="text-green-600">Notifications Created</p>
                      <p className="font-semibold text-green-800">{campaignResult.notificationsCreated}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCampaignDialog(false)}>
              Close
            </Button>
            <Button
              onClick={handleSendCampaign}
              disabled={isSendingCampaign}
              className="bg-[#166534] hover:bg-[#14532D]"
            >
              {isSendingCampaign ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Send className="size-4 mr-1" />
              )}
              Send Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
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

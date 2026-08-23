"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ShieldCheck,
  Upload,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Calendar,
  FileText,
  Plus,
  X,
  Download,
  Trash2,
  Loader2,
  Pencil,
} from "@/lib/icons";
import { toast } from "sonner";
import { CertificationSelect } from "@/components/certification-select";
import { OTHER_CERTIFICATION_VALUE } from "@/lib/certification-types";

interface CredentialItem {
  id: number;
  document_name: string;
  file_url: string;
  expiration_date: string | null;
  reminder_enabled: boolean;
  status: string;
  verification_status: string;
  uploaded_at: string;
}

type FilterType = "all" | "active" | "expiring_soon" | "expired";

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1">
          <CheckCircle2 className="size-3" /> Active
        </Badge>
      );
    case "expiring_soon":
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-1">
          <AlertTriangle className="size-3" /> Expiring Soon
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1">
          <Clock className="size-3" /> Expired
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getVerificationBadge(status: string) {
  switch (status) {
    case "verified":
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <CheckCircle2 className="size-3" /> Verified
        </Badge>
      );
    case "pending_review":
      return (
        <Badge variant="outline" className="gap-1 text-xs">
          <Eye className="size-3" /> Pending Review
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <X className="size-3" /> Rejected
        </Badge>
      );
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }
}

function getFileType(fileUrl: string): "pdf" | "image" | "other" {
  const lower = fileUrl.toLowerCase();
  if (lower.includes(".pdf") || lower.startsWith("data:application/pdf")) return "pdf";
  if (
    lower.includes(".jpg") ||
    lower.includes(".jpeg") ||
    lower.includes(".png") ||
    lower.startsWith("data:image/jpeg") ||
    lower.startsWith("data:image/png")
  ) return "image";
  return "other";
}

// ─── PDF Canvas Preview Component ──────────────────────────────────
// Renders PDF pages on a <canvas> using pdfjs-dist, avoiding iframe CORS issues.
function PdfCanvasPreview({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setRenderError(false);

    const renderPdf = async (attempt = 0) => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        // Fetch PDF as ArrayBuffer for reliable rendering
        const pdfResponse = await fetch(url);
        const pdfArrayBuffer = await pdfResponse.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setTotalPages(pdf.numPages);

        const pageNum = Math.min(currentPage, pdf.numPages);
        if (pageNum < 1) return;
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const maxWidth = 700;
        const scale = Math.min(maxWidth / baseViewport.width, 2);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) {
          if (attempt < 10) {
            setTimeout(() => { if (!cancelled) renderPdf(attempt + 1); }, 200);
          }
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
      } catch (err) {
        console.error("PDF render error:", err);
        if (!cancelled) setRenderError(true);
      }
    };

    renderPdf();
    return () => { cancelled = true; };
  }, [url, currentPage]);

  if (renderError) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] gap-3">
        <FileText className="size-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Failed to render PDF preview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
          ← Prev
        </Button>
        <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
        <Button variant="ghost" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
          Next →
        </Button>
      </div>
      <div className="flex justify-center overflow-auto max-h-[55vh]">
        <canvas ref={canvasRef} className="block max-w-full" />
      </div>
    </div>
  );
}

export default function CandidateCredentialsPage() {
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Upload form state
  const [documentName, setDocumentName] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<CredentialItem | null>(null);
  const [editDocumentName, setEditDocumentName] = useState("");
  const [editExpirationDate, setEditExpirationDate] = useState("");
  const [editReminderEnabled, setEditReminderEnabled] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Preview dialog state
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewCredential, setPreviewCredential] = useState<CredentialItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch("/api/credentials");
      if (!res.ok) throw new Error("Failed to fetch credentials");
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch {
      toast.error("Failed to load credentials");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Resolve the effective document name ──
    // The CertificationSelect component sets documentName to either:
    //   - a real certification label (e.g., "BLS (Basic Life Support)")
    //   - the OTHER_CERTIFICATION_VALUE sentinel ("__other__")
    //   - a free-text string the user typed after picking "Other"
    // If the sentinel is still set, the user picked "Other" but hasn't
    // typed anything yet — treat that as empty.
    const effectiveName =
      documentName === OTHER_CERTIFICATION_VALUE ? "" : documentName.trim();

    if (!effectiveName) {
      toast.error("Please select or enter a document name");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("documentName", effectiveName);
      if (expirationDate) formData.append("expirationDate", expirationDate);
      formData.append("reminderEnabled", String(reminderEnabled));
      if (selectedFile) formData.append("file", selectedFile);

      const res = await fetch("/api/candidate/credentials", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("Upload failed", { description: data.error });
        return;
      }

      toast.success("Credential uploaded successfully!");
      setIsDialogOpen(false);
      setDocumentName("");
      setExpirationDate("");
      setReminderEnabled(false);
      setSelectedFile(null);
      fetchCredentials();
    } catch {
      toast.error("Failed to upload credential");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (credential: CredentialItem) => {
    setDownloadingId(credential.id);
    try {
      const res = await fetch("/api/storage/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: credential.file_url }),
      });

      if (!res.ok) {
        throw new Error("Failed to get download URL");
      }

      const { signedUrl } = await res.json();

      if (signedUrl.startsWith("data:")) {
        // For base64 data URLs, create a temporary link to download
        const link = document.createElement("a");
        link.href = signedUrl;
        link.download = credential.document_name || "credential";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For signed URLs, open in a new tab
        window.open(signedUrl, "_blank");
      }
    } catch {
      toast.error("Failed to download credential");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (credentialId: number) => {
    setDeletingId(credentialId);
    try {
      const res = await fetch(`/api/credentials/${credentialId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(data.error || "Delete failed");
      }

      toast.success("Credential deleted successfully");
      setCredentials((prev) => prev.filter((c) => c.id !== credentialId));
    } catch (err) {
      toast.error("Failed to delete credential", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const openEditDialog = (credential: CredentialItem) => {
    setEditingCredential(credential);
    setEditDocumentName(credential.document_name);
    setEditExpirationDate(
      credential.expiration_date
        ? new Date(credential.expiration_date).toISOString().split("T")[0]
        : ""
    );
    setEditReminderEnabled(credential.reminder_enabled);
    setIsEditDialogOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCredential) return;

    // ── Resolve effective name (handle OTHER sentinel) ──
    const effectiveEditName =
      editDocumentName === OTHER_CERTIFICATION_VALUE
        ? ""
        : editDocumentName.trim();

    if (!effectiveEditName) {
      toast.error("Document name cannot be empty");
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/credentials/${editingCredential.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_name: effectiveEditName,
          expiration_date: editExpirationDate || null,
          reminder_enabled: editReminderEnabled,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update credential");
      }

      toast.success("Credential updated successfully");
      setIsEditDialogOpen(false);
      setEditingCredential(null);
      fetchCredentials();
    } catch (err) {
      toast.error("Failed to update credential", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openPreviewDialog = async (credential: CredentialItem) => {
    setPreviewCredential(credential);
    setIsPreviewDialogOpen(true);
    setIsLoadingPreview(true);
    setPreviewUrl(null);

    try {
      const res = await fetch("/api/storage/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: credential.file_url }),
      });

      if (!res.ok) {
        throw new Error("Failed to get preview URL");
      }

      const { signedUrl } = await res.json();
      setPreviewUrl(signedUrl);
    } catch {
      toast.error("Failed to load preview");
      setPreviewUrl(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const filteredCredentials =
    filter === "all"
      ? credentials
      : credentials.filter((c) => c.status === filter);

  const filterCounts = {
    all: credentials.length,
    active: credentials.filter((c) => c.status === "active").length,
    expiring_soon: credentials.filter((c) => c.status === "expiring_soon").length,
    expired: credentials.filter((c) => c.status === "expired").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Credentials"
          actions={
            <Skeleton className="h-10 w-36" />
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credentials"
        description="Upload and manage your healthcare credentials, licenses, and certifications."
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="size-4" />
                Upload Credential
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleUpload}>
                <DialogHeader>
                  <DialogTitle>Upload Credential</DialogTitle>
                  <DialogDescription>
                    Add a new credential to your secure vault
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* File upload */}
                  <div className="space-y-2">
                    <Label>Document File</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {selectedFile ? selectedFile.name : "Click to upload or drag & drop"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, JPG, PNG, DOC up to 10MB
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Document name — searchable certification dropdown */}
                  <CertificationSelect
                    id="docName"
                    value={documentName}
                    onChange={setDocumentName}
                    required
                  />

                  {/* Expiration date */}
                  <div className="space-y-2">
                    <Label htmlFor="expDate">Expiration Date (Optional)</Label>
                    <Input
                      id="expDate"
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                    />
                  </div>

                  {/* Reminder toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="reminder">30-Day Reminder</Label>
                      <p className="text-xs text-muted-foreground">
                        Get alerted 30 days before expiration
                      </p>
                    </div>
                    <Switch
                      id="reminder"
                      checked={reminderEnabled}
                      onCheckedChange={setReminderEnabled}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isUploading} className="gap-2">
                    {isUploading ? (
                      <>
                        <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="size-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filter bar */}
      {credentials.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "expiring_soon", "expired"] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="gap-1.5 capitalize"
            >
              {f.replace("_", " ")}
              <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                {filterCounts[f]}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {/* Credentials grid */}
      {filteredCredentials.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="size-7 text-primary" />
            </div>
            <h3 className="text-lg font-medium">
              {credentials.length === 0
                ? "No credentials uploaded"
                : `No ${filter.replace("_", " ")} credentials`}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {credentials.length === 0
                ? "Upload your licenses, certifications, and other healthcare credentials to your secure vault."
                : "Try changing the filter to see more credentials."}
            </p>
            {credentials.length === 0 && (
              <Button
                className="mt-4 gap-2"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="size-4" />
                Upload Your First Credential
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCredentials.map((credential) => (
            <Card key={credential.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">
                        {credential.document_name}
                      </p>
                      {/* Action buttons */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => openPreviewDialog(credential)}
                              aria-label="Preview credential"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Preview</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => openEditDialog(credential)}
                              aria-label="Edit credential"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => handleDownload(credential)}
                              disabled={downloadingId === credential.id}
                              aria-label="Download credential"
                            >
                              {downloadingId === credential.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Download className="size-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>

                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  disabled={deletingId === credential.id}
                                  aria-label="Delete credential"
                                >
                                  {deletingId === credential.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="size-3.5" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Credential</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure? This cannot be undone. The credential &quot;{credential.document_name}&quot; will be permanently removed from your vault.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleDelete(credential.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {getStatusBadge(credential.status)}
                      {getVerificationBadge(credential.verification_status)}
                    </div>
                    {credential.expiration_date && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Calendar className="size-3" />
                        Expires {new Date(credential.expiration_date).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      Uploaded {new Date(credential.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Credential Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditSave}>
            <DialogHeader>
              <DialogTitle>Edit Credential</DialogTitle>
              <DialogDescription>
                Update your credential details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <CertificationSelect
                id="editDocName"
                value={editDocumentName}
                onChange={setEditDocumentName}
                required
              />
              <div className="space-y-2">
                <Label htmlFor="editExpDate">Expiration Date (Optional)</Label>
                <Input
                  id="editExpDate"
                  type="date"
                  value={editExpirationDate}
                  onChange={(e) => setEditExpirationDate(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="editReminder">30-Day Reminder</Label>
                  <p className="text-xs text-muted-foreground">
                    Get alerted 30 days before expiration
                  </p>
                </div>
                <Switch
                  id="editReminder"
                  checked={editReminderEnabled}
                  onCheckedChange={setEditReminderEnabled}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingEdit} className="gap-2">
                {isSavingEdit ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Credential Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5" />
              {previewCredential?.document_name || "Preview"}
            </DialogTitle>
            <DialogDescription>
              File preview — close this dialog when done
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[300px] max-h-[60vh] overflow-auto rounded-lg border bg-muted/30">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : previewUrl ? (
              (() => {
                const fileType = getFileType(previewCredential?.file_url || "");
                if (fileType === "pdf") {
                  return <PdfCanvasPreview url={previewUrl} />;
                }
                if (fileType === "image") {
                  return (
                    <div className="flex items-center justify-center p-4">
                      <img
                        src={previewUrl}
                        alt={previewCredential?.document_name || "Credential preview"}
                        className="max-w-full max-h-[60vh] object-contain rounded"
                      />
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col items-center justify-center h-[300px] gap-3">
                    <FileText className="size-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center">
                      Preview not available for this file type.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        if (previewCredential) handleDownload(previewCredential);
                      }}
                    >
                      <Download className="size-4" />
                      Download File
                    </Button>
                  </div>
                );
              })()
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-sm text-muted-foreground">Failed to load preview</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

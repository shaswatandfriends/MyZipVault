"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { toast } from "sonner";

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

export default function CandidateCredentialsPage() {
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Upload form state
  const [documentName, setDocumentName] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

    if (!documentName.trim()) {
      toast.error("Please enter a document name");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("documentName", documentName.trim());
      if (expirationDate) formData.append("expirationDate", expirationDate);
      formData.append("reminderEnabled", String(reminderEnabled));
      if (selectedFile) formData.append("file", selectedFile);

      const res = await fetch("/api/credentials/upload", {
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

                  {/* Document name */}
                  <div className="space-y-2">
                    <Label htmlFor="docName">Document Name</Label>
                    <Input
                      id="docName"
                      placeholder="e.g., RN License, BLS Certification"
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      required
                    />
                  </div>

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
                    <p className="font-medium text-sm truncate">
                      {credential.document_name}
                    </p>
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
    </div>
  );
}

"use client";

/**
 * RequestedDocuments — candidate-side component showing pending document
 * requests from recruiters.
 *
 * For each pending ShareRequest, shows:
 *   - Recruiter name + organization
 *   - Requested document types (credential, resume, etc.)
 *   - For each requested type, 3 action buttons:
 *     * Upload (device or camera)
 *     * Existing (pick from vault)
 *     * Deny
 *
 * This is the core of the candidate experience you described:
 *   "when they click on down arrow button in right it will come as dropdown
 *    all the documents requested by company X now they can choose that either
 *    they can first sign the RTR or Share the documents"
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Loader2, ChevronDown, ChevronUp, Upload, FileText, X, Camera,
  CheckCircle2, Building2, FileCheck,
} from "@/lib/icons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ShareRequestItem {
  id: number;
  candidate_user_id: number;
  client_user_id: number;
  request_checklists: boolean;
  request_credentials: boolean;
  request_resume: boolean;
  request_references: boolean;
  status: string;
  message: string | null;
  created_at: string;
  client_user: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    organization: { id: number; name: string } | null;
  };
}

interface CredentialItem {
  id: number;
  document_name: string;
  file_url: string;
  expiration_date: string | null;
  status: string;
  verification_status: string;
  uploaded_at: string;
}

interface ResumeItem {
  id: number;
  file_url: string | null;
  is_builder_resume: boolean;
  created_at: string;
}

export function RequestedDocuments() {
  const [requests, setRequests] = useState<ShareRequestItem[]>([]);
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [resume, setResume] = useState<ResumeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);

  // Dialog state for "Existing" picker
  const [showExistingPicker, setShowExistingPicker] = useState(false);
  const [pickerDocType, setPickerDocType] = useState<string>("");
  const [pickerRequestId, setPickerRequestId] = useState<number | null>(null);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [responding, setResponding] = useState(false);

  // Upload dialog state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<string>("");
  const [uploadMode, setUploadMode] = useState<"device" | "camera">("device");
  const [uploading, setUploading] = useState(false);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/candidate/share-requests");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRequests(data.requests || []);
      setCredentials(data.credentials || []);
      setResume(data.resume || null);
    } catch (err: any) {
      console.error("[REQUESTED_DOCS]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Get requested doc types for a request ─────────────────────
  function getRequestedTypes(req: ShareRequestItem): Array<{ type: string; label: string }> {
    const types: Array<{ type: string; label: string }> = [];
    if (req.request_credentials) types.push({ type: "credential", label: "Credentials (BLS, ACLS, etc.)" });
    if (req.request_resume) types.push({ type: "resume", label: "Resume" });
    if (req.request_checklists) types.push({ type: "checklist", label: "Skills Checklist" });
    if (req.request_references) types.push({ type: "reference", label: "References" });
    return types;
  }

  // ─── Handle "Existing" (share from vault) ──────────────────────
  function openExistingPicker(requestId: number, docType: string) {
    setPickerRequestId(requestId);
    setPickerDocType(docType);
    setSelectedCredentialId("");
    setShowExistingPicker(true);
  }

  async function handleShareExisting() {
    if (!pickerRequestId || responding) return;

    if (pickerDocType === "credential" && !selectedCredentialId) {
      toast.error("Please select a credential to share");
      return;
    }

    setResponding(true);
    try {
      const res = await fetch(`/api/candidate/share-requests/${pickerRequestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: pickerDocType,
          action: "share_existing",
          credentialId: pickerDocType === "credential" ? Number(selectedCredentialId) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to share");
      }

      toast.success("Document shared with the recruiter");
      setShowExistingPicker(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResponding(false);
    }
  }

  // ─── Handle "Deny" ─────────────────────────────────────────────
  async function handleDeny(requestId: number, docType: string) {
    try {
      const res = await fetch(`/api/candidate/share-requests/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, action: "deny" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to deny");
      }

      toast.success(`Denied sharing ${docType}. The recruiter can request again later.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // ─── Handle "Upload" (new document) ────────────────────────────
  function openUpload(docType: string, mode: "device" | "camera") {
    setUploadDocType(docType);
    setUploadMode(mode);
    setShowUpload(true);
    // Trigger file input after dialog opens
    setTimeout(() => {
      if (fileInputRef) fileInputRef.click();
    }, 100);
  }

  async function handleUpload(file: File) {
    if (uploading) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_name", file.name);

      const res = await fetch("/api/candidate/credentials", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      toast.success("Document uploaded to your vault");
      setShowUpload(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  // ─── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // ─── Empty state ───────────────────────────────────────────────
  if (requests.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <FileCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No pending document requests</p>
          <p className="text-xs text-muted-foreground mt-1">
            When a recruiter requests documents (BLS, ACLS, resume, etc.), they'll appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ─── Main render ───────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const isExpanded = expandedRequestId === req.id;
        const requestedTypes = getRequestedTypes(req);
        const orgName = req.client_user.organization?.name || "Unknown Company";
        const recruiterName = `${req.client_user.first_name ?? ""} ${req.client_user.last_name ?? ""}`.trim() || req.client_user.email;

        return (
          <Card key={req.id} className="overflow-hidden">
            {/* Header — clickable to expand */}
            <button
              onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
              className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{orgName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Requested by {recruiterName} · {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {requestedTypes.length} doc{requestedTypes.length > 1 ? "s" : ""}
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
              {req.message && (
                <p className="text-xs text-muted-foreground mt-2 italic">"{req.message}"</p>
              )}
            </button>

            {/* Expanded — shows each requested doc type with 3 actions */}
            {isExpanded && (
              <div className="border-t bg-muted/30">
                <div className="p-4 space-y-3">
                  {requestedTypes.map(({ type, label }) => (
                    <div key={type} className="bg-background rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">{label}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Pending</Badge>
                      </div>

                      {/* 3 action buttons */}
                      <div className="flex flex-wrap gap-2">
                        {/* Upload — with dropdown for device vs camera */}
                        <div className="relative group">
                          <Button size="sm" variant="outline" className="h-8">
                            <Upload className="h-3.5 w-3.5 mr-1" /> Upload
                          </Button>
                          {/* Dropdown for device vs camera */}
                          <div className="absolute top-full left-0 mt-1 hidden group-hover:flex flex-col bg-background border rounded-md shadow-lg z-10 min-w-[140px]">
                            <button
                              onClick={() => openUpload(type, "device")}
                              className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-left"
                            >
                              <Upload className="h-3 w-3" /> From device
                            </button>
                            <button
                              onClick={() => openUpload(type, "camera")}
                              className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-left"
                            >
                              <Camera className="h-3 w-3" /> Take photo
                            </button>
                          </div>
                        </div>

                        {/* Existing (share from vault) */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => openExistingPicker(req.id, type)}
                          disabled={type === "credential" && credentials.length === 0}
                        >
                          <FileCheck className="h-3.5 w-3.5 mr-1" /> Share existing
                        </Button>

                        {/* Deny */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeny(req.id, type)}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Deny
                        </Button>
                      </div>

                      {/* Hint if no existing docs */}
                      {type === "credential" && credentials.length === 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          You don't have any credentials in your vault yet. Upload one first.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* ─── Existing credential picker dialog ─── */}
      <Dialog open={showExistingPicker} onOpenChange={setShowExistingPicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share from your vault</DialogTitle>
            <DialogDescription>
              Select which {pickerDocType} to share with the recruiter.
            </DialogDescription>
          </DialogHeader>

          {pickerDocType === "credential" && (
            <div className="space-y-2">
              {credentials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  You don't have any credentials in your vault yet.
                </p>
              ) : (
                <Select value={selectedCredentialId} onValueChange={setSelectedCredentialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a credential..." />
                  </SelectTrigger>
                  <SelectContent>
                    {credentials.map((cred) => (
                      <SelectItem key={cred.id} value={cred.id.toString()}>
                        {cred.document_name}
                        {cred.expiration_date && ` (exp ${new Date(cred.expiration_date).toLocaleDateString()})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {pickerDocType === "resume" && (
            <div className="space-y-2">
              {resume ? (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    {resume.is_builder_resume ? "Builder Resume" : "Uploaded Resume"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(resume.created_at).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  You don't have a resume in your vault yet.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExistingPicker(false)}>Cancel</Button>
            <Button
              onClick={handleShareExisting}
              disabled={responding || (pickerDocType === "credential" && !selectedCredentialId)}
            >
              {responding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Share document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Upload dialog (device or camera) ─── */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {uploadMode === "camera" ? "Take a photo" : "Upload from device"}
            </DialogTitle>
            <DialogDescription>
              {uploadMode === "camera"
                ? "Use your camera to capture a photo of your document."
                : "Select a file from your device to upload."}
            </DialogDescription>
          </DialogHeader>

          <input
            ref={setFileInputRef}
            type="file"
            accept="image/*"
            capture={uploadMode === "camera" ? "environment" : undefined}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 border-2 border-dashed border-border rounded-lg">
              {uploadMode === "camera" ? (
                <Camera className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {uploadMode === "camera" ? "Camera should have opened..." : "Click to select a file"}
              </p>
              <Button variant="outline" size="sm" onClick={() => fileInputRef?.click()}>
                Choose file
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)} disabled={uploading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

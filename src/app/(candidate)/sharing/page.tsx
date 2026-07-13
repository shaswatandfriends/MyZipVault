"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Share2,
  Check,
  X,
  Clock,
  ShieldCheck,
  FileText,
  Users,
  ClipboardCheck,
  Building2,
  User,
  Loader2,
  Ban,
  AlertTriangle,
  Pencil,
  Calendar,
} from "@/lib/icons";
import { toast } from "sonner";

interface RequestedDocMatch {
  documentName: string;
  matched: boolean;
  credentialId: number | null;
  uploadedAt: string | null;
  status: string | null;
}

interface ShareRequestItem {
  id: number;
  candidate_user_id: number;
  client_user_id: number;
  request_checklists: boolean;
  request_credentials: boolean;
  request_resume: boolean;
  request_references: boolean;
  requested_documents: string[];
  requestedDocumentMatches: RequestedDocMatch[];
  status: string;
  message: string | null;
  created_at: string;
  client_user: {
    first_name: string | null;
    last_name: string | null;
    organization: { name: string } | null;
  };
}

interface ConsentShareItem {
  id: number;
  client_user_id: number;
  checklist_response_id: number | null;
  credential_id: number | null;
  resume_id: number | null;
  reference_id: number | null;
  is_deleted: boolean;
  shared_at: string;
  expires_at: string;
  client_user: {
    first_name: string | null;
    last_name: string | null;
    organization: { name: string } | null;
  };
}

export default function CandidateSharingPage() {
  const [shareRequests, setShareRequests] = useState<ShareRequestItem[]>([]);
  const [activeShares, setActiveShares] = useState<ConsentShareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expirySelections, setExpirySelections] = useState<Record<string, string>>({});
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  // Modify expiry dialog state
  const [isExpiryDialogOpen, setIsExpiryDialogOpen] = useState(false);
  const [editingShare, setEditingShare] = useState<ConsentShareItem | null>(null);
  const [expiryOption, setExpiryOption] = useState("14");
  const [customExpiryDate, setCustomExpiryDate] = useState("");
  const [isSavingExpiry, setIsSavingExpiry] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sharing");
      if (!res.ok) throw new Error("Failed to fetch sharing data");
      const data = await res.json();
      setShareRequests(data.shareRequests || []);
      setActiveShares(data.activeShares || []);
    } catch {
      toast.error("Failed to load sharing data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (shareRequestId: number, itemType: string, itemId?: number) => {
    const key = `${shareRequestId}-${itemType}`;
    const expiryDays = parseInt(expirySelections[key] || "14");

    setActioningId(key);
    try {
      const res = await fetch("/api/sharing/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareRequestId,
          itemType,
          itemId,
          expiryDays,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("Failed to approve", { description: data.error });
        return;
      }

      toast.success(`${itemType} sharing approved`);
      fetchData();
    } catch {
      toast.error("Failed to approve sharing");
    } finally {
      setActioningId(null);
    }
  };

  const handleRevoke = async (consentShareId: number) => {
    setRevokingId(consentShareId);
    try {
      const res = await fetch("/api/sharing/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentShareId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("Failed to revoke", { description: data.error });
        return;
      }

      toast.success("Share revoked successfully");
      fetchData();
    } catch {
      toast.error("Failed to revoke share");
    } finally {
      setRevokingId(null);
    }
  };

  const handleDeny = async (shareRequestId: number, itemType: string) => {
    const key = `${shareRequestId}-deny`;
    setActioningId(key);
    try {
      const res = await fetch("/api/sharing/deny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareRequestId, itemType }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("Failed to deny", { description: data.error });
        return;
      }

      toast.success(`${itemType} sharing denied`);
      fetchData();
    } catch {
      toast.error("Failed to deny sharing");
    } finally {
      setActioningId(null);
    }
  };

  const openExpiryDialog = (share: ConsentShareItem) => {
    setEditingShare(share);
    setExpiryOption("14");
    setCustomExpiryDate("");
    setIsExpiryDialogOpen(true);
  };

  const handleSaveExpiry = async () => {
    if (!editingShare) return;

    let newExpiresAt: Date;

    if (expiryOption === "custom") {
      if (!customExpiryDate) {
        toast.error("Please select a custom expiry date");
        return;
      }
      newExpiresAt = new Date(customExpiryDate);
      if (newExpiresAt <= new Date()) {
        toast.error("Expiry date must be in the future");
        return;
      }
    } else {
      const days = parseInt(expiryOption);
      newExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    setIsSavingExpiry(true);
    try {
      const res = await fetch("/api/sharing/modify-expiry", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentShareId: editingShare.id,
          newExpiresAt: newExpiresAt.toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update expiry");
      }

      toast.success("Share expiry updated successfully");
      setIsExpiryDialogOpen(false);
      setEditingShare(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to update share expiry", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSavingExpiry(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sharing & Consent" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-140 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const pendingRequests = shareRequests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sharing & Consent"
        description="Manage consent-based sharing of your credentials, checklists, and references with employers."
      />

      {/* Pending Share Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="size-5 text-primary" />
            Pending Requests
            <Badge variant="secondary">{pendingRequests.length}</Badge>
          </h2>

          {pendingRequests.map((request) => {
            const recruiterName = request.client_user
              ? `${request.client_user.first_name || ""} ${request.client_user.last_name || ""}`.trim() || "A Recruiter"
              : "A Recruiter";
            const agencyName = request.client_user?.organization?.name || "Unknown Agency";

            const requestedItems: { type: string; label: string; icon: React.ReactNode }[] = [];
            if (request.request_checklists) {
              requestedItems.push({ type: "checklist", label: "Skills Checklists", icon: <ClipboardCheck className="size-4" /> });
            }
            if (request.request_credentials) {
              requestedItems.push({ type: "credential", label: "Credentials", icon: <ShieldCheck className="size-4" /> });
            }
            if (request.request_resume) {
              requestedItems.push({ type: "resume", label: "Resume", icon: <FileText className="size-4" /> });
            }
            if (request.request_references) {
              requestedItems.push({ type: "reference", label: "References", icon: <Users className="size-4" /> });
            }

            return (
              <Card key={request.id} className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{recruiterName}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Building2 className="size-3" />
                        {agencyName}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Requested {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {request.message && (
                    <div className="bg-muted/50 p-3 rounded-lg mb-4">
                      <p className="text-sm italic">&ldquo;{request.message}&rdquo;</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {requestedItems.map((item) => {
                      const key = `${request.id}-${item.type}`;
                      const isActioning = actioningId === key || actioningId === `${request.id}-deny`;

                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {item.icon}
                              <span className="text-sm font-medium">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Expiry selection */}
                              <RadioGroup
                                value={expirySelections[key] || "14"}
                                onValueChange={(val) =>
                                  setExpirySelections((prev) => ({ ...prev, [key]: val }))
                                }
                                className="flex items-center gap-2"
                              >
                                {[7, 14, 30].map((days) => (
                                  <div key={days} className="flex items-center gap-1">
                                    <RadioGroupItem value={String(days)} id={`${key}-${days}`} className="size-3" />
                                    <Label htmlFor={`${key}-${days}`} className="text-xs text-muted-foreground cursor-pointer">
                                      {days}d
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-1 h-7 text-xs"
                                disabled={isActioning}
                                onClick={() => handleApprove(request.id, item.type)}
                              >
                                {actioningId === key ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Check className="size-3" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 h-7 text-xs text-destructive hover:text-destructive"
                                disabled={isActioning}
                                onClick={() => handleDeny(request.id, item.type)}
                              >
                                <X className="size-3" />
                                Deny
                              </Button>
                            </div>
                          </div>
                          <Separator className="mt-3" />
                        </div>
                      );
                    })}

                    {/* ── Auto-matched specific credentials ── */}
                    {request.requestedDocumentMatches &&
                      request.requestedDocumentMatches.length > 0 && (
                        <div className="pt-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Specific Credentials Requested
                          </p>
                          {request.requestedDocumentMatches.map((match) => {
                            const key = `${request.id}-cred-${match.documentName}`;
                            const isActioning = actioningId === key;

                            return (
                              <div key={key} className="mb-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <ShieldCheck className="size-4 shrink-0 text-primary" />
                                    <div className="min-w-0">
                                      <span className="text-sm font-medium block truncate">
                                        {match.documentName}
                                      </span>
                                      {match.matched ? (
                                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                                          <Check className="size-3" />
                                          Found in your vault
                                          {match.uploadedAt &&
                                            ` · uploaded ${new Date(match.uploadedAt).toLocaleDateString()}`}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-amber-600 flex items-center gap-1">
                                          <AlertTriangle className="size-3" />
                                          Not in your vault —
                                          <a
                                            href="/vault/credentials"
                                            className="underline hover:text-amber-700"
                                          >
                                            upload now
                                          </a>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {match.matched && match.credentialId && (
                                    <div className="flex items-center gap-2 shrink-0">
                                      <RadioGroup
                                        value={expirySelections[key] || "14"}
                                        onValueChange={(val) =>
                                          setExpirySelections((prev) => ({ ...prev, [key]: val }))
                                        }
                                        className="flex items-center gap-2"
                                      >
                                        {[7, 14, 30].map((days) => (
                                          <div key={days} className="flex items-center gap-1">
                                            <RadioGroupItem value={String(days)} id={`${key}-${days}`} className="size-3" />
                                            <Label htmlFor={`${key}-${days}`} className="text-xs text-muted-foreground cursor-pointer">
                                              {days}d
                                            </Label>
                                          </div>
                                        ))}
                                      </RadioGroup>
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="gap-1 h-7 text-xs"
                                        disabled={isActioning}
                                        onClick={() =>
                                          handleApprove(request.id, "credential", match.credentialId ?? undefined)
                                        }
                                      >
                                        {isActioning ? (
                                          <Loader2 className="size-3 animate-spin" />
                                        ) : (
                                          <Check className="size-3" />
                                        )}
                                        Approve
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                <Separator className="mt-3" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Active Shares */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Share2 className="size-5 text-muted-foreground" />
          Active Shares
          <Badge variant="secondary">{activeShares.length}</Badge>
        </h2>

        {activeShares.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Share2 className="size-7 text-primary" />
              </div>
              <h3 className="text-lg font-medium">No active shares</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                When you grant consent to an employer to view your credentials,
                the sharing record will appear here. You can revoke access at any time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeShares.map((share) => {
              const recruiterName = share.client_user
                ? `${share.client_user.first_name || ""} ${share.client_user.last_name || ""}`.trim() || "A Recruiter"
                : "A Recruiter";
              const agencyName = share.client_user?.organization?.name || "Unknown Agency";
              const isExpired = new Date(share.expires_at) < new Date();

              const sharedItems: string[] = [];
              if (share.checklist_response_id) sharedItems.push("Checklist");
              if (share.credential_id) sharedItems.push("Credential");
              if (share.resume_id) sharedItems.push("Resume");
              if (share.reference_id) sharedItems.push("Reference");

              return (
                <Card key={share.id} className={isExpired ? "opacity-60" : ""}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <Share2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{recruiterName} — {agencyName}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>Sharing: {sharedItems.join(", ")}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {isExpired ? "Expired" : `Expires ${new Date(share.expires_at).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isExpired && !share.is_deleted && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 h-7 text-xs"
                            onClick={() => openExpiryDialog(share)}
                          >
                            <Pencil className="size-3" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 h-7 text-xs text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                                disabled={revokingId === share.id}
                              >
                                {revokingId === share.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Ban className="size-3" />
                                )}
                                Revoke
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke Share Access</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to revoke access for {recruiterName} at {agencyName}? They will immediately lose access to your shared documents.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Sharing</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleRevoke(share.id)}
                                >
                                  Yes, Revoke Access
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      <Badge variant={isExpired ? "secondary" : "default"} className="text-xs">
                        {isExpired ? "Expired" : "Active"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty state for no pending requests */}
      {pendingRequests.length === 0 && activeShares.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Share2 className="size-7 text-primary" />
            </div>
            <h3 className="text-lg font-medium">No sharing activity</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              When a recruiter requests access to your documents, you&apos;ll see it here.
              You have full control over what gets shared and for how long.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modify Expiry Dialog */}
      <Dialog open={isExpiryDialogOpen} onOpenChange={setIsExpiryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              Modify Share Expiry
            </DialogTitle>
            <DialogDescription>
              Change how long {editingShare?.client_user
                ? `${editingShare.client_user.first_name || ""} ${editingShare.client_user.last_name || ""}`.trim() || "the recruiter"
                : "the recruiter"} can access your shared documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Select new expiry period</Label>
              <RadioGroup
                value={expiryOption}
                onValueChange={setExpiryOption}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="7" id="exp-7" />
                  <Label htmlFor="exp-7" className="font-normal text-sm cursor-pointer">
                    7 days from now
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="14" id="exp-14" />
                  <Label htmlFor="exp-14" className="font-normal text-sm cursor-pointer">
                    14 days from now
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="30" id="exp-30" />
                  <Label htmlFor="exp-30" className="font-normal text-sm cursor-pointer">
                    30 days from now
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="exp-custom" />
                  <Label htmlFor="exp-custom" className="font-normal text-sm cursor-pointer">
                    Custom date
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {expiryOption === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="custom-expiry-date">Expiry Date</Label>
                <Input
                  id="custom-expiry-date"
                  type="date"
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            )}

            {editingShare && (
              <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
                <p>Current expiry: {new Date(editingShare.expires_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExpiryDialogOpen(false)}
              disabled={isSavingExpiry}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSavingExpiry}
              className="gap-2"
              onClick={handleSaveExpiry}
            >
              {isSavingExpiry ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Calendar className="size-4" />
                  Update Expiry
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

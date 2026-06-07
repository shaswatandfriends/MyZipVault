"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/alert-dialog";

// ─── Types ──────────────────────────────────────────────────────────
interface AdminPermission {
  permissionName: string;
  isAllowed: boolean;
}

interface Admin {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  accountStatus: string;
  isApproved: boolean;
  createdAt: string;
  lastActivityAt: string | null;
  permissions: AdminPermission[];
}

interface AdminsResponse {
  admins: Admin[];
  allPermissions: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getPermissionLabel(perm: string): string {
  return perm
    .replace(/^can_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Skeleton ───────────────────────────────────────────────────────
function AdminCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded" />
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-20 rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminAdminsPage() {
  const [data, setData] = useState<AdminsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Create admin dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createPermissions, setCreatePermissions] = useState<Record<string, boolean>>({});

  // Edit permissions dialog
  const [showPermDialog, setShowPermDialog] = useState(false);
  const [editAdmin, setEditAdmin] = useState<Admin | null>(null);
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({});

  // Delete admin dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteAdmin, setDeleteAdmin] = useState<Admin | null>(null);

  const fetchAdmins = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/admins");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch admins");
      }
      const json = (await res.json()) as AdminsResponse;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load admins", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const postAction = async (body: Record<string, unknown>) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/superadmin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      return json;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      toast.error("Action failed", { description: message });
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    const enabledPerms = Object.entries(createPermissions)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const result = await postAction({
      action: "create",
      email: createEmail,
      firstName: createFirstName || null,
      lastName: createLastName || null,
      permissions: enabledPerms,
    });
    if (result?.success) {
      toast.success("Admin created", {
        description: result.tempPassword
          ? `Temporary password: ${result.tempPassword}`
          : result.message,
      });
      setShowCreateDialog(false);
      setCreateEmail("");
      setCreateFirstName("");
      setCreateLastName("");
      setCreatePermissions({});
      fetchAdmins();
    }
  };

  const handleSavePermissions = async () => {
    if (!editAdmin) return;
    const result = await postAction({
      action: "set-permissions",
      adminId: editAdmin.id,
      permissions: editPermissions,
    });
    if (result?.success) {
      toast.success("Permissions updated");
      setShowPermDialog(false);
      fetchAdmins();
    }
  };

  const handleApproveAdmin = async (adminId: number) => {
    const result = await postAction({ action: "approve", adminId });
    if (result?.success) {
      toast.success("Admin approved");
      fetchAdmins();
    }
  };

  const handleRejectAdmin = async (adminId: number) => {
    const result = await postAction({ action: "reject", adminId });
    if (result?.success) {
      toast.success("Admin rejected");
      fetchAdmins();
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteAdmin) return;
    const result = await postAction({ action: "delete", adminId: deleteAdmin.id });
    if (result?.success) {
      toast.success("Admin deleted");
      setShowDeleteDialog(false);
      fetchAdmins();
    }
  };

  const openPermDialog = (admin: Admin) => {
    setEditAdmin(admin);
    const perms: Record<string, boolean> = {};
    for (const p of data?.allPermissions ?? []) {
      const existing = admin.permissions.find((ap) => ap.permissionName === p);
      perms[p] = existing?.isAllowed ?? false;
    }
    setEditPermissions(perms);
    setShowPermDialog(true);
  };

  const pendingAdmins = data?.admins.filter((a) => !a.isApproved && a.accountStatus !== "deleted") ?? [];
  const approvedAdmins = data?.admins.filter((a) => a.isApproved && a.accountStatus !== "deleted") ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admins"
        description="Manage platform administrators and their permissions."
        actions={
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => setShowCreateDialog(true)}
          >
            <UserPlus className="size-4" />
            Create Admin
          </Button>
        }
      />

      {/* ── Pending Approval Queue ─────────────────────────────────── */}
      {pendingAdmins.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-5 text-amber-600" />
              Pending Approvals
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                {pendingAdmins.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAdmins.map((admin) => {
                const fullName = [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email;
                return (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold shrink-0">
                        {admin.firstName?.[0]?.toUpperCase() ?? admin.email[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {admin.email} · Created {formatDate(admin.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={() => handleApproveAdmin(admin.id)}
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                        onClick={() => handleRejectAdmin(admin.id)}
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Admin List ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-5 text-teal-600" />
            Platform Administrators
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <AdminCardSkeleton />
              <AdminCardSkeleton />
            </div>
          ) : !approvedAdmins.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No active admins</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Create your first platform admin to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedAdmins.map((admin) => {
                const fullName = [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email;
                const enabledPerms = admin.permissions.filter((p) => p.isAllowed);
                const isSuperAdmin = admin.role === "super_admin";
                return (
                  <Card key={admin.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex size-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-sm font-semibold shrink-0">
                            {admin.firstName?.[0]?.toUpperCase() ?? admin.email[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{fullName}</p>
                              {isSuperAdmin ? (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 text-xs">
                                  Super Admin
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 text-xs">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{admin.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Last active: {admin.lastActivityAt ? formatDate(admin.lastActivityAt) : "Never"} · Created: {formatDate(admin.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!isSuperAdmin && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openPermDialog(admin)}>
                                Permissions
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setDeleteAdmin(admin);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Permission badges */}
                      {enabledPerms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {enabledPerms.map((p) => (
                            <Badge
                              key={p.permissionName}
                              variant="outline"
                              className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                            >
                              {getPermissionLabel(p.permissionName)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create Admin Dialog ──────────────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Admin</DialogTitle>
            <DialogDescription>Add a new platform administrator. They will need approval before they can log in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={createFirstName} onChange={(e) => setCreateFirstName(e.target.value)} placeholder="Jane" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={createLastName} onChange={(e) => setCreateLastName(e.target.value)} placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Permissions</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
                {(data?.allPermissions ?? []).map((perm) => (
                  <div key={perm} className="flex items-center gap-2">
                    <Checkbox
                      id={`create-${perm}`}
                      checked={createPermissions[perm] ?? false}
                      onCheckedChange={(v) =>
                        setCreatePermissions((prev) => ({ ...prev, [perm]: v === true }))
                      }
                    />
                    <Label htmlFor={`create-${perm}`} className="text-xs cursor-pointer font-normal">
                      {getPermissionLabel(perm)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreateAdmin} disabled={actionLoading || !createEmail}>
              {actionLoading ? "Creating…" : "Create Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Permissions Dialog ──────────────────────────────────── */}
      <Dialog open={showPermDialog} onOpenChange={setShowPermDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Permissions — {editAdmin ? [editAdmin.firstName, editAdmin.lastName].filter(Boolean).join(" ") || editAdmin.email : ""}</DialogTitle>
            <DialogDescription>Configure granular permissions for this administrator.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
            {(data?.allPermissions ?? []).map((perm) => (
              <div key={perm} className="flex items-center gap-2">
                <Checkbox
                  id={`edit-${perm}`}
                  checked={editPermissions[perm] ?? false}
                  onCheckedChange={(v) =>
                    setEditPermissions((prev) => ({ ...prev, [perm]: v === true }))
                  }
                />
                <Label htmlFor={`edit-${perm}`} className="text-xs cursor-pointer font-normal">
                  {getPermissionLabel(perm)}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSavePermissions} disabled={actionLoading}>
              {actionLoading ? "Saving…" : "Save Permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Admin Confirmation ────────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteAdmin ? [deleteAdmin.firstName, deleteAdmin.lastName].filter(Boolean).join(" ") || deleteAdmin.email : ""}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={handleDeleteAdmin}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? "Deleting…" : "Delete Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

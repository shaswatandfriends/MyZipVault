"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  KeyRound,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
interface RecruiterRow {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  accountStatus: string;
  lastActiveAt: string | null;
  organization: { id: number; name: string } | null;
}

interface Company {
  id: number;
  name: string;
}

interface RecruitersResponse {
  recruiters: RecruiterRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          Active
        </Badge>
      );
    case "suspended":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          Suspended
        </Badge>
      );
    case "deactivated":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          Deactivated
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────
function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-36" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded" />
          <Skeleton className="size-8 rounded" />
          <Skeleton className="h-5 w-8 rounded" />
          <Skeleton className="size-8 rounded" />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AllRecruitersPage() {
  const [data, setData] = useState<RecruitersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Reset password dialog
  const [resetPasswordUser, setResetPasswordUser] = useState<RecruiterRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Toggle status loading
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  // Delete dialog
  const [deleteUser, setDeleteUser] = useState<RecruiterRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch recruiters ──────────────────────────────────────────────
  const fetchRecruiters = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        companyId: companyFilter !== "all" ? companyFilter : "",
        page: String(page),
      });

      const res = await fetch(
        `/api/superadmin/skill-checklist/recruiters?${params}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch recruiters");
      }
      const json = (await res.json()) as RecruitersResponse;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load recruiters", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, companyFilter, page]);

  // ── Fetch companies for filter ────────────────────────────────────
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch("/api/superadmin/companies");
        if (res.ok) {
          const json = await res.json();
          // The companies API may return { companies: [...] } or just [...]
          const list = Array.isArray(json) ? json : json.companies ?? [];
          setCompanies(
            list.map((c: { id: number; name: string }) => ({
              id: c.id,
              name: c.name,
            }))
          );
        }
      } catch {
        // Non-critical — just don't show the filter
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchRecruiters();
  }, [fetchRecruiters]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, companyFilter]);

  // ── View Password (removed) ─────────────────────────────────────
  // Plaintext password retrieval has been deprecated. Use Reset Password
  // to issue a new one-time temporary password instead.

  // ── Reset Password ────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setResetLoading(true);
      const res = await fetch(
        `/api/superadmin/skill-checklist/recruiters/${resetPasswordUser.id}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reset password");

      // Backend returns the one-time temp password (no longer stored in DB).
      // Show it in a copyable toast for the admin to share out-of-band.
      if (json.temporary_password) {
        toast.success("Password reset — copy this temp password", {
          duration: 12000,
          description: `Temp password: ${json.temporary_password} (user must change on next login)`,
        });
        try {
          await navigator.clipboard.writeText(json.temporary_password);
        } catch {
          // clipboard may be blocked — user can copy from the toast
        }
      } else {
        toast.success("Password reset successfully", {
          description: `${resetPasswordUser.email} will be required to change their password on next login.`,
        });
      }
      setResetPasswordUser(null);
      setNewPassword("");
      setConfirmPassword("");
      fetchRecruiters();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to reset password", { description: message });
    } finally {
      setResetLoading(false);
    }
  };

  // ── Toggle Status ─────────────────────────────────────────────────
  const handleToggleStatus = async (recruiter: RecruiterRow) => {
    const newStatus = recruiter.accountStatus === "active" ? "suspended" : "active";
    setTogglingIds((prev) => new Set(prev).add(recruiter.id));

    try {
      const res = await fetch(
        `/api/superadmin/skill-checklist/recruiters/${recruiter.id}/toggle-status`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to toggle status");

      toast.success(
        newStatus === "suspended"
          ? "Account suspended"
          : "Account activated",
        {
          description: `${recruiter.email} is now ${newStatus}.`,
        }
      );
      fetchRecruiters();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to toggle status", { description: message });
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(recruiter.id);
        return next;
      });
    }
  };

  // ── Delete User ───────────────────────────────────────────────────
  const handleDeleteUser = async () => {
    if (!deleteUser) return;

    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/superadmin/users/${deleteUser.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete user");

      toast.success("User deleted", {
        description: `${deleteUser.email} has been deleted.`,
      });
      setDeleteUser(null);
      fetchRecruiters();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to delete user", { description: message });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Recruiters"
        description="Manage all recruiters across companies. View passwords, reset credentials, and control account access."
      />

      {/* ── Search & Filters ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-5 text-emerald-600" />
              Recruiter Accounts
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full sm:w-64"
                />
              </div>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Building2 className="size-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          ) : !data?.recruiters.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No recruiters found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {searchQuery || companyFilter !== "all"
                  ? "Try adjusting your search or filter."
                  : "No recruiter accounts have been created yet."}
              </p>
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="w-44">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recruiters.map((recruiter) => {
                    const fullName =
                      [recruiter.firstName, recruiter.lastName]
                        .filter(Boolean)
                        .join(" ") || "—";
                    const isToggling = togglingIds.has(recruiter.id);

                    return (
                      <TableRow key={recruiter.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold shrink-0">
                              {recruiter.firstName?.[0]?.toUpperCase() ??
                                recruiter.email[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-sm">
                              {fullName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {recruiter.email}
                        </TableCell>
                        <TableCell className="text-sm">
                          {recruiter.organization?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(recruiter.accountStatus)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(recruiter.lastActiveAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {/* Reset Password (View Password removed — plaintext storage no longer supported) */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0"
                              title="Reset Password"
                              onClick={() => {
                                setResetPasswordUser(recruiter);
                                setNewPassword("");
                                setConfirmPassword("");
                              }}
                            >
                              <KeyRound className="size-4 text-amber-600" />
                              <span className="sr-only">Reset Password</span>
                            </Button>

                            {/* Toggle Status */}
                            <Switch
                              checked={recruiter.accountStatus === "active"}
                              onCheckedChange={() =>
                                handleToggleStatus(recruiter)
                              }
                              disabled={isToggling}
                              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300"
                              title={
                                recruiter.accountStatus === "active"
                                  ? "Suspend Account"
                                  : "Activate Account"
                              }
                            />

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-8 p-0"
                              title="Delete User"
                              onClick={() => setDeleteUser(recruiter)}
                            >
                              <Trash2 className="size-4 text-red-500" />
                              <span className="sr-only">Delete User</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ── Pagination ──────────────────────────────────────────── */}
          {!isLoading && data && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {data.recruiters.length} of {data.total} recruiters
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {data.totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Reset Password Dialog ──────────────────────────────────────── */}
      <Dialog
        open={!!resetPasswordUser}
        onOpenChange={(open) => {
          if (!open) {
            setResetPasswordUser(null);
            setNewPassword("");
            setConfirmPassword("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-amber-600" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              {resetPasswordUser
                ? `Set a new password for ${resetPasswordUser.email}`
                : "Set a new password for this recruiter."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <PasswordInput
                id="new-password"

                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <PasswordInput
                id="confirm-password"

                placeholder="Re-enter the password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-800">
                The user will be required to change their password on next login.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordUser(null);
                setNewPassword("");
                setConfirmPassword("");
              }}
              disabled={resetLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleResetPassword}
              disabled={
                resetLoading ||
                !newPassword ||
                newPassword.length < 6 ||
                newPassword !== confirmPassword
              }
            >
              {resetLoading ? "Saving…" : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete User Confirmation ────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteUser}
        onOpenChange={(open) => {
          if (!open) setDeleteUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recruiter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {deleteUser
                  ? [deleteUser.firstName, deleteUser.lastName]
                      .filter(Boolean)
                      .join(" ") || deleteUser.email
                  : ""}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteLoading}
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading ? "Deleting…" : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

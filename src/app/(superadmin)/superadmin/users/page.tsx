"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Search,
  UserPlus,
  KeyRound,
  Ban,
  Pause,
  LogIn,
  Download,
  Filter,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
interface UserRow {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  accountStatus: string;
  organizationId: number | null;
  phone: string | null;
  organization: { id: number; name: string } | null;
  lastActivityAt: string | null;
  createdAt: string;
  isApproved: boolean;
  profileCompletionPct: number | null;
}

interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getRoleBadge(role: string) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    candidate: { bg: "bg-teal-100 border-teal-200", text: "text-teal-800", label: "Candidate" },
    client_recruiter: { bg: "bg-emerald-100 border-emerald-200", text: "text-emerald-800", label: "Recruiter" },
    client_admin: { bg: "bg-amber-100 border-amber-200", text: "text-amber-800", label: "Client Admin" },
    platform_admin: { bg: "bg-rose-100 border-rose-200", text: "text-rose-800", label: "Admin" },
    super_admin: { bg: "bg-purple-100 border-purple-200", text: "text-purple-800", label: "Super Admin" },
  };
  const c = config[role] || { bg: "", text: "", label: role };
  return (
    <Badge className={`${c.bg} ${c.text} hover:${c.bg}`}>
      {c.label}
    </Badge>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Active</Badge>;
    case "suspended":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Suspended</Badge>;
    case "deleted":
      return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Banned</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getProfileBadge(pct: number | null) {
  if (pct === null) return <span className="text-xs text-muted-foreground">N/A</span>;
  const color = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600";
  return <span className={`text-xs font-medium ${color}`}>{pct}%</span>;
}

// ─── Skeleton ───────────────────────────────────────────────────────
function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
    </TableRow>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [lastLoginFrom, setLastLoginFrom] = useState("");
  const [lastLoginTo, setLastLoginTo] = useState("");
  const [profileMin, setProfileMin] = useState("");
  const [profileMax, setProfileMax] = useState("");
  const [redactPii, setRedactPii] = useState(true);

  // Action states
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    userId: number;
    userName: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // View user dialog
  const [viewUser, setViewUser] = useState<UserRow | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
        page: String(page),
      });
      if (lastLoginFrom) params.set("lastLoginFrom", lastLoginFrom);
      if (lastLoginTo) params.set("lastLoginTo", lastLoginTo);
      if (profileMin) params.set("profileMin", profileMin);
      if (profileMax) params.set("profileMax", profileMax);

      const res = await fetch(`/api/superadmin/users?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch users");
      }
      const json = (await res.json()) as UsersResponse;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load users", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter, page, lastLoginFrom, lastLoginTo, profileMin, profileMax]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const handleAction = async (action: string, userId: number) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Action failed");

      if (action === "proxy-login" && body.proxyUser) {
        toast.success("Proxy login authorized", {
          description: `Logged in as ${body.proxyUser.email}`,
        });
        // In production, this would redirect to the user's dashboard
      } else {
        toast.success(body.message || "Action completed");
      }
      fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      toast.error("Action failed", { description: message });
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleCSVExport = () => {
    if (!data?.users.length) return;
    const headers = ["ID", "Email", "First Name", "Last Name", "Role", "Status", "Organization", "Profile %", "Last Login", "Created"];
    const rows = data.users.map((u) => [
      u.id,
      redactPii ? u.email.replace(/(.{2}).*(@.*)/, "$1***$2") : u.email,
      redactPii ? (u.firstName ? `${u.firstName[0]}***` : "") : (u.firstName ?? ""),
      redactPii ? (u.lastName ? `${u.lastName[0]}***` : "") : (u.lastName ?? ""),
      u.role,
      u.accountStatus,
      u.organization?.name ?? "",
      u.profileCompletionPct ?? "",
      u.lastActivityAt ?? "",
      u.createdAt,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const activeFilterCount = [
    roleFilter !== "all" ? 1 : 0,
    statusFilter !== "all" ? 1 : 0,
    lastLoginFrom ? 1 : 0,
    lastLoginTo ? 1 : 0,
    profileMin ? 1 : 0,
    profileMax ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users — God Mode"
        description="Manage all users across the platform. Search, filter, and modify user accounts."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                id="redact-pii"
                checked={redactPii}
                onCheckedChange={(v) => setRedactPii(v === true)}
              />
              <Label htmlFor="redact-pii" className="text-xs text-muted-foreground cursor-pointer">
                Redact PII
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCSVExport}
              disabled={isLoading || !data?.users.length}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* ── Search & Filters ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">All Users</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full sm:w-64"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1"
              >
                <Filter className="size-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-600 px-1.5 py-0 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* ── Advanced Filters ─────────────────────────────────────── */}
        {showFilters && (
          <CardContent className="border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="candidate">Candidate</SelectItem>
                    <SelectItem value="client_recruiter">Recruiter</SelectItem>
                    <SelectItem value="client_admin">Client Admin</SelectItem>
                    <SelectItem value="platform_admin">Platform Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Account Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="deleted">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Last Login From</Label>
                <Input
                  type="date"
                  value={lastLoginFrom}
                  onChange={(e) => setLastLoginFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Last Login To</Label>
                <Input
                  type="date"
                  value={lastLoginTo}
                  onChange={(e) => setLastLoginTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Profile Min %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={profileMin}
                  onChange={(e) => setProfileMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Profile Max %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={profileMax}
                  onChange={(e) => setProfileMax(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRoleFilter("all");
                  setStatusFilter("all");
                  setLastLoginFrom("");
                  setLastLoginTo("");
                  setProfileMin("");
                  setProfileMax("");
                }}
              >
                <X className="size-3" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        )}

        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          ) : !data?.users.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No users found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user) => {
                    const fullName =
                      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
                    const displayEmail = redactPii
                      ? user.email.replace(/(.{2}).*(@.*)/, "$1***$2")
                      : user.email;
                    return (
                      <TableRow key={user.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
                              {user.firstName?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{fullName}</p>
                              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell className="text-sm">{user.organization?.name ?? "—"}</TableCell>
                        <TableCell>{getStatusBadge(user.accountStatus)}</TableCell>
                        <TableCell>{getProfileBadge(user.profileCompletionPct)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(user.lastActivityAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="size-8 p-0">
                                <Eye className="size-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewUser(user)}>
                                <Eye className="size-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmAction({ type: "force-reset-password", userId: user.id, userName: fullName })
                                }
                              >
                                <KeyRound className="size-4 mr-2" />
                                Force Password Reset
                              </DropdownMenuItem>
                              {user.accountStatus === "active" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmAction({ type: "suspend", userId: user.id, userName: fullName })
                                  }
                                >
                                  <Pause className="size-4 mr-2" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              {user.accountStatus === "suspended" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmAction({ type: "unsuspend", userId: user.id, userName: fullName })
                                  }
                                >
                                  <Pause className="size-4 mr-2" />
                                  Unsuspend
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmAction({ type: "ban", userId: user.id, userName: fullName })
                                }
                                className="text-red-600 focus:text-red-600"
                              >
                                <Ban className="size-4 mr-2" />
                                Ban User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmAction({ type: "proxy-login", userId: user.id, userName: fullName })
                                }
                              >
                                <LogIn className="size-4 mr-2" />
                                Proxy Login
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                Showing {data.users.length} of {data.total} users
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

      {/* ── View User Dialog ──────────────────────────────────────── */}
      <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Complete user information</DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{[viewUser.firstName, viewUser.lastName].filter(Boolean).join(" ") || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium break-all">{viewUser.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <div className="mt-0.5">{getRoleBadge(viewUser.role)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-0.5">{getStatusBadge(viewUser.accountStatus)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <p className="font-medium">{viewUser.organization?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{viewUser.phone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profile Completion</p>
                  <p className="font-medium">{viewUser.profileCompletionPct !== null ? `${viewUser.profileCompletionPct}%` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Login</p>
                  <p className="font-medium">{formatDate(viewUser.lastActivityAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(viewUser.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approved</p>
                  <p className="font-medium">{viewUser.isApproved ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Confirm Action Dialog ──────────────────────────────────── */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "ban"
                ? "Ban User"
                : confirmAction?.type === "suspend"
                ? "Suspend User"
                : confirmAction?.type === "unsuspend"
                ? "Unsuspend User"
                : confirmAction?.type === "force-reset-password"
                ? "Force Password Reset"
                : "Proxy Login"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "proxy-login"
                ? `You are about to log in as ${confirmAction.userName}. This action will be logged.`
                : confirmAction?.type === "ban"
                ? `Are you sure you want to ban ${confirmAction.userName}? This action can be reversed by an admin.`
                : confirmAction?.type === "force-reset-password"
                ? `Force a password reset for ${confirmAction.userName}? They will be required to change their password on next login.`
                : `Are you sure you want to ${confirmAction?.type} ${confirmAction?.userName}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={() => confirmAction && handleAction(confirmAction.type, confirmAction.userId)}
              className={
                confirmAction?.type === "ban"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {actionLoading ? "Processing…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

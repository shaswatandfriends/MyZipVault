"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Mail,
  Loader2,
  Pencil,
  ShieldCheck,
  CreditCard,
  Send,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────────────
interface ActivityItem {
  type: "checklist_request" | "document_unlock";
  description: string;
  date: string;
}

interface TeamMember {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  lastActivity: string | null;
  createdAt: string;
  creditsUsed: number;
  checklistRequestsSent: number;
  documentsUnlocked: number;
  recentActivity: ActivityItem[];
}

interface TeamData {
  organization: {
    name: string;
    seatLimit: number;
    creditsBalance: number;
  };
  teamMembers: TeamMember[];
  activeSeats: number;
  emptySeats: number;
}

// ─── Helpers ────────────────────────────────────────────────────────
function getInitials(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) return firstName[0].toUpperCase();
  return email[0].toUpperCase();
}

function getStatusBadge(role: string) {
  if (role === "client_admin") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-xs">
        <ShieldCheck className="size-3" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100 text-xs">
      Active
    </Badge>
  );
}

// ─── Skeleton Loaders ───────────────────────────────────────────────
function SeatHeaderSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  );
}

function SeatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function RecruiterTeamPage() {
  const [data, setData] = useState<TeamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add recruiter dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Change email dialog
  const [changeEmailDialogOpen, setChangeEmailDialogOpen] = useState(false);
  const [changeEmailUserId, setChangeEmailUserId] = useState<number | null>(null);
  const [changeEmailValue, setChangeEmailValue] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/recruiter/team");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch team data");
      }
      const json = (await res.json()) as TeamData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load team", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleAddRecruiter = async () => {
    if (!addFirstName.trim() || !addLastName.trim() || !addEmail.trim()) {
      toast.error("Missing fields", {
        description: "Please fill in all fields.",
      });
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch("/api/recruiter/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_recruiter",
          firstName: addFirstName.trim(),
          lastName: addLastName.trim(),
          email: addEmail.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add recruiter");
      }

      toast.success("Invitation sent", {
        description: `An invitation has been sent to ${addEmail.trim()}.`,
      });
      setAddFirstName("");
      setAddLastName("");
      setAddEmail("");
      setAddDialogOpen(false);
      await fetchTeam();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to add recruiter", { description: message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!changeEmailUserId || !changeEmailValue.trim()) {
      toast.error("Missing fields", {
        description: "Please enter a new email address.",
      });
      return;
    }

    setIsChangingEmail(true);
    try {
      const res = await fetch("/api/recruiter/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_email",
          seatUserId: changeEmailUserId,
          email: changeEmailValue.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to change email");
      }

      toast.success("Email updated", {
        description: `Email has been changed to ${changeEmailValue.trim()}.`,
      });
      setChangeEmailDialogOpen(false);
      setChangeEmailUserId(null);
      setChangeEmailValue("");
      await fetchTeam();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to change email", { description: message });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const seatLimit = data?.organization.seatLimit ?? 5;
  const activeSeats = data?.activeSeats ?? 0;
  const seatPct = seatLimit > 0 ? Math.round((activeSeats / seatLimit) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <PageHeader
        title="Team Management"
        description="Manage your organization's recruiter seats and team members."
        actions={
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <UserPlus className="size-4" />
                Add Recruiter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Recruiter</DialogTitle>
                <DialogDescription>
                  Send an invitation to a new recruiter. They will receive an email to set up their account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addFirstName">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="addFirstName"
                      placeholder="Jane"
                      value={addFirstName}
                      onChange={(e) => setAddFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addLastName">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="addLastName"
                      placeholder="Doe"
                      value={addLastName}
                      onChange={(e) => setAddLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addEmail">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="addEmail"
                      type="email"
                      placeholder="jane.doe@example.com"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  disabled={isAdding}
                >
                  Cancel
                </Button>
                <Button
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={
                    !addFirstName.trim() || !addLastName.trim() || !addEmail.trim() || isAdding
                  }
                  onClick={handleAddRecruiter}
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Send Invite
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* ── Change Email Dialog ────────────────────────────────────── */}
      <Dialog open={changeEmailDialogOpen} onOpenChange={setChangeEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              Update the email address for this team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="new.email@example.com"
                  value={changeEmailValue}
                  onChange={(e) => setChangeEmailValue(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangeEmailDialogOpen(false);
                setChangeEmailUserId(null);
                setChangeEmailValue("");
              }}
              disabled={isChangingEmail}
            >
              Cancel
            </Button>
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!changeEmailValue.trim() || isChangingEmail}
              onClick={handleChangeEmail}
            >
              {isChangingEmail ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Seat Usage Header ──────────────────────────────────────── */}
      {isLoading ? (
        <SeatHeaderSkeleton />
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-emerald-600" />
                <span className="font-semibold">
                  {activeSeats} of {seatLimit} seats used
                </span>
              </div>
              <Badge
                className={
                  seatPct >= 100
                    ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"
                    : seatPct >= 80
                      ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                }
              >
                {data?.emptySeats ?? 0} available
              </Badge>
            </div>
            <Progress value={seatPct} className="h-2" />
            {seatPct >= 80 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {seatPct >= 100
                  ? "Seat limit reached. Upgrade your plan to add more recruiters."
                  : "Approaching seat limit. Consider upgrading your plan."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Team Member Cards ──────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SeatCardSkeleton key={i} />
          ))}
        </div>
      ) : (data?.teamMembers ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No team members</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Invite recruiters and admins to your organization. Manage their roles and permissions from this page.
            </p>
            <Button
              className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setAddDialogOpen(true)}
            >
              <UserPlus className="size-4" />
              Invite Your First Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.teamMembers ?? []).map((member) => {
            const fullName =
              [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email;

            return (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-4">
                  {/* Avatar + Info */}
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold shrink-0">
                      {getInitials(member.firstName, member.lastName, member.email)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium text-sm truncate">{fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      <div className="flex items-center gap-2 pt-0.5">
                        {getStatusBadge(member.role)}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Activity Summary */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CreditCard className="size-3.5 text-emerald-500" />
                      <span>
                        <span className="font-semibold text-foreground">{member.creditsUsed}</span> credits used
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Send className="size-3.5 text-teal-500" />
                      <span>
                        <span className="font-semibold text-foreground">{member.checklistRequestsSent}</span> requests
                      </span>
                    </div>
                  </div>

                  {/* Change Email button - only for recruiters, not admins changing their own */}
                  {member.role === "client_recruiter" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs"
                      onClick={() => {
                        setChangeEmailUserId(member.id);
                        setChangeEmailValue(member.email);
                        setChangeEmailDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                      Change Email
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Empty seat cards */}
          {Array.from({ length: data?.emptySeats ?? 0 }).map((_, i) => (
            <Card
              key={`empty-${i}`}
              className="border-dashed opacity-60 hover:opacity-100 transition-opacity"
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                    <Users className="size-5" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Empty Seat</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Invite a recruiter to fill this seat
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 gap-1.5 text-emerald-600 hover:text-emerald-700 text-xs"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    <UserPlus className="size-3.5" />
                    Add Recruiter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

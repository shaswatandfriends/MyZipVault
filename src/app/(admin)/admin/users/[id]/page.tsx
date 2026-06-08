"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Users,
  Building2,
  ClipboardCheck,
  Star,
  Share2,
  BadgeCheck,
  AlertCircle,
  Loader2,
  KeyRound,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ──────────────────────────────────────────────────────────
interface UserProfile {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  accountStatus: string;
  phone: string | null;
  isApproved: boolean;
  mustChangePass: boolean;
  lastActivityAt: string | null;
  createdAt: string;
  organizationId: number | null;
  organization: {
    id: number;
    name: string;
    credits_balance: number;
    baa_status: string;
    seat_limit: number;
  } | null;
  candidateProfile?: {
    id: number;
    first_name: string;
    last_name: string;
    phone: string;
    profile_completion_pct: number;
  } | null;
  credentials?: {
    id: number;
    document_name: string;
    file_url: string;
    expiration_date: string | null;
    status: string;
    verification_status: string;
    uploaded_at: string;
  }[];
  references?: {
    id: number;
    manager_email: string;
    manager_phone: string;
    facility_name: string;
    employment_status: string;
    status: string;
    requested_at: string;
  }[];
  checklists?: {
    id: number;
    status: string;
    valid_until: string;
    submitted_at: string | null;
    checklist_template: {
      id: number;
      name: string;
      profession: string;
      specialty: string;
    };
  }[];
  shares?: {
    id: number;
    shared_at: string;
    expires_at: string;
    is_deleted: boolean;
    client_user: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      organization: { id: number; name: string } | null;
    };
  }[];
  recruiterOrganization?: {
    id: number;
    name: string;
    credits_balance: number;
    baa_status: string;
    seat_limit: number;
  } | null;
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

function getRoleBadge(role: string) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    candidate: { bg: "bg-teal-100 border-teal-200", text: "text-teal-800", label: "Candidate" },
    client_recruiter: { bg: "bg-emerald-100 border-emerald-200", text: "text-emerald-800", label: "Recruiter" },
    client_admin: { bg: "bg-amber-100 border-amber-200", text: "text-amber-800", label: "Client Admin" },
    platform_admin: { bg: "bg-rose-100 border-rose-200", text: "text-rose-800", label: "Platform Admin" },
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

function getVerificationBadge(status: string) {
  switch (status) {
    case "verified":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"><CheckCircle2 className="size-3 mr-1" />Verified</Badge>;
    case "pending_review":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"><Clock className="size-3 mr-1" />Pending</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100"><XCircle className="size-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getReferenceStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Completed</Badge>;
    case "pending_request":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Pending</Badge>;
    case "declined":
      return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Declined</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getChecklistStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Active</Badge>;
    case "expired":
      return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Expired</Badge>;
    case "draft":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Draft</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AdminUserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch profile");
      }
      const json = await res.json();
      setProfile(json.profile as UserProfile);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load profile", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fullName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email
    : "";

  const initials = profile
    ? profile.firstName?.[0]?.toUpperCase() ?? profile.email[0]?.toUpperCase()
    : "?";

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Profile"
        description="View detailed user information."
        actions={
          <Button
            variant="outline"
            onClick={() => router.push("/admin/users")}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            Back to Users
          </Button>
        }
      />

      {isLoading ? (
        <ProfileSkeleton />
      ) : !profile ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">User not found</h3>
            <p className="text-sm text-muted-foreground">
              The user profile you&apos;re looking for doesn&apos;t exist.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Profile Header Card ────────────────────────────────── */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xl font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold">{fullName}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {getRoleBadge(profile.role)}
                    {getStatusBadge(profile.accountStatus)}
                    {profile.isApproved ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                        <CheckCircle2 className="size-3 mr-1" /> Approved
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
                        <Clock className="size-3 mr-1" /> Pending Approval
                      </Badge>
                    )}
                    {profile.mustChangePass && (
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50">
                        <KeyRound className="size-3 mr-1" /> Must Reset Password
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Basic Info Grid ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Email</CardTitle>
                <Mail className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium break-all">{profile.email}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Phone</CardTitle>
                <Phone className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{profile.phone || "—"}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Organization</CardTitle>
                <Building2 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">
                  {profile.organization?.name || "—"}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
                <Clock className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{formatDateTime(profile.lastActivityAt)}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Joined</CardTitle>
                <Calendar className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{formatDate(profile.createdAt)}</p>
              </CardContent>
            </Card>

            {profile.candidateProfile && (
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Profile Completion</CardTitle>
                  <BadgeCheck className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${profile.candidateProfile.profile_completion_pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold">
                      {profile.candidateProfile.profile_completion_pct}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Candidate-Specific Sections ─────────────────────────── */}
          {profile.role === "candidate" && (
            <div className="space-y-6">
              {/* Credentials */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                      <FileText className="size-4 text-teal-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Credentials</CardTitle>
                      <CardDescription>
                        {profile.credentials?.length || 0} credential(s) uploaded
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!profile.credentials?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No credentials uploaded</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Document</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Verification</TableHead>
                            <TableHead>Expiration</TableHead>
                            <TableHead>Uploaded</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profile.credentials.map((cred) => (
                            <TableRow key={cred.id}>
                              <TableCell className="font-medium text-sm">{cred.document_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{cred.status}</Badge>
                              </TableCell>
                              <TableCell>{getVerificationBadge(cred.verification_status)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(cred.expiration_date)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(cred.uploaded_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* References */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Users className="size-4 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">References</CardTitle>
                      <CardDescription>
                        {profile.references?.length || 0} reference(s) requested
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!profile.references?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No references requested</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Manager Email</TableHead>
                            <TableHead>Facility</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Requested</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profile.references.map((ref) => (
                            <TableRow key={ref.id}>
                              <TableCell className="text-sm">{ref.manager_email}</TableCell>
                              <TableCell className="text-sm">{ref.facility_name}</TableCell>
                              <TableCell>{getReferenceStatusBadge(ref.status)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(ref.requested_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Checklists */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <ClipboardCheck className="size-4 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Checklists</CardTitle>
                      <CardDescription>
                        {profile.checklists?.length || 0} checklist response(s)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!profile.checklists?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No checklist responses</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Checklist</TableHead>
                            <TableHead>Specialty</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Valid Until</TableHead>
                            <TableHead>Submitted</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profile.checklists.map((cl) => (
                            <TableRow key={cl.id}>
                              <TableCell className="font-medium text-sm">
                                {cl.checklist_template.name}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {cl.checklist_template.specialty}
                              </TableCell>
                              <TableCell>{getChecklistStatusBadge(cl.status)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(cl.valid_until)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(cl.submitted_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Consent Shares (Recent) */}
              {profile.shares && profile.shares.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <Share2 className="size-4 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Recent Shares</CardTitle>
                        <CardDescription>Recent consent shares with recruiters</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Shared With</TableHead>
                            <TableHead>Organization</TableHead>
                            <TableHead>Shared</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profile.shares.map((share) => (
                            <TableRow key={share.id}>
                              <TableCell className="text-sm">
                                {[share.client_user.first_name, share.client_user.last_name].filter(Boolean).join(" ") || share.client_user.email}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {share.client_user.organization?.name || "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(share.shared_at)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(share.expires_at)}
                              </TableCell>
                              <TableCell>
                                {share.is_deleted ? (
                                  <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Revoked</Badge>
                                ) : new Date(share.expires_at) < new Date() ? (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Expired</Badge>
                                ) : (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Active</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Recruiter/Client Admin Organization Info ─────────────── */}
          {(profile.role === "client_recruiter" || profile.role === "client_admin") && profile.recruiterOrganization && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Building2 className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Organization Details</CardTitle>
                    <CardDescription>Recruiter&apos;s organization information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Organization Name</p>
                    <p className="font-medium text-sm mt-1">{profile.recruiterOrganization.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Credits Balance</p>
                    <p className="font-medium text-sm mt-1">{profile.recruiterOrganization.credits_balance}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">BAA Status</p>
                    <div className="mt-1">
                      {profile.recruiterOrganization.baa_status === "signed" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Signed</Badge>
                      ) : profile.recruiterOrganization.baa_status === "pending" ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Pending</Badge>
                      ) : (
                        <Badge variant="outline">{profile.recruiterOrganization.baa_status}</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Seat Limit</p>
                    <p className="font-medium text-sm mt-1">{profile.recruiterOrganization.seat_limit}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

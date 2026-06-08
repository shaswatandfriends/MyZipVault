"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  CreditCard,
  FileCheck,
  Users,
  ChevronDown,
  ChevronUp,
  Trash2,
  Mail,
  Settings2,
  UserPlus,
  ShieldCheck,
  Copy,
  Check,
  Eye,
  KeyRound,
  ArrowRightLeft,
  Loader2,
  Activity,
  Clock,
  Send,
  FileText,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// ─── Types ──────────────────────────────────────────────────────────
interface Transaction {
  id: number;
  transactionType: string;
  creditAmount: number;
  description: string;
  createdAt: string;
}

interface Member {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  accountStatus: string;
  lastActivityAt: string | null;
  createdAt: string;
  mustChangePass: boolean;
}

interface Company {
  id: number;
  name: string;
  creditsBalance: number;
  baaStatus: string;
  baaSignedByName: string | null;
  baaSignedAt: string | null;
  seatLimit: number;
  seatsUsed: number;
  customPricingNotes: string | null;
  createdAt: string;
  members: Member[];
  transactions: Transaction[];
}

interface CompaniesResponse {
  companies: Company[];
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getBaaBadge(status: string) {
  switch (status) {
    case "signed":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Signed</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Pending</Badge>;
    case "expired":
      return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Expired</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getTransactionTypeBadge(type: string) {
  switch (type) {
    case "purchase":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Purchase</Badge>;
    case "spend":
    case "deduction":
      return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Deduction</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────
function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
    </TableRow>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminCompaniesPage() {
  const [data, setData] = useState<CompaniesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCompany, setExpandedCompany] = useState<number | null>(null);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const [showSeatDialog, setShowSeatDialog] = useState(false);
  const [showBaaDialog, setShowBaaDialog] = useState(false);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Form states
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Add form
  const [addName, setAddName] = useState("");
  const [addCredits, setAddCredits] = useState("0");
  const [addSeatLimit, setAddSeatLimit] = useState("5");
  const [addPricingNotes, setAddPricingNotes] = useState("");

  // Edit form
  const [editName, setEditName] = useState("");
  const [editPricingNotes, setEditPricingNotes] = useState("");

  // Credits form
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");

  // Seat limit form
  const [seatLimit, setSeatLimit] = useState("");

  // BAA form
  const [baaStatus, setBaaStatus] = useState("pending");
  const [baaSignedByName, setBaaSignedByName] = useState("");
  const [baaSignedByTitle, setBaaSignedByTitle] = useState("");

  // Swap email form
  const [swapUserId, setSwapUserId] = useState("");
  const [swapNewEmail, setSwapNewEmail] = useState("");

  // Add Recruiter form
  const [showAddRecruiterDialog, setShowAddRecruiterDialog] = useState(false);
  const [addRecruiterCompany, setAddRecruiterCompany] = useState<Company | null>(null);
  const [addRecruiterRole, setAddRecruiterRole] = useState("client_recruiter");
  const [addRecruiterFirstName, setAddRecruiterFirstName] = useState("");
  const [addRecruiterLastName, setAddRecruiterLastName] = useState("");
  const [addRecruiterEmail, setAddRecruiterEmail] = useState("");
  const [addRecruiterResult, setAddRecruiterResult] = useState<{ password: string; role: string } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Member Profile dialog
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileMember, setProfileMember] = useState<Member | null>(null);
  const [profileCompany, setProfileCompany] = useState<Company | null>(null);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Reset Password dialog
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPasswordMember, setResetPasswordMember] = useState<Member | null>(null);
  const [resetPasswordNew, setResetPasswordNew] = useState("");
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);
  const [resetPasswordCopied, setResetPasswordCopied] = useState(false);

  // Change Role dialog
  const [showChangeRoleDialog, setShowChangeRoleDialog] = useState(false);
  const [changeRoleMember, setChangeRoleMember] = useState<Member | null>(null);
  const [changeRoleCompany, setChangeRoleCompany] = useState<Company | null>(null);
  const [changeRoleNew, setChangeRoleNew] = useState("");

  const fetchCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/companies");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch companies");
      }
      const json = (await res.json()) as CompaniesResponse;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load companies", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const postAction = async (body: Record<string, unknown>) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/superadmin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      toast.success(json.message || "Action completed");
      fetchCompanies();
      return json;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      toast.error("Action failed", { description: message });
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCompany = async () => {
    const result = await postAction({
      action: "create",
      name: addName,
      initialCredits: parseInt(addCredits, 10) || 0,
      seatLimit: parseInt(addSeatLimit, 10) || 5,
      customPricingNotes: addPricingNotes || null,
    });
    if (result?.success) {
      setShowAddDialog(false);
      setAddName("");
      setAddCredits("0");
      setAddSeatLimit("5");
      setAddPricingNotes("");
    }
  };

  const handleEditCompany = async () => {
    if (!selectedCompany) return;
    const result = await postAction({
      action: "edit",
      organizationId: selectedCompany.id,
      name: editName,
      customPricingNotes: editPricingNotes,
    });
    if (result?.success) {
      setShowEditDialog(false);
    }
  };

  const handleSetCredits = async () => {
    if (!selectedCompany) return;
    const amount = parseInt(creditAmount, 10);
    if (isNaN(amount) || amount === 0) {
      toast.error("Enter a non-zero credit amount");
      return;
    }
    const result = await postAction({
      action: "set-credits",
      organizationId: selectedCompany.id,
      creditAmount: amount,
      description: creditDescription || undefined,
    });
    if (result?.success) {
      setShowCreditsDialog(false);
      setCreditAmount("");
      setCreditDescription("");
    }
  };

  const handleSetSeatLimit = async () => {
    if (!selectedCompany) return;
    const result = await postAction({
      action: "set-seat-limit",
      organizationId: selectedCompany.id,
      seatLimit: parseInt(seatLimit, 10) || 5,
    });
    if (result?.success) {
      setShowSeatDialog(false);
    }
  };

  const handleSetBaaStatus = async () => {
    if (!selectedCompany) return;
    const result = await postAction({
      action: "set-baa-status",
      organizationId: selectedCompany.id,
      baaStatus,
      baaSignedByName: baaSignedByName || undefined,
      baaSignedByTitle: baaSignedByTitle || undefined,
    });
    if (result?.success) {
      setShowBaaDialog(false);
    }
  };

  const handleSwapEmail = async () => {
    const result = await postAction({
      action: "swap-email",
      userId: parseInt(swapUserId, 10),
      newEmail: swapNewEmail,
    });
    if (result?.success) {
      setShowSwapDialog(false);
      setSwapUserId("");
      setSwapNewEmail("");
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;
    const result = await postAction({
      action: "delete",
      organizationId: selectedCompany.id,
    });
    if (result?.success) {
      setShowDeleteDialog(false);
    }
  };

  const openEditDialog = (company: Company) => {
    setSelectedCompany(company);
    setEditName(company.name);
    setEditPricingNotes(company.customPricingNotes ?? "");
    setShowEditDialog(true);
  };

  const openCreditsDialog = (company: Company) => {
    setSelectedCompany(company);
    setCreditAmount("");
    setCreditDescription("");
    setShowCreditsDialog(true);
  };

  const openSeatDialog = (company: Company) => {
    setSelectedCompany(company);
    setSeatLimit(String(company.seatLimit));
    setShowSeatDialog(true);
  };

  const openBaaDialog = (company: Company) => {
    setSelectedCompany(company);
    setBaaStatus(company.baaStatus);
    setBaaSignedByName(company.baaSignedByName ?? "");
    setBaaSignedByTitle("");
    setShowBaaDialog(true);
  };

  const openAddRecruiterDialog = (company: Company) => {
    setAddRecruiterCompany(company);
    setAddRecruiterRole("client_recruiter");
    setAddRecruiterFirstName("");
    setAddRecruiterLastName("");
    setAddRecruiterEmail("");
    setAddRecruiterResult(null);
    setCopiedPassword(false);
    setShowAddRecruiterDialog(true);
  };

  const handleAddRecruiter = async () => {
    if (!addRecruiterCompany) return;
    const result = await postAction({
      action: "add-recruiter",
      organizationId: addRecruiterCompany.id,
      email: addRecruiterEmail.trim(),
      firstName: addRecruiterFirstName.trim(),
      lastName: addRecruiterLastName.trim(),
      role: addRecruiterRole,
    });
    if (result?.success) {
      setAddRecruiterResult({ password: result.password, role: addRecruiterRole });
    }
  };

  const copyPassword = () => {
    if (addRecruiterResult?.password) {
      navigator.clipboard.writeText(addRecruiterResult.password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  // ── Member Profile ──────────────────────────────────────────────
  const openProfileDialog = async (member: Member, company: Company) => {
    setProfileMember(member);
    setProfileCompany(company);
    setShowProfileDialog(true);
    setProfileLoading(true);
    setProfileData(null);
    try {
      const res = await fetch(`/api/superadmin/companies/member?userId=${member.id}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setProfileData(data);
    } catch {
      toast.error("Failed to load member profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Reset Password ──────────────────────────────────────────────
  const openResetPasswordDialog = (member: Member) => {
    setResetPasswordMember(member);
    setResetPasswordNew("");
    setResetPasswordResult(null);
    setResetPasswordCopied(false);
    setShowResetPasswordDialog(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordMember) return;
    const result = await postAction({
      action: "reset-password",
      userId: resetPasswordMember.id,
      newPassword: resetPasswordNew.trim() || undefined,
    });
    if (result?.success) {
      setResetPasswordResult(result.password);
    }
  };

  const copyResetPassword = () => {
    if (resetPasswordResult) {
      navigator.clipboard.writeText(resetPasswordResult);
      setResetPasswordCopied(true);
      setTimeout(() => setResetPasswordCopied(false), 2000);
    }
  };

  // ── Change Role ─────────────────────────────────────────────────
  const openChangeRoleDialog = (member: Member, company: Company) => {
    setChangeRoleMember(member);
    setChangeRoleCompany(company);
    setChangeRoleNew(member.role === "client_admin" ? "client_recruiter" : "client_admin");
    setShowChangeRoleDialog(true);
  };

  const handleChangeRole = async () => {
    if (!changeRoleMember || !changeRoleCompany) return;
    const result = await postAction({
      action: "set-member-role",
      userId: changeRoleMember.id,
      newRole: changeRoleNew,
      organizationId: changeRoleCompany.id,
    });
    if (result?.success) {
      setShowChangeRoleDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Manage registered organizations. Configure BAA status, credits, and seat limits."
        actions={
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="size-4" />
            Add Company
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-5 text-teal-600" />
            Organizations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>BAA</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          ) : !data?.companies.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No companies yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Add your first organization to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {data.companies.map((company) => (
                <div key={company.id} className="border-b last:border-0">
                  {/* ── Company Row ──────────────────────────────────── */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold shrink-0">
                          {company.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{company.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <CreditCard className="size-3" />
                              {company.creditsBalance} credits
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="size-3" />
                              {company.seatsUsed}/{company.seatLimit}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getBaaBadge(company.baaStatus)}
                      <span className="text-xs text-muted-foreground">{formatDate(company.createdAt)}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(company)}>
                          <Settings2 className="size-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openCreditsDialog(company)}>
                          <CreditCard className="size-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openBaaDialog(company)}>
                          <FileCheck className="size-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openSeatDialog(company)}>
                          <Users className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1"
                          onClick={() => openAddRecruiterDialog(company)}
                          disabled={company.seatsUsed >= company.seatLimit}
                          title={company.seatsUsed >= company.seatLimit ? "Seat limit reached" : "Add Recruiter"}
                        >
                          <UserPlus className="size-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowSwapDialog(true)}>
                          <Mail className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExpandedCompany(expandedCompany === company.id ? null : company.id);
                          }}
                        >
                          {expandedCompany === company.id ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setSelectedCompany(company);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* ── Expanded: Tabs — Recruiter Management + Credit Transaction Ledger ── */}
                  {expandedCompany === company.id && (
                    <div className="pb-4 px-2">
                      <Tabs defaultValue="recruiters" className="w-full">
                        <TabsList className="w-full grid grid-cols-2 mb-3">
                          <TabsTrigger value="recruiters" className="gap-1.5 text-xs">
                            <Users className="size-3.5" />
                            Recruiter Management
                          </TabsTrigger>
                          <TabsTrigger value="ledger" className="gap-1.5 text-xs">
                            <CreditCard className="size-3.5" />
                            Credit Transaction Ledger
                          </TabsTrigger>
                        </TabsList>

                        {/* ── Recruiter Management Tab ────────────────────── */}
                        <TabsContent value="recruiters">
                          <Card className="bg-muted/30">
                            <CardHeader className="py-3 flex-row items-center justify-between">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Users className="size-4 text-teal-600" />
                                Team Members ({company.seatsUsed}/{company.seatLimit} seats)
                              </CardTitle>
                              <Button
                                size="sm"
                                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                                onClick={() => openAddRecruiterDialog(company)}
                                disabled={company.seatsUsed >= company.seatLimit}
                              >
                                <UserPlus className="size-3.5" />
                                Add Member
                              </Button>
                            </CardHeader>
                            <CardContent>
                              {company.members.length === 0 ? (
                                <div className="text-center py-6">
                                  <Users className="size-8 text-muted-foreground mx-auto mb-2" />
                                  <p className="text-sm text-muted-foreground">No team members yet</p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-3 gap-1.5 text-xs"
                                    onClick={() => openAddRecruiterDialog(company)}
                                  >
                                    <UserPlus className="size-3.5" />
                                    Add First Member
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {company.members.map((member) => {
                                    const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email;
                                    const initials = (member.firstName?.[0] || "") + (member.lastName?.[0] || "") || member.email[0];
                                    return (
                                      <div key={member.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-background gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <div className="flex size-9 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0">
                                            {initials.toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{fullName}</p>
                                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {member.role === "client_admin" ? (
                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-xs gap-1">
                                              <ShieldCheck className="size-3" />
                                              Admin
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100 text-xs">
                                              Recruiter
                                            </Badge>
                                          )}
                                          {member.mustChangePass && (
                                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-xs">
                                              Must Reset
                                            </Badge>
                                          )}
                                          {/* Action Buttons */}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="size-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            title="View Profile & Activity"
                                            onClick={() => openProfileDialog(member, company)}
                                          >
                                            <Eye className="size-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="size-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                            title="Reset Password"
                                            onClick={() => openResetPasswordDialog(member)}
                                          >
                                            <KeyRound className="size-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="size-7 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                            title="Change Role"
                                            onClick={() => openChangeRoleDialog(member, company)}
                                          >
                                            <ArrowRightLeft className="size-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {/* Empty seat indicators */}
                                  {Array.from({ length: Math.max(0, company.seatLimit - company.members.length) }).map((_, i) => (
                                    <div key={`empty-${i}`} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-dashed opacity-50">
                                      <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
                                        <Users className="size-4" />
                                      </div>
                                      <p className="text-sm text-muted-foreground">Empty Seat</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>

                        {/* ── Credit Transaction Ledger Tab ──────────────── */}
                        <TabsContent value="ledger">
                          <Card className="bg-muted/30">
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm">Credit Transaction Ledger</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {company.transactions.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
                              ) : (
                                <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Date</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {company.transactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                          <TableCell>{getTransactionTypeBadge(tx.transactionType)}</TableCell>
                                          <TableCell className="font-medium">
                                            {tx.transactionType === "purchase" ? "+" : "-"}
                                            {tx.creditAmount}
                                          </TableCell>
                                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                            {tx.description}
                                          </TableCell>
                                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatDate(tx.createdAt)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Company Dialog ──────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Company</DialogTitle>
            <DialogDescription>Create a new organization on the platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Acme Healthcare" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Initial Credits</Label>
                <Input type="number" min="0" value={addCredits} onChange={(e) => setAddCredits(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Seat Limit</Label>
                <Input type="number" min="1" value={addSeatLimit} onChange={(e) => setAddSeatLimit(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Custom Pricing Notes</Label>
              <Textarea value={addPricingNotes} onChange={(e) => setAddPricingNotes(e.target.value)} placeholder="Special rates, discounts..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAddCompany} disabled={actionLoading || !addName}>
              {actionLoading ? "Creating…" : "Create Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Company Dialog ─────────────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update organization details and pricing notes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Custom Pricing Notes</Label>
              <Textarea value={editPricingNotes} onChange={(e) => setEditPricingNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleEditCompany} disabled={actionLoading}>
              {actionLoading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Adjust Credits Dialog ───────────────────────────────────── */}
      <Dialog open={showCreditsDialog} onOpenChange={setShowCreditsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Credits — {selectedCompany?.name}</DialogTitle>
            <DialogDescription>
              Current balance: {selectedCompany?.creditsBalance ?? 0} credits. Use positive to add, negative to deduct.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Credit Amount (positive to add, negative to deduct)</Label>
              <Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="e.g. 100 or -50" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={creditDescription} onChange={(e) => setCreditDescription(e.target.value)} placeholder="Reason for adjustment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditsDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSetCredits} disabled={actionLoading}>
              {actionLoading ? "Processing…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Set Seat Limit Dialog ───────────────────────────────────── */}
      <Dialog open={showSeatDialog} onOpenChange={setShowSeatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Seat Limit — {selectedCompany?.name}</DialogTitle>
            <DialogDescription>Current: {selectedCompany?.seatLimit ?? 5} seats, {selectedCompany?.seatsUsed ?? 0} used.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Seat Limit</Label>
            <Input type="number" min="1" value={seatLimit} onChange={(e) => setSeatLimit(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeatDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSetSeatLimit} disabled={actionLoading}>
              {actionLoading ? "Saving…" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Set BAA Status Dialog ───────────────────────────────────── */}
      <Dialog open={showBaaDialog} onOpenChange={setShowBaaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set BAA Status — {selectedCompany?.name}</DialogTitle>
            <DialogDescription>Manage Business Associate Agreement status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>BAA Status</Label>
              <Select value={baaStatus} onValueChange={setBaaStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {baaStatus === "signed" && (
              <>
                <div className="space-y-2">
                  <Label>Signed By Name</Label>
                  <Input value={baaSignedByName} onChange={(e) => setBaaSignedByName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Signed By Title</Label>
                  <Input value={baaSignedByTitle} onChange={(e) => setBaaSignedByTitle(e.target.value)} placeholder="CEO" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBaaDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSetBaaStatus} disabled={actionLoading}>
              {actionLoading ? "Saving…" : "Update BAA Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Swap Email Dialog ────────────────────────────────────────── */}
      <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Swap Seat Email</DialogTitle>
            <DialogDescription>Change the email address for a seat in an organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input type="number" value={swapUserId} onChange={(e) => setSwapUserId(e.target.value)} placeholder="Enter user ID" />
            </div>
            <div className="space-y-2">
              <Label>New Email</Label>
              <Input type="email" value={swapNewEmail} onChange={(e) => setSwapNewEmail(e.target.value)} placeholder="new.email@example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSwapDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSwapEmail} disabled={actionLoading || !swapUserId || !swapNewEmail}>
              {actionLoading ? "Processing…" : "Swap Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Recruiter Dialog ─────────────────────────────────────── */}
      <Dialog open={showAddRecruiterDialog} onOpenChange={(open) => {
        if (!open) setAddRecruiterResult(null);
        setShowAddRecruiterDialog(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addRecruiterResult ? "Member Added Successfully" : `Add Member — ${addRecruiterCompany?.name}`}
            </DialogTitle>
            <DialogDescription>
              {addRecruiterResult
                ? "Share the credentials below with the new member."
                : `Current: ${addRecruiterCompany?.seatsUsed ?? 0}/${addRecruiterCompany?.seatLimit ?? 5} seats used`}
            </DialogDescription>
          </DialogHeader>

          {addRecruiterResult ? (
            /* ── Success Step ────────────────────────────────────── */
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <p className="text-sm font-medium text-emerald-800">
                  {addRecruiterResult.role === "client_admin" ? "Admin" : "Recruiter"} account created
                </p>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-mono bg-white rounded px-2 py-1 border">{addRecruiterEmail}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Auto-generated Password</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono bg-white rounded px-2 py-1 border flex-1 break-all">
                      {addRecruiterResult.password}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1"
                      onClick={copyPassword}
                    >
                      {copiedPassword ? (
                        <><Check className="size-3.5" /> Copied</>
                      ) : (
                        <><Copy className="size-3.5" /> Copy</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-amber-600">
                The member must change this password on first login.
              </p>
            </div>
          ) : (
            /* ── Form Step ───────────────────────────────────────── */
            <div className="space-y-4 py-2">
              {/* Seat info banner */}
              <div className="rounded-lg border bg-muted/50 px-3 py-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Seats</span>
                <span className="font-medium">
                  {addRecruiterCompany?.seatsUsed ?? 0}/{addRecruiterCompany?.seatLimit ?? 5} used
                  <span className="text-muted-foreground ml-1.5">
                    ({Math.max(0, (addRecruiterCompany?.seatLimit ?? 5) - (addRecruiterCompany?.seatsUsed ?? 0))} available)
                  </span>
                </span>
              </div>

              {/* Role selector */}
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={addRecruiterRole} onValueChange={setAddRecruiterRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client_recruiter">Recruiter</SelectItem>
                    <SelectItem value="client_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {addRecruiterRole === "client_admin" && (
                  <p className="text-xs text-amber-600">
                    Only one admin is allowed per company.
                  </p>
                )}
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>First Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={addRecruiterFirstName}
                    onChange={(e) => setAddRecruiterFirstName(e.target.value)}
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={addRecruiterLastName}
                    onChange={(e) => setAddRecruiterLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>Email <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={addRecruiterEmail}
                    onChange={(e) => setAddRecruiterEmail(e.target.value)}
                    placeholder="jane.doe@example.com"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {addRecruiterResult ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setShowAddRecruiterDialog(false);
                  setAddRecruiterResult(null);
                }}
              >
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowAddRecruiterDialog(false)}>Cancel</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  onClick={handleAddRecruiter}
                  disabled={
                    actionLoading ||
                    !addRecruiterFirstName.trim() ||
                    !addRecruiterLastName.trim() ||
                    !addRecruiterEmail.trim()
                  }
                >
                  <UserPlus className="size-3.5" />
                  {actionLoading ? "Adding..." : "Add Member"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Member Profile & Activity Dialog ────────────────────────── */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5 text-blue-600" />
              Member Profile
            </DialogTitle>
            <DialogDescription>
              {profileMember ? [profileMember.firstName, profileMember.lastName].filter(Boolean).join(" ") : "Loading..."}
              {profileCompany ? ` — ${profileCompany.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          {profileLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !profileData || !profileMember ? (
            <p className="text-sm text-muted-foreground text-center py-8">Failed to load profile</p>
          ) : (
            <div className="space-y-5 py-2">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-lg font-bold shrink-0">
                  {((profileMember.firstName?.[0] || "") + (profileMember.lastName?.[0] || "") || profileMember.email[0]).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-base">{[profileMember.firstName, profileMember.lastName].filter(Boolean).join(" ") || profileMember.email}</p>
                  <p className="text-sm text-muted-foreground truncate">{profileMember.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {profileMember.role === "client_admin" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-xs gap-1">
                        <ShieldCheck className="size-3" /> Admin
                      </Badge>
                    ) : (
                      <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100 text-xs">Recruiter</Badge>
                    )}
                    {profileMember.mustChangePass && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-xs">Must Reset Password</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> Joined</p>
                  <p className="font-medium">{formatDate(profileMember.createdAt)}</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="size-3" /> Last Active</p>
                  <p className="font-medium">{profileMember.lastActivityAt ? formatDate(profileMember.lastActivityAt) : "Never"}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{(profileData.stats as Record<string, number>)?.totalChecklistsSent ?? 0}</p>
                  <p className="text-xs text-blue-600 flex items-center justify-center gap-1"><Send className="size-3" /> Checklists Sent</p>
                </div>
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-center">
                  <p className="text-2xl font-bold text-teal-700">{(profileData.stats as Record<string, number>)?.totalDocumentsUnlocked ?? 0}</p>
                  <p className="text-xs text-teal-600 flex items-center justify-center gap-1"><FileText className="size-3" /> Documents Unlocked</p>
                </div>
              </div>

              {/* Activity Timeline */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Activity className="size-4 text-muted-foreground" />
                  Recent Activity
                </h4>
                <div className="space-y-1.5 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                  {(() => {
                    const activity = profileData.activity as Record<string, Array<Record<string, unknown>>>;
                    const allActivity = [
                      ...(activity?.checklistRequests || []).map((a) => ({ ...a, sortDate: new Date(a.date as string).getTime() })),
                      ...(activity?.unlockedDocuments || []).map((a) => ({ ...a, sortDate: new Date(a.date as string).getTime() })),
                      ...(activity?.auditLogs || []).map((a) => ({ ...a, sortDate: new Date(a.date as string).getTime() })),
                    ].sort((a, b) => b.sortDate - a.sortDate).slice(0, 15);

                    if (allActivity.length === 0) {
                      return <p className="text-xs text-muted-foreground text-center py-4">No activity recorded</p>;
                    }

                    return allActivity.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 py-1.5 px-2 text-xs rounded hover:bg-muted/50">
                        <div className="mt-0.5 shrink-0">
                          {item.type === "checklist_request" ? (
                            <Send className="size-3.5 text-blue-500" />
                          ) : item.type === "document_unlock" ? (
                            <FileText className="size-3.5 text-teal-500" />
                          ) : (
                            <Activity className="size-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-muted-foreground truncate">{item.description as string}</p>
                          <p className="text-muted-foreground/60">{formatDate(item.date as string)}</p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ──────────────────────────────────── */}
      <Dialog open={showResetPasswordDialog} onOpenChange={(open) => {
        if (!open) setResetPasswordResult(null);
        setShowResetPasswordDialog(open);
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-amber-600" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              {resetPasswordMember ? `Reset password for ${[resetPasswordMember.firstName, resetPasswordMember.lastName].filter(Boolean).join(" ") || resetPasswordMember.email}` : ""}
            </DialogDescription>
          </DialogHeader>

          {resetPasswordResult ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <p className="text-sm font-medium text-emerald-800">Password reset successfully</p>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">New Password</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono bg-white rounded px-2 py-1 border flex-1 break-all">
                      {resetPasswordResult}
                    </p>
                    <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={copyResetPassword}>
                      {resetPasswordCopied ? (
                        <><Check className="size-3.5" /> Copied</>
                      ) : (
                        <><Copy className="size-3.5" /> Copy</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-amber-600">
                The member must change this password on next login.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-amber-50 border-amber-200 px-3 py-2 text-sm text-amber-800">
                This will generate a new password. The member will be required to change it on next login.
              </div>
              <div className="space-y-2">
                <Label>New Password (leave blank to auto-generate)</Label>
                <Input
                  value={resetPasswordNew}
                  onChange={(e) => setResetPasswordNew(e.target.value)}
                  placeholder="Auto-generated if blank"
                  type="text"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {resetPasswordResult ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setShowResetPasswordDialog(false)}
              >
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>Cancel</Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                  onClick={handleResetPassword}
                  disabled={actionLoading}
                >
                  <KeyRound className="size-3.5" />
                  {actionLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Role Dialog ──────────────────────────────────────── */}
      <Dialog open={showChangeRoleDialog} onOpenChange={setShowChangeRoleDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-purple-600" />
              Change Role
            </DialogTitle>
            <DialogDescription>
              {changeRoleMember ? `Change role for ${[changeRoleMember.firstName, changeRoleMember.lastName].filter(Boolean).join(" ") || changeRoleMember.email}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/50 px-3 py-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Role</span>
              <Badge className={changeRoleMember?.role === "client_admin" ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-xs gap-1" : "bg-teal-100 text-teal-800 border-teal-200 text-xs"}>
                {changeRoleMember?.role === "client_admin" ? (
                  <><ShieldCheck className="size-3" /> Admin</>
                ) : (
                  "Recruiter"
                )}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={changeRoleNew} onValueChange={setChangeRoleNew}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_recruiter">Recruiter</SelectItem>
                  <SelectItem value="client_admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {changeRoleNew === "client_admin" && (
                <p className="text-xs text-amber-600">
                  Only one admin is allowed per company. If an admin already exists, this will fail.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeRoleDialog(false)}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
              onClick={handleChangeRole}
              disabled={actionLoading || changeRoleNew === changeRoleMember?.role}
            >
              <ArrowRightLeft className="size-3.5" />
              {actionLoading ? "Changing..." : "Change Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Company Confirmation ──────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedCompany?.name}&quot;? This action cannot be undone.
              The organization must have no active users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={handleDeleteCompany}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? "Deleting…" : "Delete Company"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

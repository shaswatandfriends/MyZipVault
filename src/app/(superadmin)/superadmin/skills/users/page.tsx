"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Eye,
  Download,
  Clock,
  Trash2,
  Calendar,
  Pencil,
  CheckCircle2,
  XCircle,
  Inbox,
  AlertTriangle,
  Activity,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Progress } from "@/components/ui/progress";

// ─── Types ──────────────────────────────────────────────────────────
interface CandidateResponse {
  id: number;
  status: string;
  validUntil: string;
  submittedAt: string | null;
  digitalSignature: string | null;
  candidateNameSigned: string | null;
  template: { id: number; profession: string; specialty: string; name: string } | null;
  skillRatingsCount: number;
}

interface CandidateItem {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  totalChecklists: number;
  completed: number;
  inProgress: number;
  expiring: number;
  expired: number;
  responses: CandidateResponse[];
}

interface CandidatesData {
  candidates: CandidateItem[];
  stats: {
    totalCandidates: number;
    activeChecklists: number;
    expiringWithin7: number;
    expired: number;
  };
}

interface ResponseDetail {
  id: number;
  status: string;
  validUntil: string;
  submittedAt: string | null;
  digitalSignature: string | null;
  candidateNameSigned: string | null;
  candidate: { id: number; firstName: string | null; lastName: string | null; email: string };
  template: { id: number; profession: string; specialty: string; name: string; jobTitle: string | null; totalSkills: number };
  categories: Array<{
    category: string;
    skills: Array<{
      skillId: number;
      skillName: string;
      questionType: string;
      sortOrder: number;
      hasNaOption: boolean;
      ratingValue: string | null;
      isNa: boolean;
      ratingId: number | null;
    }>;
  }>;
}

// ─── Helpers ────────────────────────────────────────────────────────
function getName(item: { firstName: string | null; lastName: string | null; email: string }): string {
  return [item.firstName, item.lastName].filter(Boolean).join(" ") || item.email;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getExpiryBadge(validUntil: string) {
  const now = new Date();
  const expiry = new Date(validUntil);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100 text-[10px]">Expired</Badge>;
  if (diffDays <= 7) return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[10px]">Expiring</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px]">Valid</Badge>;
}

function getResponseStatusBadge(status: string) {
  if (status === "submitted") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px]">Submitted</Badge>;
  return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-[10px]">Active</Badge>;
}

function getRatingLabel(value: string | null, questionType: string): string {
  if (!value) return "—";
  if (questionType === "rating_1_4") {
    switch (value) {
      case "1": return "1 — No Experience";
      case "2": return "2 — Minimal";
      case "3": return "3 — Competent";
      case "4": return "4 — Expert";
      default: return value;
    }
  }
  if (questionType === "yes_no") return value === "yes" ? "Yes" : "No";
  return value;
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SkillsUsersPage() {
  const [data, setData] = useState<CandidatesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterExpiration, setFilterExpiration] = useState("all");

  // View Checklist dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewResponseId, setViewResponseId] = useState<number | null>(null);
  const [viewData, setViewData] = useState<ResponseDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Extend expiry dialog
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendResponseId, setExtendResponseId] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState("30");
  const [extendLoading, setExtendLoading] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteResponseId, setDeleteResponseId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<ResponseDetail | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editRatings, setEditRatings] = useState<Record<number, { ratingValue: string; isNa: boolean }>>({});

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterExpiration !== "all") params.set("expiration", filterExpiration);

      const res = await fetch(`/api/superadmin/skills/users?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch candidates");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load candidates", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterStatus, filterExpiration]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── View Checklist ────────────────────────────────────────────────
  const handleViewChecklist = async (responseId: number) => {
    try {
      setViewLoading(true);
      setViewResponseId(responseId);
      setViewDialogOpen(true);
      const res = await fetch(`/api/superadmin/skills/users/${responseId}`);
      if (!res.ok) throw new Error("Failed to fetch response detail");
      const json = await res.json();
      setViewData(json);
    } catch (err) {
      toast.error("Failed to load checklist detail");
      setViewDialogOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  // ── Extend Expiry ─────────────────────────────────────────────────
  const handleExtendExpiry = async () => {
    if (!extendResponseId) return;
    try {
      setExtendLoading(true);
      const res = await fetch(`/api/superadmin/skills/users/${extendResponseId}/extend`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendDays: parseInt(extendDays) }),
      });
      if (!res.ok) throw new Error("Failed to extend expiry");
      toast.success(`Expiry extended by ${extendDays} days`);
      setExtendDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to extend expiry");
    } finally {
      setExtendLoading(false);
    }
  };

  // ── Delete Response ───────────────────────────────────────────────
  const handleDeleteResponse = async () => {
    if (!deleteResponseId) return;
    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/superadmin/skills/users/${deleteResponseId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete response");
      toast.success("Response deleted successfully");
      setDeleteDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to delete response");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Edit Responses ────────────────────────────────────────────────
  const handleEditChecklist = async (responseId: number) => {
    try {
      const res = await fetch(`/api/superadmin/skills/users/${responseId}`);
      if (!res.ok) throw new Error("Failed to fetch response detail");
      const json = await res.json();
      setEditData(json);
      // Initialize editRatings
      const ratings: Record<number, { ratingValue: string; isNa: boolean }> = {};
      for (const cat of json.categories) {
        for (const skill of cat.skills) {
          if (skill.ratingId) {
            ratings[skill.ratingId] = { ratingValue: skill.ratingValue || "", isNa: skill.isNa };
          }
        }
      }
      setEditRatings(ratings);
      setEditDialogOpen(true);
    } catch {
      toast.error("Failed to load checklist for editing");
    }
  };

  const handleSaveEdits = async () => {
    if (!editData) return;
    try {
      setEditLoading(true);
      const ratings = Object.entries(editRatings).map(([ratingId, val]) => ({
        ratingId: parseInt(ratingId),
        ratingValue: val.ratingValue,
        isNa: val.isNa,
      }));
      const res = await fetch(`/api/superadmin/skills/users/${editData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings }),
      });
      if (!res.ok) throw new Error("Failed to update ratings");
      toast.success("Ratings updated successfully");
      setEditDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Failed to update ratings");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="All candidates with checklist responses"
        actions={
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* ─── Stats ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.totalCandidates}</p>
                  <p className="text-xs text-muted-foreground">Candidates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 shrink-0">
                  <Activity className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.activeChecklists}</p>
                  <p className="text-xs text-muted-foreground">Active Checklists</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${data.stats.expiringWithin7 > 0 ? "border-l-amber-500" : "border-l-gray-400"}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-lg shrink-0 ${data.stats.expiringWithin7 > 0 ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-500"}`}>
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.expiringWithin7}</p>
                  <p className="text-xs text-muted-foreground">Expiring 7d</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${data.stats.expired > 0 ? "border-l-red-500" : "border-l-gray-400"}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-lg shrink-0 ${data.stats.expired > 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"}`}>
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.stats.expired}</p>
                  <p className="text-xs text-muted-foreground">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ─── Search & Filter ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="size-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="active">In Progress</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterExpiration} onValueChange={setFilterExpiration}>
          <SelectTrigger className="w-full sm:w-48">
            <Clock className="size-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Expiration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Expiration</SelectItem>
            <SelectItem value="valid">Valid</SelectItem>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── Table ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : !data?.candidates.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No candidates found</h3>
              <p className="text-sm text-muted-foreground">No candidates have checklist responses yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead className="text-center">In Progress</TableHead>
                    <TableHead className="text-center">Expiring</TableHead>
                    <TableHead className="text-center">Expired</TableHead>
                    <TableHead className="w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.candidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="font-medium text-sm">{getName(candidate)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{candidate.email}</TableCell>
                      <TableCell className="text-center text-sm">{candidate.totalChecklists}</TableCell>
                      <TableCell className="text-center text-sm text-emerald-700">{candidate.completed}</TableCell>
                      <TableCell className="text-center text-sm text-blue-700">{candidate.inProgress}</TableCell>
                      <TableCell className="text-center text-sm text-amber-700">{candidate.expiring}</TableCell>
                      <TableCell className="text-center text-sm text-red-700">{candidate.expired}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          {candidate.responses.map((resp) => (
                            <div key={resp.id} className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                title="View checklist"
                                onClick={() => handleViewChecklist(resp.id)}
                              >
                                <Eye className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                title="Extend expiry"
                                onClick={() => { setExtendResponseId(resp.id); setExtendDialogOpen(true); }}
                              >
                                <Calendar className="size-3.5 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                title="Edit ratings"
                                onClick={() => handleEditChecklist(resp.id)}
                              >
                                <Pencil className="size-3.5 text-emerald-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                title="Delete response"
                                onClick={() => { setDeleteResponseId(resp.id); setDeleteDialogOpen(true); }}
                              >
                                <Trash2 className="size-3.5 text-red-600" />
                              </Button>
                            </div>
                          )).slice(0, 1)}
                          {candidate.responses.length > 1 && (
                            <span className="text-[10px] text-muted-foreground ml-1">+{candidate.responses.length - 1} more</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── View Checklist Dialog ─────────────────────────────────────── */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checklist Detail</DialogTitle>
            <DialogDescription>
              {viewData ? `${viewData.template.profession} — ${viewData.template.specialty} for ${getName(viewData.candidate)}` : "Loading..."}
            </DialogDescription>
          </DialogHeader>
          {viewLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : viewData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {getResponseStatusBadge(viewData.status)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valid Until</p>
                  {getExpiryBadge(viewData.validUntil)}
                  <span className="text-sm ml-1">{formatDate(viewData.validUntil)}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <span className="text-sm">{viewData.submittedAt ? formatDate(viewData.submittedAt) : "Not yet"}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Digital Signature</p>
                  <span className="text-sm">{viewData.digitalSignature ? "Yes" : "No"}</span>
                </div>
              </div>

              {viewData.categories.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-emerald-800 border-b pb-1">{cat.category}</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Skill</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cat.skills.map((skill) => (
                        <TableRow key={skill.skillId}>
                          <TableCell className="text-xs">{skill.skillName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{skill.questionType}</TableCell>
                          <TableCell className="text-xs">
                            {skill.isNa ? (
                              <Badge variant="outline" className="text-[10px]">N/A</Badge>
                            ) : (
                              getRatingLabel(skill.ratingValue, skill.questionType)
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ─── Extend Expiry Dialog ─────────────────────────────────────── */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Expiry</DialogTitle>
            <DialogDescription>Extend the valid until date for this checklist response.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Extend by (days)</Label>
              <Select value={extendDays} onValueChange={setExtendDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">365 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleExtendExpiry}
              disabled={extendLoading}
            >
              {extendLoading && <Loader2 className="size-4 animate-spin mr-2" />}
              Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Response</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this checklist response? This action cannot be undone. All skill ratings will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteResponse}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="size-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Edit Ratings Dialog ──────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Ratings</DialogTitle>
            <DialogDescription>
              {editData ? `${editData.template.profession} — ${editData.template.specialty} for ${getName(editData.candidate)}` : "Loading..."}
            </DialogDescription>
          </DialogHeader>
          {editData ? (
            <div className="space-y-4">
              {editData.categories.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-emerald-800 border-b pb-1">{cat.category}</h4>
                  <div className="space-y-2">
                    {cat.skills.map((skill) => {
                      if (!skill.ratingId) return null;
                      const current = editRatings[skill.ratingId];
                      return (
                        <div key={skill.skillId} className="flex items-center gap-3 p-2 rounded bg-gray-50">
                          <span className="text-sm flex-1">{skill.skillName}</span>
                          {skill.questionType === "rating_1_4" && (
                            <div className="flex gap-1">
                              {["1", "2", "3", "4"].map((val) => (
                                <Button
                                  key={val}
                                  variant={current?.ratingValue === val && !current?.isNa ? "default" : "outline"}
                                  size="sm"
                                  className={`size-8 p-0 text-xs ${current?.ratingValue === val && !current?.isNa ? "bg-emerald-600 text-white" : ""}`}
                                  onClick={() => setEditRatings((prev) => ({
                                    ...prev,
                                    [skill.ratingId!]: { ratingValue: val, isNa: false },
                                  }))}
                                >
                                  {val}
                                </Button>
                              ))}
                            </div>
                          )}
                          {skill.questionType === "yes_no" && (
                            <div className="flex gap-1">
                              <Button
                                variant={current?.ratingValue === "yes" && !current?.isNa ? "default" : "outline"}
                                size="sm"
                                className={`text-xs ${current?.ratingValue === "yes" && !current?.isNa ? "bg-emerald-600 text-white" : ""}`}
                                onClick={() => setEditRatings((prev) => ({
                                  ...prev,
                                  [skill.ratingId!]: { ratingValue: "yes", isNa: false },
                                }))}
                              >
                                Yes
                              </Button>
                              <Button
                                variant={current?.ratingValue === "no" && !current?.isNa ? "default" : "outline"}
                                size="sm"
                                className={`text-xs ${current?.ratingValue === "no" && !current?.isNa ? "bg-emerald-600 text-white" : ""}`}
                                onClick={() => setEditRatings((prev) => ({
                                  ...prev,
                                  [skill.ratingId!]: { ratingValue: "no", isNa: false },
                                }))}
                              >
                                No
                              </Button>
                            </div>
                          )}
                          {skill.questionType === "text" && (
                            <Input
                              className="w-48 h-8 text-sm"
                              value={current?.isNa ? "" : (current?.ratingValue || "")}
                              onChange={(e) => setEditRatings((prev) => ({
                                ...prev,
                                [skill.ratingId!]: { ratingValue: e.target.value, isNa: false },
                              }))}
                              placeholder="Enter text..."
                              disabled={current?.isNa}
                            />
                          )}
                          {skill.hasNaOption && (
                            <Button
                              variant={current?.isNa ? "default" : "outline"}
                              size="sm"
                              className={`text-xs ${current?.isNa ? "bg-gray-600 text-white" : ""}`}
                              onClick={() => setEditRatings((prev) => ({
                                ...prev,
                                [skill.ratingId!]: { ratingValue: "", isNa: !current?.isNa },
                              }))}
                            >
                              N/A
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSaveEdits}
              disabled={editLoading}
            >
              {editLoading && <Loader2 className="size-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

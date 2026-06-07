"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Trash2,
  ShieldCheck,
  FileArchive,
  Receipt,
  Search,
  Download,
  AlertTriangle,
  RotateCcw,
  UserX,
  Plus,
  Loader2,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
interface DeletionQueueItem {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  deletionRequestedAt: string | null;
  daysRemaining: number;
  isPastWindow: boolean;
}

interface CandidateExport {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profile: unknown;
  credentials: { id: number; documentName: string; status: string; verificationStatus: string; expirationDate: string | null; uploadedAt: string }[];
  checklists: { id: number; templateName: string; status: string; validUntil: string; submittedAt: string | null }[];
  references: { id: number; managerEmail: string; facilityName: string; status: string }[];
  consentShares: { id: number; sharedAt: string; expiresAt: string }[];
  auditLogs: { id: number; action: string; createdAt: string }[];
  resumes: { id: number; createdAt: string }[];
}

interface InvoiceItem {
  id: number;
  organizationId: number;
  organizationName: string;
  creditAmount: number;
  totalPrice: number;
  pdfUrl: string | null;
  createdAt: string;
}

interface Organization {
  id: number;
  name: string;
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminCompliancePage() {
  // Deletion Queue state
  const [deletionQueue, setDeletionQueue] = useState<DeletionQueueItem[]>([]);
  const [deletionLoading, setDeletionLoading] = useState(true);
  const [purgeId, setPurgeId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // HIPAA Export state
  const [searchEmail, setSearchEmail] = useState("");
  const [candidate, setCandidate] = useState<CandidateExport | null>(null);
  const [hipaaLoading, setHipaaLoading] = useState(false);
  const [exportGenerating, setExportGenerating] = useState(false);

  // Invoice state
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [pricePerCredit, setPricePerCredit] = useState("1.00");
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);
  const [hipaaExportingId, setHipaaExportingId] = useState<number | null>(null);

  // ── Fetch deletion queue ────────────────────────────────────────
  const fetchDeletionQueue = useCallback(async () => {
    try {
      setDeletionLoading(true);
      const res = await fetch("/api/superadmin/compliance?section=deletion_queue");
      if (!res.ok) throw new Error("Failed to fetch deletion queue");
      const json = await res.json();
      setDeletionQueue(json.deletionQueue);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load deletion queue", { description: message });
    } finally {
      setDeletionLoading(false);
    }
  }, []);

  // ── Fetch invoices ──────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    try {
      setInvoiceLoading(true);
      const res = await fetch("/api/superadmin/compliance?section=invoices");
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const json = await res.json();
      setInvoices(json.invoices);
      setOrganizations(json.organizations);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load invoices", { description: message });
    } finally {
      setInvoiceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeletionQueue();
    fetchInvoices();
  }, [fetchDeletionQueue, fetchInvoices]);

  // ── Actions ─────────────────────────────────────────────────────
  const handlePurge = async () => {
    if (!purgeId) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/superadmin/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge_account", userId: purgeId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to purge");
      toast.success("Account purged permanently");
      setPurgeId(null);
      fetchDeletionQueue();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to purge";
      toast.error("Purge failed", { description: message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDeletion = async (userId: number) => {
    try {
      const res = await fetch("/api/superadmin/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel_deletion", userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to cancel deletion");
      toast.success("Deletion cancelled, account restored");
      fetchDeletionQueue();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel deletion";
      toast.error("Cancel failed", { description: message });
    }
  };

  const handleSearchCandidate = async () => {
    if (!searchEmail.trim()) return;
    try {
      setHipaaLoading(true);
      const res = await fetch(`/api/superadmin/compliance?section=hipaa_export&email=${encodeURIComponent(searchEmail)}`);
      if (!res.ok) throw new Error("Failed to search candidate");
      const json = await res.json();
      setCandidate(json.candidate);
      if (!json.candidate) {
        toast.error("No candidate found with that email");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      toast.error("Search failed", { description: message });
    } finally {
      setHipaaLoading(false);
    }
  };

  const handleGenerateExport = async () => {
    if (!candidate) return;
    try {
      setExportGenerating(true);
      const res = await fetch(`/api/superadmin/compliance/hipaa-export?userId=${candidate.id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate export");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hipaa-export-${candidate.email.replace(/[^a-zA-Z0-9._-]/g, "_")}-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("HIPAA export downloaded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate export";
      toast.error("Export failed", { description: message });
    } finally {
      setExportGenerating(false);
    }
  };

  const handleHipaaExportFromQueue = async (userId: number, email: string) => {
    try {
      setHipaaExportingId(userId);
      const res = await fetch(`/api/superadmin/compliance/hipaa-export?userId=${userId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate export");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hipaa-export-${email.replace(/[^a-zA-Z0-9._-]/g, "_")}-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("HIPAA export downloaded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export data";
      toast.error("Export failed", { description: message });
    } finally {
      setHipaaExportingId(null);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedOrgId || !creditAmount || !pricePerCredit) {
      toast.error("All fields are required");
      return;
    }
    try {
      setInvoiceSaving(true);
      const res = await fetch("/api/superadmin/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_invoice",
          organizationId: parseInt(selectedOrgId),
          creditAmount: parseInt(creditAmount),
          pricePerCredit: parseFloat(pricePerCredit),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate invoice");
      toast.success("Invoice generated", {
        description: `Total: ${formatCurrency(json.totalPrice)}`,
      });
      setSelectedOrgId("");
      setCreditAmount("");
      setPricePerCredit("1.00");
      fetchInvoices();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate invoice";
      toast.error("Invoice failed", { description: message });
    } finally {
      setInvoiceSaving(false);
    }
  };

  const totalInvoice = creditAmount && pricePerCredit
    ? formatCurrency(parseInt(creditAmount || "0") * parseFloat(pricePerCredit || "0"))
    : "$0.00";

  const handleDownloadInvoicePdf = async (invoiceId: number) => {
    try {
      setDownloadingInvoiceId(invoiceId);
      const res = await fetch(`/api/superadmin/compliance/invoice-pdf?invoiceId=${invoiceId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate invoice PDF");
      }
      const json = await res.json();

      if (json.isBase64 && json.url?.startsWith("data:")) {
        // For base64 data URLs, convert to blob and open
        const byteString = atob(json.url.split(",")[1]);
        const mimeString = json.url.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } else if (json.url) {
        window.open(json.url, "_blank");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to download PDF";
      toast.error("Download failed", { description: message });
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Tools"
        description="Data purge, HIPAA export, and invoice management."
      />

      <Tabs defaultValue="deletion_queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deletion_queue" className="gap-2">
            <Trash2 className="size-4" />
            Deletion Queue
          </TabsTrigger>
          <TabsTrigger value="hipaa_export" className="gap-2">
            <FileArchive className="size-4" />
            HIPAA Export
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="size-4" />
            Invoice Generator
          </TabsTrigger>
        </TabsList>

        {/* ── Deletion Queue Tab ──────────────────────────────────── */}
        <TabsContent value="deletion_queue">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <UserX className="size-4 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Deletion Queue</CardTitle>
                  <CardDescription>
                    Accounts in the 30-day deletion window. Past-due accounts are marked for immediate purge.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {deletionLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : deletionQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShieldCheck className="size-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No pending deletions</h3>
                  <p className="text-sm text-muted-foreground">No accounts are scheduled for deletion.</p>
                </div>
              ) : (
                <div className="max-h-[28rem] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Days Left</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletionQueue.map((item) => {
                        const fullName =
                          [item.firstName, item.lastName].filter(Boolean).join(" ") || "Unknown";
                        return (
                          <TableRow key={item.id} className={item.isPastWindow ? "bg-red-50/50" : ""}>
                            <TableCell className="font-medium text-sm">{fullName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.email}</TableCell>
                            <TableCell className="text-sm">{formatDate(item.deletionRequestedAt)}</TableCell>
                            <TableCell>
                              <span
                                className={`text-sm font-medium ${
                                  item.isPastWindow
                                    ? "text-red-600"
                                    : item.daysRemaining <= 7
                                    ? "text-amber-600"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {item.isPastWindow ? "Overdue" : `${item.daysRemaining}d`}
                              </span>
                            </TableCell>
                            <TableCell>
                              {item.isPastWindow ? (
                                <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                                  Purge Ready
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  disabled={hipaaExportingId === item.id}
                                  onClick={() => handleHipaaExportFromQueue(item.id, item.email)}
                                >
                                  {hipaaExportingId === item.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <Download className="size-3" />
                                  )}
                                  {hipaaExportingId === item.id ? "Exporting…" : "Export (HIPAA)"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleCancelDeletion(item.id)}
                                >
                                  <RotateCcw className="size-3" />
                                  Restore
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => setPurgeId(item.id)}
                                >
                                  <Trash2 className="size-3" />
                                  Purge
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── HIPAA Export Tab ────────────────────────────────────── */}
        <TabsContent value="hipaa_export">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <FileArchive className="size-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base">HIPAA Data Export</CardTitle>
                  <CardDescription>
                    Generate a complete data export for a candidate. Includes all personal data per HIPAA requirements.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by candidate email…"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="pl-8"
                    onKeyDown={(e) => e.key === "Enter" && handleSearchCandidate()}
                  />
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={handleSearchCandidate}
                  disabled={hipaaLoading}
                >
                  <Search className="size-4" />
                  {hipaaLoading ? "Searching…" : "Search"}
                </Button>
              </div>

              {candidate && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm">
                          {[candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">{candidate.email}</p>
                      </div>
                      <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-100">
                        Candidate
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Export would include:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="rounded-md bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold text-teal-700">{candidate.credentials.length}</p>
                        <p className="text-xs text-muted-foreground">Credentials</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold text-teal-700">{candidate.checklists.length}</p>
                        <p className="text-xs text-muted-foreground">Checklists</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold text-teal-700">{candidate.references.length}</p>
                        <p className="text-xs text-muted-foreground">References</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold text-teal-700">{candidate.consentShares.length}</p>
                        <p className="text-xs text-muted-foreground">Consent Shares</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold text-teal-700">{candidate.auditLogs.length}</p>
                        <p className="text-xs text-muted-foreground">Audit Logs</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold text-teal-700">{candidate.resumes.length}</p>
                        <p className="text-xs text-muted-foreground">Resumes</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      onClick={handleGenerateExport}
                      disabled={exportGenerating}
                    >
                      {exportGenerating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      {exportGenerating ? "Generating…" : "Download Export ZIP"}
                    </Button>
                  </div>
                </div>
              )}

              {!candidate && !hipaaLoading && searchEmail && (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <AlertTriangle className="size-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No candidate found. Try a different email.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Invoice Generator Tab ───────────────────────────────── */}
        <TabsContent value="invoices">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Receipt className="size-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Generate Invoice</CardTitle>
                    <CardDescription>Create a new credit invoice</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization…" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={String(org.id)}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Credit Amount</Label>
                  <Input
                    type="number"
                    min="1"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price Per Credit ($)</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={pricePerCredit}
                    onChange={(e) => setPricePerCredit(e.target.value)}
                    placeholder="1.00"
                  />
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-lg font-bold text-emerald-700">{totalInvoice}</span>
                  </div>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={handleGenerateInvoice}
                  disabled={invoiceSaving || !selectedOrgId || !creditAmount}
                >
                  <Plus className="size-4" />
                  {invoiceSaving ? "Generating…" : "Generate Invoice"}
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Recent Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {invoiceLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Receipt className="size-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">No invoices generated yet</p>
                  </div>
                ) : (
                  <div className="max-h-[28rem] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Organization</TableHead>
                          <TableHead className="text-right">Credits</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">PDF</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium text-sm">{inv.organizationName}</TableCell>
                            <TableCell className="text-right text-sm">{inv.creditAmount}</TableCell>
                            <TableCell className="text-right text-sm font-medium text-emerald-700">
                              {formatCurrency(inv.totalPrice)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(inv.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                                disabled={downloadingInvoiceId === inv.id}
                                onClick={() => handleDownloadInvoicePdf(inv.id)}
                              >
                                {downloadingInvoiceId === inv.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Download className="size-3" />
                                )}
                                {downloadingInvoiceId === inv.id ? "Loading…" : "PDF"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Purge Confirmation ──────────────────────────────────────── */}
      <AlertDialog open={!!purgeId} onOpenChange={(open) => !open && setPurgeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">⚠️ Purge Account Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the account and all associated data. This cannot be undone.
              All credentials, checklists, references, and audit logs will be destroyed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurge}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? "Purging…" : "Purge Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

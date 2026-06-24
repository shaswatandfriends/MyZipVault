"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Coins,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
  Loader2,
  FileText,
  Download,
  BarChart3,
} from "@/lib/icons";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ──────────────────────────────────────────────────────────
interface CreditPackage {
  credits: number;
  pricePerCredit: number;
  totalPrice: number;
  discount: string;
}

interface Transaction {
  id: number;
  type: string;
  creditAmount: number;
  description: string;
  createdAt: string;
  balanceAfter: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Invoice {
  id: number;
  creditAmount: number;
  totalPrice: number;
  pdfUrl: string | null;
  createdAt: string;
}

interface CreditsByMonth {
  month: string;
  used: number;
}

interface BillingData {
  organization: {
    name: string;
    creditsBalance: number;
  };
  creditPackages: CreditPackage[];
  transactions: Transaction[];
  pagination: Pagination;
  invoices: Invoice[];
  creditsByMonth: CreditsByMonth[];
}

type TransactionFilter = "all" | "purchase" | "deduction" | "refund";

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function getTransactionIcon(type: string) {
  switch (type) {
    case "purchase":
      return <ArrowUpCircle className="size-4 text-emerald-500" />;
    case "deduction":
      return <ArrowDownCircle className="size-4 text-red-500" />;
    case "refund":
      return <RotateCcw className="size-4 text-teal-500" />;
    default:
      return <Coins className="size-4 text-muted-foreground" />;
  }
}

// ─── Skeleton Loaders ───────────────────────────────────────────────
function BalanceCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="size-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function PackageCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-3 w-20" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
    </TableRow>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function RecruiterBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);

  const fetchBilling = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
      });
      if (filter !== "all") {
        params.set("type", filter);
      }
      const res = await fetch(`/api/recruiter/billing?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch billing data");
      }
      const json = (await res.json()) as BillingData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load billing", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleBuyCredits = (pkg: CreditPackage) => {
    toast.info("Payment setup in progress", {
      description: `Credit purchases (${pkg.credits} for ${formatCurrency(pkg.totalPrice)}) require Stripe configuration. Please contact your administrator or check back shortly.`,
    });
  };

  const totalPages = data?.pagination.totalPages ?? 1;

  const handleDownloadInvoice = async (invoiceId: number) => {
    try {
      setDownloadingInvoiceId(invoiceId);
      const res = await fetch(`/api/recruiter/billing/invoice-pdf?invoiceId=${invoiceId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate invoice PDF");
      }
      const json = await res.json();

      if (json.isBase64 && json.url?.startsWith("data:")) {
        // For base64 data URLs, open in a new tab
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
        // Clean up after a short delay
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
      {/* ── Header ─────────────────────────────────────────────────── */}
      <PageHeader
        title="Billing"
        description="Manage your credit balance, purchase credits, and view transaction history."
      />

      {/* ── Credit Balance Card ────────────────────────────────────── */}
      {isLoading && !data ? (
        <BalanceCardSkeleton />
      ) : (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 dark:border-emerald-900">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Credit Balance
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-5xl font-bold text-emerald-800 dark:text-emerald-300">
                    {data?.organization.creditsBalance ?? 0}
                  </span>
                  <span className="text-sm text-emerald-600 dark:text-emerald-500">
                    credits
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Organization: {data?.organization.name ?? "—"}
                </p>
              </div>
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 shrink-0">
                <CreditCard className="size-8 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Purchase Credits ───────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Purchase Credits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading && !data
            ? Array.from({ length: 4 }).map((_, i) => <PackageCardSkeleton key={i} />)
            : (data?.creditPackages ?? []).map((pkg) => (
                <Card
                  key={pkg.credits}
                  className={`relative hover:shadow-md transition-shadow ${
                    pkg.discount !== "0%"
                      ? "border-emerald-300 dark:border-emerald-800"
                      : ""
                  }`}
                >
                  {pkg.discount !== "0%" && (
                    <div className="absolute -top-2.5 right-4">
                      <Badge className="bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-600 text-xs">
                        Save {pkg.discount}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {pkg.credits}
                    </CardTitle>
                    <CardDescription>credits</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price per credit</span>
                        <span className="font-medium">{formatCurrency(pkg.pricePerCredit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-semibold text-base">{formatCurrency(pkg.totalPrice)}</span>
                      </div>
                    </div>
                    <Button
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleBuyCredits(pkg)}
                    >
                      <ShoppingCart className="size-4" />
                      Buy {pkg.credits} Credits
                    </Button>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>

      {/* ── Credits Usage Chart ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <BarChart3 className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Credits Usage</CardTitle>
              <CardDescription>Monthly credit consumption over the last 6 months</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (data?.creditsByMonth ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="size-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold">No usage data yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Credits usage will appear here as you use credits for verification requests.
              </p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.creditsByMonth ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", fontSize: "13px" }}
                    formatter={(value: number) => [`${value} credits`, "Used"]}
                  />
                  <Bar dataKey="used" fill="var(--primary-vivid)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Invoices ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileText className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Invoices</CardTitle>
              <CardDescription>
                Download PDF invoices for your credit purchases.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (data?.invoices ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="size-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold">No invoices</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Invoices will appear here after you purchase credits.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.invoices ?? []).map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-sm">
                        INV-{inv.id.toString().padStart(5, "0")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(inv.createdAt)}
                      </TableCell>
                      <TableCell className="text-right text-sm">{inv.creditAmount}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(inv.totalPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          disabled={downloadingInvoiceId === inv.id}
                          onClick={() => handleDownloadInvoice(inv.id)}
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

      {/* ── Transaction History ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Transaction History</CardTitle>
              <CardDescription>
                {data?.pagination.total ?? 0} total transaction{(data?.pagination.total ?? 0) !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <Select
              value={filter}
              onValueChange={(val) => {
                setFilter(val as TransactionFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="purchase">Purchases</SelectItem>
                <SelectItem value="deduction">Deductions</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          ) : (data?.transactions ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Coins className="size-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold">No transactions</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Purchase credits or unlock documents to see your transaction history.
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Balance After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.transactions ?? []).map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">
                          {formatDate(tx.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(tx.type)}
                            <span className="text-sm truncate max-w-[240px]">
                              {tx.description}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold text-sm ${
                              tx.creditAmount > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {tx.creditAmount > 0 ? "+" : ""}
                            {tx.creditAmount}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {tx.balanceAfter}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="gap-1"
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

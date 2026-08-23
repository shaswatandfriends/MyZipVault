"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CreditCard, Coins, ShoppingCart, ChevronLeft, ChevronRight,
  ArrowDownCircle, ArrowUpCircle, Loader2, FileText, BarChart3,
  Briefcase, Lock, Sparkles, TrendingUp,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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
  organization: { name: string; creditsBalance: number };
  creditPackages: CreditPackage[];
  transactions: Transaction[];
  pagination: Pagination;
  invoices: Invoice[];
  creditsByMonth: CreditsByMonth[];
}

type TransactionFilter = "all" | "purchase" | "deduction";

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(amount);
}

function getTransactionIcon(type: string) {
  // Positive (incoming credits)
  if (["purchase", "referral_bonus", "placement_payout", "original_owner_residual", "refund", "admin_credit"].includes(type)) {
    return <ArrowUpCircle className="size-4 text-emerald-600" />;
  }
  // Negative (spent credits)
  return <ArrowDownCircle className="size-4 text-rose-600" />;
}

function getTransactionLabel(type: string): string {
  const map: Record<string, string> = {
    purchase: "Purchase",
    referral_bonus: "Referral bonus",
    placement_payout: "Placement payout",
    original_owner_residual: "Original owner residual",
    refund: "Refund",
    admin_credit: "Admin credit",
    deduction: "Deduction",
    reveal: "Reveal",
    submit: "Submission",
    checklist_send: "Checklist send",
    rtr_send: "RTR send",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

// ─── Main Component ─────────────────────────────────────────────────
export default function EmployerBillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading billing…</div>}>
      <EmployerBillingPageInner />
    </Suspense>
  );
}

function EmployerBillingPageInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
      });
      if (filter !== "all") params.set("type", filter);

      const res = await fetch(`/api/employer/billing?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const json = (await res.json()) as BillingData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    const t = setTimeout(() => load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  // Show Stripe redirect toast on return from checkout
  useEffect(() => {
    const payment = searchParams.get("success") === "true" ? "success"
      : searchParams.get("canceled") === "true" ? "canceled"
      : null;
    if (payment === "success") {
      toast.success("Payment received", {
        description: "Your credits have been added to your account.",
      });
    } else if (payment === "canceled") {
      toast.error("Payment canceled", {
        description: "You can retry the purchase anytime.",
      });
    }
  }, [searchParams]);

  const handlePurchase = async (pkg: CreditPackage) => {
    setPurchasing(pkg.credits);
    try {
      const res = await fetch("/api/employer/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: pkg.credits }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || `Failed (${res.status})`);
      // Redirect to Stripe Checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e) {
      toast.error("Failed to start purchase", {
        description: e instanceof Error ? e.message : "",
      });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Buy credits to reveal candidate contact info for direct sourcing. Same credit costs as recruiters."
      />

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">
            <strong>Couldn&apos;t load billing data:</strong> {error}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={load}>Retry</Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </>
      )}

      {/* Loaded state */}
      {!loading && data && (
        <>
          {/* ─── Top stats ─── */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary-light">
                    <Coins className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Credit balance</p>
                    <p className="text-2xl font-bold text-foreground">{data.organization.creditsBalance.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50">
                    <TrendingUp className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Total purchased</p>
                    <p className="text-2xl font-bold text-foreground">
                      {data.transactions.filter((t) => t.creditAmount > 0).reduce((sum, t) => sum + t.creditAmount, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50">
                    <BarChart3 className="size-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Total spent</p>
                    <p className="text-2xl font-bold text-foreground">
                      {Math.abs(data.transactions.filter((t) => t.creditAmount < 0).reduce((sum, t) => sum + t.creditAmount, 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Credit packages ─── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="size-5 text-primary" />
                Buy credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.creditPackages.map((pkg) => (
                  <div
                    key={pkg.credits}
                    className={`rounded-xl border p-5 flex flex-col ${
                      pkg.discount === "20%" ? "border-primary border-2 bg-primary-light/30" : "border-border bg-white"
                    }`}
                  >
                    {pkg.discount !== "0%" && (
                      <Badge variant="outline" className="self-start mb-2 bg-primary text-white border-primary">
                        Save {pkg.discount}
                      </Badge>
                    )}
                    <p className="text-3xl font-bold text-foreground">{pkg.credits}</p>
                    <p className="text-xs text-text-muted mt-1">credits</p>
                    <p className="text-sm text-text-secondary mt-3">
                      <span className="font-semibold text-foreground">{formatCurrency(pkg.pricePerCredit)}</span> / credit
                    </p>
                    <p className="text-lg font-bold text-foreground mt-2">{formatCurrency(pkg.totalPrice)}</p>
                    <Button
                      className="mt-4 w-full"
                      onClick={() => handlePurchase(pkg)}
                      disabled={purchasing !== null}
                    >
                      {purchasing === pkg.credits ? (
                        <><Loader2 className="size-4 animate-spin" /> Redirecting…</>
                      ) : (
                        <><CreditCard className="size-4" /> Buy {pkg.credits} credits</>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-4 flex items-center gap-1.5">
                <Lock className="size-3" />
                Payments are processed securely via Stripe. Credits never expire.
              </p>
            </CardContent>
          </Card>

          {/* ─── Usage chart ─── */}
          {data.creditsByMonth.some((m) => m.used > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="size-5 text-primary" />
                  Credit usage (last 6 months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.creditsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8, border: "1px solid #E5E7EB",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="used" fill="#0A66C2" radius={[4, 4, 0, 0]} name="Credits used" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Transactions ─── */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  Transactions
                </CardTitle>
                <Select value={filter} onValueChange={(v) => { setFilter(v as TransactionFilter); setPage(1); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All transactions</SelectItem>
                    <SelectItem value="purchase">Purchases only</SelectItem>
                    <SelectItem value="deduction">Deductions only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {data.transactions.length === 0 ? (
                <div className="py-10 text-center">
                  <FileText className="size-10 text-text-muted mx-auto mb-2" />
                  <p className="font-medium text-foreground">No transactions yet</p>
                  <p className="text-sm text-text-muted mt-1">
                    Buy credits above to start revealing candidate contact info.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Credits</TableHead>
                          <TableHead className="text-right">Balance after</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getTransactionIcon(tx.type)}
                                <span className="text-sm font-medium text-foreground">
                                  {getTransactionLabel(tx.type)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-text-secondary max-w-md truncate">
                              {tx.description}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${tx.creditAmount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                              {tx.creditAmount >= 0 ? "+" : ""}{tx.creditAmount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-sm text-foreground">
                              {tx.balanceAfter.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs text-text-muted">
                              {formatDate(tx.createdAt.toISOString ? tx.createdAt.toISOString() : String(tx.createdAt))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {data.pagination.totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xs text-text-muted">
                        Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} transactions)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={data.pagination.page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="size-3.5" /> Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={data.pagination.page >= data.pagination.totalPages}
                          onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                        >
                          Next <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ─── Invoices ─── */}
          {data.invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead className="text-right">Credits</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.invoices.map((inv) => {
                        const isPaid = inv.pdfUrl?.startsWith("stripe_paid:");
                        const isPlacement = inv.pdfUrl?.startsWith("placement_paid:") || inv.pdfUrl?.startsWith("placement_session:");
                        const status = isPlacement
                          ? (inv.pdfUrl?.startsWith("placement_paid:") ? "Paid (placement)" : "Pending (placement)")
                          : isPaid ? "Paid" : "Pending";
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-xs">#{inv.id}</TableCell>
                            <TableCell className="text-right text-sm">{inv.creditAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{formatCurrency(inv.totalPrice)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                isPaid || inv.pdfUrl?.startsWith("placement_paid:")
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }>
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-text-muted">
                              {formatDate(inv.createdAt.toISOString ? inv.createdAt.toISOString() : String(inv.createdAt))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── What credits are used for ─── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                What employers use credits for
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="size-4 text-primary" />
                    <p className="font-semibold text-foreground text-sm">Reveal candidate contact info</p>
                  </div>
                  <p className="text-xs text-text-secondary">
                    When you find a candidate in the pool you want to reach out to directly, spend credits
                    to unlock their email + phone. Valid for 90 days.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Coins className="size-4 text-primary" />
                    <p className="font-semibold text-foreground text-sm">Same credit costs as recruiters</p>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Credit costs are set by the platform admin and apply equally to recruiters and employers.
                    See <Link href="/credit-system" className="text-primary hover:underline">credit system</Link> for full details.
                  </p>
                </div>
              </div>
              <p className="text-xs text-text-muted mt-3">
                Posting jobs is free. Setting commission budget is free. Credits are only spent to
                reveal candidate contact info for direct sourcing.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

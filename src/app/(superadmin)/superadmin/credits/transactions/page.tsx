"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Activity, Search, ChevronLeft, ChevronRight, Loader2,
} from "@/lib/icons";

interface Transaction {
  id: number;
  organization_id: number;
  organization_name: string;
  transaction_type: string;
  credit_amount: number;
  description: string;
  created_at: string;
}

const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  credit: "bg-emerald-100 text-emerald-700",
  debit: "bg-red-100 text-red-700",
  referral_bonus: "bg-blue-100 text-blue-700",
  reward: "bg-purple-100 text-purple-700",
  job_posting: "bg-amber-100 text-amber-700",
  candidate_reveal: "bg-indigo-100 text-indigo-700",
  candidate_submission: "bg-cyan-100 text-cyan-700",
  subscription: "bg-violet-100 text-violet-700",
};

const TRANSACTION_TYPES = [
  "credit", "debit", "referral_bonus", "reward",
  "job_posting", "candidate_reveal", "candidate_submission", "subscription",
];

export default function CreditsTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    let timeout = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: "50" });
      if (search) params.set("search", search);
      if (typeFilter) params.set("transaction_type", typeFilter);

      fetch(`/api/superadmin/credits/transactions?${params}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          setTransactions(d.transactions || []);
          setTotalPages(d.pagination?.totalPages || 1);
          setTotal(d.pagination?.total || 0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [page, search, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search descriptions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {TRANSACTION_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No transactions found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Organization</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium text-right">Amount</th>
                    <th className="p-3 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${TRANSACTION_TYPE_COLORS[t.transaction_type] || "bg-gray-100 text-gray-700"}`}
                        >
                          {t.transaction_type.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs">{t.organization_name}</td>
                      <td className="p-3 text-xs text-[#263633] max-w-xs truncate">{t.description}</td>
                      <td className={`p-3 text-right font-bold ${t.credit_amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {t.credit_amount >= 0 ? "+" : ""}{t.credit_amount}
                      </td>
                      <td className="p-3 text-right text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="gap-1"
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
              className="gap-1"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

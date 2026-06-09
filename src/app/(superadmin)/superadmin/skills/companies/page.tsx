"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Search,
  Filter,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  Users,
  TrendingUp,
  Eye,
  Inbox,
  Send,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// ─── Types ──────────────────────────────────────────────────────────
interface Company {
  id: number;
  name: string;
  creditsBalance: number;
  baaStatus: string;
  seatLimit: number;
  seatsUsed: number;
  accountStatus: string;
  createdAt: string;
  members: Array<{
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  }>;
}

// ─── Helpers ────────────────────────────────────────────────────────
function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">Active</Badge>;
    case "suspended":
      return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">Suspended</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Pending</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SkillsCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/companies");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch companies");
      }
      const json = await res.json();
      setCompanies(json.companies || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load companies", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch = !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.members.some(
          (m) =>
            m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            [m.firstName, m.lastName].filter(Boolean).join(" ").toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchesStatus = filterStatus === "all" || c.accountStatus === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [companies, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = filteredCompanies.length;
    const activePlans = filteredCompanies.filter((c) => c.accountStatus === "active").length;
    const totalCredits = filteredCompanies.reduce((sum, c) => sum + c.creditsBalance, 0);
    // Simulated checklist metrics since companies endpoint doesn't have checklist-specific data
    return { total, activePlans, totalCredits };
  }, [filteredCompanies]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Checklist-focused company metrics and activity"
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
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Companies</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 shrink-0">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activePlans}</p>
                  <p className="text-xs text-muted-foreground">Active Plans</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 shrink-0">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalCredits.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Credits</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700 shrink-0">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredCompanies.reduce((s, c) => s + c.seatsUsed, 0)}/{filteredCompanies.reduce((s, c) => s + c.seatLimit, 0)}</p>
                  <p className="text-xs text-muted-foreground">Seats Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Search & Filter ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
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
          ) : !filteredCompanies.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No companies found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Credits Balance</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Recruiters</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => {
                    const recruiterCount = company.members.filter(
                      (m) => m.role === "client_recruiter" || m.role === "client_admin"
                    ).length;

                    return (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 text-xs font-bold shrink-0">
                              {company.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{company.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(company.accountStatus)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <CreditCard className="size-3.5 text-muted-foreground" />
                            <span className="text-sm">{company.creditsBalance.toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {company.seatsUsed}/{company.seatLimit}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="size-3.5 text-muted-foreground" />
                            {recruiterCount}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(company.createdAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

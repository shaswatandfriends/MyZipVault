"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Search, FileText, Clock, CheckCircle2, XCircle, AlertTriangle,
  Send, Ban, RefreshCw, MoreHorizontal, Loader2, Download, Eye,
  FileSignature, LayoutTemplate
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-[#6B7280]", bg: "bg-[#F3F4F6]" },
  sent: { label: "Sent", color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
  partially_signed: { label: "Partially Signed", color: "text-[#D97706]", bg: "bg-[#FFFBEB]" },
  completed: { label: "Completed", color: "text-[#166534]", bg: "bg-[#DCFCE7]" },
  declined: { label: "Declined", color: "text-[#DC2626]", bg: "bg-[#FEF2F2]" },
  expired: { label: "Expired", color: "text-[#6B7280]", bg: "bg-[#F3F4F6]" },
  voided: { label: "Voided", color: "text-[#6B7280]", bg: "bg-[#F3F4F6]" },
};

export default function VaultSignDashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    declined: 0,
    expiring_soon: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [docsRes, templatesRes] = await Promise.all([
          fetch(`/api/vaultsign/documents?limit=50`),
          fetch(`/api/vaultsign/templates`),
        ]);

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments(docsData.documents || []);
          // Compute stats
          const allDocs = docsData.documents || [];
          setStats({
            pending: allDocs.filter((d: any) => ["sent", "partially_signed"].includes(d.status)).length,
            completed: allDocs.filter((d: any) => d.status === "completed").length,
            declined: allDocs.filter((d: any) => d.status === "declined").length,
            expiring_soon: allDocs.filter((d: any) => {
              if (d.status !== "sent" && d.status !== "partially_signed") return false;
              const expiry = new Date(d.expiry_date);
              const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
              return expiry < threeDays;
            }).length,
          });
        }

        if (templatesRes.ok) {
          const tData = await templatesRes.json();
          setTemplates(tData.templates || []);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load documents");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = !search || doc.document_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Actions
  const handleVoid = async (docId: number) => {
    if (!confirm("Are you sure you want to void this document?")) return;
    try {
      const res = await fetch(`/api/vaultsign/documents/${docId}/void`, { method: "POST" });
      if (res.ok) {
        toast.success("Document voided");
        setDocuments(documents.map((d) => d.id === docId ? { ...d, status: "voided" } : d));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to void");
      }
    } catch {
      toast.error("Failed to void document");
    }
  };

  const handleRemind = async (docId: number, signerId: number) => {
    try {
      const res = await fetch(`/api/vaultsign/documents/${docId}/remind/${signerId}`, { method: "POST" });
      if (res.ok) {
        toast.success("Reminder sent");
      }
    } catch {
      toast.error("Failed to send reminder");
    }
  };

  const handleRevise = async (docId: number) => {
    try {
      const res = await fetch(`/api/vaultsign/documents/${docId}/revise`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success("Document revised — redirecting to editor");
        router.push(`/recruiter/vaultsign/editor/${data.id}`);
      }
    } catch {
      toast.error("Failed to revise document");
    }
  };

  const handleDuplicate = async (doc: any) => {
    try {
      const res = await fetch(`/api/vaultsign/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_name: `${doc.document_name} (Copy)`,
          document_type: doc.document_type,
          source_type: doc.source_type,
          original_file_url: doc.original_file_url,
          tiptap_content: doc.tiptap_content,
          sign_fields: doc.sign_fields,
          signers: doc.signers?.map((s: any) => ({
            name: s.name,
            email: s.email,
            role: s.role,
          })) || [],
        }),
      });
      if (res.ok) {
        toast.success("Document duplicated");
        router.refresh();
      }
    } catch {
      toast.error("Failed to duplicate document");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#166534]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              VaultSign
            </h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Send, sign, and manage documents</p>
          </div>
          <Button
            className="bg-[#166534] hover:bg-[#14532D] text-white"
            onClick={() => router.push("/recruiter/vaultsign/new")}
          >
            <Plus className="h-4 w-4 mr-1" /> New Document
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                  <Clock className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111827]">{stats.pending}</p>
                  <p className="text-xs text-[#6B7280]">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#DCFCE7] flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-[#166534]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111827]">{stats.completed}</p>
                  <p className="text-xs text-[#6B7280]">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FEF2F2] flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-[#DC2626]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111827]">{stats.declined}</p>
                  <p className="text-xs text-[#6B7280]">Declined</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FFFBEB] flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-[#D97706]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111827]">{stats.expiring_soon}</p>
                  <p className="text-xs text-[#6B7280]">Expiring Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Templates quick start */}
        {templates.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#111827] mb-3 flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-[#166534]" /> Start with Template
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {templates.slice(0, 4).map((template: any) => (
                <Card
                  key={template.id}
                  className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-md transition-shadow border-[#E5E7EB]"
                  onClick={() => router.push(`/recruiter/vaultsign/new?template_id=${template.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FileSignature className="h-4 w-4 text-[#166534]" />
                      <span className="font-medium text-sm text-[#111827] truncate">{template.name}</span>
                    </div>
                    <p className="text-xs text-[#6B7280] truncate">{template.description || template.document_type}</p>
                    <Badge variant="outline" className="text-[10px] mt-2">
                      {template.source_type === "word" ? "Word" : "PDF"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Documents table */}
        <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-lg">Documents</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#9CA3AF]" />
                  <Input
                    placeholder="Search documents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 w-[200px] text-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[140px] text-sm">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="partially_signed">Partially Signed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="voided">Voided</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signers</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-[#9CA3AF]">
                        <FileText className="h-8 w-8 mx-auto mb-2" />
                        <p>No documents found</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 border-[#166534] text-[#166534]"
                          onClick={() => router.push("/recruiter/vaultsign/new")}
                        >
                          Create your first document
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocs.map((doc) => {
                    const statusConf = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
                    return (
                      <TableRow key={doc.id} className="cursor-pointer hover:bg-[#F8F7F4]" onClick={() => router.push(`/recruiter/vaultsign/${doc.id}`)}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm text-[#111827]">{doc.document_name}</p>
                            <p className="text-xs text-[#6B7280]">
                              {doc.document_type} • {doc.source_type === "word" ? "Word" : "PDF"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConf.bg} ${statusConf.color} border-0`}>
                            {statusConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {doc.signers?.slice(0, 3).map((s: any, i: number) => (
                              <div
                                key={i}
                                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold"
                                style={{
                                  backgroundColor: s.status === "signed" ? "#DCFCE7" : s.status === "declined" ? "#FEF2F2" : "#F3F4F6",
                                  color: s.status === "signed" ? "#166534" : s.status === "declined" ? "#DC2626" : "#6B7280",
                                }}
                                title={`${s.name} - ${s.status}`}
                              >
                                {s.name?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                            ))}
                            {doc.signers?.length > 3 && (
                              <span className="text-xs text-[#6B7280]">+{doc.signers.length - 3}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-[#6B7280]">
                          {new Date(doc.expiry_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-[#6B7280]">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/recruiter/vaultsign/${doc.id}`); }}>
                                <Eye className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              {doc.status === "draft" && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  const route = doc.source_type === "pdf"
                                    ? `/recruiter/vaultsign/signer/${doc.id}`
                                    : `/recruiter/vaultsign/editor/${doc.id}`;
                                  router.push(route);
                                }}>
                                  <FileText className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                              )}
                              {doc.status === "draft" && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/recruiter/vaultsign/${doc.id}`); }}>
                                  <Send className="h-4 w-4 mr-2" /> Send
                                </DropdownMenuItem>
                              )}
                              {["sent", "partially_signed"].includes(doc.status) && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleVoid(doc.id); }}>
                                  <Ban className="h-4 w-4 mr-2" /> Void
                                </DropdownMenuItem>
                              )}
                              {doc.status === "declined" && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRevise(doc.id); }}>
                                  <RefreshCw className="h-4 w-4 mr-2" /> Revise
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(doc); }}>
                                <FileText className="h-4 w-4 mr-2" /> Duplicate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

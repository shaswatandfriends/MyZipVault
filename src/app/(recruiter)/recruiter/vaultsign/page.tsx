"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VaultSignErrorBoundary } from "@/components/vaultsign/vaultsign-error-boundary";
import { toast } from "sonner";
import {
  Plus, Search, FileText, Clock, CheckCircle2, XCircle, AlertTriangle,
  Send, Ban, RefreshCw, MoreHorizontal, Loader2, Download, Eye,
  FileSignature, LayoutTemplate, Settings, Save, Building2, Upload,
  Globe, Phone, Mail, Trash2
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [showOrgSettings, setShowOrgSettings] = useState(false);
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const [orgSettingsLoading, setOrgSettingsLoading] = useState(false);
  const [orgSettingsSaving, setOrgSettingsSaving] = useState(false);
  const [isClientAdmin, setIsClientAdmin] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
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
        const [docsRes, templatesRes, sessionRes] = await Promise.all([
          fetch(`/api/vaultsign/documents?limit=50`),
          fetch(`/api/vaultsign/templates`),
          fetch("/api/auth/session"),
        ]);

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments(docsData.documents || []);
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

        if (sessionRes.ok) {
          const session = await sessionRes.json();
          const role = session?.user?.role;
          setIsClientAdmin(role === "client_admin");
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

  // Fetch org settings for client admin
  const fetchOrgSettings = async () => {
    try {
      setOrgSettingsLoading(true);
      const res = await fetch("/api/vaultsign/organization");
      if (res.ok) {
        const data = await res.json();
        setOrgSettings(data);
      }
    } catch (err) {
      console.error("Org settings fetch error:", err);
    } finally {
      setOrgSettingsLoading(false);
    }
  };

  const saveOrgSettings = async () => {
    if (!orgSettings) return;
    try {
      setOrgSettingsSaving(true);
      const res = await fetch("/api/vaultsign/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_logo_url: orgSettings.company_logo_url,
          company_address: orgSettings.company_address,
          company_phone: orgSettings.company_phone,
          company_email: orgSettings.company_email,
          company_website: orgSettings.company_website,
        }),
      });
      if (res.ok) {
        toast.success("Organization settings saved");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setOrgSettingsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogoUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/vaultsign/documents/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setOrgSettings({ ...orgSettings, company_logo_url: data.document_url });
        toast.success("Logo uploaded");
      }
    } catch { toast.error("Upload failed"); }
    finally { setLogoUploading(false); }
  };

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

  const handleDelete = async (doc: any) => {
    if (!confirm(`Are you sure you want to delete '${doc.document_name}'? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/vaultsign/documents/${doc.id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments(documents.filter((d) => d.id !== doc.id));
        toast.success("Document deleted");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete document");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4]">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Skeleton Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-4 w-52" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>

          {/* Skeleton Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-7 w-10 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skeleton Table */}
          <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-24" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-[200px]" />
                  <Skeleton className="h-9 w-[140px]" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="hidden md:block">
                <div className="border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-4">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
              {/* Mobile skeleton cards */}
              <div className="md:hidden p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-xl border border-[#E5E7EB] space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <VaultSignErrorBoundary>
    <div className="min-h-screen bg-[#F8F7F4]">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header — stacks on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              VaultSign
            </h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Send, sign, and manage documents</p>
          </div>
          <div className="flex items-center gap-2">
            {isClientAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="border-[#E5E7EB] text-[#6B7280] hover:text-[#111827]"
                onClick={() => { setShowOrgSettings(true); fetchOrgSettings(); }}
              >
                <Settings className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Org Settings</span>
              </Button>
            )}
            <Button
              className="bg-[#166534] hover:bg-[#14532D] text-white w-full sm:w-auto"
              onClick={() => router.push("/recruiter/vaultsign/new")}
            >
              <Plus className="h-4 w-4 mr-1" /> New Document
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-vaultsign-fade-in">
          <Card
            className={`rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-md transition-all ${
              statusFilter === "sent" || statusFilter === "partially_signed" ? "ring-2 ring-[#166534]/30 border-[#166534]" : ""
            }`}
            onClick={() => setStatusFilter(statusFilter === "sent" || statusFilter === "partially_signed" ? "all" : "sent")}
            title="Click to filter by pending documents"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                  <Clock className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#111827]">{stats.pending}</p>
                  <p className="text-xs text-[#6B7280]">Pending <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">— click to filter</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-md transition-all ${
              statusFilter === "completed" ? "ring-2 ring-[#166534]/30 border-[#166534]" : ""
            }`}
            onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")}
            title="Click to filter by completed documents"
          >
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
          <Card
            className={`rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-md transition-all ${
              statusFilter === "declined" ? "ring-2 ring-[#166534]/30 border-[#166534]" : ""
            }`}
            onClick={() => setStatusFilter(statusFilter === "declined" ? "all" : "declined")}
            title="Click to filter by declined documents"
          >
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
          <Card
            className={`rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-md transition-all ${
              statusFilter === "sent" ? "ring-2 ring-[#166534]/30 border-[#166534]" : ""
            }`}
            onClick={() => setStatusFilter(statusFilter === "sent" ? "all" : "sent")}
            title="Click to filter by expiring documents"
          >
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
                  className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-md transition-shadow border-[#E5E7EB] hover:scale-[1.02] transition-transform"
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

        {/* Documents */}
        <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-lg">Documents</CardTitle>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#9CA3AF]" />
                  <Input
                    placeholder="Search documents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 w-full sm:w-[200px] text-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-[140px] text-sm">
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
            {/* Desktop Table */}
            <div className="hidden md:block">
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
                                {["draft", "completed", "expired", "voided"].includes(doc.status) && (
                                  <DropdownMenuItem
                                    className="text-[#DC2626] focus:text-[#DC2626]"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden">
              {filteredDocs.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-[#9CA3AF]" />
                  <p className="text-[#9CA3AF]">No documents found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-[#166534] text-[#166534]"
                    onClick={() => router.push("/recruiter/vaultsign/new")}
                  >
                    Create your first document
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB] vaultsign-stagger animate-vaultsign-fade-in">
                  {filteredDocs.map((doc) => {
                    const statusConf = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
                    return (
                      <div
                        key={doc.id}
                        className="p-4 cursor-pointer hover:bg-[#F8F7F4] active:bg-[#F3F4F6] transition-colors"
                        onClick={() => router.push(`/recruiter/vaultsign/${doc.id}`)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-[#111827] truncate">{doc.document_name}</p>
                            <p className="text-xs text-[#6B7280] mt-0.5">
                              {doc.document_type} • {doc.source_type === "word" ? "Word" : "PDF"}
                            </p>
                          </div>
                          <Badge className={`${statusConf.bg} ${statusConf.color} border-0 flex-shrink-0`}>
                            {statusConf.label}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            {doc.signers?.slice(0, 3).map((s: any, i: number) => (
                              <div
                                key={i}
                                className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-bold"
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
                              <span className="text-[10px] text-[#6B7280]">+{doc.signers.length - 3}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-[#9CA3AF]">
                            <span>Exp: {new Date(doc.expiry_date).toLocaleDateString()}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/recruiter/vaultsign/${doc.id}`); }}>
                                  <Eye className="h-4 w-4 mr-2" /> View
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
                                {["draft", "completed", "expired", "voided"].includes(doc.status) && (
                                  <DropdownMenuItem
                                    className="text-[#DC2626] focus:text-[#DC2626]"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Org Settings Dialog (Client Admin Only) */}
      <Dialog open={showOrgSettings} onOpenChange={setShowOrgSettings}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#166534]" /> Organization Settings
            </DialogTitle>
          </DialogHeader>
          {orgSettingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#166534]" />
            </div>
          ) : orgSettings ? (
            <div className="space-y-4">
              {/* Company Logo */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Company Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {orgSettings.company_logo_url ? (
                    <div className="w-16 h-16 rounded-xl border border-[#E5E7EB] overflow-hidden bg-white flex items-center justify-center">
                      <img src={orgSettings.company_logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-[#E5E7EB] flex items-center justify-center bg-[#F8F7F4]">
                      <Building2 className="h-6 w-6 text-[#9CA3AF]" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input value={orgSettings.company_logo_url || ""}
                      onChange={(e) => setOrgSettings({ ...orgSettings, company_logo_url: e.target.value })}
                      placeholder="https://example.com/logo.png" className="h-8 text-xs" />
                    <label className="cursor-pointer mt-1 inline-block">
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={logoUploading} />
                      <Button variant="outline" size="sm" className="h-7 text-xs" asChild disabled={logoUploading}>
                        <span>{logoUploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />} Upload</span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Address</Label>
                <Textarea value={orgSettings.company_address || ""}
                  onChange={(e) => setOrgSettings({ ...orgSettings, company_address: e.target.value })}
                  placeholder="123 Main St, City, State, ZIP" rows={2} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone</Label>
                  <Input value={orgSettings.company_phone || ""}
                    onChange={(e) => setOrgSettings({ ...orgSettings, company_phone: e.target.value })}
                    placeholder="+1 (555) 000-0000" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</Label>
                  <Input value={orgSettings.company_email || ""}
                    onChange={(e) => setOrgSettings({ ...orgSettings, company_email: e.target.value })}
                    placeholder="company@example.com" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-sm flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Website</Label>
                <Input value={orgSettings.company_website || ""}
                  onChange={(e) => setOrgSettings({ ...orgSettings, company_website: e.target.value })}
                  placeholder="https://example.com" className="mt-1" />
              </div>
              <p className="text-[10px] text-[#9CA3AF]">These details appear in document headers and footers</p>
            </div>
          ) : (
            <p className="text-sm text-[#9CA3AF] text-center py-4">Could not load organization settings</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowOrgSettings(false)}>Cancel</Button>
            <Button className="bg-[#166534] hover:bg-[#14532D] text-white" onClick={() => { saveOrgSettings(); }}
              disabled={orgSettingsSaving || !orgSettings}>
              {orgSettingsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </VaultSignErrorBoundary>
  );
}

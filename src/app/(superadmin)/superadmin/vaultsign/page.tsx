"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { VaultSignErrorBoundary } from "@/components/vaultsign/vaultsign-error-boundary";
import { LogoUploader } from "@/components/vaultsign/logo-uploader";
import {
  LayoutTemplate, Activity, Building2, Plus, Loader2, Edit3,
  Trash2, Search, FileText, Eye, X, Save, FileSignature,
  BarChart3, ShieldCheck, Download, Copy, RefreshCw, Ban,
  Send, Clock, CheckCircle2, XCircle, AlertTriangle, Users,
  TrendingUp, Calendar, Filter, ChevronLeft, ChevronRight,
  Upload, Globe, Phone, Mail
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { vaultSignStatusColors, destructiveColors } from "@/lib/status-colors";

const STATUS_CONFIG = vaultSignStatusColors;

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  document_created: { label: "Created", color: "text-text-secondary" },
  document_sent: { label: "Sent", color: "text-status-blue" },
  document_viewed: { label: "Viewed", color: "text-purple-500" },
  signer_signed: { label: "Signed", color: "text-primary" },
  signer_declined: { label: "Declined", color: "text-status-red" },
  document_completed: { label: "Completed", color: "text-primary" },
  document_voided: { label: "Voided", color: "text-text-secondary" },
  document_expired: { label: "Expired", color: "text-text-secondary" },
  reminder_sent: { label: "Reminder", color: "text-status-amber" },
  document_revised: { label: "Revised", color: "text-status-blue" },
};

const DOCUMENT_TYPES = [
  { value: "right_to_represent", label: "Right to Represent" },
  { value: "pre_offer_acceptance", label: "Pre-Offer Acceptance" },
  { value: "offer_letter", label: "Offer Letter" },
  { value: "nda", label: "NDA" },
  { value: "background_check_authorization", label: "Background Check Authorization" },
  { value: "employment_contract", label: "Employment Contract" },
  { value: "onboarding_form", label: "Onboarding Form" },
  { value: "custom", label: "Custom" },
];

export default function SuperAdminVaultSignPage() {
  const [activeTab, setActiveTab] = useState("templates");

  // === Templates State ===
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [templateForm, setTemplateForm] = useState({
    name: "", description: "", document_type: "custom", source_type: "word",
    is_active: true, tiptap_content: "", predefined_sign_fields: "[]",
    placeholder_variables: "[]", header_config: "{}", footer_config: "{}",
  });

  // === Activity State ===
  const [documents, setDocuments] = useState<any[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [actStatusFilter, setActStatusFilter] = useState("all");
  const [actOrgFilter, setActOrgFilter] = useState("all");
  const [actTypeFilter, setActTypeFilter] = useState("all");
  const [actDateFrom, setActDateFrom] = useState("");
  const [actDateTo, setActDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // === Org Settings State ===
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // === Analytics State ===
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsOrgFilter, setAnalyticsOrgFilter] = useState("__none__");

  // === Audit Logs State ===
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditOrgFilter, setAuditOrgFilter] = useState("");

  // === Shared State ===
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // === Initial Data Fetch ===
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [templatesRes, activityRes, orgsRes, analyticsRes, auditRes] = await Promise.all([
          fetch("/api/superadmin/vaultsign/templates"),
          fetch("/api/superadmin/vaultsign/activity?limit=20"),
          fetch("/api/organizations"),
          fetch("/api/superadmin/vaultsign/analytics"),
          fetch("/api/superadmin/vaultsign/audit-logs?limit=50"),
        ]);

        if (templatesRes.ok) { const d = await templatesRes.json(); setTemplates(d.templates || []); }
        if (activityRes.ok) {
          const d = await activityRes.json();
          setDocuments(d.documents || []);
          setActivityTotal(d.total || 0);
        }
        if (orgsRes.ok) { const d = await orgsRes.json(); setOrganizations(d.organizations || d || []); }
        if (analyticsRes.ok) { const d = await analyticsRes.json(); setAnalytics(d); }
        if (auditRes.ok) {
          const d = await auditRes.json();
          setAuditLogs(d.logs || []);
          setAuditTotal(d.total || 0);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // === Fetch Org Settings ===
  useEffect(() => {
    if (!selectedOrgId) { setOrgSettings(null); return; }
    const fetchOrgSettings = async () => {
      try {
        const res = await fetch(`/api/superadmin/vaultsign/organization/${selectedOrgId}`);
        if (res.ok) { const d = await res.json(); setOrgSettings(d); }
      } catch (err) { console.error("Org settings fetch error:", err); }
    };
    fetchOrgSettings();
  }, [selectedOrgId]);

  // === Fetch Activity with Filters ===
  const fetchActivity = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "20", page: activityPage.toString() });
      if (actStatusFilter !== "all") params.set("status", actStatusFilter);
      if (actOrgFilter !== "all") params.set("organization_id", actOrgFilter);
      if (actTypeFilter !== "all") params.set("document_type", actTypeFilter);
      if (actDateFrom) params.set("date_from", actDateFrom);
      if (actDateTo) params.set("date_to", actDateTo);

      const res = await fetch(`/api/superadmin/vaultsign/activity?${params}`);
      if (res.ok) {
        const d = await res.json();
        setDocuments(d.documents || []);
        setActivityTotal(d.total || 0);
      }
    } catch (err) { console.error("Activity fetch error:", err); }
  }, [activityPage, actStatusFilter, actOrgFilter, actTypeFilter, actDateFrom, actDateTo]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  // === Fetch Analytics ===
  const fetchAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (analyticsOrgFilter && analyticsOrgFilter !== "__none__") params.set("organization_id", analyticsOrgFilter);
      const res = await fetch(`/api/superadmin/vaultsign/analytics?${params}`);
      if (res.ok) { const d = await res.json(); setAnalytics(d); }
    } catch (err) { console.error("Analytics fetch error:", err); }
  }, [analyticsOrgFilter]);

  useEffect(() => { if (activeTab === "analytics") fetchAnalytics(); }, [activeTab, fetchAnalytics]);

  // === Fetch Audit Logs ===
  const fetchAuditLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50", page: auditPage.toString() });
      if (auditSearch) params.set("search", auditSearch);
      if (auditOrgFilter) params.set("organization_id", auditOrgFilter);
      const res = await fetch(`/api/superadmin/vaultsign/audit-logs?${params}`);
      if (res.ok) {
        const d = await res.json();
        setAuditLogs(d.logs || []);
        setAuditTotal(d.total || 0);
      }
    } catch (err) { console.error("Audit fetch error:", err); }
  }, [auditPage, auditSearch, auditOrgFilter]);

  useEffect(() => { if (activeTab === "audit") fetchAuditLogs(); }, [activeTab, fetchAuditLogs]);

  // === Template CRUD ===
  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: "", description: "", document_type: "custom", source_type: "word",
      is_active: true, tiptap_content: "", predefined_sign_fields: "[]",
      placeholder_variables: "[]", header_config: "{}", footer_config: "{}",
    });
    setShowTemplateDialog(true);
  };

  const openEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name, description: template.description || "",
      document_type: template.document_type, source_type: template.source_type,
      is_active: template.is_active, tiptap_content: template.tiptap_content || "",
      predefined_sign_fields: typeof template.predefined_sign_fields === "string" ? template.predefined_sign_fields : JSON.stringify(template.predefined_sign_fields || []),
      placeholder_variables: typeof template.placeholder_variables === "string" ? template.placeholder_variables : JSON.stringify(template.placeholder_variables || []),
      header_config: typeof template.header_config === "string" ? template.header_config : JSON.stringify(template.header_config || {}),
      footer_config: typeof template.footer_config === "string" ? template.footer_config : JSON.stringify(template.footer_config || {}),
    });
    setShowTemplateDialog(true);
  };

  const saveTemplate = async () => {
    try {
      setSaving(true);
      const url = editingTemplate ? `/api/superadmin/vaultsign/templates/${editingTemplate.id}` : "/api/superadmin/vaultsign/templates";
      const method = editingTemplate ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(templateForm) });
      if (res.ok) {
        toast.success(editingTemplate ? "Template updated" : "Template created");
        setShowTemplateDialog(false);
        const refreshRes = await fetch("/api/superadmin/vaultsign/templates");
        if (refreshRes.ok) { const d = await refreshRes.json(); setTemplates(d.templates || []); }
      } else { const d = await res.json(); toast.error(d.error || "Failed to save template"); }
    } catch { toast.error("Failed to save template"); }
    finally { setSaving(false); }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm("Deactivate this template?")) return;
    try {
      const res = await fetch(`/api/superadmin/vaultsign/templates/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Template deactivated"); setTemplates(templates.map((t) => t.id === id ? { ...t, is_active: false } : t)); }
    } catch { toast.error("Failed to delete template"); }
  };

  const duplicateTemplate = async (template: any) => {
    try {
      setSaving(true);
      const res = await fetch("/api/superadmin/vaultsign/templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...templateForm,
          name: `${template.name} (Copy)`,
          source_type: template.source_type,
          document_type: template.document_type,
          tiptap_content: template.tiptap_content || "",
          predefined_sign_fields: typeof template.predefined_sign_fields === "string" ? template.predefined_sign_fields : JSON.stringify(template.predefined_sign_fields || []),
          placeholder_variables: typeof template.placeholder_variables === "string" ? template.placeholder_variables : JSON.stringify(template.placeholder_variables || []),
        }),
      });
      if (res.ok) {
        toast.success("Template duplicated");
        const refreshRes = await fetch("/api/superadmin/vaultsign/templates");
        if (refreshRes.ok) { const d = await refreshRes.json(); setTemplates(d.templates || []); }
      }
    } catch { toast.error("Failed to duplicate template"); }
    finally { setSaving(false); }
  };

  // === Save Org Settings ===
  const saveOrgSettings = async () => {
    if (!selectedOrgId || !orgSettings) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/superadmin/vaultsign/organization/${selectedOrgId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_logo_url: orgSettings.company_logo_url,
          company_address: orgSettings.company_address,
          company_phone: orgSettings.company_phone,
          company_email: orgSettings.company_email,
          company_website: orgSettings.company_website,
        }),
      });
      if (res.ok) toast.success("Organization settings saved");
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  };

  // === Logo Upload Handler ===
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogoUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `org-${selectedOrgId}/logos`);
      const res = await fetch("/api/vaultsign/documents/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setOrgSettings({ ...orgSettings, company_logo_url: data.document_url });
        toast.success("Logo uploaded");
      }
    } catch { toast.error("Logo upload failed"); }
    finally { setLogoUploading(false); }
  };

  // === Document Actions ===
  const handleVoidDoc = async (docId: number) => {
    if (!confirm("Void this document?")) return;
    try {
      const res = await fetch(`/api/vaultsign/documents/${docId}/void`, { method: "POST" });
      if (res.ok) { toast.success("Document voided"); fetchActivity(); }
    } catch { toast.error("Failed to void"); }
  };

  const handleRemindDoc = async (docId: number, signerId: number) => {
    try {
      const res = await fetch(`/api/vaultsign/documents/${docId}/remind/${signerId}`, { method: "POST" });
      if (res.ok) toast.success("Reminder sent");
    } catch { toast.error("Failed to send reminder"); }
  };

  // === Export CSV ===
  const handleExport = () => {
    const params = new URLSearchParams();
    if (actStatusFilter !== "all") params.set("status", actStatusFilter);
    if (actOrgFilter !== "all") params.set("organization_id", actOrgFilter);
    if (actTypeFilter !== "all") params.set("document_type", actTypeFilter);
    if (actDateFrom) params.set("date_from", actDateFrom);
    if (actDateTo) params.set("date_to", actDateTo);
    window.open(`/api/superadmin/vaultsign/export?${params}`, "_blank");
  };

  // === Filtered Templates ===
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = !templateSearch || t.name.toLowerCase().includes(templateSearch.toLowerCase());
    const matchesFilter = templateFilter === "all" || (templateFilter === "active" ? t.is_active : !t.is_active);
    return matchesSearch && matchesFilter;
  });

  // === Loading Skeleton ===
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6"><Skeleton className="h-8 w-48 mb-1" /><Skeleton className="h-4 w-72" /></div>
          <Skeleton className="h-10 w-[500px] rounded-xl mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl"><CardContent className="p-4">
                <Skeleton className="h-5 w-32 mb-1" /><Skeleton className="h-3 w-48" />
                <Skeleton className="h-7 w-16 mt-3" />
              </CardContent></Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <VaultSignErrorBoundary>
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
            VaultSign Management
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage templates, monitor activity, analytics, audit logs, and configure organizations</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="bg-white border border-border rounded-xl p-1 inline-flex">
              <TabsTrigger value="templates" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm">
                <LayoutTemplate className="h-4 w-4 mr-1" /> Templates
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm">
                <Activity className="h-4 w-4 mr-1" /> Activity
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm">
                <BarChart3 className="h-4 w-4 mr-1" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="audit" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm">
                <ShieldCheck className="h-4 w-4 mr-1" /> Audit Logs
              </TabsTrigger>
              <TabsTrigger value="org-settings" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm">
                <Building2 className="h-4 w-4 mr-1" /> Org Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ==================== TEMPLATES TAB ==================== */}
          <TabsContent value="templates" className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">Templates</h2>
                <Badge variant="outline" className="text-[10px]">{templates.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
                  <Input placeholder="Search templates..." value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)}
                    className="pl-8 h-8 w-[160px] text-xs" />
                </div>
                <Select value={templateFilter} onValueChange={setTemplateFilter}>
                  <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-primary hover:bg-primary-hover text-white h-8" onClick={openNewTemplate}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> New
                </Button>
              </div>
            </div>

            {filteredTemplates.length === 0 ? (
              <Card className="rounded-2xl"><CardContent className="p-12 text-center">
                <LayoutTemplate className="h-12 w-12 text-text-muted mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-1">No Templates Found</h3>
                <p className="text-sm text-text-secondary mb-4">Create your first template to get started</p>
                <Button className="bg-primary hover:bg-primary-hover text-white" onClick={openNewTemplate}>
                  <Plus className="h-4 w-4 mr-1" /> Create Template
                </Button>
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 vaultsign-stagger animate-vaultsign-fade-in">
                {filteredTemplates.map((template: any) => (
                  <Card key={template.id} className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-foreground truncate">{template.name}</h3>
                          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{template.description || "No description"}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] ml-2 flex-shrink-0">
                          {template.source_type === "word" ? "Word" : "PDF"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge className={`${template.is_active ? "bg-primary-light text-primary" : "bg-surface-2 text-text-secondary"} border-0 text-[10px]`}>
                          {template.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{template.document_type}</Badge>
                        {template._count?.documents !== undefined && (
                          <span className="text-[10px] text-text-muted">{template._count.documents} docs</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-3">
                        <Link href={`/superadmin/vaultsign/templates/${template.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="text-xs border-border w-full h-7">
                            <Edit3 className="h-3 w-3 mr-1" /> Open Editor
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" className="text-xs border-border h-7 w-7 p-0"
                          onClick={() => openEditTemplate(template)} title="Quick Edit Name">
                          <FileSignature className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs border-border h-7"
                          onClick={() => duplicateTemplate(template)} title="Duplicate">
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs text-text-muted hover:text-status-red h-7"
                          onClick={() => deleteTemplate(template.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== ACTIVITY TAB ==================== */}
          <TabsContent value="activity" className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">All Documents</h2>
                <Badge variant="outline" className="text-[10px]">{activityTotal}</Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="h-8 text-xs border-border"
                  onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-3.5 w-3.5 mr-1" /> Filters
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs border-border" onClick={handleExport}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs border-border"
                  onClick={() => fetchActivity()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] mb-4 animate-vaultsign-fade-in">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <Label className="text-xs text-text-secondary">Status</Label>
                      <Select value={actStatusFilter} onValueChange={setActStatusFilter}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-text-secondary">Organization</Label>
                      <Select value={actOrgFilter} onValueChange={setActOrgFilter}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Orgs</SelectItem>
                          {organizations.map((org: any) => (
                            <SelectItem key={org.id} value={org.id.toString()}>{org.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-text-secondary">Type</Label>
                      <Select value={actTypeFilter} onValueChange={setActTypeFilter}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {DOCUMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-text-secondary">From</Label>
                      <Input type="date" value={actDateFrom} onChange={(e) => setActDateFrom(e.target.value)}
                        className="h-8 text-xs mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-text-secondary">To</Label>
                      <Input type="date" value={actDateTo} onChange={(e) => setActDateTo(e.target.value)}
                        className="h-8 text-xs mt-1" />
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button variant="ghost" size="sm" className="text-xs text-text-secondary"
                      onClick={() => { setActStatusFilter("all"); setActOrgFilter("all"); setActTypeFilter("all"); setActDateFrom(""); setActDateTo(""); }}>
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {documents.length === 0 ? (
              <Card className="rounded-2xl"><CardContent className="p-12 text-center">
                <Activity className="h-12 w-12 text-text-muted mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-1">No Activity Yet</h3>
                <p className="text-sm text-text-secondary">Document activity will appear here</p>
              </CardContent></Card>
            ) : (
              <>
                <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Signers</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc: any) => {
                          const sc = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
                          return (
                            <TableRow key={doc.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm text-foreground">{doc.document_name}</p>
                                  <p className="text-xs text-text-secondary">{doc.document_type}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-text-secondary">{doc.organization?.name || "—"}</TableCell>
                              <TableCell>
                                <Badge className={`${sc.bg} ${sc.text} border-0`}>{sc.label}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {doc.signers?.slice(0, 3).map((s: any, i: number) => (
                                    <div key={i} className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-[7px] font-bold"
                                      style={{ backgroundColor: s.status === "signed" ? "var(--primary-light)" : s.status === "declined" ? "var(--status-red-bg)" : "var(--surface-2)", color: s.status === "signed" ? "var(--primary)" : s.status === "declined" ? "var(--status-red)" : "var(--text-secondary)" }}
                                      title={`${s.name} - ${s.status}`}>
                                      {s.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                  ))}
                                  {doc.signers?.length > 3 && <span className="text-xs text-text-secondary">+{doc.signers.length - 3}</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-text-secondary">{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {["sent", "partially_signed"].includes(doc.status) && (
                                    <>
                                      {doc.signers?.filter((s: any) => s.status === "pending").slice(0, 1).map((s: any) => (
                                        <Button key={s.id} variant="ghost" size="sm" className="h-7 w-7 p-0 text-status-amber"
                                          onClick={() => handleRemindDoc(doc.id, s.id)} title="Send Reminder">
                                          <Send className="h-3 w-3" />
                                        </Button>
                                      ))}
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-status-red"
                                        onClick={() => handleVoidDoc(doc.id)} title="Void">
                                        <Ban className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                  {doc.status === "completed" && doc.final_document_url && (
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary"
                                      onClick={() => window.open(doc.final_document_url, "_blank")} title="Download Final">
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                {/* Pagination */}
                {activityTotal > 20 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-text-secondary">
                      Page {activityPage} of {Math.ceil(activityTotal / 20)} ({activityTotal} documents)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs" disabled={activityPage <= 1}
                        onClick={() => setActivityPage(activityPage - 1)}>
                        <ChevronLeft className="h-3 w-3" /> Prev
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" disabled={activityPage >= Math.ceil(activityTotal / 20)}
                        onClick={() => setActivityPage(activityPage + 1)}>
                        Next <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ==================== ANALYTICS TAB ==================== */}
          <TabsContent value="analytics" className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-foreground">Analytics & Insights</h2>
              <Select value={analyticsOrgFilter} onValueChange={setAnalyticsOrgFilter}>
                <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="All Organizations" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All Organizations</SelectItem>
                  {organizations.map((org: any) => (
                    <SelectItem key={org.id} value={org.id.toString()}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {analytics ? (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6 animate-vaultsign-fade-in">
                  {[
                    { label: "Total Docs", value: analytics.overview.totalDocuments, icon: FileText, color: "bg-status-blue-bg", iconColor: "text-status-blue" },
                    { label: "Completed", value: analytics.overview.completedDocuments, icon: CheckCircle2, color: "bg-primary-light", iconColor: "text-primary" },
                    { label: "Declined", value: analytics.overview.declinedDocuments, icon: XCircle, color: "bg-status-red-bg", iconColor: "text-status-red" },
                    { label: "Expired", value: analytics.overview.expiredDocuments, icon: AlertTriangle, color: "bg-status-amber-bg", iconColor: "text-status-amber" },
                    { label: "Completion Rate", value: `${analytics.overview.completionRate}%`, icon: TrendingUp, color: "bg-status-green-bg", iconColor: "text-primary" },
                    { label: "Avg Sign Time", value: `${analytics.overview.avgSigningHours}h`, icon: Clock, color: "bg-status-blue-bg", iconColor: "text-status-blue" },
                  ].map((stat, i) => (
                    <Card key={i} className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}>
                            <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-foreground">{stat.value}</p>
                            <p className="text-[10px] text-text-secondary">{stat.label}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* By Status */}
                  <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Documents by Status</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(analytics.byStatus || {}).map(([status, count]: [string, any]) => {
                          const sc = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
                          const pct = analytics.overview.totalDocuments > 0 ? Math.round((count / analytics.overview.totalDocuments) * 100) : 0;
                          return (
                            <div key={status} className="flex items-center gap-3">
                              <Badge className={`${sc.bg} ${sc.text} border-0 text-[10px] w-24 justify-center`}>{sc.label}</Badge>
                              <div className="flex-1 bg-surface-2 rounded-full h-4 overflow-hidden">
                                <div className={`h-full rounded-full ${sc.bg.replace("bg-", "bg-")} transition-all`}
                                  style={{ width: `${pct}%`, backgroundColor: status === "completed" ? "var(--primary)" : status === "declined" ? "var(--status-red)" : status === "sent" ? "var(--status-blue)" : status === "partially_signed" ? "var(--status-amber)" : "var(--text-muted)" }} />
                              </div>
                              <span className="text-xs text-text-secondary w-16 text-right">{count} ({pct}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* By Document Type */}
                  <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Documents by Type</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(analytics.byType || {}).sort((a: any, b: any) => b[1] - a[1]).map(([type, count]: [string, any]) => {
                          const label = DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
                          const pct = analytics.overview.totalDocuments > 0 ? Math.round((count / analytics.overview.totalDocuments) * 100) : 0;
                          return (
                            <div key={type} className="flex items-center gap-3">
                              <span className="text-xs text-foreground w-32 truncate">{label}</span>
                              <div className="flex-1 bg-surface-2 rounded-full h-3 overflow-hidden">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-text-secondary w-12 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monthly Trend */}
                  <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Trend</CardTitle></CardHeader>
                    <CardContent>
                      {analytics.byMonth?.length > 0 ? (
                        <div className="space-y-2">
                          {analytics.byMonth.map((m: any) => {
                            const maxCreated = Math.max(...analytics.byMonth.map((x: any) => x.created), 1);
                            return (
                              <div key={m.month} className="flex items-center gap-3">
                                <span className="text-xs text-text-secondary w-16">{m.month.slice(5)}</span>
                                <div className="flex-1 flex items-center gap-1">
                                  <div className="flex-1 bg-surface-2 rounded-full h-3 overflow-hidden">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${(m.created / maxCreated) * 100}%` }} />
                                  </div>
                                </div>
                                <span className="text-xs text-foreground w-6 text-right">{m.created}</span>
                                <span className="text-[10px] text-primary w-6">{m.completed}</span>
                                <span className="text-[10px] text-status-red w-6">{m.declined}</span>
                              </div>
                            );
                          })}
                          <div className="flex items-center gap-4 text-[10px] text-text-secondary mt-2">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Created</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary opacity-60" /> Completed</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-red" /> Declined</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-text-muted text-center py-4">No data yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Organization Usage */}
                  <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Top Organizations</CardTitle></CardHeader>
                    <CardContent>
                      {analytics.byOrganization?.length > 0 ? (
                        <div className="space-y-2">
                          {analytics.byOrganization.map((org: any, i: number) => {
                            const maxDocs = analytics.byOrganization[0]?.documentCount || 1;
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <span className="text-xs text-foreground w-32 truncate">{org.name}</span>
                                <div className="flex-1 bg-surface-2 rounded-full h-3 overflow-hidden">
                                  <div className="h-full rounded-full bg-status-blue" style={{ width: `${(org.documentCount / maxDocs) * 100}%` }} />
                                </div>
                                <span className="text-xs text-text-secondary w-8 text-right">{org.documentCount}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-text-muted text-center py-4">No data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Signer Stats */}
                <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] mt-6">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Signer Statistics</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-lg bg-background">
                        <p className="text-2xl font-bold text-foreground">{analytics.signers.total}</p>
                        <p className="text-xs text-text-secondary">Total Signers</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-status-green-bg">
                        <p className="text-2xl font-bold text-primary">{analytics.signers.signed}</p>
                        <p className="text-xs text-text-secondary">Signed</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-status-blue-bg">
                        <p className="text-2xl font-bold text-status-blue">{analytics.signers.signRate}%</p>
                        <p className="text-xs text-text-secondary">Sign Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="rounded-2xl"><CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-secondary">Loading analytics...</p>
              </CardContent></Card>
            )}
          </TabsContent>

          {/* ==================== AUDIT LOGS TAB ==================== */}
          <TabsContent value="audit" className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-foreground">Audit Logs</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
                  <Input placeholder="Search logs..." value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-8 h-8 w-[180px] text-xs" />
                </div>
                <Select value={auditOrgFilter} onValueChange={setAuditOrgFilter}>
                  <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="All Orgs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">All Organizations</SelectItem>
                    {organizations.map((org: any) => (
                      <SelectItem key={org.id} value={org.id.toString()}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {auditLogs.length === 0 ? (
              <Card className="rounded-2xl"><CardContent className="p-12 text-center">
                <ShieldCheck className="h-12 w-12 text-text-muted mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-1">No Audit Logs</h3>
                <p className="text-sm text-text-secondary">Activity will be logged here</p>
              </CardContent></Card>
            ) : (
              <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.slice(0, 50).map((log: any, i: number) => {
                        const ev = EVENT_LABELS[log.event] || { label: log.event, color: "text-text-secondary" };
                        return (
                          <TableRow key={i}>
                            <TableCell className="text-xs text-text-secondary whitespace-nowrap">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs font-medium ${ev.color}`}>{ev.label}</span>
                            </TableCell>
                            <TableCell className="text-xs text-foreground">{log.user_name || "—"}</TableCell>
                            <TableCell className="text-xs text-foreground max-w-[200px] truncate">{log.document_name || "—"}</TableCell>
                            <TableCell className="text-xs text-text-secondary">{log.organization || "—"}</TableCell>
                            <TableCell className="text-xs text-text-secondary font-mono">{log.ip_address || "—"}</TableCell>
                            <TableCell className="text-xs text-text-secondary max-w-[200px] truncate">
                              {log.details ? JSON.stringify(log.details).slice(0, 50) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {auditTotal > 50 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-text-secondary">Page {auditPage} of {Math.ceil(auditTotal / 50)}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={auditPage <= 1}
                    onClick={() => setAuditPage(auditPage - 1)}><ChevronLeft className="h-3 w-3" /> Prev</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={auditPage >= Math.ceil(auditTotal / 50)}
                    onClick={() => setAuditPage(auditPage + 1)}>Next <ChevronRight className="h-3 w-3" /></Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ==================== ORG SETTINGS TAB ==================== */}
          <TabsContent value="org-settings" className="mt-6">
            <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <CardHeader>
                <CardTitle className="text-lg">Organization Document Settings</CardTitle>
                <p className="text-sm text-text-secondary">Configure company details, branding, and defaults that appear in document headers and footers</p>
              </CardHeader>
              <CardContent className="p-4">
                <div className="mb-6">
                  <Label className="text-sm font-medium">Select Organization</Label>
                  <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                    <SelectTrigger className="mt-1 max-w-sm"><SelectValue placeholder="Choose an organization..." /></SelectTrigger>
                    <SelectContent>
                      {Array.isArray(organizations) && organizations.map((org: any) => (
                        <SelectItem key={org.id} value={org.id.toString()}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {orgSettings && (
                  <div className="space-y-6 max-w-2xl mt-4">
                    {/* Company Logo — upload only, no URL input */}
                    <LogoUploader
                      value={orgSettings.company_logo_url}
                      onChange={(url) => setOrgSettings({ ...orgSettings, company_logo_url: url })}
                      onUpload={async (file) => {
                        const formData = new FormData();
                        formData.append("file", file);
                        const res = await fetch("/api/vaultsign/documents/upload", { method: "POST", body: formData });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          throw new Error(data.error || "Upload failed");
                        }
                        const data = await res.json();
                        toast.success("Logo uploaded");
                        return data.document_url;
                      }}
                    />

                    <Separator />

                    {/* Company Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Company Address</Label>
                        <Textarea
                          value={orgSettings.company_address || ""}
                          onChange={(e) => setOrgSettings({ ...orgSettings, company_address: e.target.value })}
                          placeholder="123 Main St, City, State, ZIP"
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                      <div className="space-y-3">
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
                        <div>
                          <Label className="text-sm flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Website</Label>
                          <Input value={orgSettings.company_website || ""}
                            onChange={(e) => setOrgSettings({ ...orgSettings, company_website: e.target.value })}
                            placeholder="https://example.com" className="mt-1" />
                        </div>
                      </div>
                    </div>

                    <Button className="bg-primary hover:bg-primary-hover text-white" onClick={saveOrgSettings} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Save Settings
                    </Button>
                  </div>
                )}

                {!selectedOrgId && (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-text-muted mx-auto mb-3" />
                    <p className="text-sm text-text-secondary">Select an organization to configure settings</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Template Create/Edit Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="Template name" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Textarea value={templateForm.description} onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Optional description" rows={2} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Document Type</Label>
                  <Select value={templateForm.document_type} onValueChange={(val) => setTemplateForm({ ...templateForm, document_type: val })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Source Type</Label>
                  <Select value={templateForm.source_type} onValueChange={(val) => setTemplateForm({ ...templateForm, source_type: val })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="word">Word (.docx)</SelectItem>
                      <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={templateForm.is_active}
                  onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })} className="rounded" />
                <Label className="text-sm">Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
              <Button className="bg-primary hover:bg-primary-hover" onClick={saveTemplate} disabled={saving || !templateForm.name}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {editingTemplate ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </VaultSignErrorBoundary>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { VaultSignErrorBoundary } from "@/components/vaultsign/vaultsign-error-boundary";
import {
  LayoutTemplate, Activity, Building2, Plus, Loader2, Edit3,
  Trash2, Search, FileText, Eye, X, Save, FileSignature
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-[#6B7280]", bg: "bg-[#F3F4F6]" },
  sent: { label: "Sent", color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
  partially_signed: { label: "In Progress", color: "text-[#D97706]", bg: "bg-[#FFFBEB]" },
  completed: { label: "Completed", color: "text-[#166534]", bg: "bg-[#DCFCE7]" },
  declined: { label: "Declined", color: "text-[#DC2626]", bg: "bg-[#FEF2F2]" },
  expired: { label: "Expired", color: "text-[#6B7280]", bg: "bg-[#F3F4F6]" },
  voided: { label: "Voided", color: "text-[#6B7280]", bg: "bg-[#F3F4F6]" },
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
  const [templates, setTemplates] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    document_type: "custom",
    source_type: "word",
    is_active: true,
    tiptap_content: "",
    predefined_sign_fields: "[]",
    placeholder_variables: "[]",
    header_config: "{}",
    footer_config: "{}",
  });
  const [saving, setSaving] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [templatesRes, activityRes, orgsRes] = await Promise.all([
          fetch("/api/superadmin/vaultsign/templates"),
          fetch("/api/superadmin/vaultsign/activity?limit=50"),
          fetch("/api/organizations"),
        ]);

        if (templatesRes.ok) {
          const data = await templatesRes.json();
          setTemplates(data.templates || []);
        }
        if (activityRes.ok) {
          const data = await activityRes.json();
          setDocuments(data.documents || []);
        }
        if (orgsRes.ok) {
          const data = await orgsRes.json();
          setOrganizations(data.organizations || data || []);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch org settings when selected
  useEffect(() => {
    if (!selectedOrgId) return;
    const fetchOrgSettings = async () => {
      try {
        const res = await fetch(`/api/superadmin/vaultsign/organization/${selectedOrgId}`);
        if (res.ok) {
          const data = await res.json();
          setOrgSettings(data);
        }
      } catch (err) {
        console.error("Org settings fetch error:", err);
      }
    };
    fetchOrgSettings();
  }, [selectedOrgId]);

  // Template CRUD
  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: "",
      description: "",
      document_type: "custom",
      source_type: "word",
      is_active: true,
      tiptap_content: "",
      predefined_sign_fields: "[]",
      placeholder_variables: "[]",
      header_config: "{}",
      footer_config: "{}",
    });
    setShowTemplateDialog(true);
  };

  const openEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || "",
      document_type: template.document_type,
      source_type: template.source_type,
      is_active: template.is_active,
      tiptap_content: template.tiptap_content || "",
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
      const url = editingTemplate
        ? `/api/superadmin/vaultsign/templates/${editingTemplate.id}`
        : "/api/superadmin/vaultsign/templates";
      const method = editingTemplate ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateForm),
      });

      if (res.ok) {
        toast.success(editingTemplate ? "Template updated" : "Template created");
        setShowTemplateDialog(false);
        // Refresh templates
        const refreshRes = await fetch("/api/superadmin/vaultsign/templates");
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setTemplates(data.templates || []);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save template");
      }
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate this template?")) return;
    try {
      const res = await fetch(`/api/superadmin/vaultsign/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Template deactivated");
        setTemplates(templates.map((t) => t.id === id ? { ...t, is_active: false } : t));
      }
    } catch {
      toast.error("Failed to delete template");
    }
  };

  // Save org settings
  const saveOrgSettings = async () => {
    if (!selectedOrgId || !orgSettings) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/superadmin/vaultsign/organization/${selectedOrgId}`, {
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
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4]">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Skeleton Header */}
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-1" />
            <Skeleton className="h-4 w-72" />
          </div>

          {/* Skeleton Tabs */}
          <Skeleton className="h-10 w-72 rounded-xl mb-6" />

          {/* Skeleton Template Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-[#E5E7EB]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-5 w-12 rounded" />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded" />
                  </div>
                  <Skeleton className="h-3 w-28 mt-2" />
                  <div className="flex items-center gap-1 mt-3">
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-7 w-7" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <VaultSignErrorBoundary>
    <div className="min-h-screen bg-[#F8F7F4]">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            VaultSign Management
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Manage templates, monitor activity, and configure organizations</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-[#E5E7EB] rounded-xl p-1">
            <TabsTrigger value="templates" className="rounded-lg data-[state=active]:bg-[#166534] data-[state=active]:text-white">
              <LayoutTemplate className="h-4 w-4 mr-1" /> Templates
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg data-[state=active]:bg-[#166534] data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-1" /> Activity
            </TabsTrigger>
            <TabsTrigger value="org-settings" className="rounded-lg data-[state=active]:bg-[#166534] data-[state=active]:text-white">
              <Building2 className="h-4 w-4 mr-1" /> Org Settings
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#111827]">Templates</h2>
              <Button className="bg-[#166534] hover:bg-[#14532D] text-white" onClick={openNewTemplate}>
                <Plus className="h-4 w-4 mr-1" /> New Template
              </Button>
            </div>

            {templates.length === 0 ? (
              <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <CardContent className="p-12 text-center">
                  <LayoutTemplate className="h-12 w-12 text-[#9CA3AF] mx-auto mb-3" />
                  <h3 className="font-medium text-[#111827] mb-1">No Templates Yet</h3>
                  <p className="text-sm text-[#6B7280] mb-4">Create your first template to get started</p>
                  <Button className="bg-[#166534] hover:bg-[#14532D] text-white" onClick={openNewTemplate}>
                    <Plus className="h-4 w-4 mr-1" /> Create Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 vaultsign-stagger animate-vaultsign-fade-in">
                {templates.map((template: any) => (
                <Card key={template.id} className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-[#E5E7EB]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-[#111827]">{template.name}</h3>
                        <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{template.description || "No description"}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {template.source_type === "word" ? "Word" : "PDF"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge className={`${template.is_active ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F3F4F6] text-[#6B7280]"} border-0`}>
                        {template.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{template.document_type}</Badge>
                    </div>
                    {template._count?.documents !== undefined && (
                      <p className="text-xs text-[#9CA3AF] mt-2">{template._count.documents} documents created</p>
                    )}
                    <div className="flex items-center gap-1 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-[#E5E7EB] flex-1"
                        onClick={() => openEditTemplate(template)}
                      >
                        <Edit3 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-[#9CA3AF] hover:text-[#DC2626]"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-6">
            {documents.length === 0 ? (
              <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <CardContent className="p-12 text-center">
                  <Activity className="h-12 w-12 text-[#9CA3AF] mx-auto mb-3" />
                  <h3 className="font-medium text-[#111827] mb-1">No Activity Yet</h3>
                  <p className="text-sm text-[#6B7280]">Document activity will appear here once documents are created</p>
                </CardContent>
              </Card>
            ) : (
            <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <CardHeader>
                <CardTitle className="text-lg">All Documents</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Signers</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc: any) => {
                      const statusConf = STATUS_CONFIG[doc.status] || STATUS_CONFIG.draft;
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm text-[#111827]">{doc.document_name}</p>
                              <p className="text-xs text-[#6B7280]">{doc.document_type}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-[#6B7280]">
                            {doc.organization?.name || "—"}
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
                                  className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-[7px] font-bold"
                                  style={{
                                    backgroundColor: s.status === "signed" ? "#DCFCE7" : "#F3F4F6",
                                    color: s.status === "signed" ? "#166534" : "#6B7280",
                                  }}
                                  title={s.name}
                                >
                                  {s.name?.charAt(0)?.toUpperCase()}
                                </div>
                              ))}
                              {doc.signers?.length > 3 && <span className="text-xs text-[#6B7280]">+{doc.signers.length - 3}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-[#6B7280]">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            )}
          </TabsContent>

          {/* Org Settings Tab */}
          <TabsContent value="org-settings" className="mt-6">
            <Card className="rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <CardHeader>
                <CardTitle className="text-lg">Organization Document Settings</CardTitle>
                <p className="text-sm text-[#6B7280]">Configure company details that appear in document headers and footers</p>
              </CardHeader>
              <CardContent className="p-4">
                <div className="mb-4">
                  <Label className="text-sm font-medium">Select Organization</Label>
                  <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                    <SelectTrigger className="mt-1 max-w-sm">
                      <SelectValue placeholder="Choose an organization..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(organizations) && organizations.map((org: any) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {orgSettings && (
                  <div className="space-y-3 max-w-lg mt-4">
                    <div>
                      <Label className="text-sm">Company Logo URL</Label>
                      <Input
                        value={orgSettings.company_logo_url || ""}
                        onChange={(e) => setOrgSettings({ ...orgSettings, company_logo_url: e.target.value })}
                        placeholder="https://example.com/logo.png"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Company Address</Label>
                      <Textarea
                        value={orgSettings.company_address || ""}
                        onChange={(e) => setOrgSettings({ ...orgSettings, company_address: e.target.value })}
                        placeholder="123 Main St, City, State"
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Phone</Label>
                        <Input
                          value={orgSettings.company_phone || ""}
                          onChange={(e) => setOrgSettings({ ...orgSettings, company_phone: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Email</Label>
                        <Input
                          value={orgSettings.company_email || ""}
                          onChange={(e) => setOrgSettings({ ...orgSettings, company_email: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Website</Label>
                      <Input
                        value={orgSettings.company_website || ""}
                        onChange={(e) => setOrgSettings({ ...orgSettings, company_website: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      className="bg-[#166534] hover:bg-[#14532D] text-white mt-2"
                      onClick={saveOrgSettings}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Save Settings
                    </Button>
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
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="Template name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Document Type</Label>
                  <Select value={templateForm.document_type} onValueChange={(val) => setTemplateForm({ ...templateForm, document_type: val })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Source Type</Label>
                  <Select value={templateForm.source_type} onValueChange={(val) => setTemplateForm({ ...templateForm, source_type: val })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="word">Word (.docx)</SelectItem>
                      <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={templateForm.is_active}
                  onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label className="text-sm">Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
              <Button className="bg-[#166534] hover:bg-[#14532D]" onClick={saveTemplate} disabled={saving || !templateForm.name}>
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

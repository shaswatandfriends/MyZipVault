"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileSignature, Plus, Trash2, Pencil, Eye, Upload, X,
  Loader2, LayoutTemplate, ToggleLeft, Building2, Users as UsersIcon,
  Search, Filter, CheckCircle2, XCircle, Clock, AlertCircle, FileText
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────
interface Template {
  id: number;
  name: string;
  description: string | null;
  document_url: string;
  document_type: string;
  placeholder_fields: string;
  predefined_sign_fields: string;
  is_active: boolean;
  created_at: string;
}

interface ActivityDocument {
  id: number;
  document_name: string;
  document_type: string;
  status: string;
  expiry_date: string;
  created_at: string;
  organization: { id: number; name: string };
  creator: { id: number; first_name: string | null; last_name: string | null; email: string };
  signers: { id: number; name: string; status: string }[];
}

const typeLabels: Record<string, string> = {
  right_to_represent: "Right to Represent",
  pre_offer_acceptance: "Pre-Offer Acceptance",
  offer_letter: "Offer Letter",
  nda: "NDA",
  background_check_authorization: "Background Check Auth",
  employment_contract: "Employment Contract",
  onboarding_form: "Onboarding Form",
  custom: "Custom",
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" },
  sent: { label: "Sent", bg: "bg-blue-50", text: "text-blue-700" },
  partially_signed: { label: "Partially Signed", bg: "bg-[#FEF9C3]", text: "text-[#CA8A04]" },
  completed: { label: "Completed", bg: "bg-[#DCFCE7]", text: "text-[#166534]" },
  declined: { label: "Declined", bg: "bg-[#FEE2E2]", text: "text-[#DC2626]" },
  expired: { label: "Expired", bg: "bg-orange-50", text: "text-orange-700" },
  voided: { label: "Voided", bg: "bg-[#F3F4F6]", text: "text-[#9CA3AF]" },
};

// ─── Component ──────────────────────────────────────────────────────
export default function SuperAdminVaultSign() {
  const [tab, setTab] = useState<"templates" | "activity">("templates");

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Template form
  const [tplName, setTplName] = useState("");
  const [tplDescription, setTplDescription] = useState("");
  const [tplDocumentType, setTplDocumentType] = useState("custom");
  const [tplFile, setTplFile] = useState<File | null>(null);
  const [tplPlaceholders, setTplPlaceholders] = useState<{ key: string; label: string }[]>([]);
  const [tplSaving, setTplSaving] = useState(false);

  // Activity state
  const [documents, setDocuments] = useState<ActivityDocument[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityStats, setActivityStats] = useState({ total_sent: 0, completed_this_month: 0, pending_signatures: 0, declined_this_month: 0 });
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/vaultsign/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || data || []);
      }
    } catch {} finally {
      setTemplatesLoading(false);
    }
  }, []);

  // Fetch activity
  const fetchActivity = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/superadmin/vaultsign/activity?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setActivityStats(data.stats || activityStats);
      }
    } catch {} finally {
      setActivityLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (tab === "templates") fetchTemplates();
    else fetchActivity();
  }, [tab, fetchTemplates, fetchActivity]);

  // ─── Template Handlers ────────────────────────────────────────────
  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTplName("");
    setTplDescription("");
    setTplDocumentType("custom");
    setTplFile(null);
    setTplPlaceholders([]);
    setShowTemplateModal(true);
  };

  const openEditTemplate = (t: Template) => {
    setEditingTemplate(t);
    setTplName(t.name);
    setTplDescription(t.description || "");
    setTplDocumentType(t.document_type);
    setTplFile(null);
    try { setTplPlaceholders(JSON.parse(t.placeholder_fields || "[]")); } catch { setTplPlaceholders([]); }
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!tplName.trim()) return toast.error("Template name is required");
    if (!editingTemplate && !tplFile) return toast.error("PDF file is required");
    setTplSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", tplName);
      formData.append("description", tplDescription);
      formData.append("document_type", tplDocumentType);
      formData.append("placeholder_fields", JSON.stringify(tplPlaceholders));
      formData.append("predefined_sign_fields", JSON.stringify([]));
      if (tplFile) formData.append("file", tplFile);

      const url = editingTemplate
        ? `/api/superadmin/vaultsign/templates/${editingTemplate.id}`
        : "/api/superadmin/vaultsign/templates";
      const method = editingTemplate ? "PUT" : "POST";

      const res = await fetch(url, { method, body: formData });
      if (res.ok) {
        toast.success(editingTemplate ? "Template updated" : "Template created");
        setShowTemplateModal(false);
        fetchTemplates();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to save template");
      }
    } catch {
      toast.error("Failed to save template");
    } finally {
      setTplSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/superadmin/vaultsign/templates/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Template deleted"); fetchTemplates(); }
      else { toast.error("Failed to delete"); }
    } catch { toast.error("Failed to delete"); }
  };

  const handleToggleActive = async (t: Template) => {
    try {
      const res = await fetch(`/api/superadmin/vaultsign/templates/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !t.is_active }),
      });
      if (res.ok) { fetchTemplates(); }
    } catch {}
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>VaultSign</h1>
          <p className="text-sm text-[#6B7280]">Manage document signing templates and monitor activity.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F3F4F6] rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("templates")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "templates" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setTab("activity")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "activity" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
          }`}
        >
          Activity
        </button>
      </div>

      {/* ── Templates Tab ──────────────────────────────────────────── */}
      {tab === "templates" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateTemplate} className="bg-[#166534] hover:bg-[#14532D]">
              <Plus className="size-4 mr-2" /> Add Template
            </Button>
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-[#166534]" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]">
              <LayoutTemplate className="size-12 mx-auto text-[#9CA3AF] mb-3" />
              <h3 className="text-lg font-medium text-[#111827]">No templates yet</h3>
              <p className="text-sm text-[#6B7280] mt-1">Create a template for recruiters to use.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => {
                let fieldCount = 0;
                try { fieldCount = JSON.parse(t.predefined_sign_fields || "[]").length; } catch {}
                return (
                  <div key={t.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-start justify-between">
                      <FileSignature className="size-8 text-[#166534]" />
                      <div className="flex items-center gap-2">
                        <Switch checked={t.is_active} onCheckedChange={() => handleToggleActive(t)} />
                      </div>
                    </div>
                    <h3 className="font-medium text-[#111827] mt-3">{t.name}</h3>
                    <p className="text-sm text-[#6B7280] mt-1 line-clamp-2">{t.description || "No description"}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge className="bg-[#F3F4F6] text-[#6B7280] border-0 text-xs">{typeLabels[t.document_type] || t.document_type}</Badge>
                      {fieldCount > 0 && (
                        <Badge className="bg-[#DCFCE7] text-[#166534] border-0 text-xs">{fieldCount} fields preset</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E5E7EB]">
                      <Button variant="ghost" size="sm" onClick={() => openEditTemplate(t)} className="text-[#6B7280]">
                        <Pencil className="size-3 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(t.id)} className="text-[#DC2626]">
                        <Trash2 className="size-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Template Modal */}
          {showTemplateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                    {editingTemplate ? "Edit Template" : "Add Template"}
                  </h2>
                  <button onClick={() => setShowTemplateModal(false)} className="text-[#9CA3AF] hover:text-[#111827]">
                    <X className="size-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Template Name</Label>
                    <Input value={tplName} onChange={(e) => setTplName(e.target.value)} className="mt-1 border-[#E5E7EB]" />
                  </div>
                  <div>
                    <Label>Document Type</Label>
                    <Select value={tplDocumentType} onValueChange={setTplDocumentType}>
                      <SelectTrigger className="mt-1 border-[#E5E7EB]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={tplDescription} onChange={(e) => setTplDescription(e.target.value)} className="mt-1 border-[#E5E7EB]" rows={3} />
                  </div>
                  <div>
                    <Label>Upload PDF</Label>
                    <label className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed mt-1 cursor-pointer transition-all ${
                      tplFile ? "border-[#166534] bg-[#DCFCE7]/20" : "border-[#E5E7EB] hover:border-[#166534]/50"
                    }`}>
                      <Upload className="size-6 text-[#9CA3AF] mb-1" />
                      <p className="text-sm text-[#111827]">{tplFile ? tplFile.name : "Click to upload PDF"}</p>
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => setTplFile(e.target.files?.[0] || null)} />
                    </label>
                    {editingTemplate && !tplFile && <p className="text-xs text-[#9CA3AF] mt-1">Leave empty to keep existing PDF</p>}
                  </div>

                  {/* Placeholder Variables */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Template Variables</Label>
                      <Button variant="ghost" size="sm" onClick={() => setTplPlaceholders((prev) => [...prev, { key: "", label: "" }])} className="text-[#166534]">
                        <Plus className="size-3 mr-1" /> Add Variable
                      </Button>
                    </div>
                    {tplPlaceholders.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <Input
                          value={p.key}
                          onChange={(e) => {
                            const updated = [...tplPlaceholders];
                            updated[i] = { ...updated[i], key: e.target.value.replace(/\s/g, "_") };
                            setTplPlaceholders(updated);
                          }}
                          placeholder="key_name"
                          className="border-[#E5E7EB] flex-1"
                        />
                        <Input
                          value={p.label}
                          onChange={(e) => {
                            const updated = [...tplPlaceholders];
                            updated[i] = { ...updated[i], label: e.target.value };
                            setTplPlaceholders(updated);
                          }}
                          placeholder="Display Label"
                          className="border-[#E5E7EB] flex-1"
                        />
                        <button onClick={() => setTplPlaceholders((prev) => prev.filter((_, idx) => idx !== i))} className="text-[#9CA3AF] hover:text-[#DC2626]">
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-[#E5E7EB]">
                  <Button variant="ghost" onClick={() => setShowTemplateModal(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleSaveTemplate} disabled={tplSaving} className="flex-1 bg-[#166534] hover:bg-[#14532D]">
                    {tplSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Save Template
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Activity Tab ────────────────────────────────────────────── */}
      {tab === "activity" && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Documents", value: activityStats.total_sent, icon: FileText, color: "text-[#111827]" },
              { label: "Completed This Month", value: activityStats.completed_this_month, icon: CheckCircle2, color: "text-[#166534]" },
              { label: "Pending Signatures", value: activityStats.pending_signatures, icon: Clock, color: "text-blue-600" },
              { label: "Declined This Month", value: activityStats.declined_this_month, icon: XCircle, color: "text-[#DC2626]" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#6B7280]">{s.label}</p>
                  <s.icon className={`size-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-semibold text-[#111827] mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] border-[#E5E7EB] bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {activityLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-[#166534]" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]">
              <FileSignature className="size-12 mx-auto text-[#9CA3AF] mb-3" />
              <h3 className="text-lg font-medium text-[#111827]">No documents yet</h3>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Document</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Organization</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Recruiter</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => {
                      const sc = statusConfig[doc.status] || statusConfig.draft;
                      return (
                        <tr key={doc.id} className="border-b border-[#E5E7EB] hover:bg-[#F8F7F4]">
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#111827]">{doc.document_name}</div>
                            <Badge className="mt-1 text-[10px] bg-[#F3F4F6] text-[#6B7280] border-0">{typeLabels[doc.document_type]}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-[#6B7280]">
                            <div className="flex items-center gap-1"><Building2 className="size-3" />{doc.organization.name}</div>
                          </td>
                          <td className="py-3 px-4 text-sm text-[#6B7280]">
                            {doc.creator.first_name} {doc.creator.last_name}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`${sc.bg} ${sc.text} border-0`}>{sc.label}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-[#6B7280]">{new Date(doc.created_at).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

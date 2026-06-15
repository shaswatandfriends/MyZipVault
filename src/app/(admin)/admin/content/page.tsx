"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  PenSquare,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  FileDown,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  X,
  Loader2,
} from "@/lib/icons";
import { priorityColors, destructiveColors } from "@/lib/status-colors";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ──────────────────────────────────────────────────────────
interface ChecklistTemplateItem {
  id: number;
  profession: string;
  specialty: string;
  name: string;
  jobTitle?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface SkillItem {
  id: number;
  checklistTemplateId: number;
  skillName: string;
  category: string;
  questionType: string;
  sortOrder: number;
  hasNaOption: boolean;
}

interface ReferenceQuestionItem {
  id: number;
  employmentStatus: string;
  questionText: string;
  responseType: string;
  sortOrder: number;
}

interface ContentData {
  checklistTemplates: ChecklistTemplateItem[];
  skills: SkillItem[];
  referenceQuestions: ReferenceQuestionItem[];
}

interface PreviewCategory {
  category: string;
  skills: Array<{
    id: number;
    skillName: string;
    questionType: string;
    sortOrder: number;
    hasNaOption: boolean;
  }>;
}

interface PreviewTemplate {
  id: number;
  profession: string;
  specialty: string;
  name: string;
  jobTitle?: string | null;
  isActive: boolean;
}

interface PreviewRefQuestion {
  id: number;
  questionText: string;
  responseType: string;
  sortOrder: number;
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AdminContentPage() {
  const [data, setData] = useState<ContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplateItem | null>(null);
  const [templateForm, setTemplateForm] = useState({
    profession: "",
    specialty: "",
    name: "",
    jobTitle: "",
    isActive: true,
  });

  // ── Skill dialog state
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillItem | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("all");
  const [skillForm, setSkillForm] = useState({
    checklistTemplateId: 0,
    skillName: "",
    category: "",
    questionType: "rating_1_4",
    sortOrder: 0,
    hasNaOption: true,
  });

  // ── Reference question dialog state
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ReferenceQuestionItem | null>(null);
  const [questionEmploymentFilter, setQuestionEmploymentFilter] = useState<string>("all");
  const [questionForm, setQuestionForm] = useState({
    employmentStatus: "current",
    questionText: "",
    responseType: "rating_1_4",
    sortOrder: 0,
  });

  // ── Delete confirm dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number } | null>(null);

  // ── Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importValidating, setImportValidating] = useState(false);
  const [importImporting, setImportImporting] = useState(false);
  const [importValidationResult, setImportValidationResult] = useState<{
    totalRows: number;
    validRows: number;
    errorRows: number;
    errors: Array<{ row: number; message: string }>;
    preview: Array<{ profession: string; jobTitle: string; specialty: string; category: string; skillName: string; questionType: string; hasNaOption: string }>;
  } | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Delete All modal state
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [deleteAllStep, setDeleteAllStep] = useState<1 | 2>(1);
  const [deleteAllOtp, setDeleteAllOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [deleteAllSending, setDeleteAllSending] = useState(false);
  const [deleteAllDeleting, setDeleteAllDeleting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ── Preview Checklist modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string>("");
  const [previewData, setPreviewData] = useState<{
    template: PreviewTemplate;
    categories: PreviewCategory[];
    totalSkills: number;
    totalCategories: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Reference Preview modal state
  const [refPreviewOpen, setRefPreviewOpen] = useState(false);
  const [refPreviewStatus, setRefPreviewStatus] = useState<string>("current");
  const [refPreviewQuestions, setRefPreviewQuestions] = useState<PreviewRefQuestion[]>([]);
  const [refPreviewLoading, setRefPreviewLoading] = useState(false);

  // ── Reference Import modal state
  const [refImportModalOpen, setRefImportModalOpen] = useState(false);
  const [refImportFile, setRefImportFile] = useState<File | null>(null);
  const [refImportValidating, setRefImportValidating] = useState(false);
  const [refImportImporting, setRefImportImporting] = useState(false);
  const [refImportValidationResult, setRefImportValidationResult] = useState<{
    totalRows: number;
    validRows: number;
    errorRows: number;
    errors: Array<{ row: number; message: string }>;
    preview: Array<{ employmentStatus: string; questionText: string; responseType: string; sortOrder: number }>;
  } | null>(null);
  const [refImportResult, setRefImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // ── Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const fetchContent = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/content");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch content");
      }
      const json = (await res.json()) as ContentData;
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load content", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // ─── CRUD helper ──────────────────────────────────────────────────
  const performAction = async (type: string, action: string, data: Record<string, unknown>) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, action, data }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Action failed");
      }
      toast.success(`Successfully ${action === "create" ? "created" : action === "update" ? "updated" : "deleted"} ${type.replace("_", " ")}`);
      fetchContent();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Action failed", { description: message });
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Template handlers ────────────────────────────────────────────
  const openTemplateDialog = (template?: ChecklistTemplateItem) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        profession: template.profession,
        specialty: template.specialty,
        name: template.name,
        jobTitle: template.jobTitle || "",
        isActive: template.isActive,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ profession: "", specialty: "", name: "", jobTitle: "", isActive: true });
    }
    setTemplateDialogOpen(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.profession || !templateForm.specialty || !templateForm.name) {
      toast.error("Please fill in all fields");
      return;
    }
    if (editingTemplate) {
      await performAction("checklist_template", "update", {
        id: editingTemplate.id,
        ...templateForm,
      });
    } else {
      await performAction("checklist_template", "create", templateForm);
    }
    setTemplateDialogOpen(false);
  };

  // ─── Skill handlers ──────────────────────────────────────────────
  const openSkillDialog = (skill?: SkillItem) => {
    if (skill) {
      setEditingSkill(skill);
      setSkillForm({
        checklistTemplateId: skill.checklistTemplateId,
        skillName: skill.skillName,
        category: skill.category,
        questionType: skill.questionType,
        sortOrder: skill.sortOrder,
        hasNaOption: skill.hasNaOption,
      });
    } else {
      setEditingSkill(null);
      const firstTemplateId = data?.checklistTemplates[0]?.id ?? 0;
      setSkillForm({
        checklistTemplateId: selectedTemplateId !== "all"
          ? Number(selectedTemplateId)
          : firstTemplateId,
        skillName: "",
        category: "",
        questionType: "rating_1_4",
        sortOrder: 0,
        hasNaOption: true,
      });
    }
    setSkillDialogOpen(true);
  };

  const saveSkill = async () => {
    if (!skillForm.skillName || !skillForm.category || !skillForm.checklistTemplateId) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (editingSkill) {
      await performAction("skill", "update", { id: editingSkill.id, ...skillForm });
    } else {
      await performAction("skill", "create", skillForm);
    }
    setSkillDialogOpen(false);
  };

  // ─── Reference question handlers ─────────────────────────────────
  const openQuestionDialog = (question?: ReferenceQuestionItem) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        employmentStatus: question.employmentStatus,
        questionText: question.questionText,
        responseType: question.responseType,
        sortOrder: question.sortOrder,
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        employmentStatus: "current",
        questionText: "",
        responseType: "rating_1_4",
        sortOrder: 0,
      });
    }
    setQuestionDialogOpen(true);
  };

  const saveQuestion = async () => {
    if (!questionForm.questionText) {
      toast.error("Please enter a question");
      return;
    }
    if (editingQuestion) {
      await performAction("reference_question", "update", { id: editingQuestion.id, ...questionForm });
    } else {
      await performAction("reference_question", "create", questionForm);
    }
    setQuestionDialogOpen(false);
  };

  // ─── Delete handler ──────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await performAction(deleteTarget.type, "delete", { id: deleteTarget.id });
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  // ─── Export Template ──────────────────────────────────────────────
  const handleExportTemplate = () => {
    window.open("/api/admin/skills/export-template", "_blank");
  };

  // ─── Export Current Data ──────────────────────────────────────────
  const handleExportData = () => {
    window.open("/api/admin/skills/export-data", "_blank");
  };

  // ─── Import handlers ──────────────────────────────────────────────
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx")) {
        toast.error("Only .xlsx files are accepted");
        return;
      }
      setImportFile(file);
      setImportValidationResult(null);
      setImportResult(null);
    }
  };

  const handleValidate = async () => {
    if (!importFile) return;
    try {
      setImportValidating(true);
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await fetch("/api/admin/skills/validate-import", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Validation failed");
      }
      setImportValidationResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Validation failed", { description: message });
    } finally {
      setImportValidating(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      setImportImporting(true);
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await fetch("/api/admin/skills/import", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Import failed");
      }
      setImportResult(result);
      fetchContent();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Import failed", { description: message });
    } finally {
      setImportImporting(false);
    }
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportValidationResult(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Delete All handlers ──────────────────────────────────────────
  const handleRequestOtp = async () => {
    try {
      setDeleteAllSending(true);
      const res = await fetch("/api/admin/skills/request-delete-otp", { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send code");
      setDeleteAllStep(2);
      setResendCooldown(60);
      toast.success("Verification code sent to your email");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to send code", { description: message });
    } finally {
      setDeleteAllSending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...deleteAllOtp];
    newOtp[index] = value;
    setDeleteAllOtp(newOtp);
    // Auto advance
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...deleteAllOtp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setDeleteAllOtp(newOtp);
  };

  const handleDeleteAll = async () => {
    const otpValue = deleteAllOtp.join("");
    if (otpValue.length !== 6) return;
    try {
      setDeleteAllDeleting(true);
      const res = await fetch("/api/admin/skills/delete-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpValue }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete");
      toast.success("All skills data has been permanently deleted");
      setDeleteAllModalOpen(false);
      setDeleteAllStep(1);
      setDeleteAllOtp(["", "", "", "", "", ""]);
      fetchContent();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Deletion failed", { description: message });
    } finally {
      setDeleteAllDeleting(false);
    }
  };

  // ─── Preview Checklist handlers ───────────────────────────────────
  const handlePreviewChecklist = async () => {
    if (!previewTemplateId) return;
    try {
      setPreviewLoading(true);
      setPreviewModalOpen(true);
      const res = await fetch(`/api/admin/skills/preview/${previewTemplateId}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load preview");
      setPreviewData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Preview failed", { description: message });
      setPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ─── Reference Import handlers ────────────────────────────────────
  const handleRefExportTemplate = () => {
    window.open("/api/admin/reference-questions/export-template", "_blank");
  };

  const handleRefExportData = () => {
    window.open("/api/admin/reference-questions/export-data", "_blank");
  };

  const handleRefImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx")) {
        toast.error("Only .xlsx files are accepted");
        return;
      }
      setRefImportFile(file);
      setRefImportValidationResult(null);
      setRefImportResult(null);
    }
  };

  const handleRefValidate = async () => {
    if (!refImportFile) return;
    try {
      setRefImportValidating(true);
      const formData = new FormData();
      formData.append("file", refImportFile);
      const res = await fetch("/api/admin/reference-questions/validate-import", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Validation failed");
      }
      setRefImportValidationResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Validation failed", { description: message });
    } finally {
      setRefImportValidating(false);
    }
  };

  const handleRefImport = async () => {
    if (!refImportFile) return;
    try {
      setRefImportImporting(true);
      const formData = new FormData();
      formData.append("file", refImportFile);
      const res = await fetch("/api/admin/reference-questions/import", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Import failed");
      }
      setRefImportResult(result);
      fetchContent();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Import failed", { description: message });
    } finally {
      setRefImportImporting(false);
    }
  };

  const resetRefImportModal = () => {
    setRefImportFile(null);
    setRefImportValidationResult(null);
    setRefImportResult(null);
    if (refFileInputRef.current) refFileInputRef.current.value = "";
  };

  // ─── Reference Preview handlers ───────────────────────────────────
  const handleRefPreview = async () => {
    try {
      setRefPreviewLoading(true);
      setRefPreviewOpen(true);
      const res = await fetch(`/api/admin/reference-questions/preview?employment_status=${refPreviewStatus}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to load preview");
      setRefPreviewQuestions(result.questions || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Preview failed", { description: message });
      setRefPreviewOpen(false);
    } finally {
      setRefPreviewLoading(false);
    }
  };

  // ─── Filtered skills ─────────────────────────────────────────────
  const filteredSkills = data?.skills.filter(
    (s) => selectedTemplateId === "all" || s.checklistTemplateId === Number(selectedTemplateId)
  ) ?? [];

  const filteredQuestions = data?.referenceQuestions.filter(
    (q) => questionEmploymentFilter === "all" || q.employmentStatus === questionEmploymentFilter
  ) ?? [];

  // ─── Rating button style helper ───────────────────────────────────
  const getRatingBtnClass = (rating: number, selected: number | null) => {
    const isSelected = selected === rating;
    const base = "w-10 h-10 rounded-lg font-bold text-sm border-2 transition-all ";
    if (rating === 4) return base + (isSelected ? "bg-primary border-primary text-white" : "border-gray-200 text-gray-400 hover:border-primary hover:text-primary");
    const p = priorityColors[rating];
    if (!p) return base;
    const borderCls = p.text.replace("text-", "border-");
    return isSelected
      ? `${base}${p.bg} ${borderCls} ${p.text}`
      : `${base}border-gray-200 text-gray-400 hover:${borderCls} hover:${p.text}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Management"
        description="Manage professions, specialties, skills, and reference questions."
      />

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Professions & Specialties</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="questions">Reference Questions</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════
            Tab 1 — Professions & Specialties
        ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Checklist Templates</CardTitle>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => openTemplateDialog()}
                >
                  <Plus className="size-4" />
                  Add Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : data?.checklistTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PenSquare className="size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No templates yet</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profession</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Specialty</TableHead>
                        <TableHead>Template Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.checklistTemplates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium text-sm">
                            {template.profession}
                          </TableCell>
                          <TableCell className="text-sm">{template.jobTitle || "—"}</TableCell>
                          <TableCell className="text-sm">{template.specialty}</TableCell>
                          <TableCell className="text-sm">{template.name}</TableCell>
                          <TableCell>
                            {template.isActive ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => openTemplateDialog(template)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeleteTarget({ type: "checklist_template", id: template.id });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            Tab 2 — Skills
        ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">Skills</CardTitle>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue placeholder="Filter by template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      {data?.checklistTemplates.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.profession} — {t.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => openSkillDialog()}
                  >
                    <Plus className="size-4" />
                    Add Skill
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleExportTemplate}>
                    <Download className="size-4" />
                    Export Template
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { resetImportModal(); setImportModalOpen(true); }}>
                    <Upload className="size-4" />
                    Import Data
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleExportData}>
                    <FileDown className="size-4" />
                    Export Current Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-status-red text-status-red hover:bg-badge-red-bg bg-transparent"
                    onClick={() => { setDeleteAllStep(1); setDeleteAllOtp(["", "", "", "", "", ""]); setDeleteAllModalOpen(true); }}
                  >
                    <Trash2 className="size-4" />
                    Delete All Data
                  </Button>
                  <div className="flex items-center gap-2">
                    <Select value={previewTemplateId} onValueChange={setPreviewTemplateId}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {data?.checklistTemplates.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.profession} — {t.specialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="secondary" size="sm" onClick={handlePreviewChecklist} disabled={!previewTemplateId}>
                      <Eye className="size-4" />
                      Preview Checklist
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : filteredSkills.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PenSquare className="size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No skills found</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Order</TableHead>
                        <TableHead>Skill Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>N/A</TableHead>
                        <TableHead className="w-28">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSkills.map((skill) => (
                        <TableRow key={skill.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {skill.sortOrder}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {skill.skillName}
                          </TableCell>
                          <TableCell className="text-sm">{skill.category}</TableCell>
                          <TableCell className="text-sm">{skill.questionType}</TableCell>
                          <TableCell>
                            {skill.hasNaOption ? (
                              <CheckCircle2 className="size-4 text-emerald-600" />
                            ) : (
                              <XCircle className="size-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() =>
                                  performAction("skill", "update", {
                                    id: skill.id,
                                    sortOrder: Math.max(0, skill.sortOrder - 1),
                                    skillName: skill.skillName,
                                    category: skill.category,
                                    questionType: skill.questionType,
                                    hasNaOption: skill.hasNaOption,
                                    checklistTemplateId: skill.checklistTemplateId,
                                  })
                                }
                                disabled={actionLoading}
                              >
                                <ChevronUp className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() =>
                                  performAction("skill", "update", {
                                    id: skill.id,
                                    sortOrder: skill.sortOrder + 1,
                                    skillName: skill.skillName,
                                    category: skill.category,
                                    questionType: skill.questionType,
                                    hasNaOption: skill.hasNaOption,
                                    checklistTemplateId: skill.checklistTemplateId,
                                  })
                                }
                                disabled={actionLoading}
                              >
                                <ChevronDown className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => openSkillDialog(skill)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeleteTarget({ type: "skill", id: skill.id });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            Tab 3 — Reference Questions
        ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">Reference Questions</CardTitle>
                  <Select
                    value={questionEmploymentFilter}
                    onValueChange={setQuestionEmploymentFilter}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="ending_contract">Ending Contract</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={handleRefExportTemplate}>
                    <Download className="size-4" />
                    Export Template
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { resetRefImportModal(); setRefImportModalOpen(true); }}>
                    <Upload className="size-4" />
                    Import Data
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRefExportData}>
                    <FileDown className="size-4" />
                    Export Current Data
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleRefPreview}>
                    <Eye className="size-4" />
                    Preview Form
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => openQuestionDialog()}
                  >
                    <Plus className="size-4" />
                    Add Question
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PenSquare className="size-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No questions found</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Order</TableHead>
                        <TableHead>Employment Status</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Response Type</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuestions.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {q.sortOrder}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {q.employmentStatus.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-xs truncate">
                            {q.questionText}
                          </TableCell>
                          <TableCell className="text-sm">{q.responseType}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => openQuestionDialog(q)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeleteTarget({ type: "reference_question", id: q.id });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Template Dialog ────────────────────────────────────────── */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Add Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update the checklist template details."
                : "Create a new checklist template for a profession and specialty."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Profession</Label>
              <Input
                placeholder="e.g. Nursing"
                value={templateForm.profession}
                onChange={(e) => setTemplateForm((f) => ({ ...f, profession: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Specialty</Label>
              <Input
                placeholder="e.g. ICU"
                value={templateForm.specialty}
                onChange={(e) => setTemplateForm((f) => ({ ...f, specialty: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                placeholder="e.g. RN"
                value={templateForm.jobTitle}
                onChange={(e) => setTemplateForm((f) => ({ ...f, jobTitle: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                placeholder="e.g. ICU Skills Checklist"
                value={templateForm.name}
                onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={templateForm.isActive}
                onCheckedChange={(checked) => setTemplateForm((f) => ({ ...f, isActive: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={saveTemplate}
              disabled={actionLoading}
            >
              {editingTemplate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Skill Dialog ───────────────────────────────────────────── */}
      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSkill ? "Edit Skill" : "Add Skill"}</DialogTitle>
            <DialogDescription>
              {editingSkill ? "Update skill details." : "Add a new skill to a checklist template."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Checklist Template</Label>
              <Select
                value={String(skillForm.checklistTemplateId)}
                onValueChange={(val) =>
                  setSkillForm((f) => ({ ...f, checklistTemplateId: Number(val) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {data?.checklistTemplates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.profession} — {t.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Skill Name</Label>
              <Input
                placeholder="e.g. Ventilator Management"
                value={skillForm.skillName}
                onChange={(e) => setSkillForm((f) => ({ ...f, skillName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                placeholder="e.g. Clinical Skills"
                value={skillForm.category}
                onChange={(e) => setSkillForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={skillForm.questionType}
                  onValueChange={(val) => setSkillForm((f) => ({ ...f, questionType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating_1_4">1-4 Rating</SelectItem>
                    <SelectItem value="yes_no">Yes/No</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={skillForm.sortOrder}
                  onChange={(e) =>
                    setSkillForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={skillForm.hasNaOption}
                onCheckedChange={(checked) => setSkillForm((f) => ({ ...f, hasNaOption: checked }))}
              />
              <Label>Include N/A Option</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={saveSkill}
              disabled={actionLoading}
            >
              {editingSkill ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Question Dialog ────────────────────────────────────────── */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>
              {editingQuestion
                ? "Update reference question details."
                : "Add a new reference question."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employment Status</Label>
              <Select
                value={questionForm.employmentStatus}
                onValueChange={(val) => setQuestionForm((f) => ({ ...f, employmentStatus: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="ending_contract">Ending Contract</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea
                placeholder="e.g. How would you rate this employee's clinical skills?"
                value={questionForm.questionText}
                onChange={(e) => setQuestionForm((f) => ({ ...f, questionText: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Response Type</Label>
                <Select
                  value={questionForm.responseType}
                  onValueChange={(val) => setQuestionForm((f) => ({ ...f, responseType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating_1_4">1-4 Rating</SelectItem>
                    <SelectItem value="yes_no">Yes/No</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={questionForm.sortOrder}
                  onChange={(e) =>
                    setQuestionForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={saveQuestion}
              disabled={actionLoading}
            >
              {editingQuestion ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={actionLoading}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          Import Modal
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={importModalOpen} onOpenChange={(open) => { setImportModalOpen(open); if (!open) resetImportModal(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Skills Data</DialogTitle>
            <DialogDescription>Upload an Excel file to import skills into the database.</DialogDescription>
          </DialogHeader>

          {!importResult ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1 - Download Template */}
                <Card className="border-2 border-dashed border-gray-200 hover:border-emerald-300 transition-colors">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <FileSpreadsheet className="size-8 text-emerald-600" />
                    <h3 className="font-semibold text-sm">Download Template</h3>
                    <p className="text-xs text-muted-foreground">
                      Download the Excel template with correct column format. Fill it in and upload it back.
                    </p>
                    <Button variant="secondary" className="w-full" onClick={handleExportTemplate}>
                      <Download className="size-4" />
                      Download Excel Template
                    </Button>
                  </CardContent>
                </Card>

                {/* Card 2 - Upload Data */}
                <Card className="border-2 border-dashed border-gray-200 hover:border-emerald-300 transition-colors">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <Upload className="size-8 text-orange-500" />
                    <h3 className="font-semibold text-sm">Upload Data</h3>
                    <p className="text-xs text-muted-foreground">
                      Upload your completed Excel file. Data will be validated before import.
                    </p>
                    <div className="w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        {importFile ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-5 text-emerald-600" />
                            <span className="text-sm font-medium">{importFile.name}</span>
                            <span className="text-xs text-muted-foreground">({(importFile.size / 1024).toFixed(1)} KB)</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Upload className="size-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">.xlsx files only</span>
                          </div>
                        )}
                        <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFileSelect} />
                      </label>
                    </div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!importFile || importValidating} onClick={handleValidate}>
                      {importValidating ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                      Upload & Validate
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Warning box */}
              <div className="bg-badge-yellow-bg border border-status-amber rounded-lg p-4 flex gap-3">
                <AlertTriangle className="size-5 text-status-amber flex-shrink-0 mt-0.5" />
                <p className="text-sm text-status-amber-dark">
                  Importing will <strong>ADD</strong> new data to existing skills. To replace all data, use Delete All Data first, then import. Duplicate skills (same Profession + Job Title + Specialty + Category + Skill Name) will be skipped.
                </p>
              </div>

              {/* Validation Results */}
              {importValidationResult && (
                <div className="space-y-3">
                  {importValidationResult.errorRows > 0 && (
                    <div className="bg-status-red-bg border border-status-red-border rounded-lg p-4">
                      <p className="text-sm font-semibold text-status-red-dark">
                        {importValidationResult.errorRows} row(s) have errors
                      </p>
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs text-status-red-dark space-y-1">
                        {importValidationResult.errors.slice(0, 10).map((e, i) => (
                          <p key={i}>Row {e.row}: {e.message}</p>
                        ))}
                        {importValidationResult.errors.length > 10 && (
                          <p>...and {importValidationResult.errors.length - 10} more errors</p>
                        )}
                      </div>
                    </div>
                  )}
                  {importValidationResult.validRows > 0 && (
                    <div className="bg-status-green-bg border border-primary/30 rounded-lg p-4">
                      <p className="text-sm font-semibold text-primary">
                        {importValidationResult.validRows} valid row(s) found out of {importValidationResult.totalRows} total
                      </p>
                      {importValidationResult.preview.length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Job Title</TableHead>
                                <TableHead className="text-xs">Specialty</TableHead>
                                <TableHead className="text-xs">Category</TableHead>
                                <TableHead className="text-xs">Skill Name</TableHead>
                                <TableHead className="text-xs">Type</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importValidationResult.preview.slice(0, 3).map((row, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-xs">{row.jobTitle}</TableCell>
                                  <TableCell className="text-xs">{row.specialty}</TableCell>
                                  <TableCell className="text-xs">{row.category}</TableCell>
                                  <TableCell className="text-xs">{row.skillName}</TableCell>
                                  <TableCell className="text-xs">{row.questionType}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      <div className="mt-4 flex gap-2">
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={handleImport}
                          disabled={importImporting}
                        >
                          {importImporting ? <Loader2 className="size-4 animate-spin" /> : null}
                          Import {importValidationResult.validRows} Valid Rows
                        </Button>
                        <Button variant="ghost" onClick={() => { setImportModalOpen(false); resetImportModal(); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Import Success */
            <div className="flex flex-col items-center py-8 text-center gap-3">
              <div className="size-16 rounded-full bg-status-green-bg flex items-center justify-center">
                <Check className="size-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{importResult.imported} skills imported successfully</h3>
              {importResult.skipped > 0 && (
                <p className="text-sm text-muted-foreground">{importResult.skipped} duplicates skipped</p>
              )}
              <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setImportModalOpen(false); resetImportModal(); }}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          Delete All Data Modal
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={deleteAllModalOpen} onOpenChange={setDeleteAllModalOpen}>
        <DialogContent>
          {deleteAllStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">Delete All Skills Data?</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4">
                <div className="size-16 rounded-full bg-status-red-bg flex items-center justify-center">
                  <AlertTriangle className="size-8 text-status-red" />
                </div>
                <div className="bg-status-red-bg border border-status-red-border rounded-lg p-4 w-full">
                  <p className="text-sm text-status-red-dark font-medium">This will permanently delete:</p>
                  <ul className="mt-2 text-sm text-status-red-dark list-disc list-inside space-y-1">
                    <li>All professions</li>
                    <li>All job titles</li>
                    <li>All specialties</li>
                    <li>All skill categories</li>
                    <li>All individual skills</li>
                    <li>All reference questions</li>
                  </ul>
                  <p className="mt-3 text-sm text-status-red-dark font-semibold">This action cannot be undone.</p>
                  <p className="mt-1 text-sm text-status-red-dark">To proceed, you will need to verify with a one-time code.</p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setDeleteAllModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className={destructiveColors.buttonBg + " " + destructiveColors.buttonText}
                  onClick={handleRequestOtp}
                  disabled={deleteAllSending}
                >
                  {deleteAllSending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Continue to Verification →
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Verify Your Identity</DialogTitle>
                <DialogDescription>
                  A one-time verification code has been sent to your registered email.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {deleteAllOtp.map((digit, i) => (
                    <Input
                      key={i}
                      ref={(el) => { otpInputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ""))}
                      className="w-12 h-14 text-center text-2xl font-bold"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <button
                    className="text-sm text-emerald-600 hover:underline disabled:opacity-50 disabled:no-underline"
                    onClick={handleRequestOtp}
                    disabled={resendCooldown > 0 || deleteAllSending}
                  >
                    {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : "Resend Code"}
                  </button>
                </div>
                <Button
                  className={"w-full " + destructiveColors.buttonBg + " " + destructiveColors.buttonText}
                  onClick={handleDeleteAll}
                  disabled={deleteAllOtp.join("").length !== 6 || deleteAllDeleting}
                >
                  {deleteAllDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Permanently Delete All Data
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          Preview Checklist Modal
      ═══════════════════════════════════════════════════════════════ */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewModalOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-[860px] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Checklist Preview</h2>
              <button onClick={() => setPreviewModalOpen(false)} className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : previewData ? (
                <div className="space-y-6">
                  {/* Progress bar */}
                  <Progress value={0} className="h-2" />

                  {/* Sticky checklist name */}
                  <div className="bg-gray-50 rounded-lg p-3 sticky top-0 z-10">
                    <h3 className="font-semibold text-sm text-center">{previewData.template.name}</h3>
                    <p className="text-xs text-center text-muted-foreground">
                      {previewData.template.profession} — {previewData.template.specialty}
                      {previewData.template.jobTitle ? ` — ${previewData.template.jobTitle}` : ""}
                    </p>
                  </div>

                  {/* Intro card */}
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Please rate each skill according to your level of experience. This checklist helps evaluate professional competencies.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Rating scale legend */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Rating Scale:</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded bg-badge-red-bg border-2 border-status-red flex items-center justify-center font-bold text-status-red">1</div>
                        <span>No theory / experience</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded bg-badge-yellow-bg border-2 border-status-amber flex items-center justify-center font-bold text-status-amber">2</div>
                        <span>Limited Experience</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded bg-badge-blue-bg border-2 border-status-blue flex items-center justify-center font-bold text-status-blue">3</div>
                        <span>Experienced</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded bg-primary border-2 border-primary flex items-center justify-center font-bold text-white">4</div>
                        <span>Proficient</span>
                      </div>
                    </div>
                  </div>

                  {/* Skills grouped by category */}
                  {previewData.categories.map((cat) => (
                    <div key={cat.category}>
                      <h4 className="font-semibold text-sm text-primary mb-2 border-b pb-1">{cat.category}</h4>
                      <div className="space-y-2">
                        {cat.skills.map((skill) => (
                          <div key={skill.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                            <span className="text-sm flex-1">{skill.skillName}</span>
                            {skill.questionType === "rating_1_4" ? (
                              <div className="flex gap-2">
                                {[1, 2, 3, 4].map((r) => (
                                  <button key={r} className={getRatingBtnClass(r, null)}>{r}</button>
                                ))}
                                {skill.hasNaOption && (
                                  <button className="w-10 h-10 rounded-lg border-2 border-gray-200 text-gray-400 text-xs font-medium hover:border-gray-400">
                                    N/A
                                  </button>
                                )}
                              </div>
                            ) : skill.questionType === "yes_no" ? (
                              <div className="flex gap-2">
                                <button className="px-4 h-10 rounded-lg border-2 border-gray-200 text-gray-400 text-sm font-medium hover:border-emerald-600 hover:text-emerald-600">Yes</button>
                                <button className="px-4 h-10 rounded-lg border-2 border-gray-200 text-gray-400 text-sm font-medium hover:border-red-600 hover:text-red-600">No</button>
                              </div>
                            ) : (
                              <Textarea placeholder="Enter response..." disabled className="w-48 h-10 text-sm" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Signature section */}
                  <Card className="border-dashed">
                    <CardContent className="p-4">
                      <Label className="text-sm font-medium">Digital Signature</Label>
                      <div className="mt-2 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                        Signature area (disabled in preview)
                      </div>
                      <Input placeholder="Type your full name" disabled className="mt-2" />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Select a template and click Preview
                </div>
              )}
            </div>

            {/* Footer */}
            {previewData && (
              <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between text-sm text-muted-foreground">
                <span>{previewData.totalCategories} categories — {previewData.totalSkills} total skills</span>
                <span>This is how candidates see this checklist</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          Reference Form Preview Modal
      ═══════════════════════════════════════════════════════════════ */}
      {refPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setRefPreviewOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-[860px] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Reference Form Preview</h2>
              <button onClick={() => setRefPreviewOpen(false)} className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X className="size-5" />
              </button>
            </div>

            {/* Employment Status Tabs */}
            <div className="px-6 pt-4">
              <div className="flex gap-2">
                {(["current", "ending_contract", "past"] as const).map((status) => (
                  <button
                    key={status}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      refPreviewStatus === status
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => setRefPreviewStatus(status)}
                  >
                    {status === "current" ? "Currently Working" : status === "ending_contract" ? "Ending Contract" : "Past Employment"}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {refPreviewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : refPreviewQuestions.length > 0 ? (
                <div className="space-y-4">
                  {/* Rating scale legend */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Rating Scale:</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded bg-badge-red-bg border-2 border-status-red flex items-center justify-center font-bold text-status-red">1</div>
                        <span>No theory / experience</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded bg-badge-yellow-bg border-2 border-status-amber flex items-center justify-center font-bold text-status-amber">2</div>
                        <span>Limited Experience</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded bg-badge-blue-bg border-2 border-status-blue flex items-center justify-center font-bold text-status-blue">3</div>
                        <span>Experienced</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="size-6 rounded bg-primary border-2 border-primary flex items-center justify-center font-bold text-white">4</div>
                        <span>Proficient</span>
                      </div>
                    </div>
                  </div>

                  {refPreviewQuestions.map((q, i) => (
                    <div key={q.id} className="py-3 border-b border-gray-50">
                      <p className="text-sm font-medium mb-2">{i + 1}. {q.questionText}</p>
                      {q.responseType === "rating_1_4" ? (
                        <div className="flex gap-2">
                          {[1, 2, 3, 4].map((r) => (
                            <button key={r} className={getRatingBtnClass(r, null)}>{r}</button>
                          ))}
                        </div>
                      ) : q.responseType === "yes_no" ? (
                        <div className="flex gap-2">
                          <button className="px-4 h-10 rounded-lg border-2 border-gray-200 text-gray-400 text-sm font-medium hover:border-emerald-600 hover:text-emerald-600">Yes</button>
                          <button className="px-4 h-10 rounded-lg border-2 border-gray-200 text-gray-400 text-sm font-medium hover:border-red-600 hover:text-red-600">No</button>
                        </div>
                      ) : (
                        <Textarea placeholder="Enter response..." disabled className="text-sm" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  No questions for this employment status
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between text-sm text-muted-foreground">
              <span>{refPreviewQuestions.length} questions for {refPreviewStatus === "current" ? "Currently Working" : refPreviewStatus === "ending_contract" ? "Ending Contract" : "Past Employment"}</span>
              <span>This is how managers see this form</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          Reference Questions Import Modal
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={refImportModalOpen} onOpenChange={(open) => { setRefImportModalOpen(open); if (!open) resetRefImportModal(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Reference Questions</DialogTitle>
            <DialogDescription>Upload an Excel file to import reference questions into the database.</DialogDescription>
          </DialogHeader>

          {!refImportResult ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1 - Download Template */}
                <Card className="border-2 border-dashed border-gray-200 hover:border-emerald-300 transition-colors">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <FileSpreadsheet className="size-8 text-emerald-600" />
                    <h3 className="font-semibold text-sm">Download Template</h3>
                    <p className="text-xs text-muted-foreground">
                      Download the Excel template with correct column format. Fill it in and upload it back.
                    </p>
                    <Button variant="secondary" className="w-full" onClick={handleRefExportTemplate}>
                      <Download className="size-4" />
                      Download Excel Template
                    </Button>
                  </CardContent>
                </Card>

                {/* Card 2 - Upload Data */}
                <Card className="border-2 border-dashed border-gray-200 hover:border-emerald-300 transition-colors">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <Upload className="size-8 text-orange-500" />
                    <h3 className="font-semibold text-sm">Upload Data</h3>
                    <p className="text-xs text-muted-foreground">
                      Upload your completed Excel file. Data will be validated before import.
                    </p>
                    <div className="w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        {refImportFile ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-5 text-emerald-600" />
                            <span className="text-sm font-medium">{refImportFile.name}</span>
                            <span className="text-xs text-muted-foreground">({(refImportFile.size / 1024).toFixed(1)} KB)</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Upload className="size-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">.xlsx files only</span>
                          </div>
                        )}
                        <input ref={refFileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleRefImportFileSelect} />
                      </label>
                    </div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!refImportFile || refImportValidating} onClick={handleRefValidate}>
                      {refImportValidating ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                      Upload & Validate
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Warning box */}
              <div className="bg-badge-yellow-bg border border-status-amber rounded-lg p-4 flex gap-3">
                <AlertTriangle className="size-5 text-status-amber flex-shrink-0 mt-0.5" />
                <p className="text-sm text-status-amber-dark">
                  Importing will <strong>ADD</strong> new questions to existing data. To replace all data, use Delete All Data first, then import. Duplicate questions (same Employment Status + Question Text) will be skipped.
                </p>
              </div>

              {/* Validation Results */}
              {refImportValidationResult && (
                <div className="space-y-3">
                  {refImportValidationResult.errorRows > 0 && (
                    <div className="bg-status-red-bg border border-status-red-border rounded-lg p-4">
                      <p className="text-sm font-semibold text-status-red-dark">
                        {refImportValidationResult.errorRows} row(s) have errors
                      </p>
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs text-status-red-dark space-y-1">
                        {refImportValidationResult.errors.slice(0, 10).map((e, i) => (
                          <p key={i}>Row {e.row}: {e.message}</p>
                        ))}
                        {refImportValidationResult.errors.length > 10 && (
                          <p>...and {refImportValidationResult.errors.length - 10} more errors</p>
                        )}
                      </div>
                    </div>
                  )}
                  {refImportValidationResult.validRows > 0 && (
                    <div className="bg-status-green-bg border border-primary/30 rounded-lg p-4">
                      <p className="text-sm font-semibold text-primary">
                        {refImportValidationResult.validRows} valid row(s) found out of {refImportValidationResult.totalRows} total
                      </p>
                      {refImportValidationResult.preview.length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Employment Status</TableHead>
                                <TableHead className="text-xs">Question</TableHead>
                                <TableHead className="text-xs">Type</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {refImportValidationResult.preview.slice(0, 3).map((row, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-xs">{row.employmentStatus}</TableCell>
                                  <TableCell className="text-xs max-w-xs truncate">{row.questionText}</TableCell>
                                  <TableCell className="text-xs">{row.responseType}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      <div className="mt-4 flex gap-2">
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={handleRefImport}
                          disabled={refImportImporting}
                        >
                          {refImportImporting ? <Loader2 className="size-4 animate-spin" /> : null}
                          Import {refImportValidationResult.validRows} Valid Rows
                        </Button>
                        <Button variant="ghost" onClick={() => { setRefImportModalOpen(false); resetRefImportModal(); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Import Success */
            <div className="flex flex-col items-center py-8 text-center gap-3">
              <div className="size-16 rounded-full bg-status-green-bg flex items-center justify-center">
                <Check className="size-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{refImportResult.imported} questions imported successfully</h3>
              {refImportResult.skipped > 0 && (
                <p className="text-sm text-muted-foreground">{refImportResult.skipped} duplicates skipped</p>
              )}
              <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setRefImportModalOpen(false); resetRefImportModal(); }}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

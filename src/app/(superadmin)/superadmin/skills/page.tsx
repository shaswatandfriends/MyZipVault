"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
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
  Search,
  Database,
} from "@/lib/icons";

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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

interface ContentData {
  checklistTemplates: ChecklistTemplateItem[];
  skills: SkillItem[];
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

// ─── Grouped Types ──────────────────────────────────────────────────
interface SpecialtyGroup {
  templateId: number;
  specialty: string;
  templateName: string;
  jobTitle: string | null;
  isActive: boolean;
  skills: SkillItem[];
  categories: Map<string, SkillItem[]>;
}

interface ProfessionGroup {
  profession: string;
  specialties: SpecialtyGroup[];
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminSkillsPage() {
  const [data, setData] = useState<ContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Master-detail state
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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
  const [skillForm, setSkillForm] = useState({
    checklistTemplateId: 0,
    skillName: "",
    category: "",
    questionType: "rating_1_4",
    sortOrder: 0,
    hasNaOption: true,
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
  const [previewData, setPreviewData] = useState<{
    template: PreviewTemplate;
    categories: PreviewCategory[];
    totalSkills: number;
    totalCategories: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameProfession, setRenameProfession] = useState("");
  const [renameNewName, setRenameNewName] = useState("");

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
      const json = await res.json() as ContentData;
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

  // ─── Grouped data ─────────────────────────────────────────────────
  const professionGroups = useMemo<ProfessionGroup[]>(() => {
    if (!data) return [];
    const map = new Map<string, SpecialtyGroup[]>();

    for (const template of data.checklistTemplates) {
      const skills = data.skills.filter((s) => s.checklistTemplateId === template.id);
      const categoryMap = new Map<string, SkillItem[]>();
      for (const skill of skills) {
        if (!categoryMap.has(skill.category)) categoryMap.set(skill.category, []);
        categoryMap.get(skill.category)!.push(skill);
      }
      // Sort skills within each category
      for (const [, catSkills] of categoryMap) {
        catSkills.sort((a, b) => a.sortOrder - b.sortOrder);
      }

      const group: SpecialtyGroup = {
        templateId: template.id,
        specialty: template.specialty,
        templateName: template.name,
        jobTitle: template.jobTitle || null,
        isActive: template.isActive,
        skills,
        categories: categoryMap,
      };

      if (!map.has(template.profession)) map.set(template.profession, []);
      map.get(template.profession)!.push(group);
    }

    return Array.from(map.entries()).map(([profession, specialties]) => ({
      profession,
      specialties,
    }));
  }, [data]);

  // ── Filter by search ──────────────────────────────────────────────
  const filteredProfessions = useMemo(() => {
    if (!searchQuery) return professionGroups;
    const q = searchQuery.toLowerCase();
    return professionGroups
      .map((pg) => ({
        ...pg,
        specialties: pg.specialties.filter(
          (s) =>
            pg.profession.toLowerCase().includes(q) ||
            s.specialty.toLowerCase().includes(q) ||
            s.templateName.toLowerCase().includes(q)
        ),
      }))
      .filter((pg) => pg.specialties.length > 0 || pg.profession.toLowerCase().includes(q));
  }, [professionGroups, searchQuery]);

  // ── Selected profession data ──────────────────────────────────────
  const selectedProfessionData = useMemo(() => {
    if (!selectedProfession) return null;
    return professionGroups.find((pg) => pg.profession === selectedProfession) || null;
  }, [selectedProfession, professionGroups]);

  const selectedSpecialtyData = useMemo(() => {
    if (!selectedSpecialtyId || !selectedProfessionData) return null;
    return selectedProfessionData.specialties.find((s) => s.templateId === selectedSpecialtyId) || null;
  }, [selectedSpecialtyId, selectedProfessionData]);

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
      const profession = selectedProfession || "";
      setTemplateForm({ profession, specialty: "", name: "", jobTitle: "", isActive: true });
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
  const openSkillDialog = (skill?: SkillItem, templateId?: number) => {
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
      const tid = templateId || selectedSpecialtyId || data?.checklistTemplates[0]?.id || 0;
      setSkillForm({
        checklistTemplateId: tid,
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

  // ─── Delete handler ──────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await performAction(deleteTarget.type, "delete", { id: deleteTarget.id });
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    // Reset selection if we deleted the selected template
    if (deleteTarget.type === "checklist_template" && deleteTarget.id === selectedSpecialtyId) {
      setSelectedSpecialtyId(null);
    }
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
      setSelectedProfession(null);
      setSelectedSpecialtyId(null);
      fetchContent();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Deletion failed", { description: message });
    } finally {
      setDeleteAllDeleting(false);
    }
  };

  // ─── Preview Checklist handlers ───────────────────────────────────
  const handlePreviewChecklist = async (templateId: number) => {
    try {
      setPreviewLoading(true);
      setPreviewModalOpen(true);
      const res = await fetch(`/api/admin/skills/preview/${templateId}`);
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

  // ─── Rename handlers ──────────────────────────────────────────────
  const handleRenameProfession = async () => {
    if (!renameProfession || !renameNewName.trim()) return;
    // Update all templates with the old profession name
    const templates = data?.checklistTemplates.filter((t) => t.profession === renameProfession) || [];
    for (const template of templates) {
      await performAction("checklist_template", "update", {
        id: template.id,
        profession: renameNewName.trim(),
        specialty: template.specialty,
        name: template.name,
        jobTitle: template.jobTitle,
        isActive: template.isActive,
      });
    }
    if (selectedProfession === renameProfession) {
      setSelectedProfession(renameNewName.trim());
    }
    setRenameDialogOpen(false);
  };

  // ─── Category toggle ──────────────────────────────────────────────
  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryKey)) next.delete(categoryKey);
      else next.add(categoryKey);
      return next;
    });
  };

  // ─── Auto-select first profession ─────────────────────────────────
  useEffect(() => {
    if (!isLoading && professionGroups.length > 0 && !selectedProfession) {
      setSelectedProfession(professionGroups[0].profession);
    }
  }, [isLoading, professionGroups, selectedProfession]);

  // ─── Auto-select first specialty ──────────────────────────────────
  useEffect(() => {
    if (selectedProfessionData && selectedProfessionData.specialties.length > 0 && !selectedSpecialtyId) {
      setSelectedSpecialtyId(selectedProfessionData.specialties[0].templateId);
    }
  }, [selectedProfessionData, selectedSpecialtyId]);

  // ─── Auto-expand all categories when specialty changes ────────────
  useEffect(() => {
    if (selectedSpecialtyData) {
      const allKeys = new Set<string>();
      for (const [cat] of selectedSpecialtyData.categories) {
        allKeys.add(`${selectedSpecialtyData.templateId}-${cat}`);
      }
      setExpandedCategories(allKeys);
    }
  }, [selectedSpecialtyId]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Skills Database"
        description="Manage professions, specialties, and skills"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleExportTemplate}>
              <Download className="size-4" />
              <span className="hidden sm:inline">Export Template</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExportData}>
              <FileDown className="size-4" />
              <span className="hidden sm:inline">Export Data</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { resetImportModal(); setImportModalOpen(true); }}>
              <Upload className="size-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50 bg-transparent"
              onClick={() => { setDeleteAllStep(1); setDeleteAllOtp(["", "", "", "", "", ""]); setDeleteAllModalOpen(true); }}
            >
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">Delete All</span>
            </Button>
          </div>
        }
      />

      {/* ─── Master-Detail Panel ────────────────────────────────────── */}
      <div className="flex gap-4 min-h-[calc(100vh-220px)]">
        {/* ─── Left Panel (1/3): Job Titles List ─────────────────────── */}
        <Card className="w-full md:w-1/3 shrink-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Job Titles</CardTitle>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white size-8"
                size="icon"
                onClick={() => openTemplateDialog()}
                title="Add Job Title"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded" />
                ))}
              </div>
            ) : filteredProfessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center p-4">
                <Database className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No matching titles" : "No job titles yet"}
                </p>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white mt-3"
                  size="sm"
                  onClick={() => openTemplateDialog()}
                >
                  <Plus className="size-4" />
                  Add Job Title
                </Button>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-340px)] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {filteredProfessions.map((pg) => (
                  <div
                    key={pg.profession}
                    className={`border-b cursor-pointer transition-colors ${
                      selectedProfession === pg.profession
                        ? "bg-emerald-50 border-l-4 border-l-emerald-600"
                        : "hover:bg-gray-50 border-l-4 border-l-transparent"
                    }`}
                    onClick={() => {
                      setSelectedProfession(pg.profession);
                      setSelectedSpecialtyId(null);
                    }}
                  >
                    <div className="flex items-center justify-between p-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{pg.profession}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {pg.specialties.length} {pg.specialties.length === 1 ? "specialty" : "specialties"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          title="Rename"
                          onClick={() => {
                            setRenameProfession(pg.profession);
                            setRenameNewName(pg.profession);
                            setRenameDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete profession"
                          onClick={() => {
                            // Delete all templates in this profession
                            pg.specialties.forEach((s) => {
                              performAction("checklist_template", "delete", { id: s.templateId });
                            });
                            if (selectedProfession === pg.profession) {
                              setSelectedProfession(null);
                              setSelectedSpecialtyId(null);
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Right Panel (2/3): Selected Job Title Details ─────────── */}
        <Card className="flex-1">
          {isLoading ? (
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          ) : !selectedProfessionData ? (
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Database className="size-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">Select a Job Title</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose a profession from the left panel to view its specialties and skills.
              </p>
            </CardContent>
          ) : (
            <>
              {/* ── Header ──────────────────────────────────────────── */}
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{selectedProfessionData.profession}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedProfessionData.specialties.length} {selectedProfessionData.specialties.length === 1 ? "specialty" : "specialties"} • {selectedProfessionData.specialties.reduce((s, sp) => s + sp.skills.length, 0)} skills
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRenameProfession(selectedProfessionData.profession);
                        setRenameNewName(selectedProfessionData.profession);
                        setRenameDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                      Rename
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        selectedProfessionData.specialties.forEach((s) => {
                          performAction("checklist_template", "delete", { id: s.templateId });
                        });
                        setSelectedProfession(null);
                        setSelectedSpecialtyId(null);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {/* ── Specialties Section ────────────────────────────── */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Specialties</h3>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                      size="sm"
                      onClick={() => openTemplateDialog()}
                    >
                      <Plus className="size-3" />
                      Add Specialty
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfessionData.specialties.map((sp) => (
                      <div
                        key={sp.templateId}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all ${
                          selectedSpecialtyId === sp.templateId
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-white text-gray-700 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                        }`}
                        onClick={() => setSelectedSpecialtyId(sp.templateId)}
                      >
                        <span className="text-sm font-medium">{sp.specialty}</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {sp.skills.length}
                        </Badge>
                        {!sp.isActive && (
                          <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px] h-4 px-1">Inactive</Badge>
                        )}
                        <div className="hidden group-hover:flex items-center gap-0.5 ml-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5"
                            onClick={() => openTemplateDialog(data?.checklistTemplates.find((t) => t.id === sp.templateId))}
                          >
                            <Pencil className="size-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5 text-red-600 hover:text-red-700"
                            onClick={() => {
                              setDeleteTarget({ type: "checklist_template", id: sp.templateId });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="size-2.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Skill Categories Section ────────────────────────── */}
                {selectedSpecialtyData ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Skill Categories — {selectedSpecialtyData.specialty}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handlePreviewChecklist(selectedSpecialtyData.templateId)}
                        >
                          <Eye className="size-3" />
                          Preview
                        </Button>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                          size="sm"
                          onClick={() => openSkillDialog(undefined, selectedSpecialtyData.templateId)}
                        >
                          <Plus className="size-3" />
                          Add Skill
                        </Button>
                      </div>
                    </div>

                    {selectedSpecialtyData.categories.size === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
                        <PenSquare className="size-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No skills in this specialty yet</p>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
                          size="sm"
                          onClick={() => openSkillDialog(undefined, selectedSpecialtyData.templateId)}
                        >
                          <Plus className="size-4" />
                          Add First Skill
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {Array.from(selectedSpecialtyData.categories.entries()).map(([category, skills]) => {
                          const catKey = `${selectedSpecialtyData.templateId}-${category}`;
                          const isExpanded = expandedCategories.has(catKey);
                          const questionTypes = [...new Set(skills.map((s) => s.questionType))];

                          return (
                            <div key={category} className="border rounded-lg">
                              <Collapsible
                                open={isExpanded}
                                onOpenChange={() => toggleCategory(catKey)}
                              >
                                <CollapsibleTrigger asChild>
                                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50">
                                    <div className="flex items-center gap-2">
                                      {isExpanded ? (
                                        <ChevronUp className="size-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronDown className="size-4 text-muted-foreground" />
                                      )}
                                      <span className="font-medium text-sm">{category}</span>
                                      <Badge variant="outline" className="text-[10px] h-5">
                                        {skills.length} skills
                                      </Badge>
                                      {questionTypes.map((qt) => (
                                        <Badge key={qt} className="text-[10px] h-5 bg-blue-50 text-blue-700 border-blue-200">
                                          {qt === "rating_1_4" ? "1-4 Rating" : qt === "yes_no" ? "Yes/No" : "Text"}
                                        </Badge>
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7"
                                        title="Add skill to this category"
                                        onClick={() => openSkillDialog(undefined, selectedSpecialtyData.templateId)}
                                      >
                                        <Plus className="size-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="px-3 pb-3 border-t">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="text-xs w-10">#</TableHead>
                                          <TableHead className="text-xs">Skill Name</TableHead>
                                          <TableHead className="text-xs">Type</TableHead>
                                          <TableHead className="text-xs">N/A</TableHead>
                                          <TableHead className="text-xs w-28">Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {skills.map((skill) => (
                                          <TableRow key={skill.id}>
                                            <TableCell className="text-xs text-muted-foreground">{skill.sortOrder}</TableCell>
                                            <TableCell className="text-xs font-medium">{skill.skillName}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                              {skill.questionType === "rating_1_4" ? "1-4 Rating" : skill.questionType === "yes_no" ? "Yes/No" : "Text"}
                                            </TableCell>
                                            <TableCell>
                                              {skill.hasNaOption ? (
                                                <CheckCircle2 className="size-3.5 text-emerald-600" />
                                              ) : (
                                                <XCircle className="size-3.5 text-muted-foreground" />
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-0.5">
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="size-6"
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
                                                  <ChevronUp className="size-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="size-6"
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
                                                  <ChevronDown className="size-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="size-6"
                                                  onClick={() => openSkillDialog(skill)}
                                                >
                                                  <Pencil className="size-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="size-6 text-destructive hover:text-destructive"
                                                  onClick={() => {
                                                    setDeleteTarget({ type: "skill", id: skill.id });
                                                    setDeleteDialogOpen(true);
                                                  }}
                                                >
                                                  <Trash2 className="size-3" />
                                                </Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-sm text-muted-foreground">Select a specialty to view its skills</p>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* ── Template Dialog ────────────────────────────────────────── */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Specialty" : "Add Specialty"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update the checklist template details."
                : "Create a new specialty template."}
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

      {/* ── Rename Profession Dialog ──────────────────────────────────── */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Profession</DialogTitle>
            <DialogDescription>
              Change the profession name. This will update all specialties under this profession.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Name</Label>
              <Input
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleRenameProfession}
              disabled={actionLoading}
            >
              Rename
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
            <DialogDescription>Upload an .xlsx file to validate and import skills data.</DialogDescription>
          </DialogHeader>

          {!importResult ? (
            <div className="space-y-4">
              {/* Step 1: Upload */}
              <div className="space-y-2">
                <Label>Upload File (.xlsx)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    onChange={handleImportFileSelect}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("/api/admin/skills/export-template", "_blank")}
                  >
                    <FileSpreadsheet className="size-4" />
                    Download Template
                  </Button>
                </div>
                {importFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Step 2: Validate */}
              {importFile && !importValidationResult && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                  onClick={handleValidate}
                  disabled={importValidating}
                >
                  {importValidating ? (
                    <><Loader2 className="size-4 animate-spin mr-2" />Validating...</>
                  ) : (
                    <><CheckCircle2 className="size-4 mr-2" />Validate File</>
                  )}
                </Button>
              )}

              {/* Validation Result */}
              {importValidationResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold">{importValidationResult.totalRows}</p>
                        <p className="text-xs text-muted-foreground">Total Rows</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-600">{importValidationResult.validRows}</p>
                        <p className="text-xs text-muted-foreground">Valid Rows</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-red-600">{importValidationResult.errorRows}</p>
                        <p className="text-xs text-muted-foreground">Errors</p>
                      </CardContent>
                    </Card>
                  </div>

                  {importValidationResult.errors.length > 0 && (
                    <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                      {importValidationResult.errors.map((err, idx) => (
                        <p key={idx} className="text-xs text-red-600">
                          Row {err.row}: {err.message}
                        </p>
                      ))}
                    </div>
                  )}

                  {importValidationResult.validRows > 0 && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                      onClick={handleImport}
                      disabled={importImporting || importValidationResult.validRows === 0}
                    >
                      {importImporting ? (
                        <><Loader2 className="size-4 animate-spin mr-2" />Importing...</>
                      ) : (
                        <><Upload className="size-4 mr-2" />Import {importValidationResult.validRows} Rows</>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Import Result */
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="size-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-semibold">Import Complete</h3>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
                    <p className="text-xs text-muted-foreground">Imported</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{importResult.skipped}</p>
                    <p className="text-xs text-muted-foreground">Skipped (Duplicates)</p>
                  </CardContent>
                </Card>
              </div>
              <Button onClick={() => setImportModalOpen(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          Delete All Modal
      ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={deleteAllModalOpen} onOpenChange={setDeleteAllModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Skills Data</DialogTitle>
            <DialogDescription>
              This will permanently delete ALL checklist templates and skills. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteAllStep === 1 ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="size-8 text-red-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Warning: Destructive Action</p>
                  <p className="text-xs text-red-700 mt-1">
                    This will delete all templates, skills, and their associated data.
                    You will receive a verification code via email to confirm.
                  </p>
                </div>
              </div>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white w-full"
                onClick={handleRequestOtp}
                disabled={deleteAllSending}
              >
                {deleteAllSending ? (
                  <><Loader2 className="size-4 animate-spin mr-2" />Sending Code...</>
                ) : (
                  <>Send Verification Code</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit verification code sent to your email.
              </p>
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {deleteAllOtp.map((digit, idx) => (
                  <Input
                    key={idx}
                    ref={(el) => { otpInputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="w-12 h-12 text-center text-lg font-bold"
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleRequestOtp}
                  disabled={resendCooldown > 0 || deleteAllSending}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteAll}
                  disabled={deleteAllOtp.join("").length !== 6 || deleteAllDeleting}
                >
                  {deleteAllDeleting ? (
                    <><Loader2 className="size-4 animate-spin mr-2" />Deleting...</>
                  ) : (
                    "Confirm Delete All"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Preview Checklist Modal ────────────────────────────────── */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checklist Preview</DialogTitle>
            <DialogDescription>
              {previewData
                ? `${previewData.template.profession} — ${previewData.template.specialty}`
                : "Loading preview..."}
            </DialogDescription>
          </DialogHeader>
          {previewLoading ? (
            <div className="space-y-4 py-4">
              <Loader2 className="size-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-center text-sm text-muted-foreground">Loading preview...</p>
            </div>
          ) : previewData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Profession</p>
                  <p className="text-sm font-medium">{previewData.template.profession}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Specialty</p>
                  <p className="text-sm font-medium">{previewData.template.specialty}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Skills</p>
                  <p className="text-sm font-medium">{previewData.totalSkills}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Categories</p>
                  <p className="text-sm font-medium">{previewData.totalCategories}</p>
                </div>
              </div>

              {previewData.categories.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-emerald-800 border-b pb-1">{cat.category}</h4>
                  <div className="space-y-1">
                    {cat.skills.map((skill) => (
                      <div key={skill.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
                        <span className="text-sm">{skill.skillName}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {skill.questionType === "rating_1_4" ? "1-4" : skill.questionType === "yes_no" ? "Y/N" : "Text"}
                          </Badge>
                          {skill.hasNaOption && <Badge variant="outline" className="text-[10px]">N/A</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

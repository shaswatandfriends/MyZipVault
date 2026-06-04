"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
    questionType: "rating_5",
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
    responseType: "rating_5",
    sortOrder: 0,
  });

  // ── Delete confirm dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number } | null>(null);

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
        isActive: template.isActive,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ profession: "", specialty: "", name: "", isActive: true });
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
        questionType: "rating_5",
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
        responseType: "rating_5",
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

  // ─── Filtered skills ─────────────────────────────────────────────
  const filteredSkills = data?.skills.filter(
    (s) => selectedTemplateId === "all" || s.checklistTemplateId === Number(selectedTemplateId)
  ) ?? [];

  const filteredQuestions = data?.referenceQuestions.filter(
    (q) => questionEmploymentFilter === "all" || q.employmentStatus === questionEmploymentFilter
  ) ?? [];

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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => openSkillDialog()}
                >
                  <Plus className="size-4" />
                  Add Skill
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
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => openQuestionDialog()}
                >
                  <Plus className="size-4" />
                  Add Question
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
                    <SelectItem value="rating_5">5-Point Rating</SelectItem>
                    <SelectItem value="rating_3">3-Point Rating</SelectItem>
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
                    <SelectItem value="rating_5">5-Point Rating</SelectItem>
                    <SelectItem value="rating_3">3-Point Rating</SelectItem>
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
    </div>
  );
}

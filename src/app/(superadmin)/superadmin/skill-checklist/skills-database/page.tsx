"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Loader2,
  FolderOpen,
  Layers,
  BookOpen,
} from "@/lib/icons";

import { PageHeader } from "@/components/layout/page-header";
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

// ─── Types ──────────────────────────────────────────────────────────

interface ProfessionItem {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface SpecialtyItem {
  id: number;
  professionId: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface SkillCategoryItem {
  id: number;
  specialtyId: number;
  name: string;
  sortOrder: number;
  createdAt: string;
}

interface ChecklistTemplateItem {
  id: number;
  profession: string;
  specialty: string;
  name: string;
  isActive: boolean;
  professionId: number | null;
  specialtyId: number | null;
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
  categoryId: number | null;
}

interface ContentData {
  professions: ProfessionItem[];
  specialties: SpecialtyItem[];
  skillCategories: SkillCategoryItem[];
  checklistTemplates: ChecklistTemplateItem[];
  skills: SkillItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────

function questionTypeLabel(type: string): string {
  switch (type) {
    case "rating_5":
      return "1-4 Rating";
    case "rating_3":
      return "1-3 Rating";
    case "yes_no":
      return "Yes/No";
    case "text":
      return "Text Box";
    default:
      return "Default";
  }
}

function questionTypeBadgeColor(type: string): { bg: string; fg: string } {
  switch (type) {
    case "rating_5":
      return { bg: "var(--primary-light)", fg: "var(--primary)" };
    case "rating_3":
      return { bg: "var(--primary-light)", fg: "var(--primary)" };
    case "yes_no":
      return { bg: "#DBEAFE", fg: "#2563EB" };
    case "text":
      return { bg: "var(--surface-2)", fg: "var(--text-muted)" };
    default:
      return { bg: "#F3F4F6", fg: "var(--text-secondary)" };
  }
}

function getCategoryTypeBadge(
  categoryId: number,
  skills: SkillItem[]
): { label: string; bg: string; fg: string } {
  const catSkills = skills.filter((s) => s.categoryId === categoryId);
  if (catSkills.length === 0) {
    return { label: "Default", bg: "#F3F4F6", fg: "var(--text-secondary)" };
  }
  const types = new Set(catSkills.map((s) => s.questionType));
  if (types.size === 1) {
    const t = Array.from(types)[0];
    return { label: questionTypeLabel(t), ...questionTypeBadgeColor(t) };
  }
  return { label: "Mixed", bg: "#FEF3C7", fg: "#92400E" };
}

// ─── Main Component ─────────────────────────────────────────────────

export default function SkillsDatabasePage() {
  const [data, setData] = useState<ContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Left panel: profession selection
  const [selectedProfessionId, setSelectedProfessionId] = useState<number | null>(null);
  const [professionSearch, setProfessionSearch] = useState("");

  // ── Right panel: specialty selection
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | null>(null);

  // ── Inline add forms
  const [addingProfession, setAddingProfession] = useState(false);
  const [newProfessionName, setNewProfessionName] = useState("");

  const [addingSpecialty, setAddingSpecialty] = useState(false);
  const [newSpecialtyName, setNewSpecialtyName] = useState("");

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("rating_5");

  const [addingSkillInCategory, setAddingSkillInCategory] = useState<number | null>(null);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillType, setNewSkillType] = useState("rating_5");

  // ── Inline editing
  const [editingProfessionId, setEditingProfessionId] = useState<number | null>(null);
  const [editingProfessionName, setEditingProfessionName] = useState("");

  const [editingSpecialtyId, setEditingSpecialtyId] = useState<number | null>(null);
  const [editingSpecialtyName, setEditingSpecialtyName] = useState("");

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const [editingSkillId, setEditingSkillId] = useState<number | null>(null);
  const [editingSkillName, setEditingSkillName] = useState("");
  const [editingSkillType, setEditingSkillType] = useState("");

  // ── Collapsible categories
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  // ─── Fetch ──────────────────────────────────────────────────────────

  const fetchContent = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/content");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch content");
      }
      const json = (await res.json()) as ContentData & { referenceQuestions: unknown[] };
      setData({
        professions: json.professions,
        specialties: json.specialties,
        skillCategories: json.skillCategories,
        checklistTemplates: json.checklistTemplates,
        skills: json.skills,
      });
      // Auto-select first profession
      if (json.professions.length > 0 && !selectedProfessionId) {
        setSelectedProfessionId(json.professions[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load content", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [selectedProfessionId]);

  useEffect(() => {
    fetchContent();
    }, []);

  // ─── CRUD helper ──────────────────────────────────────────────────

  const performAction = async (
    type: string,
    action: string,
    actionData: Record<string, unknown>
  ) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/superadmin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, action, data: actionData }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Action failed");
      }
      toast.success(
        `Successfully ${action === "create" ? "created" : action === "update" ? "updated" : "deleted"} ${type.replace("_", " ")}`
      );
      await fetchContent();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Action failed", { description: message });
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Derived Data ────────────────────────────────────────────────

  const filteredProfessions = data?.professions
    .filter((p) =>
      p.name.toLowerCase().includes(professionSearch.toLowerCase())
    )
    .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  const selectedProfession = data?.professions.find(
    (p) => p.id === selectedProfessionId
  ) ?? null;

  const specialtiesForProfession = selectedProfessionId
    ? data?.specialties
        .filter((s) => s.professionId === selectedProfessionId)
        .sort((a, b) => a.sortOrder - b.sortOrder) ?? []
    : [];

  const selectedSpecialty = data?.specialties.find(
    (s) => s.id === selectedSpecialtyId
  ) ?? null;

  const categoriesForSpecialty = selectedSpecialtyId
    ? data?.skillCategories
        .filter((c) => c.specialtyId === selectedSpecialtyId)
        .sort((a, b) => a.sortOrder - b.sortOrder) ?? []
    : [];

  const getSkillsForCategory = (categoryId: number) =>
    data?.skills
      .filter((s) => s.categoryId === categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  const getChecklistTemplateForSpecialty = (specialtyId: number) =>
    data?.checklistTemplates.find((t) => t.specialtyId === specialtyId) ?? null;

  // Auto-select first specialty when profession changes
  useEffect(() => {
    if (selectedProfessionId && specialtiesForProfession.length > 0) {
      if (!specialtiesForProfession.find((s) => s.id === selectedSpecialtyId)) {
        setSelectedSpecialtyId(specialtiesForProfession[0].id);
      }
    } else {
      setSelectedSpecialtyId(null);
    }
  }, [selectedProfessionId, data?.specialties]);

  // ─── Profession handlers ────────────────────────────────────────

  const handleAddProfession = async () => {
    if (!newProfessionName.trim()) {
      toast.error("Please enter a profession name");
      return;
    }
    await performAction("profession", "create", {
      name: newProfessionName.trim(),
      isActive: true,
      sortOrder: 0,
    });
    setNewProfessionName("");
    setAddingProfession(false);
  };

  const handleRenameProfession = async () => {
    if (!editingProfessionName.trim() || !editingProfessionId) return;
    await performAction("profession", "update", {
      id: editingProfessionId,
      name: editingProfessionName.trim(),
      isActive: true,
      sortOrder:
        data?.professions.find((p) => p.id === editingProfessionId)?.sortOrder ?? 0,
    });
    setEditingProfessionId(null);
    setEditingProfessionName("");
  };

  const handleDeleteProfession = async (id: number) => {
    await performAction("profession", "delete", { id });
    if (selectedProfessionId === id) {
      setSelectedProfessionId(null);
      setSelectedSpecialtyId(null);
    }
  };

  // ─── Specialty handlers ──────────────────────────────────────────

  const handleAddSpecialty = async () => {
    if (!newSpecialtyName.trim() || !selectedProfessionId) {
      toast.error("Please enter a specialty name");
      return;
    }
    await performAction("specialty", "create", {
      professionId: selectedProfessionId,
      name: newSpecialtyName.trim(),
      isActive: true,
      sortOrder: 0,
    });
    setNewSpecialtyName("");
    setAddingSpecialty(false);
  };

  const handleRenameSpecialty = async () => {
    if (!editingSpecialtyName.trim() || !editingSpecialtyId) return;
    const spec = data?.specialties.find((s) => s.id === editingSpecialtyId);
    await performAction("specialty", "update", {
      id: editingSpecialtyId,
      professionId: spec?.professionId,
      name: editingSpecialtyName.trim(),
      isActive: spec?.isActive ?? true,
      sortOrder: spec?.sortOrder ?? 0,
    });
    setEditingSpecialtyId(null);
    setEditingSpecialtyName("");
  };

  const handleDeleteSpecialty = async (id: number) => {
    await performAction("specialty", "delete", { id });
    if (selectedSpecialtyId === id) {
      setSelectedSpecialtyId(null);
    }
  };

  // ─── Category handlers ──────────────────────────────────────────

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !selectedSpecialtyId) {
      toast.error("Please enter a category name");
      return;
    }
    // Create the SkillCategory
    await performAction("skill_category", "create", {
      specialtyId: selectedSpecialtyId,
      name: newCategoryName.trim(),
      sortOrder: 0,
    });
    // Also ensure a ChecklistTemplate exists for this specialty
    const existingTemplate = getChecklistTemplateForSpecialty(selectedSpecialtyId);
    if (!existingTemplate && selectedProfession) {
      await performAction("checklist_template", "create", {
        professionId: selectedProfessionId,
        specialtyId: selectedSpecialtyId,
        name: `${selectedProfession.name} - ${selectedSpecialty?.name ?? newCategoryName.trim()}`,
        isActive: true,
      });
    }
    setNewCategoryName("");
    setNewCategoryType("rating_5");
    setAddingCategory(false);
  };

  const handleRenameCategory = async () => {
    if (!editingCategoryName.trim() || !editingCategoryId) return;
    const cat = data?.skillCategories.find((c) => c.id === editingCategoryId);
    await performAction("skill_category", "update", {
      id: editingCategoryId,
      specialtyId: cat?.specialtyId,
      name: editingCategoryName.trim(),
      sortOrder: cat?.sortOrder ?? 0,
    });
    // Also update the skill category names for skills in this category
    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  const handleDeleteCategory = async (id: number) => {
    await performAction("skill_category", "delete", { id });
  };

  // ─── Skill handlers ──────────────────────────────────────────────

  const handleAddSkill = async (categoryId: number) => {
    if (!newSkillName.trim()) {
      toast.error("Please enter a skill name");
      return;
    }
    const category = data?.skillCategories.find((c) => c.id === categoryId);
    if (!category) return;

    // Find or create a ChecklistTemplate for this specialty
    let templateId: number | null = null;
    const existingTemplate = getChecklistTemplateForSpecialty(category.specialtyId);
    if (existingTemplate) {
      templateId = existingTemplate.id;
    } else if (selectedProfession) {
      // Create a template first
      try {
        const res = await fetch("/api/superadmin/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "checklist_template",
            action: "create",
            data: {
              professionId: selectedProfessionId,
              specialtyId: category.specialtyId,
              name: `${selectedProfession.name} - ${selectedSpecialty?.name ?? "Specialty"}`,
              isActive: true,
            },
          }),
        });
        const result = await res.json();
        if (result.success && result.template) {
          templateId = result.template.id;
        }
      } catch {
        toast.error("Failed to create checklist template");
        return;
      }
    }

    if (!templateId) {
      toast.error("No checklist template found for this specialty");
      return;
    }

    await performAction("skill", "create", {
      checklistTemplateId: templateId,
      skillName: newSkillName.trim(),
      category: category.name,
      questionType: newSkillType,
      sortOrder: 0,
      hasNaOption: true,
      categoryId: categoryId,
    });
    setNewSkillName("");
    setNewSkillType("rating_5");
    setAddingSkillInCategory(null);
  };

  const handleRenameSkill = async () => {
    if (!editingSkillName.trim() || !editingSkillId) return;
    const skill = data?.skills.find((s) => s.id === editingSkillId);
    if (!skill) return;
    await performAction("skill", "update", {
      id: editingSkillId,
      checklistTemplateId: skill.checklistTemplateId,
      skillName: editingSkillName.trim(),
      category: skill.category,
      questionType: editingSkillType || skill.questionType,
      sortOrder: skill.sortOrder,
      hasNaOption: skill.hasNaOption,
      categoryId: skill.categoryId,
    });
    setEditingSkillId(null);
    setEditingSkillName("");
    setEditingSkillType("");
  };

  const handleDeleteSkill = async (id: number) => {
    await performAction("skill", "delete", { id });
  };

  const handleSkillTypeChange = async (skillId: number, newType: string) => {
    const skill = data?.skills.find((s) => s.id === skillId);
    if (!skill) return;
    await performAction("skill", "update", {
      id: skillId,
      checklistTemplateId: skill.checklistTemplateId,
      skillName: skill.skillName,
      category: skill.category,
      questionType: newType,
      sortOrder: skill.sortOrder,
      hasNaOption: skill.hasNaOption,
      categoryId: skill.categoryId,
    });
  };

  // ─── Toggle category expand ──────────────────────────────────────

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-page-fade">
      <PageHeader
        title="Skills Database"
        description="Create and manage skill checklists. Add professions, specialties, categories, and skills."
      />

      <div className="flex gap-6 min-h-[calc(100vh-220px)]">
        {/* ═══════════════════════════════════════════════════════════
            LEFT PANEL — Job Titles / Professions
        ═══════════════════════════════════════════════════════════ */}
        <div
          className="w-[300px] shrink-0 rounded-2xl border overflow-hidden flex flex-col"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          {/* Search bar */}
          <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4"
                style={{ color: "var(--text-muted)" }}
              />
              <Input
                placeholder="Search titles..."
                className="pl-8 h-9 text-sm"
                value={professionSearch}
                onChange={(e) => setProfessionSearch(e.target.value)}
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                }}
              />
            </div>
          </div>

          {/* Add profession button */}
          <div className="px-3 pt-2 pb-1">
            {addingProfession ? (
              <div
                className="flex items-center gap-2 p-2 rounded-lg"
                style={{ background: "var(--surface-2)" }}
              >
                <Input
                  placeholder="Job title name..."
                  className="h-8 text-sm flex-1"
                  value={newProfessionName}
                  onChange={(e) => setNewProfessionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddProfession();
                    if (e.key === "Escape") {
                      setAddingProfession(false);
                      setNewProfessionName("");
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="p-1 rounded hover:bg-black/5"
                  onClick={handleAddProfession}
                  disabled={actionLoading}
                >
                  <Check className="size-4" style={{ color: "var(--primary)" }} />
                </button>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-black/5"
                  onClick={() => {
                    setAddingProfession(false);
                    setNewProfessionName("");
                  }}
                >
                  <X className="size-4" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="w-full h-8 text-sm gap-1.5 justify-start"
                style={{ color: "var(--primary)" }}
                onClick={() => setAddingProfession(true)}
              >
                <Plus className="size-3.5" />
                Add Job Title
              </Button>
            )}
          </div>

          {/* Profession list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredProfessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <BookOpen
                  className="size-8 mb-2"
                  style={{ color: "var(--text-muted)" }}
                />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {professionSearch ? "No matching titles" : "No professions yet"}
                </p>
              </div>
            ) : (
              filteredProfessions.map((prof) => {
                const isSelected = selectedProfessionId === prof.id;
                const specCount =
                  data?.specialties.filter((s) => s.professionId === prof.id).length ?? 0;
                const isEditing = editingProfessionId === prof.id;

                return (
                  <div
                    key={prof.id}
                    className="group relative cursor-pointer transition-colors"
                    onClick={() => {
                      if (!isEditing) {
                        setSelectedProfessionId(prof.id);
                        setSelectedSpecialtyId(null);
                      }
                    }}
                    style={{
                      background: isSelected ? "var(--primary-light)" : "transparent",
                      borderLeft: isSelected
                        ? "3px solid var(--primary)"
                        : "3px solid transparent",
                    }}
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <Input
                              className="h-7 text-sm flex-1"
                              value={editingProfessionName}
                              onChange={(e) => setEditingProfessionName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameProfession();
                                if (e.key === "Escape") {
                                  setEditingProfessionId(null);
                                  setEditingProfessionName("");
                                }
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-black/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameProfession();
                              }}
                            >
                              <Check className="size-3.5" style={{ color: "var(--primary)" }} />
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-black/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProfessionId(null);
                                setEditingProfessionName("");
                              }}
                            >
                              <X className="size-3.5" style={{ color: "var(--text-muted)" }} />
                            </button>
                          </div>
                        ) : (
                          <span
                            className="text-sm font-medium truncate"
                            style={{
                              color: isSelected ? "var(--primary)" : "var(--text-primary)",
                            }}
                          >
                            {prof.name}
                          </span>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-xs shrink-0"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {specCount} {specCount === 1 ? "specialty" : "specialties"}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-black/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProfessionId(prof.id);
                                setEditingProfessionName(prof.name);
                              }}
                            >
                              <Pencil
                                className="size-3"
                                style={{ color: "var(--text-muted)" }}
                              />
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-black/5"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProfession(prof.id);
                              }}
                            >
                              <Trash2 className="size-3 text-red-500" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            RIGHT PANEL — Inline Editor
        ═══════════════════════════════════════════════════════════ */}
        <div
          className="flex-1 rounded-2xl border overflow-hidden flex flex-col"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          {!selectedProfessionId ? (
            /* ── Empty state ── */
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <BookOpen
                className="size-10 mb-3"
                style={{ color: "var(--text-muted)" }}
              />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Select a profession from the left panel to get started
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex-1 p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* ── Profession Header ── */}
              <div
                className="flex items-center justify-between p-4 border-b sticky top-0 z-10"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                <div className="flex items-center gap-3">
                  <h3
                    style={{
                      fontFamily: "'Satoshi', sans-serif",
                      fontSize: 18,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {selectedProfession?.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-sm"
                    style={{ color: "var(--text-muted)" }}
                    onClick={() => {
                      if (selectedProfession) {
                        setEditingProfessionId(selectedProfession.id);
                        setEditingProfessionName(selectedProfession.name);
                      }
                    }}
                  >
                    <Pencil className="size-3.5" />
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-sm text-red-500 hover:text-red-600"
                    onClick={() => {
                      if (selectedProfession) {
                        handleDeleteProfession(selectedProfession.id);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="p-5 space-y-6">
                {/* ── Specialties Section ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Specialties ({specialtiesForProfession.length})
                    </span>
                    {addingSpecialty ? null : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        style={{ color: "var(--primary)" }}
                        onClick={() => setAddingSpecialty(true)}
                      >
                        <Plus className="size-3" />
                        Add Specialty
                      </Button>
                    )}
                  </div>

                  {/* Add specialty inline form */}
                  {addingSpecialty && (
                    <div
                      className="flex items-center gap-2 mb-3 p-2.5 rounded-lg"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <Input
                        placeholder="Specialty name..."
                        className="h-8 text-sm flex-1"
                        value={newSpecialtyName}
                        onChange={(e) => setNewSpecialtyName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddSpecialty();
                          if (e.key === "Escape") {
                            setAddingSpecialty(false);
                            setNewSpecialtyName("");
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-black/5"
                        onClick={handleAddSpecialty}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 className="size-4 animate-spin" style={{ color: "var(--primary)" }} />
                        ) : (
                          <Check className="size-4" style={{ color: "var(--primary)" }} />
                        )}
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-black/5"
                        onClick={() => {
                          setAddingSpecialty(false);
                          setNewSpecialtyName("");
                        }}
                      >
                        <X className="size-4" style={{ color: "var(--text-muted)" }} />
                      </button>
                    </div>
                  )}

                  {/* Specialty chips */}
                  {specialtiesForProfession.length === 0 && !addingSpecialty ? (
                    <p
                      className="text-sm italic"
                      style={{ color: "var(--text-muted)" }}
                    >
                      No specialties yet. Add one above.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {specialtiesForProfession.map((spec) => {
                        const isSelected = selectedSpecialtyId === spec.id;
                        const isEditing = editingSpecialtyId === spec.id;

                        if (isEditing) {
                          return (
                            <div
                              key={spec.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                              style={{ background: "var(--surface-2)" }}
                            >
                              <Input
                                className="h-6 text-sm w-32 border-0 p-0 focus-visible:ring-0"
                                value={editingSpecialtyName}
                                onChange={(e) => setEditingSpecialtyName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRenameSpecialty();
                                  if (e.key === "Escape") {
                                    setEditingSpecialtyId(null);
                                    setEditingSpecialtyName("");
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                className="p-0.5 rounded hover:bg-black/5"
                                onClick={handleRenameSpecialty}
                              >
                                <Check
                                  className="size-3"
                                  style={{ color: "var(--primary)" }}
                                />
                              </button>
                              <button
                                type="button"
                                className="p-0.5 rounded hover:bg-black/5"
                                onClick={() => {
                                  setEditingSpecialtyId(null);
                                  setEditingSpecialtyName("");
                                }}
                              >
                                <X
                                  className="size-3"
                                  style={{ color: "var(--text-muted)" }}
                                />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={spec.id}
                            className="group/chip flex items-center gap-1 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
                            style={{
                              background: isSelected
                                ? "var(--primary)"
                                : "var(--primary-light)",
                              color: isSelected
                                ? "white"
                                : "var(--primary)",
                            }}
                            onClick={() => setSelectedSpecialtyId(spec.id)}
                          >
                            <span className="text-sm font-medium">{spec.name}</span>
                            <button
                              type="button"
                              className="p-0.5 rounded opacity-0 group-hover/chip:opacity-100 transition-opacity"
                              style={{ color: isSelected ? "white" : "var(--text-muted)" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSpecialtyId(spec.id);
                                setEditingSpecialtyName(spec.name);
                              }}
                            >
                              <Pencil className="size-3" />
                            </button>
                            <button
                              type="button"
                              className="p-0.5 rounded opacity-0 group-hover/chip:opacity-100 transition-opacity"
                              style={{ color: isSelected ? "white" : "var(--text-muted)" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSpecialty(spec.id);
                              }}
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Skill Categories Section ── */}
                {selectedSpecialtyId && selectedSpecialty && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Skill Categories — {selectedSpecialty.name}
                      </span>
                      {addingCategory ? null : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1"
                          style={{ color: "var(--primary)" }}
                          onClick={() => setAddingCategory(true)}
                        >
                          <Plus className="size-3" />
                          Add Category
                        </Button>
                      )}
                    </div>

                    {/* Add category inline form */}
                    {addingCategory && (
                      <div
                        className="flex items-center gap-2 mb-3 p-3 rounded-lg border"
                        style={{
                          background: "var(--surface-2)",
                          borderColor: "var(--border)",
                        }}
                      >
                        <Input
                          placeholder="Category name..."
                          className="h-8 text-sm flex-1"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddCategory();
                            if (e.key === "Escape") {
                              setAddingCategory(false);
                              setNewCategoryName("");
                              setNewCategoryType("rating_5");
                            }
                          }}
                          autoFocus
                        />
                        <Select
                          value={newCategoryType}
                          onValueChange={setNewCategoryType}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rating_5">1-4 Rating</SelectItem>
                            <SelectItem value="rating_3">1-3 Rating</SelectItem>
                            <SelectItem value="yes_no">Yes/No</SelectItem>
                            <SelectItem value="text">Text Box</SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-black/5"
                          onClick={handleAddCategory}
                          disabled={actionLoading}
                        >
                          {actionLoading ? (
                            <Loader2
                              className="size-4 animate-spin"
                              style={{ color: "var(--primary)" }}
                            />
                          ) : (
                            <Check className="size-4" style={{ color: "var(--primary)" }} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-black/5"
                          onClick={() => {
                            setAddingCategory(false);
                            setNewCategoryName("");
                            setNewCategoryType("rating_5");
                          }}
                        >
                          <X
                            className="size-4"
                            style={{ color: "var(--text-muted)" }}
                          />
                        </button>
                      </div>
                    )}

                    {/* Category blocks */}
                    {categoriesForSpecialty.length === 0 && !addingCategory ? (
                      <p
                        className="text-sm italic"
                        style={{ color: "var(--text-muted)" }}
                      >
                        No categories yet. Add one above.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {categoriesForSpecialty.map((cat) => {
                          const isExpanded = expandedCategories.has(cat.id);
                          const skills = getSkillsForCategory(cat.id);
                          const typeBadge = getCategoryTypeBadge(
                            cat.id,
                            data?.skills ?? []
                          );
                          const isEditingCat = editingCategoryId === cat.id;
                          const isAddingSkillHere = addingSkillInCategory === cat.id;

                          return (
                            <div
                              key={cat.id}
                              className="rounded-xl border overflow-hidden"
                              style={{
                                borderColor: "var(--border)",
                                background: "var(--surface)",
                              }}
                            >
                              {/* Category header */}
                              <div
                                className="flex items-center justify-between p-3 cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                                onClick={() => toggleCategory(cat.id)}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="transition-transform duration-150"
                                    style={{
                                      transform: isExpanded
                                        ? "rotate(90deg)"
                                        : "rotate(0deg)",
                                    }}
                                  >
                                    <ChevronRight
                                      className="size-4"
                                      style={{ color: "var(--text-muted)" }}
                                    />
                                  </div>
                                  {isEditingCat ? (
                                    <div
                                      className="flex items-center gap-1.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Input
                                        className="h-7 text-sm w-48"
                                        value={editingCategoryName}
                                        onChange={(e) =>
                                          setEditingCategoryName(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            handleRenameCategory();
                                          if (e.key === "Escape") {
                                            setEditingCategoryId(null);
                                            setEditingCategoryName("");
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        className="p-1 rounded hover:bg-black/5"
                                        onClick={handleRenameCategory}
                                      >
                                        <Check
                                          className="size-3.5"
                                          style={{ color: "var(--primary)" }}
                                        />
                                      </button>
                                      <button
                                        type="button"
                                        className="p-1 rounded hover:bg-black/5"
                                        onClick={() => {
                                          setEditingCategoryId(null);
                                          setEditingCategoryName("");
                                        }}
                                      >
                                        <X
                                          className="size-3.5"
                                          style={{ color: "var(--text-muted)" }}
                                        />
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      className="text-sm font-semibold"
                                      style={{ color: "var(--text-primary)" }}
                                    >
                                      {cat.name}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className="flex items-center gap-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Type badge */}
                                  <Badge
                                    className="text-xs"
                                    style={{
                                      background: typeBadge.bg,
                                      color: typeBadge.fg,
                                      border: "none",
                                    }}
                                  >
                                    {typeBadge.label}
                                  </Badge>
                                  {/* Skill count badge */}
                                  <Badge
                                    className="text-xs"
                                    style={{
                                      background: "var(--primary-light)",
                                      color: "var(--primary)",
                                      border: "none",
                                    }}
                                  >
                                    <Layers className="size-3 mr-1" />
                                    {skills.length} {skills.length === 1 ? "skill" : "skills"}
                                  </Badge>
                                  {/* Edit / Delete */}
                                  {!isEditingCat && (
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        className="p-1 rounded hover:bg-black/5"
                                        onClick={() => {
                                          setEditingCategoryId(cat.id);
                                          setEditingCategoryName(cat.name);
                                        }}
                                      >
                                        <Pencil
                                          className="size-3.5"
                                          style={{ color: "var(--text-muted)" }}
                                        />
                                      </button>
                                      <button
                                        type="button"
                                        className="p-1 rounded hover:bg-black/5"
                                        onClick={() => handleDeleteCategory(cat.id)}
                                      >
                                        <Trash2 className="size-3.5 text-red-500" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Expanded: Skills list */}
                              {isExpanded && (
                                <div
                                  className="border-t"
                                  style={{ borderColor: "var(--border)" }}
                                >
                                  <div className="px-4 py-3 space-y-1">
                                    {skills.length === 0 && !isAddingSkillHere && (
                                      <p
                                        className="text-xs italic pl-2"
                                        style={{ color: "var(--text-muted)" }}
                                      >
                                        No skills yet. Add one below.
                                      </p>
                                    )}

                                    {skills.map((skill) => {
                                      const isEditingSkill =
                                        editingSkillId === skill.id;

                                      return (
                                        <div
                                          key={skill.id}
                                          className="flex items-center justify-between py-1.5 px-2 rounded-lg group/skill hover:bg-[var(--surface-2)] transition-colors"
                                        >
                                          {isEditingSkill ? (
                                            <div className="flex items-center gap-2 flex-1">
                                              <Input
                                                className="h-7 text-sm flex-1"
                                                value={editingSkillName}
                                                onChange={(e) =>
                                                  setEditingSkillName(e.target.value)
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter")
                                                    handleRenameSkill();
                                                  if (e.key === "Escape") {
                                                    setEditingSkillId(null);
                                                    setEditingSkillName("");
                                                    setEditingSkillType("");
                                                  }
                                                }}
                                                autoFocus
                                              />
                                              <Select
                                                value={editingSkillType || skill.questionType}
                                                onValueChange={setEditingSkillType}
                                              >
                                                <SelectTrigger className="h-7 w-[120px] text-xs">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="rating_5">
                                                    1-4 Rating
                                                  </SelectItem>
                                                  <SelectItem value="rating_3">
                                                    1-3 Rating
                                                  </SelectItem>
                                                  <SelectItem value="yes_no">
                                                    Yes/No
                                                  </SelectItem>
                                                  <SelectItem value="text">
                                                    Text Box
                                                  </SelectItem>
                                                </SelectContent>
                                              </Select>
                                              <button
                                                type="button"
                                                className="p-1 rounded hover:bg-black/5"
                                                onClick={handleRenameSkill}
                                              >
                                                <Check
                                                  className="size-3.5"
                                                  style={{ color: "var(--primary)" }}
                                                />
                                              </button>
                                              <button
                                                type="button"
                                                className="p-1 rounded hover:bg-black/5"
                                                onClick={() => {
                                                  setEditingSkillId(null);
                                                  setEditingSkillName("");
                                                  setEditingSkillType("");
                                                }}
                                              >
                                                <X
                                                  className="size-3.5"
                                                  style={{ color: "var(--text-muted)" }}
                                                />
                                              </button>
                                            </div>
                                          ) : (
                                            <>
                                              <span
                                                className="text-sm flex-1"
                                                style={{
                                                  color: "var(--text-primary)",
                                                }}
                                              >
                                                {skill.skillName}
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <Select
                                                  value={skill.questionType}
                                                  onValueChange={(val) =>
                                                    handleSkillTypeChange(skill.id, val)
                                                  }
                                                >
                                                  <SelectTrigger className="h-7 w-[110px] text-xs border-0 p-0 focus-visible:ring-0 bg-transparent">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="rating_5">
                                                      1-4 Rating
                                                    </SelectItem>
                                                    <SelectItem value="rating_3">
                                                      1-3 Rating
                                                    </SelectItem>
                                                    <SelectItem value="yes_no">
                                                      Yes/No
                                                    </SelectItem>
                                                    <SelectItem value="text">
                                                      Text Box
                                                    </SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover/skill:opacity-100 transition-opacity">
                                                  <button
                                                    type="button"
                                                    className="p-1 rounded hover:bg-black/5"
                                                    onClick={() => {
                                                      setEditingSkillId(skill.id);
                                                      setEditingSkillName(
                                                        skill.skillName
                                                      );
                                                      setEditingSkillType(
                                                        skill.questionType
                                                      );
                                                    }}
                                                  >
                                                    <Pencil
                                                      className="size-3"
                                                      style={{
                                                        color: "var(--text-muted)",
                                                      }}
                                                    />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="p-1 rounded hover:bg-black/5"
                                                    onClick={() =>
                                                      handleDeleteSkill(skill.id)
                                                    }
                                                  >
                                                    <Trash2 className="size-3 text-red-500" />
                                                  </button>
                                                </div>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}

                                    {/* Add skill inline form */}
                                    {isAddingSkillHere && (
                                      <div
                                        className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
                                        style={{ background: "var(--surface-2)" }}
                                      >
                                        <Input
                                          placeholder="Skill name..."
                                          className="h-7 text-sm flex-1"
                                          value={newSkillName}
                                          onChange={(e) =>
                                            setNewSkillName(e.target.value)
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter")
                                              handleAddSkill(cat.id);
                                            if (e.key === "Escape") {
                                              setAddingSkillInCategory(null);
                                              setNewSkillName("");
                                              setNewSkillType("rating_5");
                                            }
                                          }}
                                          autoFocus
                                        />
                                        <Select
                                          value={newSkillType}
                                          onValueChange={setNewSkillType}
                                        >
                                          <SelectTrigger className="h-7 w-[120px] text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="rating_5">
                                              1-4 Rating
                                            </SelectItem>
                                            <SelectItem value="rating_3">
                                              1-3 Rating
                                            </SelectItem>
                                            <SelectItem value="yes_no">
                                              Yes/No
                                            </SelectItem>
                                            <SelectItem value="text">
                                              Text Box
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <button
                                          type="button"
                                          className="p-1 rounded hover:bg-black/5"
                                          onClick={() => handleAddSkill(cat.id)}
                                          disabled={actionLoading}
                                        >
                                          {actionLoading ? (
                                            <Loader2
                                              className="size-3.5 animate-spin"
                                              style={{ color: "var(--primary)" }}
                                            />
                                          ) : (
                                            <Check
                                              className="size-3.5"
                                              style={{ color: "var(--primary)" }}
                                            />
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          className="p-1 rounded hover:bg-black/5"
                                          onClick={() => {
                                            setAddingSkillInCategory(null);
                                            setNewSkillName("");
                                            setNewSkillType("rating_5");
                                          }}
                                        >
                                          <X
                                            className="size-3.5"
                                            style={{ color: "var(--text-muted)" }}
                                          />
                                        </button>
                                      </div>
                                    )}

                                    {/* Add skill button */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs gap-1 mt-1"
                                      style={{ color: "var(--primary)" }}
                                      onClick={() => {
                                        setAddingSkillInCategory(cat.id);
                                        setNewSkillName("");
                                        setNewSkillType("rating_5");
                                      }}
                                    >
                                      <Plus className="size-3" />
                                      Add Skill
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Global loading overlay ── */}
      {actionLoading && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <Loader2 className="size-4 animate-spin" style={{ color: "var(--primary)" }} />
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              Saving...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

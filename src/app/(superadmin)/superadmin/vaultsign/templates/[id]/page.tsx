"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { VaultSignErrorBoundary } from "@/components/vaultsign/vaultsign-error-boundary";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import FontFamily from "@tiptap/extension-font-family";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { FontSize } from "@/lib/vaultsign/tiptap-font-size";
import { LineHeight } from "@/lib/vaultsign/tiptap-line-height";
import { ParagraphSpacing } from "@/lib/vaultsign/tiptap-paragraph-spacing";
import { PageBreak } from "@/lib/vaultsign/tiptap-page-break";
import { SignFieldExtension } from "@/lib/vaultsign/tiptap-sign-field";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo2, Redo2, Palette,
  Highlighter, Plus, Trash2,
  Variable, ChevronDown, X, Loader2, TableIcon, ImagePlus, Minus,
  PanelLeftIcon, PanelRightIcon, MoreVertical, ArrowUpDown, FileText,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SYSTEM_VARIABLES, SIGNER_COLORS, FIELD_TYPE_LABELS, FIELD_TYPE_ICONS, type SignField, type SignFieldType } from "@/lib/vaultsign/types";

// Template placeholder variables for superadmin editor
const TEMPLATE_VARIABLES = [
  { key: "candidate_name", label: "{{candidate_name}}" },
  { key: "company_name", label: "{{company_name}}" },
  { key: "date", label: "{{date}}" },
  { key: "position", label: "{{position}}" },
  { key: "specialty", label: "{{specialty}}" },
  { key: "facility_name", label: "{{facility_name}}" },
  { key: "recruiter_name", label: "{{recruiter_name}}" },
  { key: "start_date", label: "{{start_date}}" },
  { key: "salary", label: "{{salary}}" },
  { key: "manager_name", label: "{{manager_name}}" },
];

// Sign field types available for templates
const TEMPLATE_SIGN_FIELD_TYPES: SignFieldType[] = ["signature", "date", "full_name", "initials", "email", "checkbox", "text"];

export default function SuperAdminTemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string>("");
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [signFields, setSignFields] = useState<SignField[]>([]);
  const [customVariables, setCustomVariables] = useState<Array<{ key: string; label: string }>>([]);
  const [newVarKey, setNewVarKey] = useState("");
  const [newVarLabel, setNewVarLabel] = useState("");
  const [signerSlots, setSignerSlots] = useState<Array<{ index: number; label: string }>>([
    { index: 0, label: "Signer 1" },
    { index: 1, label: "Signer 2" },
    { index: 2, label: "Signer 3" },
  ]);
  const [showVariablesPanel, setShowVariablesPanel] = useState(false);
  const [showSignersPanel, setShowSignersPanel] = useState(false);
  const [showHeaderFooter, setShowHeaderFooter] = useState(true);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setTemplateId(p.id));
  }, [params]);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      FontFamily,
      TextStyle,
      Color,
      FontSize,
      LineHeight,
      ParagraphSpacing,
      PageBreak,
      SignFieldExtension,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Subscript,
      Superscript,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
      Placeholder.configure({ placeholder: "Start building your template..." }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        handleAutoSave(editor.getJSON());
      }, 5000);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[500px] px-8 py-6",
      },
    },
  });

  // Fetch template data
  const fetchTemplate = useCallback(async () => {
    if (!templateId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/superadmin/vaultsign/templates/${templateId}`);
      if (!res.ok) throw new Error("Failed to fetch template");
      const data = await res.json();
      setTemplate(data);
      setTemplateName(data.name || "");
      setTemplateDescription(data.description || "");

      // Parse sign fields
      if (data.predefined_sign_fields) {
        const fields = typeof data.predefined_sign_fields === "string"
          ? JSON.parse(data.predefined_sign_fields)
          : data.predefined_sign_fields;
        setSignFields(Array.isArray(fields) ? fields : []);
      }

      // Parse placeholder variables
      if (data.placeholder_variables) {
        const vars = typeof data.placeholder_variables === "string"
          ? JSON.parse(data.placeholder_variables)
          : data.placeholder_variables;
        setCustomVariables(vars.filter((v: any) => v.category === "custom"));
      }

      // Parse show_header_footer
      if (data.show_header_footer !== undefined) {
        setShowHeaderFooter(data.show_header_footer);
      } else if (data.header_config || data.footer_config) {
        // Backward compat
        try {
          const hc = typeof data.header_config === "string" ? JSON.parse(data.header_config) : data.header_config;
          const fc = typeof data.footer_config === "string" ? JSON.parse(data.footer_config) : data.footer_config;
          const anyHeaderOn = hc && (hc.show_logo || hc.show_company_name || hc.show_contact || hc.show_address || hc.show_document_title);
          const anyFooterOn = fc && (fc.show_rights_reserved || fc.show_powered_by || fc.show_page_numbers);
          setShowHeaderFooter(!!anyHeaderOn || !!anyFooterOn);
        } catch {
          setShowHeaderFooter(true);
        }
      }

      // Set editor content
      if (editor && data.tiptap_content) {
        try {
          const rawContent = typeof data.tiptap_content === "string"
            ? data.tiptap_content
            : JSON.stringify(data.tiptap_content);

          try {
            const parsed = JSON.parse(rawContent);
            if (parsed.type === "doc" && parsed.content) {
              editor.commands.setContent(parsed);
            } else {
              editor.commands.setContent(rawContent);
            }
          } catch {
            editor.commands.setContent(rawContent);
          }
        } catch (setContentErr) {
          console.error("Failed to set editor content:", setContentErr);
          try {
            editor.commands.setContent(data.tiptap_content);
          } catch {
            // Give up silently
          }
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load template");
    } finally {
      setLoading(false);
    }
  }, [templateId, editor]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  // Auto-save
  const handleAutoSave = async (content?: any) => {
    if (!templateId || !editor) return;
    try {
      setSaving(true);
      const editorContent = content || editor.getJSON();
      await fetch(`/api/superadmin/vaultsign/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          tiptap_content: JSON.stringify(editorContent),
          predefined_sign_fields: signFields,
          placeholder_variables: [
            ...SYSTEM_VARIABLES,
            ...customVariables.map((v) => ({ ...v, category: "custom" as const })),
          ],
          show_header_footer: showHeaderFooter,
        }),
      });
    } catch (err) {
      console.error("Auto-save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Manual save
  const handleSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    try {
      setSaving(true);
      const editorContent = editor?.getJSON();
      const res = await fetch(`/api/superadmin/vaultsign/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          tiptap_content: JSON.stringify(editorContent),
          predefined_sign_fields: signFields,
          placeholder_variables: [
            ...SYSTEM_VARIABLES,
            ...customVariables.map((v) => ({ ...v, category: "custom" as const })),
          ],
          show_header_footer: showHeaderFooter,
        }),
      });
      if (res.ok) {
        toast.success("Template saved");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to save template");
      }
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  // Insert variable at cursor
  const insertVariable = (varLabel: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(varLabel).run();
  };

  // Add sign field
  const addSignField = (type: SignFieldType, signerIndex: number) => {
    const newField: SignField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      page: 1,
      x_percent: 0,
      y_percent: 0,
      width_percent: 20,
      height_percent: 3,
      assigned_to_signer_index: signerIndex,
      label: FIELD_TYPE_LABELS[type],
      required: true,
      value: null,
    };
    setSignFields([...signFields, newField]);

    if (editor) {
      // Cast to any because SignFieldExtension adds `insertSignField` via
      // TipTap's addCommands but the type isn't augmented globally.
      (editor.chain().focus() as any).insertSignField({
        fieldType: type,
        assignedToSignerIndex: signerIndex,
        signerLabel: signerSlots.find(s => s.index === signerIndex)?.label || `Signer ${signerIndex + 1}`,
        fieldId: newField.id,
      }).run();
    }
  };

  // Remove sign field
  const removeSignField = (fieldId: string) => {
    setSignFields(signFields.filter((f) => f.id !== fieldId));
  };

  // Add custom variable
  const addCustomVariable = () => {
    if (!newVarKey || !newVarLabel) return;
    setCustomVariables([...customVariables, { key: newVarKey, label: newVarLabel }]);
    setNewVarKey("");
    setNewVarLabel("");
  };

  // Add signer slot
  const addSignerSlot = () => {
    setSignerSlots([...signerSlots, { index: signerSlots.length, label: `Signer ${signerSlots.length + 1}` }]);
  };

  // Remove signer slot
  const removeSignerSlot = (index: number) => {
    setSignerSlots(signerSlots.filter((s) => s.index !== index));
    setSignFields(signFields.filter((f) => f.assigned_to_signer_index !== index));
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-6 w-px" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-24" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="bg-white border-b border-border px-4 py-2 flex items-center gap-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded" />
          ))}
          <Skeleton className="h-8 w-[120px] rounded ml-1" />
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="hidden lg:flex w-64 border-r border-border bg-white flex-col">
            <div className="p-3 border-b border-border">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-36 mt-1" />
            </div>
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded" />
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-white p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-border shadow-sm min-h-[800px] p-8 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
          <div className="hidden lg:flex w-72 border-l border-border bg-white flex-col">
            <div className="p-3 border-b border-border">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="p-3 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Variables panel content
  const variablesPanelContent = (
    <>
      <ScrollArea className="flex-1">
        <div className="p-3">
          <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">Template Variables</h4>
          <p className="text-[10px] text-text-muted mb-2">Click to insert a placeholder into the template</p>
          <div className="space-y-1.5">
            {TEMPLATE_VARIABLES.map((v) => (
              <button
                key={v.key}
                onClick={() => { insertVariable(v.label); setShowVariablesPanel(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-primary-light hover:bg-primary-light text-primary font-mono font-medium transition-colors border border-transparent hover:border-primary/20"
              >
                {v.label}
              </button>
            ))}
          </div>

          <Separator className="my-3" />

          <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">System Variables</h4>
          <div className="space-y-1.5">
            {SYSTEM_VARIABLES.map((v) => (
              <button
                key={v.key}
                onClick={() => { insertVariable(`{{${v.key}}}`); setShowVariablesPanel(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-primary-light hover:bg-primary-light text-primary font-mono font-medium transition-colors border border-transparent hover:border-primary/20"
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>

          <Separator className="my-3" />

          <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">Custom Variables</h4>
          <div className="space-y-1.5">
            {customVariables.map((v) => (
              <div key={v.key} className="flex items-center gap-1">
                <button
                  onClick={() => { insertVariable(`{{${v.key}}}`); setShowVariablesPanel(false); }}
                  className="flex-1 text-left px-2.5 py-1.5 rounded-lg text-xs bg-status-blue-bg hover:bg-badge-blue-bg text-status-blue-dark font-mono font-medium transition-colors"
                >
                  {`{{${v.key}}}`}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-text-muted hover:text-status-red"
                  onClick={() => setCustomVariables(customVariables.filter((cv) => cv.key !== v.key))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-3 p-2 rounded-lg border border-dashed border-border">
            <Input
              placeholder="Variable key"
              value={newVarKey}
              onChange={(e) => setNewVarKey(e.target.value)}
              className="h-7 text-xs mb-1.5"
            />
            <Input
              placeholder="Display label"
              value={newVarLabel}
              onChange={(e) => setNewVarLabel(e.target.value)}
              className="h-7 text-xs mb-1.5"
            />
            <Button
              size="sm"
              className="w-full h-7 text-xs bg-primary hover:bg-primary-hover"
              onClick={addCustomVariable}
              disabled={!newVarKey || !newVarLabel}
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </div>
      </ScrollArea>
    </>
  );

  // Sign fields panel content
  const signersPanelContent = (
    <>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Header & Footer Settings */}
          <div>
            <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-background border border-border">
              <div>
                <span className="text-xs font-medium text-foreground">Header & Footer</span>
                <p className="text-[9px] text-text-muted">Company header and footer on document</p>
              </div>
              <button 
                onClick={() => setShowHeaderFooter(!showHeaderFooter)} 
                className={`w-9 h-5 rounded-full transition-colors ${showHeaderFooter ? 'bg-primary' : 'bg-surface-3'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${showHeaderFooter ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          <Separator />

          {/* Signer Slots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-text-secondary uppercase">Signer Slots</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-primary"
                onClick={addSignerSlot}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>

            {signerSlots.map((slot, idx) => (
              <div
                key={slot.index}
                className="flex items-center gap-2 p-2 rounded-lg border border-border mb-1.5"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: SIGNER_COLORS[idx % SIGNER_COLORS.length] }}
                />
                <Input
                  value={slot.label}
                  onChange={(e) => {
                    const updated = [...signerSlots];
                    updated[idx] = { ...updated[idx], label: e.target.value };
                    setSignerSlots(updated);
                  }}
                  className="h-6 text-xs border-none shadow-none p-0 flex-1 min-w-0 font-medium text-foreground"
                />
                {signerSlots.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-text-muted hover:text-status-red"
                    onClick={() => removeSignerSlot(slot.index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Sign Fields */}
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2">Sign Fields</h4>
            {signerSlots.map((slot, idx) => (
              <div key={slot.index} className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: SIGNER_COLORS[idx % SIGNER_COLORS.length] }}
                  />
                  <span className="text-xs font-medium text-foreground">{slot.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {TEMPLATE_SIGN_FIELD_TYPES.map((type) => (
                    <TooltipProvider key={type}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border border-border hover:border-primary/30 hover:bg-primary-light transition-colors text-foreground cursor-pointer"
                            onClick={() => addSignField(type, slot.index)}
                          >
                            <span className="text-sm">{FIELD_TYPE_ICONS[type]}</span>
                            <span className="truncate">{FIELD_TYPE_LABELS[type]}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          Add {FIELD_TYPE_LABELS[type]} field for {slot.label}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>

                {/* Assigned fields for this signer */}
                {signFields.filter((f) => f.assigned_to_signer_index === slot.index).map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between mt-1 px-2 py-1 rounded bg-background border border-border"
                  >
                    <span className="text-[10px] text-text-secondary">
                      {FIELD_TYPE_ICONS[field.type]} {field.label}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 text-text-muted hover:text-status-red"
                      onClick={() => removeSignField(field.id)}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </>
  );

  return (
    <VaultSignErrorBoundary>
    <TooltipProvider>
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-border px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Mobile panel toggle buttons */}
          <div className="flex items-center gap-1 lg:hidden">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-text-secondary" onClick={() => setShowVariablesPanel(true)}>
              <PanelLeftIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-text-secondary" onClick={() => setShowSignersPanel(true)}>
              <PanelRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/superadmin/vaultsign")} className="text-text-secondary hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Back to VaultSign</span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="font-semibold text-foreground border-none shadow-none focus-visible:ring-0 p-0 h-auto text-lg max-w-xs min-w-0"
            placeholder="Template Name"
          />
          <Badge variant="outline" className="text-xs bg-background hidden sm:inline-flex">
            Template Editor
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && (
            <span className="text-xs text-text-secondary flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> <span className="hidden sm:inline">Saving...</span>
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleSave} className="border-primary text-primary">
            <Save className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Save</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-text-secondary">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" /> Save Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Desktop Toolbar — Word-style ribbon */}
      <div className="hidden lg:flex bg-toolbar-bg border-b border-border px-1 py-0.5 flex-wrap gap-y-0">
        {/* Clipboard Group */}
        <div className="flex flex-col bg-white rounded-md border border-border/60 mx-0.5 px-1.5 py-1">
          <div className="flex items-center gap-0.5">
            <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} title="Undo (Ctrl+Z)" isActive={false}>
              <Undo2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} title="Redo (Ctrl+Y)" isActive={false}>
              <Redo2 className="h-4 w-4" />
            </ToolbarButton>
          </div>
          <span className="text-[9px] text-text-secondary mt-0.5 select-none text-center font-medium">Undo</span>
        </div>

        {/* Font Group */}
        <div className="flex flex-col bg-white rounded-md border border-border/60 mx-0.5 px-1.5 py-1">
          <div className="flex items-center gap-0.5 flex-wrap">
            <Select value={editor?.getAttributes("textStyle").fontFamily || "Default"} onValueChange={(val) => {
              if (val === "Default") editor?.chain().focus().unsetFontFamily().run();
              else editor?.chain().focus().setFontFamily(val).run();
            }}>
              <SelectTrigger className="w-[110px] h-7 text-[11px]">
                <SelectValue placeholder="Font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Default">Default</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
              </SelectContent>
            </Select>

            <Select value={((): string => {
              const fs = editor?.getAttributes("textStyle").fontSize;
              if (!fs) return "11";
              const num = parseInt(String(fs));
              return isNaN(num) ? "11" : String(num);
            })()} onValueChange={(val) => {
              editor?.chain().focus().setMark("textStyle", { fontSize: val + "pt" }).run();
            }}>
              <SelectTrigger className="w-[60px] h-7 text-[11px]">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72].map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} isActive={editor?.isActive("bold")} title="Bold (Ctrl+B)">
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} isActive={editor?.isActive("italic")} title="Italic (Ctrl+I)">
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} isActive={editor?.isActive("underline")} title="Underline (Ctrl+U)">
              <UnderlineIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} isActive={editor?.isActive("strike")} title="Strikethrough">
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${editor?.isActive("textStyle") && editor?.getAttributes("textStyle").color ? "bg-primary-light text-primary" : "text-text-secondary"}`} title="Font Color">
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="grid grid-cols-6 gap-1">
                  {["#000000", "#374151", "var(--text-secondary)", "#DC2626", "var(--primary)", "var(--accent-teal)", "#7C3AED", "#D97706", "#DB2777", "#2563EB"].map((color) => (
                    <button key={color} className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => editor?.chain().focus().setColor(color).run()} />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${editor?.isActive("highlight") ? "bg-primary-light text-primary" : "text-text-secondary"}`} title="Highlight">
                  <Highlighter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { color: "#FEF08A", label: "Yellow" },
                    { color: "#BBF7D0", label: "Green" },
                    { color: "#BFDBFE", label: "Blue" },
                    { color: "#FECACA", label: "Red" },
                    { color: "#E9D5FF", label: "Purple" },
                  ].map(({ color, label }) => (
                    <button key={color} className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => editor?.chain().focus().toggleHighlight({ color }).run()} title={label} />
                  ))}
                  <button className="w-6 h-6 rounded border border-border text-xs flex items-center justify-center hover:scale-110 transition-transform" onClick={() => editor?.chain().focus().unsetHighlight().run()} title="Remove highlight">
                    <Minus className="h-3 w-3" />
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <span className="text-[9px] text-text-secondary mt-0.5 select-none text-center font-medium">Font</span>
        </div>

        {/* Paragraph Group */}
        <div className="flex flex-col bg-white rounded-md border border-border/60 mx-0.5 px-1.5 py-1">
          <div className="flex items-center gap-0.5 flex-wrap">
            <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("left").run()} isActive={editor?.isActive({ textAlign: "left" })} title="Align Left">
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("center").run()} isActive={editor?.isActive({ textAlign: "center" })} title="Align Center">
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("right").run()} isActive={editor?.isActive({ textAlign: "right" })} title="Align Right">
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("justify").run()} isActive={editor?.isActive({ textAlign: "justify" })} title="Justify">
              <AlignJustify className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} isActive={editor?.isActive("bulletList")} title="Bullet List">
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} isActive={editor?.isActive("orderedList")} title="Numbered List">
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-text-secondary" title="Line Spacing">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-32">
                <DropdownMenuItem onClick={() => editor?.chain().focus().setNode("paragraph", { lineHeight: 1.0 }).run()}>1.0</DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor?.chain().focus().setNode("paragraph", { lineHeight: 1.15 }).run()}>1.15</DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor?.chain().focus().setNode("paragraph", { lineHeight: 1.5 }).run()}>1.5</DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor?.chain().focus().setNode("paragraph", { lineHeight: 2.0 }).run()}>2.0</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <span className="text-[9px] text-text-secondary mt-0.5 select-none text-center font-medium">Paragraph</span>
        </div>

        {/* Insert Group */}
        <div className="flex flex-col bg-white rounded-md border border-border/60 mx-0.5 px-1.5 py-1">
          <div className="flex items-center gap-0.5">
            <ToolbarButton onClick={() => {
              const url = prompt("Enter image URL:");
              if (url) editor?.chain().focus().setImage({ src: url }).run();
            }} title="Insert Image">
              <ImagePlus className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">
              <TableIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor?.chain().focus().insertPageBreak().run()} title="Insert Page Break (Ctrl+Enter)">
              <FileText className="h-4 w-4" />
            </ToolbarButton>
          </div>
          <span className="text-[9px] text-text-secondary mt-0.5 select-none text-center font-medium">Insert</span>
        </div>

        {/* Styles Group */}
        <div className="flex flex-col bg-white rounded-md border border-border/60 mx-0.5 px-1.5 py-1">
          <Select value={
            editor?.isActive("heading", { level: 1 }) ? "1"
            : editor?.isActive("heading", { level: 2 }) ? "2"
            : editor?.isActive("heading", { level: 3 }) ? "3"
            : "0"
          } onValueChange={(val) => {
            if (val === "0") editor?.chain().focus().setParagraph().run();
            else editor?.chain().focus().toggleHeading({ level: parseInt(val) as 1 | 2 | 3 }).run();
          }}>
            <SelectTrigger className="w-[110px] h-7 text-[11px]">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Normal Text</SelectItem>
              <SelectItem value="1">Heading 1</SelectItem>
              <SelectItem value="2">Heading 2</SelectItem>
              <SelectItem value="3">Heading 3</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[9px] text-text-secondary mt-0.5 select-none text-center font-medium">Styles</span>
        </div>
      </div>

      {/* Mobile Toolbar (simplified) */}
      <div className="lg:hidden bg-white border-b border-border px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} isActive={editor?.isActive("bold")} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} isActive={editor?.isActive("italic")} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} isActive={editor?.isActive("underline")} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} isActive={editor?.isActive("strike")} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="h-6 mx-0.5" />
        <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("left").run()} isActive={editor?.isActive({ textAlign: "left" })} title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("center").run()} isActive={editor?.isActive({ textAlign: "center" })} title="Center">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} isActive={editor?.isActive("bulletList")} title="Bullet List">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} isActive={editor?.isActive("orderedList")} title="Numbered List">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="h-6 mx-0.5" />
        <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} title="Undo">
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} title="Redo">
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-text-secondary">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
              <AlignRight className="h-4 w-4 mr-2" /> Align Right
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("justify").run()}>
              <AlignJustify className="h-4 w-4 mr-2" /> Justify
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().insertPageBreak().run()}>
              <FileText className="h-4 w-4 mr-2" /> Page Break
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              <TableIcon className="h-4 w-4 mr-2" /> Insert Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const url = prompt("Enter image URL:"); if (url) editor?.chain().focus().setImage({ src: url }).run(); }}>
              <ImagePlus className="h-4 w-4 mr-2" /> Insert Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content — Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Variables (desktop only) */}
        <div className="hidden lg:flex w-64 border-r border-border bg-white flex-col">
          <div className="p-3 border-b border-border">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Variable className="h-4 w-4 text-primary" /> Variables
            </h3>
            <p className="text-xs text-text-secondary mt-1">Click to insert at cursor</p>
          </div>
          {variablesPanelContent}
        </div>

        {/* Center — Editor */}
        <div className="flex-1 overflow-y-auto bg-surface-2">
          <div className="max-w-3xl mx-auto my-4 lg:my-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-2xl border border-border bg-white min-h-[800px]">
            <EditorContent editor={editor} className="tiptap-editor" />
          </div>
        </div>

        {/* Right Panel — Signer Fields (desktop only) */}
        <div className="hidden lg:flex w-72 border-l border-border bg-white flex-col">
          <div className="p-3 border-b border-border">
            <h3 className="font-semibold text-sm text-foreground">Sign Fields</h3>
            <p className="text-xs text-text-secondary mt-1">Define placeholder sign fields for this template</p>
          </div>
          {signersPanelContent}
        </div>
      </div>

      {/* Mobile: Variables Sheet */}
      <Sheet open={showVariablesPanel} onOpenChange={setShowVariablesPanel}>
        <SheetContent side="left" className="w-80 p-0 flex flex-col">
          <SheetHeader className="p-3 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Variable className="h-4 w-4 text-primary" /> Variables
            </SheetTitle>
            <SheetDescription className="text-xs">Click to insert at cursor</SheetDescription>
          </SheetHeader>
          {variablesPanelContent}
        </SheetContent>
      </Sheet>

      {/* Mobile: Signers Sheet */}
      <Sheet open={showSignersPanel} onOpenChange={setShowSignersPanel}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col">
          <SheetHeader className="p-3 border-b border-border">
            <SheetTitle className="text-sm">Sign Fields</SheetTitle>
            <SheetDescription className="text-xs">Define placeholder sign fields</SheetDescription>
          </SheetHeader>
          {signersPanelContent}
        </SheetContent>
      </Sheet>

      {/* TipTap Editor Styles */}
      <style jsx global>{`
        .tiptap-editor .tiptap {
          outline: none;
          min-height: 500px;
          padding: 24px 32px;
        }
        .tiptap-editor .tiptap p {
          margin-bottom: 0.5em;
          color: var(--text-secondary);
          line-height: 1.6;
        }
        .tiptap-editor .tiptap h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--foreground);
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .tiptap-editor .tiptap h2 {
          font-size: 1.4rem;
          font-weight: 600;
          color: var(--foreground);
          margin-top: 1.2em;
          margin-bottom: 0.4em;
        }
        .tiptap-editor .tiptap h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--foreground);
          margin-top: 1em;
          margin-bottom: 0.3em;
        }
        .tiptap-editor .tiptap ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin-bottom: 0.5em;
        }
        .tiptap-editor .tiptap ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin-bottom: 0.5em;
        }
        .tiptap-editor .tiptap li {
          margin-bottom: 0.2em;
        }
        .tiptap-editor .tiptap table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .tiptap-editor .tiptap table td,
        .tiptap-editor .tiptap table th {
          border: 1px solid var(--border);
          padding: 8px;
          min-width: 60px;
        }
        .tiptap-editor .tiptap table th {
          background: var(--surface-2);
          font-weight: 600;
        }
        .tiptap-editor .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 0.5em 0;
        }
        .tiptap-editor .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-muted);
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor .tiptap mark {
          border-radius: 2px;
          padding: 0 2px;
        }
        .tiptap-editor .tiptap .task-list {
          list-style: none;
          padding-left: 0;
        }
        .tiptap-editor .tiptap .task-list li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .tiptap-editor .tiptap .task-list li label {
          display: flex;
          align-items: center;
        }
        .tiptap-editor .tiptap hr.page-break,
        .tiptap-editor .tiptap hr[data-page-break] {
          border: none;
          margin: 0;
          padding: 24px 0;
          position: relative;
          min-height: 56px;
          background: linear-gradient(to bottom,
            #ffffff 0%,
            #ffffff 38%,
            var(--border) 38%,
            var(--border) 40%,
            #ffffff 40%,
            #ffffff 60%,
            var(--border) 60%,
            var(--border) 62%,
            #ffffff 62%,
            #ffffff 100%
          );
        }
        .tiptap-editor .tiptap hr.page-break::before,
        .tiptap-editor .tiptap hr[data-page-break]::before {
          content: "PAGE BREAK";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          color: var(--status-green-dark);
          background: var(--primary-light);
          border: 1px solid var(--status-green-dark);
          padding: 3px 16px;
          border-radius: 4px;
          white-space: nowrap;
          z-index: 1;
        }
        .tiptap-editor .tiptap hr[style*="page-break"] {
          border: none;
          margin: 0;
          padding: 24px 0;
          position: relative;
          min-height: 56px;
          background: linear-gradient(to bottom,
            #ffffff 0%,
            #ffffff 38%,
            var(--border) 38%,
            var(--border) 40%,
            #ffffff 40%,
            #ffffff 60%,
            var(--border) 60%,
            var(--border) 62%,
            #ffffff 62%,
            #ffffff 100%
          );
        }
        .tiptap-editor .tiptap hr[style*="page-break"]::before {
          content: "PAGE BREAK";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          color: var(--status-green-dark);
          background: var(--primary-light);
          border: 1px solid var(--status-green-dark);
          padding: 3px 16px;
          border-radius: 4px;
          white-space: nowrap;
          z-index: 1;
        }
      `}</style>
    </div>
    </TooltipProvider>
    </VaultSignErrorBoundary>
  );
}

// Toolbar button component — Word-style ribbon button
function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 transition-all rounded ${
              isActive
                ? "bg-primary-light text-primary ring-1 ring-primary/30"
                : "text-foreground hover:bg-surface-2 hover:text-foreground active:bg-surface-3"
            }`}
            onClick={onClick}
            title={title}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

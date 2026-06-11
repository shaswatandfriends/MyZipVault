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
import { toast } from "sonner";
import {
  ArrowLeft, Save, FileDown, Send, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Undo2, Redo2, Type, Palette,
  Highlighter, Subscript as SubIcon, Superscript as SupIcon, Plus, Trash2,
  Variable, ChevronDown, X, Loader2, TableIcon, ImagePlus, Minus,
  Menu, PanelLeftIcon, PanelRightIcon, MoreVertical
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SYSTEM_VARIABLES, SIGNER_COLORS, FIELD_TYPE_LABELS, FIELD_TYPE_ICONS, type SignField, type SignFieldType } from "@/lib/vaultsign/types";

export default function WordEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [docId, setDocId] = useState<string>("");
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docName, setDocName] = useState("");
  const [signers, setSigners] = useState<any[]>([]);
  const [signFields, setSignFields] = useState<SignField[]>([]);
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [customVariables, setCustomVariables] = useState<Array<{ key: string; label: string }>>([]);
  const [newVarKey, setNewVarKey] = useState("");
  const [newVarLabel, setNewVarLabel] = useState("");
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [newSignerRole, setNewSignerRole] = useState("Candidate");
  const [showAddSigner, setShowAddSigner] = useState(false);
  const [showVariablesPanel, setShowVariablesPanel] = useState(false);
  const [showSignersPanel, setShowSignersPanel] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSaved = useRef<string>("");

  // Unwrap params
  useEffect(() => {
    params.then((p) => setDocId(p.id));
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
      Placeholder.configure({ placeholder: "Start typing your document..." }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      // Debounced auto-save
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        handleAutoSave(editor.getJSON());
      }, 3000);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[500px] px-8 py-6",
      },
    },
  });

  // Fetch document data
  const fetchDocument = useCallback(async () => {
    if (!docId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/vaultsign/documents/${docId}`);
      if (!res.ok) throw new Error("Failed to fetch document");
      const data = await res.json();
      setDocument(data);
      setDocName(data.document_name);
      setSigners(data.signers || []);
      setSignFields(data.sign_fields || []);
      setPlaceholderValues(data.placeholder_values || {});

      // Parse custom variables from template or existing data
      if (data.template?.placeholder_variables) {
        const vars = typeof data.template.placeholder_variables === "string"
          ? JSON.parse(data.template.placeholder_variables)
          : data.template.placeholder_variables;
        setCustomVariables(vars.filter((v: any) => v.category === "custom"));
      }

      // Set editor content
      if (editor && data.tiptap_content) {
        try {
          const content = typeof data.tiptap_content === "string"
            ? JSON.parse(data.tiptap_content)
            : data.tiptap_content;
          editor.commands.setContent(content);
        } catch {
          // If tiptap content is HTML from mammoth, just set it as HTML
          editor.commands.setContent(data.tiptap_content);
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [docId, editor]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // Auto-save function
  const handleAutoSave = async (content?: any) => {
    if (!docId || !editor) return;
    try {
      setSaving(true);
      const editorContent = content || editor.getJSON();
      const res = await fetch(`/api/vaultsign/documents/${docId}/save-draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tiptap_content: JSON.stringify(editorContent),
          placeholder_values: placeholderValues,
          sign_fields: signFields,
          document_name: docName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        lastSaved.current = data.saved_at;
      }
    } catch (err) {
      console.error("Auto-save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Manual save
  const handleSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    await handleAutoSave();
    toast.success("Draft saved");
  };

  // Export PDF
  const handleExportPdf = async () => {
    try {
      await handleSave();
      toast.loading("Generating PDF...");
      const res = await fetch(`/api/vaultsign/documents/${docId}/export-pdf`, { method: "POST" });
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      if (data.pdf_url) {
        window.open(data.pdf_url, "_blank");
        toast.success("PDF generated");
      }
    } catch (err) {
      toast.error("Failed to export PDF");
    }
  };

  // Insert variable at cursor
  const insertVariable = (varKey: string) => {
    if (!editor) return;
    const value = placeholderValues[varKey] || `{{${varKey}}}`;
    editor.chain().focus().insertContent(value).run();
  };

  // Add signer
  const addSigner = async () => {
    if (!newSignerName || !newSignerEmail) {
      toast.error("Name and email are required");
      return;
    }

    const newSigner = {
      name: newSignerName,
      email: newSignerEmail,
      role: newSignerRole,
      signer_index: signers.length,
      signing_order_position: signers.length + 1,
      status: "pending",
    };

    try {
      // Update fields API
      const res = await fetch(`/api/vaultsign/documents/${docId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signers: [...signers, newSigner],
        }),
      });
      if (res.ok) {
        setSigners([...signers, { ...newSigner, id: Date.now() }]);
        setNewSignerName("");
        setNewSignerEmail("");
        setShowAddSigner(false);
        toast.success("Signer added");
      }
    } catch {
      toast.error("Failed to add signer");
    }
  };

  // Remove signer
  const removeSigner = async (index: number) => {
    const updated = signers.filter((_, i) => i !== index);
    setSigners(updated);
    // Update fields that were assigned to this signer
    const updatedFields = signFields
      .filter((f) => f.assigned_to_signer_index !== index)
      .map((f) => ({
        ...f,
        assigned_to_signer_index: f.assigned_to_signer_index > index
          ? f.assigned_to_signer_index - 1
          : f.assigned_to_signer_index,
      }));
    setSignFields(updatedFields);
    toast.success("Signer removed");
  };

  // Add sign field (inline for Word editor)
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
    const updated = [...signFields, newField];
    setSignFields(updated);

    // Insert marker in editor
    if (editor) {
      const marker = `[${FIELD_TYPE_LABELS[type].toUpperCase()} — Signer ${signerIndex + 1}]`;
      editor.chain().focus().insertContent(marker).run();
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

  // Update placeholder value
  const updatePlaceholder = (key: string, value: string) => {
    setPlaceholderValues({ ...placeholderValues, [key]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex flex-col">
        {/* Skeleton Top Bar */}
        <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-6 w-px" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-24" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        {/* Skeleton Toolbar */}
        <div className="bg-white border-b border-[#E5E7EB] px-4 py-2 flex items-center gap-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded" />
          ))}
          <Skeleton className="h-8 w-[120px] rounded ml-1" />
        </div>
        {/* Skeleton Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Skeleton Left Panel */}
          <div className="hidden lg:flex w-64 border-r border-[#E5E7EB] bg-white flex-col">
            <div className="p-3 border-b border-[#E5E7EB]">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-36 mt-1" />
            </div>
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded" />
              ))}
            </div>
          </div>
          {/* Skeleton Editor Area */}
          <div className="flex-1 overflow-y-auto bg-white p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#E5E7EB] shadow-sm min-h-[800px] p-8 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-6 w-1/2 mt-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full mt-4" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3 mt-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
          {/* Skeleton Right Panel */}
          <div className="hidden lg:flex w-72 border-l border-[#E5E7EB] bg-white flex-col">
            <div className="p-3 border-b border-[#E5E7EB]">
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

  // Variables panel content (shared between inline and Sheet)
  const variablesPanelContent = (
    <>
      <ScrollArea className="flex-1">
        <div className="p-3">
          <h4 className="text-xs font-semibold text-[#6B7280] uppercase mb-2">System Variables</h4>
          <div className="space-y-1.5">
            {SYSTEM_VARIABLES.map((v) => (
              <button
                key={v.key}
                onClick={() => { insertVariable(v.key); setShowVariablesPanel(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#166534] font-medium transition-colors border border-transparent hover:border-[#166534]/20"
              >
                {v.label}
              </button>
            ))}
          </div>

          <Separator className="my-3" />

          <h4 className="text-xs font-semibold text-[#6B7280] uppercase mb-2">Custom Variables</h4>
          <div className="space-y-1.5">
            {customVariables.map((v) => (
              <div key={v.key} className="flex items-center gap-1">
                <button
                  onClick={() => { insertVariable(v.key); setShowVariablesPanel(false); }}
                  className="flex-1 text-left px-2.5 py-1.5 rounded-lg text-xs bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] font-medium transition-colors"
                >
                  {v.label}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-[#9CA3AF] hover:text-[#DC2626]"
                  onClick={() => setCustomVariables(customVariables.filter((cv) => cv.key !== v.key))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-3 p-2 rounded-lg border border-dashed border-[#E5E7EB]">
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
              className="w-full h-7 text-xs bg-[#166534] hover:bg-[#14532D]"
              onClick={addCustomVariable}
              disabled={!newVarKey || !newVarLabel}
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>

          <Separator className="my-3" />

          <h4 className="text-xs font-semibold text-[#6B7280] uppercase mb-2">Fill Values</h4>
          <div className="space-y-2">
            {[...SYSTEM_VARIABLES, ...customVariables.map((v) => ({ ...v, category: "custom" as const }))].map((v) => (
              <div key={v.key}>
                <label className="text-xs text-[#6B7280]">{v.label}</label>
                <Input
                  value={placeholderValues[v.key] || ""}
                  onChange={(e) => updatePlaceholder(v.key, e.target.value)}
                  placeholder={v.label}
                  className="h-7 text-xs mt-0.5"
                />
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </>
  );

  // Signers panel content (shared between inline and Sheet)
  const signersPanelContent = (
    <>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Signers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-[#6B7280] uppercase">Signers</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-[#166534]"
                onClick={() => setShowAddSigner(true)}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>

            {signers.map((signer, index) => (
              <div
                key={signer.id || index}
                className="flex items-center gap-2 p-2 rounded-lg border border-[#E5E7EB] mb-1.5"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: SIGNER_COLORS[index % SIGNER_COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#111827] truncate">{signer.name}</p>
                  <p className="text-[10px] text-[#6B7280] truncate">{signer.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px] h-5">{signer.role}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-[#9CA3AF] hover:text-[#DC2626]"
                  onClick={() => removeSigner(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {showAddSigner && (
              <div className="p-2 rounded-lg border border-[#166534]/20 bg-[#F0FDF4] space-y-1.5">
                <Input
                  placeholder="Name"
                  value={newSignerName}
                  onChange={(e) => setNewSignerName(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newSignerEmail}
                  onChange={(e) => setNewSignerEmail(e.target.value)}
                  className="h-7 text-xs"
                />
                <Select value={newSignerRole} onValueChange={setNewSignerRole}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Candidate">Candidate</SelectItem>
                    <SelectItem value="Recruiter">Recruiter</SelectItem>
                    <SelectItem value="Client Employer">Client Employer</SelectItem>
                    <SelectItem value="Witness">Witness</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs bg-[#166534] hover:bg-[#14532D]"
                    onClick={addSigner}
                  >
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowAddSigner(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sign Fields */}
          <div>
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase mb-2">Sign Fields</h4>
            {signers.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] p-2">Add signers first to assign fields</p>
            ) : (
              <>
                {/* Field type buttons per signer */}
                {signers.map((signer, index) => (
                  <div key={index} className="mb-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: SIGNER_COLORS[index % SIGNER_COLORS.length] }}
                      />
                      <span className="text-xs font-medium text-[#111827]">{signer.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(["signature", "date", "full_name", "initials", "email", "text", "checkbox"] as SignFieldType[]).map((type) => (
                        <Button
                          key={type}
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2 border-[#E5E7EB]"
                          onClick={() => addSignField(type, index)}
                        >
                          {FIELD_TYPE_ICONS[type]} {FIELD_TYPE_LABELS[type]}
                        </Button>
                      ))}
                    </div>

                    {/* Assigned fields */}
                    {signFields.filter((f) => f.assigned_to_signer_index === index).map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between mt-1 px-2 py-1 rounded bg-[#F8F7F4] border border-[#E5E7EB]"
                      >
                        <span className="text-[10px] text-[#6B7280]">
                          {FIELD_TYPE_ICONS[field.type]} {field.label}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 text-[#9CA3AF] hover:text-[#DC2626]"
                          onClick={() => removeSignField(field.id)}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </ScrollArea>
    </>
  );

  return (
    <VaultSignErrorBoundary>
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Mobile panel toggle buttons */}
          <div className="flex items-center gap-1 lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[#6B7280]"
              onClick={() => setShowVariablesPanel(true)}
            >
              <PanelLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[#6B7280]"
              onClick={() => setShowSignersPanel(true)}
            >
              <PanelRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/recruiter/vaultsign")}
            className="text-[#6B7280] hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Back</span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            className="font-semibold text-[#111827] border-none shadow-none focus-visible:ring-0 p-0 h-auto text-lg max-w-xs min-w-0"
            placeholder="Document Name"
          />
          <Badge variant="outline" className="text-xs bg-[#F8F7F4] hidden sm:inline-flex">
            Word Document
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && (
            <span className="text-xs text-[#6B7280] flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> <span className="hidden sm:inline">Saving...</span>
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="border-[#E5E7EB] text-[#166534]"
          >
            <Save className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Save Draft</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="border-[#E5E7EB] text-[#111827]"
          >
            <FileDown className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Export PDF</span>
          </Button>
        </div>
      </div>

      {/* Toolbar — Desktop */}
      <div className="hidden lg:flex bg-white border-b border-[#E5E7EB] px-4 py-2 items-center gap-1">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={editor?.isActive("bold")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editor?.isActive("italic")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          isActive={editor?.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          isActive={editor?.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Select value={editor?.getAttributes("textStyle").fontFamily || "Default"} onValueChange={(val) => {
          if (val === "Default") {
            editor?.chain().focus().unsetFontFamily().run();
          } else {
            editor?.chain().focus().setFontFamily(val).run();
          }
        }}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-6 gap-1">
              {["#000000", "#374151", "#6B7280", "#DC2626", "#166534", "#0D9488", "#7C3AED", "#D97706", "#DB2777", "#2563EB"].map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-[#E5E7EB] hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor?.chain().focus().setColor(color).run()}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-[#E5E7EB] hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor?.chain().focus().toggleHighlight({ color }).run()}
                  title={label}
                />
              ))}
              <button
                className="w-6 h-6 rounded border border-[#E5E7EB] text-xs flex items-center justify-center hover:scale-110 transition-transform"
                onClick={() => editor?.chain().focus().unsetHighlight().run()}
                title="Remove highlight"
              >
                <Minus className="h-3 w-3" />
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          isActive={editor?.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          isActive={editor?.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          isActive={editor?.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
          isActive={editor?.isActive({ textAlign: "justify" })}
          title="Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          isActive={editor?.isActive("taskList")}
          title="Task List"
        >
          <CheckSquare className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleSubscript().run()}
          isActive={editor?.isActive("subscript")}
          title="Subscript"
        >
          <SubIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleSuperscript().run()}
          isActive={editor?.isActive("superscript")}
          title="Superscript"
        >
          <SupIcon className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton
          onClick={() => {
            const url = prompt("Enter image URL:");
            if (url) editor?.chain().focus().setImage({ src: url }).run();
          }}
          title="Insert Image"
        >
          <ImagePlus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insert Table"
        >
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Toolbar — Mobile (simplified) */}
      <div className="lg:hidden bg-white border-b border-[#E5E7EB] px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          isActive={editor?.isActive("bold")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editor?.isActive("italic")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          isActive={editor?.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          isActive={editor?.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="h-6 mx-0.5" />
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          isActive={editor?.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          isActive={editor?.isActive({ textAlign: "center" })}
          title="Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <Separator orientation="vertical" className="h-6 mx-0.5" />
        <ToolbarButton
          onClick={() => editor?.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        {/* More formatting dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#6B7280]">
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
            <DropdownMenuItem onClick={() => editor?.chain().focus().toggleTaskList().run()}>
              <CheckSquare className="h-4 w-4 mr-2" /> Task List
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().toggleSubscript().run()}>
              <SubIcon className="h-4 w-4 mr-2" /> Subscript
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().toggleSuperscript().run()}>
              <SupIcon className="h-4 w-4 mr-2" /> Superscript
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const url = prompt("Enter image URL:");
              if (url) editor?.chain().focus().setImage({ src: url }).run();
            }}>
              <ImagePlus className="h-4 w-4 mr-2" /> Insert Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              <TableIcon className="h-4 w-4 mr-2" /> Insert Table
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content — Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Variables (desktop only) */}
        <div className="hidden lg:flex w-64 border-r border-[#E5E7EB] bg-white flex-col">
          <div className="p-3 border-b border-[#E5E7EB]">
            <h3 className="font-semibold text-sm text-[#111827] flex items-center gap-2">
              <Variable className="h-4 w-4 text-[#166534]" /> Variables
            </h3>
            <p className="text-xs text-[#6B7280] mt-1">Click to insert at cursor</p>
          </div>
          {variablesPanelContent}
        </div>

        {/* Center — TipTap Editor (full width on mobile) */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-3xl mx-auto my-4 lg:my-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-2xl border border-[#E5E7EB] bg-white min-h-[800px]">
            <EditorContent editor={editor} className="tiptap-editor" />
          </div>
        </div>

        {/* Right Panel — Signers & Fields (desktop only) */}
        <div className="hidden lg:flex w-72 border-l border-[#E5E7EB] bg-white flex-col">
          <div className="p-3 border-b border-[#E5E7EB]">
            <h3 className="font-semibold text-sm text-[#111827]">Signers & Fields</h3>
          </div>
          {signersPanelContent}
        </div>
      </div>

      {/* Mobile: Variables Sheet (slide-over from left) */}
      <Sheet open={showVariablesPanel} onOpenChange={setShowVariablesPanel}>
        <SheetContent side="left" className="w-80 p-0 flex flex-col">
          <SheetHeader className="p-3 border-b border-[#E5E7EB]">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Variable className="h-4 w-4 text-[#166534]" /> Variables
            </SheetTitle>
            <SheetDescription className="text-xs">Click to insert at cursor</SheetDescription>
          </SheetHeader>
          {variablesPanelContent}
        </SheetContent>
      </Sheet>

      {/* Mobile: Signers Sheet (slide-over from right) */}
      <Sheet open={showSignersPanel} onOpenChange={setShowSignersPanel}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col">
          <SheetHeader className="p-3 border-b border-[#E5E7EB]">
            <SheetTitle className="text-sm">Signers & Fields</SheetTitle>
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
          color: #374151;
          line-height: 1.6;
        }
        .tiptap-editor .tiptap h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .tiptap-editor .tiptap h2 {
          font-size: 1.4rem;
          font-weight: 600;
          color: #111827;
          margin-top: 1.2em;
          margin-bottom: 0.4em;
        }
        .tiptap-editor .tiptap h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: #111827;
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
          border: 1px solid #E5E7EB;
          padding: 8px;
          min-width: 60px;
        }
        .tiptap-editor .tiptap table th {
          background: #F3F4F6;
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
          color: #9CA3AF;
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
      `}</style>
    </div>
    </VaultSignErrorBoundary>
  );
}

// Toolbar button component
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
    <Button
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 transition-colors ${isActive ? "bg-[#F0FDF4] text-[#166534]" : "text-[#6B7280]"}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

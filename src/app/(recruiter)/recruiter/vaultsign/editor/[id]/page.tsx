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
import { toast } from "sonner";
import {
  ArrowLeft, Save, FileDown, Send, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Undo2, Redo2, Type, Palette,
  Highlighter, Subscript as SubIcon, Superscript as SupIcon, Plus, Trash2,
  Variable, ChevronDown, X, Loader2, TableIcon, ImagePlus, Minus,
  Menu, PanelLeftIcon, PanelRightIcon, MoreVertical, ArrowUpDown, FileText,
  Eye, Edit3, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, AlertTriangle
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  // PDF Preview state
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfZoom, setPdfZoom] = useState(1.0);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setDocId(p.id));
  }, [params]);

  // Initialize TipTap editor with format-preserving extensions
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

      if (data.template?.placeholder_variables) {
        const vars = typeof data.template.placeholder_variables === "string"
          ? JSON.parse(data.template.placeholder_variables)
          : data.template.placeholder_variables;
        setCustomVariables(vars.filter((v: any) => v.category === "custom"));
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

      // If document has an edited_pdf_url, we can use it for preview
      if (data.edited_pdf_url) {
        setPdfUrl(data.edited_pdf_url);
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

  // Generate PDF Preview using LibreOffice
  const handleGeneratePreview = useCallback(async () => {
    if (!docId) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      await handleSave();
      const res = await fetch(`/api/vaultsign/documents/${docId}/convert-pdf`, {
        method: "POST",
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Conversion failed");
      }
      const data = await res.json();
      if (data.pdf_url) {
        setPdfUrl(data.pdf_url);
        setPdfPage(1);
        setPdfTotalPages(0);
        setViewMode("preview");
        toast.success("PDF preview generated with exact formatting");
      } else {
        throw new Error("No PDF URL returned");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setPdfError("PDF generation timed out. Please try again.");
      } else {
        setPdfError(err.message || "Failed to generate PDF preview");
      }
      toast.error(err.message || "Failed to generate PDF preview");
    } finally {
      setPdfLoading(false);
    }
  }, [docId]);

  // Export PDF
  const handleExportPdf = async () => {
    const loadingToast = toast.loading("Generating PDF...");
    try {
      await handleSave();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(`/api/vaultsign/documents/${docId}/export-pdf`, {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Export failed");
      }
      const data = await res.json();
      if (data.pdf_url) {
        window.open(data.pdf_url, "_blank");
        toast.success("PDF generated", { id: loadingToast });
      } else {
        toast.error("No PDF URL returned", { id: loadingToast });
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast.error("PDF generation timed out. Please try again.", { id: loadingToast });
      } else {
        toast.error(err.message || "Failed to export PDF", { id: loadingToast });
      }
    }
  };

  // Render PDF page on canvas
  const renderPdfPage = useCallback(async () => {
    if (!pdfUrl || !pdfCanvasRef.current) return;

    try {
      // Dynamically import pdfjs-dist
      const pdfjsLib = await import("pdfjs-dist");

      // Set worker source
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
      }

      let docToRender = pdfDocRef.current;

      if (!docToRender) {
        let loadingTask;
        if (pdfUrl.startsWith("data:")) {
          const base64 = pdfUrl.split(",")[1];
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          loadingTask = pdfjsLib.getDocument({ data: bytes });
        } else {
          loadingTask = pdfjsLib.getDocument(pdfUrl);
        }

        docToRender = await loadingTask.promise;
        pdfDocRef.current = docToRender;
        setPdfTotalPages(docToRender.numPages);
      }

      const page = await docToRender.getPage(pdfPage);
      const viewport = page.getViewport({ scale: pdfZoom * 1.5 });
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext("2d");

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    } catch (err) {
      console.error("PDF render error:", err);
      setPdfError("Failed to render PDF page");
    }
  }, [pdfUrl, pdfPage, pdfZoom]);

  // Load and render PDF when switching to preview mode
  useEffect(() => {
    if (viewMode === "preview" && pdfUrl) {
      pdfDocRef.current = null; // Reset when switching
      renderPdfPage();
    }
  }, [viewMode, pdfUrl, pdfPage, pdfZoom, renderPdfPage]);

  // Cleanup PDF doc on unmount
  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, []);

  // Delete document
  const handleDelete = async () => {
    if (!docId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/vaultsign/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      toast.success("Document deleted");
      router.push("/recruiter/vaultsign");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
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
      const res = await fetch(`/api/vaultsign/documents/${docId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signers: [...signers, newSigner] }),
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
    const updated = [...signFields, newField];
    setSignFields(updated);

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
        <div className="bg-white border-b border-[#E5E7EB] px-4 py-2 flex items-center gap-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded" />
          ))}
          <Skeleton className="h-8 w-[120px] rounded ml-1" />
        </div>
        <div className="flex-1 flex overflow-hidden">
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
          <div className="flex-1 overflow-y-auto bg-white p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#E5E7EB] shadow-sm min-h-[800px] p-8 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-6 w-1/2 mt-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
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

  // Variables panel content
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

  // Signers panel content
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
                  <Button size="sm" className="flex-1 h-7 text-xs bg-[#166534] hover:bg-[#14532D]" onClick={addSigner}>
                    Add
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddSigner(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sign Fields — with clickable labeled buttons */}
          <div>
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase mb-2">Sign Fields</h4>
            {signers.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] p-2">Add signers first to assign fields</p>
            ) : (
              <>
                {signers.map((signer, index) => (
                  <div key={index} className="mb-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: SIGNER_COLORS[index % SIGNER_COLORS.length] }}
                      />
                      <span className="text-xs font-medium text-[#111827]">{signer.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {(["signature", "date", "full_name", "initials", "email", "text", "checkbox"] as SignFieldType[]).map((type) => (
                        <TooltipProvider key={type}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border border-[#E5E7EB] hover:border-[#166534]/30 hover:bg-[#F0FDF4] transition-colors text-[#374151] cursor-pointer"
                                onClick={() => addSignField(type, index)}
                              >
                                <span className="text-sm">{FIELD_TYPE_ICONS[type]}</span>
                                <span className="truncate">{FIELD_TYPE_LABELS[type]}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              Add {FIELD_TYPE_LABELS[type]} field for {signer.name}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
    <TooltipProvider>
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Mobile panel toggle buttons */}
          <div className="flex items-center gap-1 lg:hidden">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#6B7280]" onClick={() => setShowVariablesPanel(true)}>
              <PanelLeftIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#6B7280]" onClick={() => setShowSignersPanel(true)}>
              <PanelRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/recruiter/vaultsign")} className="text-[#6B7280] hover:text-[#111827]">
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

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center bg-[#F3F4F6] rounded-lg p-0.5">
            <button
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "edit" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
              }`}
              onClick={() => setViewMode("edit")}
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "preview" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
              }`}
              onClick={() => {
                if (viewMode !== "preview") {
                  if (pdfUrl) {
                    setViewMode("preview");
                  } else {
                    handleGeneratePreview();
                  }
                }
              }}
              disabled={pdfLoading}
            >
              {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} Preview
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleSave} className="border-[#E5E7EB] text-[#166534]">
            <Save className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Save</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="border-[#E5E7EB] text-[#111827]">
            <FileDown className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Export PDF</span>
          </Button>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#6B7280]">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleGeneratePreview} disabled={pdfLoading}>
                <Eye className="h-4 w-4 mr-2" /> Generate PDF Preview
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[#DC2626] focus:text-[#DC2626]" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Toolbar — Only show in Edit mode, Desktop — Word-style ribbon */}
      {viewMode === "edit" && (
        <div className="hidden lg:flex bg-[#F8F9FA] border-b border-[#E5E7EB] px-1 py-0.5 flex-wrap gap-y-0">
          {/* Clipboard Group */}
          <div className="flex flex-col bg-white rounded-md border border-[#E5E7EB]/60 mx-0.5 px-1.5 py-1">
            <div className="flex items-center gap-0.5">
              <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} title="Undo (Ctrl+Z)" isActive={false}>
                <Undo2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} title="Redo (Ctrl+Y)" isActive={false}>
                <Redo2 className="h-4 w-4" />
              </ToolbarButton>
            </div>
            <span className="text-[9px] text-[#6B7280] mt-0.5 select-none text-center font-medium">Undo</span>
          </div>

          {/* Font Group */}
          <div className="flex flex-col bg-white rounded-md border border-[#E5E7EB]/60 mx-0.5 px-1.5 py-1">
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
                  <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${editor?.isActive("textStyle") && editor?.getAttributes("textStyle").color ? "bg-[#F0FDF4] text-[#166534]" : "text-[#6B7280]"}`} title="Font Color">
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-6 gap-1">
                    {["#000000", "#374151", "#6B7280", "#DC2626", "#166534", "#0D9488", "#7C3AED", "#D97706", "#DB2777", "#2563EB"].map((color) => (
                      <button key={color} className="w-6 h-6 rounded border border-[#E5E7EB] hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => editor?.chain().focus().setColor(color).run()} />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${editor?.isActive("highlight") ? "bg-[#F0FDF4] text-[#166534]" : "text-[#6B7280]"}`} title="Highlight">
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
                      <button key={color} className="w-6 h-6 rounded border border-[#E5E7EB] hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => editor?.chain().focus().toggleHighlight({ color }).run()} title={label} />
                    ))}
                    <button className="w-6 h-6 rounded border border-[#E5E7EB] text-xs flex items-center justify-center hover:scale-110 transition-transform" onClick={() => editor?.chain().focus().unsetHighlight().run()} title="Remove highlight">
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <span className="text-[9px] text-[#6B7280] mt-0.5 select-none text-center font-medium">Font</span>
          </div>

          {/* Paragraph Group */}
          <div className="flex flex-col bg-white rounded-md border border-[#E5E7EB]/60 mx-0.5 px-1.5 py-1">
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
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#6B7280]" title="Line Spacing">
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
            <span className="text-[9px] text-[#6B7280] mt-0.5 select-none text-center font-medium">Paragraph</span>
          </div>

          {/* Insert Group */}
          <div className="flex flex-col bg-white rounded-md border border-[#E5E7EB]/60 mx-0.5 px-1.5 py-1">
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
            <span className="text-[9px] text-[#6B7280] mt-0.5 select-none text-center font-medium">Insert</span>
          </div>

          {/* Styles Group */}
          <div className="flex flex-col bg-white rounded-md border border-[#E5E7EB]/60 mx-0.5 px-1.5 py-1">
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
            <span className="text-[9px] text-[#6B7280] mt-0.5 select-none text-center font-medium">Styles</span>
          </div>
        </div>
      )}

      {/* Mobile Toolbar (simplified) — only in edit mode */}
      {viewMode === "edit" && (
        <div className="lg:hidden bg-white border-b border-[#E5E7EB] px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
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
      )}

      {/* PDF Preview Toolbar — only in preview mode */}
      {viewMode === "preview" && pdfUrl && (
        <div className="bg-white border-b border-[#E5E7EB] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { if (pdfPage > 1) { setPdfPage(pdfPage - 1); } }} disabled={pdfPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-[#6B7280] min-w-[80px] text-center">
              Page {pdfPage} of {pdfTotalPages || "..."}
            </span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { if (pdfPage < pdfTotalPages) { setPdfPage(pdfPage + 1); } }} disabled={pdfPage >= pdfTotalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPdfZoom(Math.max(0.5, pdfZoom - 0.25))} disabled={pdfZoom <= 0.5}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-[#6B7280] min-w-[50px] text-center">{Math.round(pdfZoom * 100)}%</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPdfZoom(Math.min(2.5, pdfZoom + 0.25))} disabled={pdfZoom >= 2.5}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Badge variant="outline" className="text-[10px] bg-[#F0FDF4] text-[#166534] border-[#166534]/20">
              Exact Format Preview
            </Badge>
          </div>
        </div>
      )}

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

        {/* Center — Editor or PDF Preview */}
        <div className="flex-1 overflow-y-auto bg-[#F3F4F6]">
          {viewMode === "edit" ? (
            <>
              {/* Info banner for Word documents */}
              <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-4 py-2 flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#2563EB] flex-shrink-0" />
                <p className="text-xs text-[#1E40AF]">
                  <strong>Tip:</strong> For exact Word formatting with real page breaks, use the <strong>Preview</strong> mode. The editor shows an approximate view.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-6 text-[10px] border-[#2563EB]/30 text-[#2563EB] hover:bg-[#DBEAFE] flex-shrink-0"
                  onClick={() => {
                    if (pdfUrl) {
                      setViewMode("preview");
                    } else {
                      handleGeneratePreview();
                    }
                  }}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                  Preview
                </Button>
              </div>
              <div className="max-w-3xl mx-auto my-4 lg:my-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-2xl border border-[#E5E7EB] bg-white min-h-[800px]">
                <EditorContent editor={editor} className="tiptap-editor" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-6">
              {pdfLoading ? (
                <div className="flex flex-col items-center gap-3 py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-[#166534]" />
                  <p className="text-sm text-[#6B7280]">Converting DOCX to PDF with exact formatting...</p>
                  <p className="text-xs text-[#9CA3AF]">This uses LibreOffice for pixel-perfect conversion</p>
                </div>
              ) : pdfError ? (
                <div className="flex flex-col items-center gap-3 py-20 max-w-md text-center">
                  <AlertTriangle className="h-8 w-8 text-[#D97706]" />
                  <p className="text-sm font-medium text-[#111827]">PDF Preview Error</p>
                  <p className="text-xs text-[#6B7280]">{pdfError}</p>
                  <Button variant="outline" size="sm" onClick={handleGeneratePreview} className="mt-2">
                    Try Again
                  </Button>
                </div>
              ) : !pdfUrl ? (
                <div className="flex flex-col items-center gap-3 py-20">
                  <Eye className="h-8 w-8 text-[#9CA3AF]" />
                  <p className="text-sm text-[#6B7280]">Click "Preview" to generate an exact-format PDF view</p>
                  <Button variant="outline" size="sm" onClick={handleGeneratePreview}>
                    Generate Preview
                  </Button>
                </div>
              ) : (
                <div className="shadow-lg border border-[#E5E7EB] rounded-lg overflow-hidden bg-[#F3F4F6]">
                  <canvas ref={pdfCanvasRef} className="block" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel — Signers & Fields (desktop only) */}
        <div className="hidden lg:flex w-72 border-l border-[#E5E7EB] bg-white flex-col">
          <div className="p-3 border-b border-[#E5E7EB]">
            <h3 className="font-semibold text-sm text-[#111827]">Signers & Fields</h3>
          </div>
          {signersPanelContent}
        </div>
      </div>

      {/* Mobile: Variables Sheet */}
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

      {/* Mobile: Signers Sheet */}
      <Sheet open={showSignersPanel} onOpenChange={setShowSignersPanel}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col">
          <SheetHeader className="p-3 border-b border-[#E5E7EB]">
            <SheetTitle className="text-sm">Signers & Fields</SheetTitle>
          </SheetHeader>
          {signersPanelContent}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#DC2626]">
              <Trash2 className="h-5 w-5" /> Delete Document
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{docName}"</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        /* Page break styling — looks like actual page boundary */
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
            #E5E7EB 38%,
            #E5E7EB 40%,
            #ffffff 40%,
            #ffffff 60%,
            #E5E7EB 60%,
            #E5E7EB 62%,
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
          color: #166534;
          background: #F0FDF4;
          border: 1px solid #166534/30;
          padding: 3px 16px;
          border-radius: 4px;
          white-space: nowrap;
          z-index: 1;
        }
        /* Legacy page-break-after hr styling */
        .tiptap-editor .tiptap hr[style*="page-break"] {
          border: none;
          margin: 0;
          padding: 24px 0;
          position: relative;
          min-height: 56px;
          background: linear-gradient(to bottom,
            #ffffff 0%,
            #ffffff 38%,
            #E5E7EB 38%,
            #E5E7EB 40%,
            #ffffff 40%,
            #ffffff 60%,
            #E5E7EB 60%,
            #E5E7EB 62%,
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
          color: #166534;
          background: #F0FDF4;
          border: 1px solid #166534/30;
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
                ? "bg-[#DCFCE7] text-[#166534] shadow-[inset_0_0_0_1px_#166534/30]"
                : "text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827] active:bg-[#E5E7EB]"
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

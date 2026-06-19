"use client";

/**
 * VaultSign Editor — Editorial Premium redesign (full rewrite)
 *
 * Design tokens (Editorial Premium):
 *   Navy #0B1F3A · Cream #FAF7F0 · Gold #C9A961 · Gold-50 #F8F2E4
 *   Ink #1A1A1A / #5B5A56 / #8C8A83 · Border #E8E2D4
 * Fonts: Playfair Display (titles) + Inter (UI/body)
 *
 * Components: ToolbarButton · VariableChip · SignerCard · SignatureBlock
 *
 * Preserved functionality: TipTap editor w/ all extensions, autosave (3s debounce),
 * manual save, PDF preview (LibreOffice), PDF export, send for signature,
 * add/remove signer, add/remove sign field, custom variables, placeholder fill,
 * header/footer toggle, delete document, save-as-template, mobile sheets.
 */

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
  ArrowLeft, Save, FileDown, Send, Bold, Italic, Underline as UnderlineIcon,
  Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo2, Redo2, Type, Palette, Highlighter,
  Subscript as SubIcon, Superscript as SupIcon, Plus, Trash2, Variable,
  X, Loader2, TableIcon, ImagePlus, Minus, PanelLeftIcon, PanelRightIcon,
  MoreVertical, ArrowUpDown, FileText, Eye, Edit3, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, AlertTriangle, FileSignature, User,
  Building2, Calendar, PenLine, Settings2,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  SYSTEM_VARIABLES, SIGNER_COLORS, FIELD_TYPE_LABELS, FIELD_TYPE_ICONS,
  type SignField, type SignFieldType, type PlaceholderVariable,
} from "@/lib/vaultsign/types";

// ─── Design Tokens ────────────────────────────────────────────────────
const T = {
  navy950:   "#0B1F3A",
  navy700:   "#16335C",
  navy50:    "#EEF1F6",
  cream50:   "#FAF7F0",
  cream100:  "#F2ECDD",
  gold500:   "#C9A961",
  gold600:   "#B8924A",
  gold50:    "#F8F2E4",
  ink900:    "#1A1A1A",
  ink600:    "#5B5A56",
  ink400:    "#8C8A83",
  borderSubtle: "#E8E2D4",
  borderStrong: "#D8D0BC",
};

// ─── Variable Groups (mapped from SYSTEM_VARIABLES) ──────────────────
const VARIABLE_GROUPS: Array<{
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  items: PlaceholderVariable[];
}> = [
  {
    label: "Candidate",
    icon: User,
    items: SYSTEM_VARIABLES.filter((v) =>
      ["candidate_name", "position_title", "start_date", "salary"].includes(v.key)
    ),
  },
  {
    label: "Company",
    icon: Building2,
    items: SYSTEM_VARIABLES.filter((v) =>
      ["company_name", "company_address", "company_phone", "company_email", "company_website", "recruiter_name"].includes(v.key)
    ),
  },
  {
    label: "Document",
    icon: Calendar,
    items: SYSTEM_VARIABLES.filter((v) =>
      ["current_date", "current_year"].includes(v.key)
    ),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── ToolbarButton — minimal icon button with optional divider ───────
function ToolbarButton({
  onClick, isActive, title, children, divider,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            aria-label={title}
            className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors ${
              isActive
                ? "bg-[#F8F2E4] text-[#B8924A] ring-1 ring-[#C9A961]/40"
                : "text-[#5B5A56] hover:bg-[#F2ECDD] hover:text-[#0B1F3A]"
            }`}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {title}
        </TooltipContent>
      </Tooltip>
      {divider && <div className="w-px h-5 mx-1.5" style={{ background: T.borderSubtle }} />}
    </>
  );
}

// ─── VariableChip — full-width insert button with hover Plus icon ────
function VariableChip({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group"
      style={{
        border: `1px solid ${T.borderSubtle}`,
        background: "#fff",
        color: T.ink900,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = T.gold500;
        e.currentTarget.style.background = T.gold50;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.borderSubtle;
        e.currentTarget.style.background = "#fff";
      }}
    >
      <span className="truncate">{text}</span>
      <Plus
        size={13}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
        style={{ color: T.gold600 }}
      />
    </button>
  );
}

// ─── SignerCard — avatar + name/role + place signature field ─────────
function SignerCard({
  signer, index, placedCount, onPlaceField, onRemove,
}: {
  signer: { id?: number; name: string; email?: string; role: string; status?: string };
  index: number;
  placedCount: number;
  onPlaceField: (type: SignFieldType) => void;
  onRemove: () => void;
}) {
  const accent = index % 2 === 0 ? T.gold500 : T.navy700;
  const accentBg = index % 2 === 0 ? T.gold50 : T.navy50;
  const [showFields, setShowFields] = useState(false);

  return (
    <div
      className="rounded-lg p-3 transition-shadow hover:shadow-sm"
      style={{ border: `1px solid ${T.borderSubtle}`, background: "#fff" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: accentBg, color: accent }}
          >
            {getInitials(signer.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate" style={{ color: T.ink900 }}>
              {signer.name}
            </p>
            <p className="text-xs leading-tight truncate" style={{ color: T.ink400 }}>
              {signer.role}{signer.email ? ` · ${signer.email}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={onRemove}
          aria-label="Remove signer"
          className="shrink-0 p-1 rounded text-[#8C8A83] hover:text-[#A0392E] hover:bg-[#FECACA]/40 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <button
        onClick={() => setShowFields(!showFields)}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-colors"
        style={{
          border: `1px solid ${T.gold500}`,
          color: T.gold600,
          background: T.gold50,
        }}
      >
        <PenLine size={13} />
        Place signature field
      </button>

      {showFields && (
        <div className="grid grid-cols-2 gap-1 mt-2">
          {(["signature", "date", "full_name", "initials", "email", "text", "checkbox"] as SignFieldType[]).map((type) => (
            <button
              key={type}
              onClick={() => { onPlaceField(type); setShowFields(false); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium border transition-colors"
              style={{
                borderColor: T.borderSubtle,
                color: T.ink900,
                background: "#fff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = T.gold500;
                e.currentTarget.style.background = T.gold50;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = T.borderSubtle;
                e.currentTarget.style.background = "#fff";
              }}
            >
              <span className="text-sm">{FIELD_TYPE_ICONS[type]}</span>
              <span className="truncate">{FIELD_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>
      )}

      {placedCount > 0 && (
        <p className="text-xs mt-1.5 text-center" style={{ color: T.ink400 }}>
          {placedCount} field{placedCount > 1 ? "s" : ""} placed
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
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
  const [showFillValues, setShowFillValues] = useState(false);
  const [showCustomVars, setShowCustomVars] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSaved = useRef<string>("");

  // View mode: "edit" (TipTap editable) | "preview" (read-only rendered) | "pdf" (generated PDF)
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "pdf">("edit");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfZoom, setPdfZoom] = useState(1.0);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);

  // Header & Footer
  const [showHeaderFooter, setShowHeaderFooter] = useState(true);
  const [organization, setOrganization] = useState<{
    name: string | null;
    company_logo_url: string | null;
    company_address: string | null;
    company_phone: string | null;
    company_email: string | null;
    company_website: string | null;
  } | null>(null);

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [sending, setSending] = useState(false);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setDocId(p.id));
  }, [params]);

  // ─── TipTap editor ─────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      FontFamily, TextStyle, Color, FontSize, LineHeight, ParagraphSpacing,
      PageBreak, SignFieldExtension,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline, Subscript, Superscript,
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader, Image,
      TaskList, TaskItem.configure({ nested: true }),
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
        class: "prose prose-sm max-w-none focus:outline-none min-h-[500px] px-10 py-8",
      },
    },
  });

  // ─── Fetch document ────────────────────────────────────────────────
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
      setOrganization(data.organization || null);

      if (data.show_header_footer !== undefined) {
        setShowHeaderFooter(data.show_header_footer);
      } else if (data.header_config || data.footer_config) {
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

      if (data.template?.placeholder_variables) {
        const vars = typeof data.template.placeholder_variables === "string"
          ? JSON.parse(data.template.placeholder_variables)
          : data.template.placeholder_variables;
        setCustomVariables(vars.filter((v: any) => v.category === "custom"));
      }

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
          try { editor.commands.setContent(data.tiptap_content); } catch { /* give up */ }
        }
      }

      if (data.edited_pdf_url) setPdfUrl(data.edited_pdf_url);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [docId, editor]);

  useEffect(() => { fetchDocument(); }, [fetchDocument]);

  // Toggle editor editable state based on viewMode — Preview mode = read-only
  useEffect(() => {
    if (editor) {
      editor.setEditable(viewMode === "edit");
    }
  }, [editor, viewMode]);

  // ─── Save handlers ─────────────────────────────────────────────────
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
          show_header_footer: showHeaderFooter,
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

  const handleSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    await handleAutoSave();
    toast.success("Draft saved");
  };

  // ─── PDF export (used by "Export PDF" button — separate from Preview) ───
  const handleGeneratePdf = useCallback(async (): Promise<string | null> => {
    if (!docId) return null;
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
        return data.pdf_url;
      } else {
        throw new Error("No PDF URL returned");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setPdfError("PDF generation timed out. Please try again.");
      } else {
        setPdfError(err.message || "Failed to generate PDF");
      }
      return null;
    } finally {
      setPdfLoading(false);
    }
  }, [docId]);

  // Kept for backwards compatibility (used by dropdown menu + old callers)
  const handleGeneratePreview = useCallback(async () => {
    const url = await handleGeneratePdf();
    if (url) {
      toast.success("PDF generated");
      setViewMode("pdf");
    } else {
      toast.error(pdfError || "Failed to generate PDF");
    }
  }, [handleGeneratePdf, pdfError]);

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

  // ─── PDF rendering ─────────────────────────────────────────────────
  const renderPdfPage = useCallback(async () => {
    if (!pdfUrl || !pdfCanvasRef.current) return;
    try {
      const pdfjsLib = await import("pdfjs-dist");
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
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
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
      const context = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
    } catch (err) {
      console.error("PDF render error:", err);
      setPdfError("Failed to render PDF page");
    }
  }, [pdfUrl, pdfPage, pdfZoom]);

  useEffect(() => {
    if (viewMode === "pdf" && pdfUrl) {
      pdfDocRef.current = null;
      renderPdfPage();
    }
  }, [viewMode, pdfUrl, pdfPage, pdfZoom, renderPdfPage]);

  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, []);

  // ─── Document actions ──────────────────────────────────────────────
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

  const handleSendForSignature = async () => {
    if (!docId) return;
    try {
      setSending(true);
      await handleSave();
      const res = await fetch(`/api/vaultsign/documents/${docId}/send`, { method: "POST" });
      if (res.ok) {
        toast.success("Document sent for signature");
        router.push(`/recruiter/vaultsign/${docId}`);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to send");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send for signature");
    } finally {
      setSending(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!docId) return;
    try {
      setSavingTemplate(true);
      await handleSave();
      const res = await fetch("/api/vaultsign/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: docId, template_name: templateName || docName }),
      });
      if (res.ok) {
        toast.success("Template saved! It will appear in your Shared Templates.");
        setShowSaveTemplateDialog(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save template");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  // ─── Variable / signer / field handlers ───────────────────────────
  const insertVariable = (varKey: string) => {
    if (!editor) return;
    const value = placeholderValues[varKey] || `{{${varKey}}}`;
    editor.chain().focus().insertContent(value).run();
  };

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
      editor.chain().focus().insertSignField({
        fieldType: type,
        assignedToSignerIndex: signerIndex,
        signerLabel: signers[signerIndex]?.name || `Signer ${signerIndex + 1}`,
        fieldId: newField.id,
      }).run();
    }
  };

  const removeSignField = (fieldId: string) => {
    setSignFields(signFields.filter((f) => f.id !== fieldId));
  };

  const addCustomVariable = () => {
    if (!newVarKey || !newVarLabel) return;
    setCustomVariables([...customVariables, { key: newVarKey, label: newVarLabel }]);
    setNewVarKey("");
    setNewVarLabel("");
  };

  const updatePlaceholder = (key: string, value: string) => {
    setPlaceholderValues({ ...placeholderValues, [key]: value });
  };

  // ─── Loading skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: T.cream50 }}>
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3" style={{ borderColor: T.borderSubtle }}>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-6 w-48" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="bg-white border-b px-4 py-2 flex items-center gap-1" style={{ borderColor: T.borderSubtle }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-7 rounded-md" />
          ))}
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="hidden lg:flex w-64 border-r bg-white flex-col" style={{ borderColor: T.borderSubtle }}>
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#F2ECDD] p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-sm border shadow-sm min-h-[800px] p-10 space-y-4" style={{ borderColor: T.borderSubtle }}>
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
          <div className="hidden lg:flex w-72 border-l bg-white flex-col" style={{ borderColor: T.borderSubtle }}>
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-20" />
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Variables panel (shared between desktop + mobile sheet) ───────
  const variablesPanel = (
    <ScrollArea className="flex-1">
      <div className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: T.ink400 }}>
          Insert variable
        </h3>

        {VARIABLE_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <group.icon size={13} style={{ color: T.gold600 }} />
              <span className="text-xs font-medium" style={{ color: T.ink600 }}>{group.label}</span>
            </div>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <VariableChip
                  key={item.key}
                  text={item.label}
                  onClick={() => {
                    insertVariable(item.key);
                    setShowVariablesPanel(false);
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Custom variables (collapsible) */}
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
          <button
            onClick={() => setShowCustomVars(!showCustomVars)}
            className="flex items-center justify-between w-full mb-2"
          >
            <div className="flex items-center gap-1.5">
              <Plus size={13} style={{ color: T.gold600 }} />
              <span className="text-xs font-medium" style={{ color: T.ink600 }}>Custom</span>
            </div>
            <span className="text-xs" style={{ color: T.ink400 }}>{showCustomVars ? "Hide" : "Show"}</span>
          </button>
          {showCustomVars && (
            <>
              <div className="space-y-1.5 mb-2">
                {customVariables.length === 0 && (
                  <p className="text-xs px-3 py-2" style={{ color: T.ink400 }}>No custom variables yet.</p>
                )}
                {customVariables.map((v) => (
                  <div key={v.key} className="flex items-center gap-1">
                    <div className="flex-1">
                      <VariableChip
                        text={v.label}
                        onClick={() => {
                          insertVariable(v.key);
                          setShowVariablesPanel(false);
                        }}
                      />
                    </div>
                    <button
                      onClick={() => setCustomVariables(customVariables.filter((cv) => cv.key !== v.key))}
                      className="p-1 rounded text-[#8C8A83] hover:text-[#A0392E] hover:bg-[#FECACA]/40 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-2 rounded-md border border-dashed" style={{ borderColor: T.borderSubtle }}>
                <Input
                  placeholder="Variable key (e.g. bill_rate)"
                  value={newVarKey}
                  onChange={(e) => setNewVarKey(e.target.value)}
                  className="h-7 text-xs mb-1.5"
                />
                <Input
                  placeholder="Display label (e.g. Bill Rate)"
                  value={newVarLabel}
                  onChange={(e) => setNewVarLabel(e.target.value)}
                  className="h-7 text-xs mb-1.5"
                />
                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  style={{ background: T.navy950, color: "#fff" }}
                  onClick={addCustomVariable}
                  disabled={!newVarKey || !newVarLabel}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add variable
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Fill values (collapsible) */}
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
          <button
            onClick={() => setShowFillValues(!showFillValues)}
            className="flex items-center justify-between w-full mb-2"
          >
            <div className="flex items-center gap-1.5">
              <Settings2 size={13} style={{ color: T.gold600 }} />
              <span className="text-xs font-medium" style={{ color: T.ink600 }}>Fill values</span>
            </div>
            <span className="text-xs" style={{ color: T.ink400 }}>{showFillValues ? "Hide" : "Show"}</span>
          </button>
          {showFillValues && (
            <div className="space-y-2">
              {[...SYSTEM_VARIABLES, ...customVariables.map((v) => ({ ...v, category: "custom" as const }))].map((v) => (
                <div key={v.key}>
                  <label className="text-xs" style={{ color: T.ink600 }}>{v.label}</label>
                  <Input
                    value={placeholderValues[v.key] || ""}
                    onChange={(e) => updatePlaceholder(v.key, e.target.value)}
                    placeholder={v.label}
                    className="h-7 text-xs mt-0.5"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );

  // ─── Signers panel (shared) ────────────────────────────────────────
  const signersPanel = (
    <ScrollArea className="flex-1">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.ink400 }}>
            Signers
          </h3>
          <button
            onClick={() => setShowAddSigner(true)}
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: T.gold600 }}
          >
            <Plus size={13} /> Add
          </button>
        </div>

        {signers.length === 0 && (
          <div className="text-center py-8 px-4 rounded-lg border border-dashed" style={{ borderColor: T.borderSubtle }}>
            <User size={20} className="mx-auto mb-2" style={{ color: T.ink400 }} />
            <p className="text-xs" style={{ color: T.ink400 }}>No signers yet. Click "Add" to add one.</p>
          </div>
        )}

        <div className="space-y-2.5">
          {signers.map((signer, index) => (
            <SignerCard
              key={signer.id || index}
              signer={signer}
              index={index}
              placedCount={signFields.filter((f) => f.assigned_to_signer_index === index).length}
              onPlaceField={(type) => addSignField(type, index)}
              onRemove={() => removeSigner(index)}
            />
          ))}
        </div>

        {/* Add signer form */}
        {showAddSigner && (
          <div
            className="mt-3 p-3 rounded-lg space-y-2"
            style={{ border: `1px solid ${T.gold500}`, background: T.gold50 }}
          >
            <Input
              placeholder="Full name"
              value={newSignerName}
              onChange={(e) => setNewSignerName(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              placeholder="Email"
              type="email"
              value={newSignerEmail}
              onChange={(e) => setNewSignerEmail(e.target.value)}
              className="h-8 text-xs"
            />
            <Select value={newSignerRole} onValueChange={setNewSignerRole}>
              <SelectTrigger className="h-8 text-xs">
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
                className="flex-1 h-7 text-xs"
                style={{ background: T.navy950, color: "#fff" }}
                onClick={addSigner}
              >
                Add signer
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

        {/* Placed fields list */}
        {signFields.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.ink400 }}>
              Placed fields
            </h4>
            <div className="space-y-1">
              {signFields.map((field) => {
                const signer = signers[field.assigned_to_signer_index];
                return (
                  <div
                    key={field.id}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md border"
                    style={{ borderColor: T.borderSubtle, background: "#fff" }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm">{FIELD_TYPE_ICONS[field.type]}</span>
                      <span className="text-xs truncate" style={{ color: T.ink600 }}>
                        {field.label} · {signer?.name || "Unassigned"}
                      </span>
                    </div>
                    <button
                      onClick={() => removeSignField(field.id)}
                      className="p-1 rounded text-[#8C8A83] hover:text-[#A0392E] hover:bg-[#FECACA]/40 shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Header & Footer toggle */}
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
          <div
            className="flex items-center justify-between px-3 py-2 rounded-md"
            style={{ border: `1px solid ${T.borderSubtle}`, background: "#fff" }}
          >
            <div>
              <p className="text-xs font-medium" style={{ color: T.ink900 }}>Header & Footer</p>
              <p className="text-[10px]" style={{ color: T.ink400 }}>Company branding on document</p>
            </div>
            <button
              onClick={() => setShowHeaderFooter(!showHeaderFooter)}
              className="w-9 h-5 rounded-full transition-colors shrink-0"
              style={{ background: showHeaderFooter ? T.gold500 : T.borderStrong }}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${showHeaderFooter ? "translate-x-4" : "translate-x-0.5"}`}
              />
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.ink400 }}>
            Status
          </h4>
          <div className="flex items-center gap-2 text-sm" style={{ color: T.ink600 }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.gold500 }} />
            {document?.status === "draft" ? "Draft — not yet sent" : document?.status?.charAt(0).toUpperCase() + document?.status?.slice(1) || "Draft"}
          </div>
        </div>
      </div>
    </ScrollArea>
  );

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <VaultSignErrorBoundary>
      <TooltipProvider>
        <div
          className="min-h-screen flex flex-col"
          style={{ background: T.cream50, fontFamily: "Inter, sans-serif" }}
        >
          {/* ─── Top Bar ─── */}
          <header
            className="flex items-center justify-between px-6 py-3 shrink-0 sticky top-0 z-50"
            style={{ background: "#fff", borderBottom: `1px solid ${T.borderSubtle}` }}
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Mobile panel toggles */}
              <div className="flex items-center gap-1 lg:hidden">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" style={{ color: T.ink600 }} onClick={() => setShowVariablesPanel(true)}>
                  <PanelLeftIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" style={{ color: T.ink600 }} onClick={() => setShowSignersPanel(true)}>
                  <PanelRightIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* VaultSign badge — navy box + gold icon */}
              <div
                className="flex items-center gap-2 px-2.5 py-1 rounded-md shrink-0"
                style={{ background: T.navy950 }}
              >
                <FileSignature size={15} style={{ color: T.gold500 }} />
                <span className="text-xs font-medium tracking-wide text-white">VaultSign</span>
              </div>

              <Button variant="ghost" size="sm" onClick={() => router.push("/recruiter/vaultsign")} style={{ color: T.ink600 }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Back</span>
              </Button>

              {/* Document title — Playfair Display */}
              <input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="text-lg bg-transparent outline-none truncate min-w-0 flex-1"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: T.ink900,
                  fontWeight: 600,
                }}
                placeholder="Untitled Document"
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {saving && (
                <span className="text-xs flex items-center gap-1" style={{ color: T.ink600 }}>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </span>
              )}

              {/* Edit/Preview toggle — Preview is instant, in-browser, no PDF conversion */}
              <div className="hidden sm:flex items-center rounded-md p-0.5" style={{ background: T.cream100 }}>
                <button
                  onClick={() => setViewMode("edit")}
                  className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
                  style={{
                    background: viewMode === "edit" ? "#fff" : "transparent",
                    color: viewMode === "edit" ? T.navy950 : T.ink600,
                    boxShadow: viewMode === "edit" ? "0 1px 2px rgba(11,31,58,0.08)" : "none",
                  }}
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  onClick={() => setViewMode("preview")}
                  className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
                  style={{
                    background: viewMode === "preview" ? "#fff" : "transparent",
                    color: viewMode === "preview" ? T.navy950 : T.ink600,
                    boxShadow: viewMode === "preview" ? "0 1px 2px rgba(11,31,58,0.08)" : "none",
                  }}
                  title="See exactly what the signer will see — instant, no PDF conversion"
                >
                  <Eye size={14} /> Preview
                </button>
              </div>

              <Button variant="outline" size="sm" onClick={handleSave} style={{ borderColor: T.borderSubtle, color: T.ink900 }}>
                <Save className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Save</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setTemplateName(docName); setShowSaveTemplateDialog(true); }}
                style={{ borderColor: T.borderSubtle, color: T.ink900 }}
              >
                <FileText className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Template</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf} style={{ borderColor: T.borderSubtle, color: T.ink900 }}>
                <FileDown className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Export PDF</span>
              </Button>
              <Button
                size="sm"
                style={{ background: T.navy950, color: "#fff" }}
                onClick={handleSendForSignature}
                disabled={sending || document?.status !== "draft"}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                <span className="hidden sm:inline">Send for Signature</span>
              </Button>

              {/* More menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" style={{ color: T.ink600 }}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleGeneratePreview} disabled={pdfLoading}>
                    <FileText className="h-4 w-4 mr-2" /> Generate PDF View
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-[#A0392E] focus:text-[#A0392E]" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Document
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* ─── Formatting Toolbar (Edit mode) — minimal ribbon ─── */}
          {viewMode === "edit" && (
            <div
              className="flex items-center gap-0.5 px-6 py-2 shrink-0 overflow-x-auto"
              style={{ background: "#fff", borderBottom: `1px solid ${T.borderSubtle}` }}
            >
              <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} title="Undo (Ctrl+Z)">
                <Undo2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} title="Redo (Ctrl+Y)" divider>
                <Redo2 className="h-4 w-4" />
              </ToolbarButton>

              {/* Style select */}
              <Select value={
                editor?.isActive("heading", { level: 1 }) ? "1"
                : editor?.isActive("heading", { level: 2 }) ? "2"
                : editor?.isActive("heading", { level: 3 }) ? "3"
                : "0"
              } onValueChange={(val) => {
                if (val === "0") editor?.chain().focus().setParagraph().run();
                else editor?.chain().focus().toggleHeading({ level: parseInt(val) as 1 | 2 | 3 }).run();
              }}>
                <SelectTrigger className="w-[110px] h-7 text-[11px] border-[#E8E2D4]">
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Normal Text</SelectItem>
                  <SelectItem value="1">Heading 1</SelectItem>
                  <SelectItem value="2">Heading 2</SelectItem>
                  <SelectItem value="3">Heading 3</SelectItem>
                </SelectContent>
              </Select>

              {/* Font family */}
              <Select value={editor?.getAttributes("textStyle").fontFamily || "Default"} onValueChange={(val) => {
                if (val === "Default") editor?.chain().focus().unsetFontFamily().run();
                else editor?.chain().focus().setFontFamily(val).run();
              }}>
                <SelectTrigger className="w-[100px] h-7 text-[11px] border-[#E8E2D4]">
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

              {/* Font size */}
              <Select value={((): string => {
                const fs = editor?.getAttributes("textStyle").fontSize;
                if (!fs) return "11";
                const num = parseInt(String(fs));
                return isNaN(num) ? "11" : String(num);
              })()} onValueChange={(val) => {
                editor?.chain().focus().setMark("textStyle", { fontSize: val + "pt" }).run();
              }}>
                <SelectTrigger className="w-[60px] h-7 text-[11px] border-[#E8E2D4]">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72].map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="w-px h-5 mx-1.5" style={{ background: T.borderSubtle }} />

              {/* B / I / U / Strike */}
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} isActive={editor?.isActive("bold")} title="Bold (Ctrl+B)">
                <Bold className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} isActive={editor?.isActive("italic")} title="Italic (Ctrl+I)">
                <Italic className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} isActive={editor?.isActive("underline")} title="Underline (Ctrl+U)">
                <UnderlineIcon className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} isActive={editor?.isActive("strike")} title="Strikethrough" divider>
                <Strikethrough className="h-4 w-4" />
              </ToolbarButton>

              {/* Color */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center justify-center h-7 w-7 rounded-md transition-colors"
                    style={{
                      color: editor?.isActive("textStyle") && editor?.getAttributes("textStyle").color ? T.gold600 : T.ink600,
                      background: editor?.isActive("textStyle") && editor?.getAttributes("textStyle").color ? T.gold50 : "transparent",
                    }}
                    title="Font Color"
                  >
                    <Palette className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-6 gap-1">
                    {["#000000", "#374151", "#5B5A56", "#DC2626", "#0B1F3A", "#0D9488", "#7C3AED", "#D97706", "#DB2777", "#2563EB", "#C9A961", "#8C8A83"].map((color) => (
                      <button
                        key={color}
                        className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color, borderColor: T.borderSubtle }}
                        onClick={() => editor?.chain().focus().setColor(color).run()}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Highlight */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center justify-center h-7 w-7 rounded-md transition-colors"
                    style={{
                      color: editor?.isActive("highlight") ? T.gold600 : T.ink600,
                      background: editor?.isActive("highlight") ? T.gold50 : "transparent",
                    }}
                    title="Highlight"
                  >
                    <Highlighter className="h-4 w-4" />
                  </button>
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
                        className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color, borderColor: T.borderSubtle }}
                        onClick={() => editor?.chain().focus().toggleHighlight({ color }).run()}
                        title={label}
                      />
                    ))}
                    <button
                      className="w-6 h-6 rounded border text-xs flex items-center justify-center hover:scale-110 transition-transform"
                      style={{ borderColor: T.borderSubtle }}
                      onClick={() => editor?.chain().focus().unsetHighlight().run()}
                      title="Remove highlight"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="w-px h-5 mx-1.5" style={{ background: T.borderSubtle }} />

              {/* Alignment */}
              <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("left").run()} isActive={editor?.isActive({ textAlign: "left" })} title="Align Left">
                <AlignLeft className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("center").run()} isActive={editor?.isActive({ textAlign: "center" })} title="Align Center">
                <AlignCenter className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("right").run()} isActive={editor?.isActive({ textAlign: "right" })} title="Align Right">
                <AlignRight className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("justify").run()} isActive={editor?.isActive({ textAlign: "justify" })} title="Justify" divider>
                <AlignJustify className="h-4 w-4" />
              </ToolbarButton>

              {/* Lists */}
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} isActive={editor?.isActive("bulletList")} title="Bullet List">
                <List className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} isActive={editor?.isActive("orderedList")} title="Numbered List" divider>
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>

              {/* Line spacing */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center justify-center h-7 w-7 rounded-md transition-colors"
                    style={{ color: T.ink600 }}
                    title="Line Spacing"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-32">
                  <DropdownMenuItem onClick={() => editor?.chain().focus().setNode("paragraph", { lineHeight: 1.0 }).run()}>1.0</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor?.chain().focus().setNode("paragraph", { lineHeight: 1.15 }).run()}>1.15</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor?.chain().focus().setNode("paragraph", { lineHeight: 1.5 }).run()}>1.5</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor?.chain().focus().setNode("paragraph", { lineHeight: 2.0 }).run()}>2.0</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-5 mx-1.5" style={{ background: T.borderSubtle }} />

              {/* Insert */}
              <ToolbarButton
                onClick={() => { const url = prompt("Enter image URL:"); if (url) editor?.chain().focus().setImage({ src: url }).run(); }}
                title="Insert Image"
              >
                <ImagePlus className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">
                <TableIcon className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().insertPageBreak().run()} title="Page Break">
                <FileText className="h-4 w-4" />
              </ToolbarButton>
            </div>
          )}

          {/* ─── Mobile toolbar (compact) ─── */}
          {viewMode === "edit" && (
            <div className="lg:hidden bg-white border-b px-2 py-1.5 flex items-center gap-1 overflow-x-auto" style={{ borderColor: T.borderSubtle }}>
              <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} title="Undo">
                <Undo2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} title="Redo" divider>
                <Redo2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} isActive={editor?.isActive("bold")} title="Bold">
                <Bold className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} isActive={editor?.isActive("italic")} title="Italic">
                <Italic className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} isActive={editor?.isActive("underline")} title="Underline" divider>
                <UnderlineIcon className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("left").run()} isActive={editor?.isActive({ textAlign: "left" })} title="Align Left">
                <AlignLeft className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("center").run()} isActive={editor?.isActive({ textAlign: "center" })} title="Center">
                <AlignCenter className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} isActive={editor?.isActive("bulletList")} title="Bullets" divider>
                <List className="h-4 w-4" />
              </ToolbarButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" style={{ color: T.ink600 }}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => editor?.chain().focus().toggleStrike().run()}>
                    <Strikethrough className="h-4 w-4 mr-2" /> Strikethrough
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
                    <AlignRight className="h-4 w-4 mr-2" /> Align Right
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("justify").run()}>
                    <AlignJustify className="h-4 w-4 mr-2" /> Justify
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor?.chain().focus().toggleSubscript().run()}>
                    <SubIcon className="h-4 w-4 mr-2" /> Subscript
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor?.chain().focus().toggleSuperscript().run()}>
                    <SupIcon className="h-4 w-4 mr-2" /> Superscript
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                    <TableIcon className="h-4 w-4 mr-2" /> Insert Table
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { const url = prompt("Enter image URL:"); if (url) editor?.chain().focus().setImage({ src: url }).run(); }}>
                    <ImagePlus className="h-4 w-4 mr-2" /> Insert Image
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor?.chain().focus().insertPageBreak().run()}>
                    <FileText className="h-4 w-4 mr-2" /> Page Break
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* ─── PDF viewer toolbar (only in PDF mode) ─── */}
          {viewMode === "pdf" && pdfUrl && (
            <div className="bg-white border-b px-4 py-2 flex items-center justify-between" style={{ borderColor: T.borderSubtle }}>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { if (pdfPage > 1) setPdfPage(pdfPage - 1); }} disabled={pdfPage <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm min-w-[80px] text-center" style={{ color: T.ink600 }}>
                  Page {pdfPage} of {pdfTotalPages || "..."}
                </span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { if (pdfPage < pdfTotalPages) setPdfPage(pdfPage + 1); }} disabled={pdfPage >= pdfTotalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPdfZoom(Math.max(0.5, pdfZoom - 0.25))} disabled={pdfZoom <= 0.5}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm min-w-[50px] text-center" style={{ color: T.ink600 }}>{Math.round(pdfZoom * 100)}%</span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPdfZoom(Math.min(2.5, pdfZoom + 0.25))} disabled={pdfZoom >= 2.5}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Badge variant="outline" className="text-[10px]" style={{ background: T.gold50, color: T.gold600, borderColor: T.gold500 }}>
                  PDF Preview
                </Badge>
              </div>
            </div>
          )}

          {/* ─── Main 3-pane layout ─── */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left — Variables */}
            <aside
              className="hidden lg:flex w-64 shrink-0 flex-col overflow-hidden"
              style={{ background: "#fff", borderRight: `1px solid ${T.borderSubtle}` }}
            >
              {variablesPanel}
            </aside>

            {/* Center — Canvas (edit / preview share the live editor; pdf mode renders the canvas) */}
            <main className="flex-1 overflow-y-auto" style={{ background: T.cream100 }}>
              {viewMode === "pdf" ? (
                <div className="flex flex-col items-center py-6">
                  {pdfLoading ? (
                    <div className="flex flex-col items-center gap-3 py-20">
                      <Loader2 className="h-8 w-8 animate-spin" style={{ color: T.gold600 }} />
                      <p className="text-sm" style={{ color: T.ink600 }}>Generating PDF...</p>
                      <p className="text-xs" style={{ color: T.ink400 }}>This may take a few seconds</p>
                    </div>
                  ) : pdfError ? (
                    <div className="flex flex-col items-center gap-3 py-20 max-w-md text-center">
                      <AlertTriangle className="h-8 w-8 text-status-amber" />
                      <p className="text-sm font-medium" style={{ color: T.ink900 }}>PDF Generation Error</p>
                      <p className="text-xs" style={{ color: T.ink600 }}>{pdfError}</p>
                      <Button variant="outline" size="sm" onClick={handleGeneratePreview} className="mt-2">
                        Try Again
                      </Button>
                    </div>
                  ) : !pdfUrl ? (
                    <div className="flex flex-col items-center gap-3 py-20">
                      <FileText className="h-8 w-8" style={{ color: T.ink400 }} />
                      <p className="text-sm" style={{ color: T.ink600 }}>No PDF generated yet. Use "Export PDF" to generate one.</p>
                      <Button variant="outline" size="sm" onClick={handleGeneratePreview}>
                        Generate PDF
                      </Button>
                    </div>
                  ) : (
                    <div className="shadow-lg rounded-lg overflow-hidden" style={{ border: `1px solid ${T.borderSubtle}`, background: T.cream100 }}>
                      <canvas ref={pdfCanvasRef} className="block" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 px-6">
                  {/* Preview-mode banner */}
                  {viewMode === "preview" && (
                    <div
                      className="mx-auto mb-4 flex items-center justify-between px-4 py-2 rounded-md text-xs"
                      style={{
                        maxWidth: 780,
                        background: T.gold50,
                        border: `1px solid ${T.gold500}`,
                        color: T.gold600,
                      }}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Eye size={14} />
                        Preview — this is exactly what the signer will see. Placeholders are replaced with their values.
                      </span>
                      <button
                        onClick={() => setViewMode("edit")}
                        className="font-medium underline hover:no-underline"
                      >
                        Back to edit
                      </button>
                    </div>
                  )}

                  <div
                    className="mx-auto rounded-sm"
                    style={{
                      maxWidth: 780,
                      minHeight: 880,
                      background: "#fff",
                      border: `1px solid ${T.borderSubtle}`,
                      boxShadow: "0 2px 12px rgba(11,31,58,0.06)",
                    }}
                  >
                    {/* Letterhead preview */}
                    {showHeaderFooter && organization && (
                      <div
                        className="flex items-center justify-between px-12 pt-10 pb-6"
                        style={{ borderBottom: `1px solid ${T.borderSubtle}` }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {organization.company_logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={organization.company_logo_url}
                              alt={`${organization.name || "Company"} logo`}
                              className="h-10 w-auto max-w-[60px] object-contain flex-shrink-0 rounded"
                            />
                          ) : (
                            <div
                              className="h-10 w-10 rounded flex items-center justify-center shrink-0"
                              style={{ background: T.navy950 }}
                            >
                              <span className="text-xs font-semibold" style={{ color: T.gold500 }}>
                                {(organization.name || "DL").slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight truncate" style={{ color: T.navy950 }}>
                              {organization.name || "MyZipVault"}
                            </p>
                            <p className="text-[11px] leading-tight truncate" style={{ color: T.ink400 }}>
                              {organization.company_email || organization.company_phone || ""}
                            </p>
                          </div>
                        </div>
                        <span
                          className="text-[11px] font-mono px-2 py-1 rounded shrink-0 ml-2"
                          style={{ background: T.cream100, color: T.ink600 }}
                        >
                          {placeholderValues.current_date || new Date().toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {/* Editor content — editable in edit mode, read-only in preview mode */}
                    <EditorContent editor={editor} className="tiptap-editor" />

                    {/* Footer preview */}
                    {showHeaderFooter && (
                      <div
                        className="px-12 pt-3 pb-6 mt-2"
                        style={{ borderTop: `1px solid ${T.borderSubtle}` }}
                      >
                        <p className="text-[10px] text-center leading-snug" style={{ color: T.ink400 }}>
                          © {new Date().getFullYear()} {organization?.name || "MyZipVault"}. All rights reserved. This is a legally binding document.
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[9px] flex-1 text-center" style={{ color: T.ink400 }}>
                            Powered by VaultSign
                          </p>
                          <p className="text-[10px] italic shrink-0" style={{ color: T.ink400 }}>
                            Page 1
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>

            {/* Right — Signers */}
            <aside
              className="hidden lg:flex w-72 shrink-0 flex-col overflow-hidden"
              style={{ background: "#fff", borderLeft: `1px solid ${T.borderSubtle}` }}
            >
              {signersPanel}
            </aside>
          </div>

          {/* ─── Mobile sheets ─── */}
          <Sheet open={showVariablesPanel} onOpenChange={setShowVariablesPanel}>
            <SheetContent side="left" className="w-80 p-0 flex flex-col">
              <SheetHeader className="p-4 border-b" style={{ borderColor: T.borderSubtle }}>
                <SheetTitle className="flex items-center gap-2 text-sm">
                  <Variable className="h-4 w-4" style={{ color: T.gold600 }} /> Variables
                </SheetTitle>
                <SheetDescription className="text-xs">Click to insert at cursor</SheetDescription>
              </SheetHeader>
              {variablesPanel}
            </SheetContent>
          </Sheet>

          <Sheet open={showSignersPanel} onOpenChange={setShowSignersPanel}>
            <SheetContent side="right" className="w-80 p-0 flex flex-col">
              <SheetHeader className="p-4 border-b" style={{ borderColor: T.borderSubtle }}>
                <SheetTitle className="text-sm">Signers & Fields</SheetTitle>
              </SheetHeader>
              {signersPanel}
            </SheetContent>
          </Sheet>

          {/* ─── Delete dialog ─── */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#A0392E]">
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

          {/* ─── Save as template dialog ─── */}
          <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Save as Template</DialogTitle>
              </DialogHeader>
              <p className="text-sm" style={{ color: T.ink600 }}>Save this document as a reusable template for your company.</p>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name"
                className="mt-2"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Cancel</Button>
                <Button
                  style={{ background: T.navy950, color: "#fff" }}
                  onClick={handleSaveAsTemplate}
                  disabled={savingTemplate}
                >
                  {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  Save Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ─── TipTap editor styles ─── */}
          <style jsx global>{`
            .tiptap-editor .tiptap {
              outline: none;
              min-height: 500px;
              padding: 32px 48px;
              color: ${T.ink900};
              font-size: 15px;
              line-height: 1.7;
            }
            .tiptap-editor .tiptap p {
              margin-bottom: 0.6em;
            }
            .tiptap-editor .tiptap h1 {
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 1.875rem;
              font-weight: 600;
              color: ${T.navy950};
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              line-height: 1.2;
            }
            .tiptap-editor .tiptap h2 {
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 1.4rem;
              font-weight: 600;
              color: ${T.navy950};
              margin-top: 1.2em;
              margin-bottom: 0.4em;
            }
            .tiptap-editor .tiptap h3 {
              font-size: 1.15rem;
              font-weight: 600;
              color: ${T.ink900};
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
            .tiptap-editor .tiptap li { margin-bottom: 0.2em; }
            .tiptap-editor .tiptap table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            .tiptap-editor .tiptap table td,
            .tiptap-editor .tiptap table th {
              border: 1px solid ${T.borderSubtle};
              padding: 8px;
              min-width: 60px;
            }
            .tiptap-editor .tiptap table th {
              background: ${T.cream100};
              font-weight: 600;
              color: ${T.navy950};
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
              color: ${T.ink400};
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
            /* Page break */
            .tiptap-editor .tiptap hr.page-break,
            .tiptap-editor .tiptap hr[data-page-break] {
              border: none;
              margin: 0;
              padding: 24px 0;
              position: relative;
              min-height: 56px;
              background: linear-gradient(to bottom,
                #ffffff 0%, #ffffff 38%,
                ${T.borderSubtle} 38%, ${T.borderSubtle} 40%,
                #ffffff 40%, #ffffff 60%,
                ${T.borderSubtle} 60%, ${T.borderSubtle} 62%,
                #ffffff 62%, #ffffff 100%);
            }
            .tiptap-editor .tiptap hr.page-break::before,
            .tiptap-editor .tiptap hr[data-page-break]::before {
              content: "PAGE BREAK";
              position: absolute;
              top: 50%; left: 50%;
              transform: translate(-50%, -50%);
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 2px;
              color: ${T.gold600};
              background: ${T.gold50};
              border: 1px solid ${T.gold500};
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

"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, ArrowRight, ArrowLeft, GripVertical,
  Plus, X, Loader2, FileSignature, Check,
  ChevronLeft, ChevronRight, Trash2, MinusIcon, AlertCircle,
  Save, Type, Highlighter, Square,
  Bold, Italic, Underline,
  Paintbrush, Eraser, MousePointer2, Undo2, Redo2, Baseline,
  ZoomIn, ZoomOut,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import * as PDFLib from "pdf-lib";

// ─── Types ──────────────────────────────────────────────────────────
interface SignerForm {
  name: string;
  email: string;
  role: string;
  party_number: number;
  signing_order_position: number;
}

interface SignField {
  id: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  assigned_to_signer_id: string;
  label: string;
  required: boolean;
  value: string | null;
}

type EditorTool = "select" | "text" | "edit-text" | "highlight" | "whiteout" | "draw" | "eraser";

interface TextItem {
  id: string;
  text: string;
  left: string;    // CSS left percentage string, e.g. "12.34%"
  top: string;     // CSS top percentage string, e.g. "5.67%"
  fontHeight: string;  // CSS --font-height value (px at scale=1)
  scaleX: string;  // CSS --scale-x value
  rotate: string;  // CSS --rotate value (deg)
  fontFamily: string;
  origFontName: string;  // Original PDF font name for mapping
  width: number;    // text width in PDF points (from item.width at scale=1)
  viewportWidth: number;   // PDF page width in points at scale=1
  viewportHeight: number;  // PDF page height in points at scale=1
  bold: boolean;     // Whether the original font is bold
  italic: boolean;   // Whether the original font is italic
  underline: boolean; // Whether the text has underline styling
}

interface TextAnnotation {
  id: string;
  page: number;
  x: number;       // percentage position (0-100)
  y: number;       // percentage position (0-100)
  width: number;   // percentage width (0-100)
  height: number;  // percentage height (0-100)
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  type: "text" | "highlight" | "whiteout";
}

// ─── Constants ──────────────────────────────────────────────────────
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

const fieldTypes = [
  { type: "signature", label: "Signature", icon: "\u270D\uFE0F" },
  { type: "date", label: "Date Signed", icon: "\uD83D\uDCC5" },
  { type: "full_name", label: "Full Name", icon: "\uD83C\uDD00" },
  { type: "initials", label: "Initials", icon: "\uD83D\uDCDD" },
  { type: "email", label: "Email", icon: "\u2709\uFE0F" },
  { type: "text", label: "Text Field", icon: "\uD83D\uDCCB" },
  { type: "checkbox", label: "Checkbox", icon: "\u2611\uFE0F" },
];

const partyColors = ["#166534", "#0D9488", "#7C3AED", "#D97706"];
const roleOptions = ["Candidate", "Client Employer", "Witness", "Recruiter"];
const zoomLevels = [50, 75, 100, 125, 150, 200];

const annotationFontFamilies = [
  { value: "Arial", label: "Arial" },
  { value: "Arial Narrow", label: "Arial Narrow" },
  { value: "Calibri", label: "Calibri", alt: "Carlito" },
  { value: "Cambria", label: "Cambria", alt: "Caladea" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
  { value: "Verdana", label: "Verdana" },
  { value: "Tahoma", label: "Tahoma" },
  { value: "Segoe UI", label: "Segoe UI", alt: "Selawik" },
  { value: "Georgia", label: "Georgia" },
  { value: "Garamond", label: "Garamond", alt: "EB Garamond" },
  { value: "Bahnschrift", label: "Bahnschrift" },
  { value: "Franklin Gothic", label: "Franklin Gothic", alt: "Liberty Sans" },
  { value: "Century Gothic", label: "Century Gothic", alt: "Arimo" },
  { value: "Trebuchet MS", label: "Trebuchet MS", alt: "Fira Sans" },
  { value: "Palatino Linotype", label: "Palatino Linotype", alt: "PT Serif" },
  { value: "Consolas", label: "Consolas" },
  { value: "Lucida Sans Unicode", label: "Lucida Sans Unicode" },
  { value: "Impact", label: "Impact" },
  { value: "Book Antiqua", label: "Book Antiqua", alt: "PT Serif Caption" },
  { value: "Helvetica", label: "Helvetica" },
];

const annotationFontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

// ─── CSS Font Stack Mapping (Sejda-style fallbacks) ─────────────────
// Maps commercial font names to CSS font stacks with open-source equivalents.
// The stored annotation value uses the commercial name (e.g., "Calibri")
// so the PDF save function can map it to the correct pdf-lib StandardFont.
// But CSS rendering needs fallbacks for non-Windows systems.
const cssFontStacks: Record<string, string> = {
  "Arial": "'Arial', 'Liberation Sans', 'Helvetica', sans-serif",
  "Arial Narrow": "'Arial Narrow', 'Liberation Sans Narrow', 'Helvetica Narrow', sans-serif",
  "Calibri": "'Calibri', 'Carlito', 'Liberation Sans', sans-serif",
  "Cambria": "'Cambria', 'Caladea', 'Liberation Serif', serif",
  "Times New Roman": "'Times New Roman', 'Tinos', 'Liberation Serif', serif",
  "Courier New": "'Courier New', 'Cousine', 'Liberation Mono', monospace",
  "Verdana": "'Verdana', 'DejaVu Sans', 'Liberation Sans', sans-serif",
  "Tahoma": "'Tahoma', 'Liberation Sans', 'DejaVu Sans', sans-serif",
  "Segoe UI": "'Segoe UI', 'Selawik', 'Liberation Sans', sans-serif",
  "Georgia": "'Georgia', 'DejaVu Serif', 'Liberation Serif', serif",
  "Garamond": "'Garamond', 'EB Garamond', 'Liberation Serif', serif",
  "Bahnschrift": "'Bahnschrift', 'Liberation Sans', 'Carlito', sans-serif",
  "Franklin Gothic": "'Franklin Gothic', 'Liberation Sans', 'Carlito', sans-serif",
  "Century Gothic": "'Century Gothic', 'Arimo', sans-serif",
  "Trebuchet MS": "'Trebuchet MS', 'Fira Sans', 'Liberation Sans', sans-serif",
  "Palatino Linotype": "'Palatino Linotype', 'PT Serif', 'P052', 'Liberation Serif', serif",
  "Consolas": "'Consolas', 'Cousine', 'Liberation Mono', monospace",
  "Lucida Sans Unicode": "'Lucida Sans Unicode', 'DejaVu Sans', 'Liberation Sans', sans-serif",
  "Impact": "'Impact', 'Liberation Sans', sans-serif",
  "Book Antiqua": "'Book Antiqua', 'PT Serif Caption', 'P052', 'Liberation Serif', serif",
  "Helvetica": "'Helvetica', 'Liberation Sans', 'Arial', sans-serif",
};

/**
 * Returns a CSS font-family string with proper fallbacks for the given font name.
 * If the font name is not in our mapping (e.g., a PDF internal font name like "g_d0_f1"),
 * it falls back to a generic family based on heuristic matching.
 */
function getCssFontStack(fontName: string): string {
  // Direct lookup in our mapping
  if (cssFontStacks[fontName]) return cssFontStacks[fontName];

  // Heuristic: try to match PDF internal names or partial names
  const lower = fontName.toLowerCase();
  for (const [key, stack] of Object.entries(cssFontStacks)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return stack;
    }
  }

  // Heuristic: serif/sans-serif/mono based on common PDF font name patterns
  if (lower.includes("serif") || lower.includes("roman") || lower.includes("times") || lower.includes("garamond") || lower.includes("palatino")) {
    return "'Liberation Serif', 'Times New Roman', serif";
  }
  if (lower.includes("mono") || lower.includes("courier") || lower.includes("consol") || lower.includes("code")) {
    return "'Liberation Mono', 'Courier New', monospace";
  }
  // Default: sans-serif
  return "'Liberation Sans', 'Helvetica', 'Arial', sans-serif";
}

/**
 * Maps PDF internal font names (e.g., "ArialMT", "g_d0_f1", "TimesNewRomanPSMT")
 * to one of our known annotation font families. This is used when extracting
 * text from PDFs so that the edit-text tool and save function can work correctly.
 */
function mapPdfFontToAnnotationFont(pdfFontName: string): string {
  if (!pdfFontName) return "Helvetica";

  // Direct match
  const knownFonts = annotationFontFamilies.map(f => f.value);
  if (knownFonts.includes(pdfFontName)) return pdfFontName;

  // Common PDF font name patterns
  const lower = pdfFontName.toLowerCase();

  // Arial variants: ArialMT, Arial-BoldMT, Arial-ItalicMT, ArialNarrow, etc.
  if (lower.startsWith("arial")) {
    if (lower.includes("narrow")) return "Arial Narrow";
    return "Arial";
  }
  // Times variants: TimesNewRomanPSMT, Times-Roman, TimesNewRomanPS-BoldMT
  if (lower.includes("times") || lower === "timesnewromanpsmt" || lower === "times-roman") {
    return "Times New Roman";
  }
  // Courier variants: CourierNewPSMT, Courier
  if (lower.includes("courier")) return "Courier New";
  // Helvetica variants: Helvetica, Helvetica-Bold, HelveticaNeue
  if (lower.includes("helvetica") || lower === "arialunicodems") return "Helvetica";
  // Calibri variants: Calibri, Calibri-Bold
  if (lower.includes("calibri") || lower.includes("carlito")) return "Calibri";
  // Cambria variants
  if (lower.includes("cambria") || lower.includes("caladea")) return "Cambria";
  // Verdana
  if (lower.includes("verdana")) return "Verdana";
  // Tahoma
  if (lower.includes("tahoma")) return "Tahoma";
  // Segoe UI
  if (lower.includes("segoe")) return "Segoe UI";
  // Georgia
  if (lower.includes("georgia")) return "Georgia";
  // Garamond / EB Garamond
  if (lower.includes("garamond")) return "Garamond";
  // Consolas
  if (lower.includes("consolas")) return "Consolas";
  // Impact
  if (lower.includes("impact")) return "Impact";
  // Century Gothic
  if (lower.includes("century") && lower.includes("gothic")) return "Century Gothic";
  // Trebuchet
  if (lower.includes("trebuchet")) return "Trebuchet MS";
  // Palatino
  if (lower.includes("palatino")) return "Palatino Linotype";
  // Book Antiqua
  if (lower.includes("book") && lower.includes("antiqua")) return "Book Antiqua";
  // Lucida
  if (lower.includes("lucida")) return "Lucida Sans Unicode";
  // Bahnschrift
  if (lower.includes("bahnschrift")) return "Bahnschrift";
  // Franklin Gothic
  if (lower.includes("franklin")) return "Franklin Gothic";
  // DejaVu Serif (common Linux PDF font)
  if (lower.includes("dejavu") && lower.includes("serif")) return "Georgia";
  // DejaVu Sans
  if (lower.includes("dejavu") && lower.includes("sans")) return "Verdana";
  // Liberation Serif
  if (lower.includes("liberation") && lower.includes("serif")) return "Times New Roman";
  // Liberation Sans
  if (lower.includes("liberation") && lower.includes("sans")) return "Arial";
  // Liberation Mono
  if (lower.includes("liberation") && lower.includes("mono")) return "Courier New";
  // Noto Serif
  if (lower.includes("noto") && lower.includes("serif")) return "Georgia";
  // Noto Sans
  if (lower.includes("noto") && lower.includes("sans")) return "Arial";
  // Symbol / ZapfDingbats (not real text fonts)
  if (lower.includes("symbol") || lower.includes("zapf")) return "Helvetica";

  // Generic serif/sans/mono heuristics
  if (lower.includes("serif") || lower.includes("roman")) return "Times New Roman";
  if (lower.includes("mono") || lower.includes("courier") || lower.includes("code")) return "Courier New";

  // Default: sans-serif
  return "Helvetica";
}

interface ModifiedTextItem {
  textItemId: string;
  page: number;
  originalText: string;
  newText: string;
  fontFamily: string;
  fontSize: number;  // in PDF points (from fontHeight)
  bold: boolean;
  italic: boolean;
  color: string;  // usually "#000000"
  // Position data for save
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

const toolHints: Record<EditorTool, string> = {
  select: "Click an annotation to select it. Drag to move. Double-click text to edit.",
  text: "Click on the document to add a text annotation.",
  "edit-text": "Click on any highlighted text area to edit it. Press Escape when done.",
  highlight: "Click and drag on the document to create a highlight.",
  whiteout: "Click and drag on the document to white out content.",
  draw: "Draw freehand on the document with your mouse.",
  eraser: "Click and drag to erase freehand drawings.",
};

// ─── Save Edited PDF (pdf-lib only, NO html2canvas) ────────────────
async function saveEditedPdf(
  originalPdfBytes: Uint8Array,
  annotations: TextAnnotation[],
  drawings: Map<number, string>,
  modifiedTextItems: Map<string, ModifiedTextItem>,
): Promise<Uint8Array> {
  const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();

  // Pre-embed all needed standard fonts
  const fontCache: Record<string, PDFLib.PDFFont> = {};
  const getFont = async (name: PDFLib.StandardFonts) => {
    if (!fontCache[name]) {
      fontCache[name] = await pdfDoc.embedFont(name);
    }
    return fontCache[name];
  };

  // Map CSS fontFamily to pdf-lib StandardFonts
  function getStandardFont(ff: string, bold: boolean, italic: boolean): PDFLib.StandardFonts {
    const sansSerifFonts = ["Arial", "Helvetica", "Tahoma", "Verdana", "Segoe UI", "Calibri",
      "Century Gothic", "Franklin Gothic", "Bahnschrift", "Arial Narrow", "Trebuchet MS", "Impact"];
    const serifFonts = ["Times New Roman", "Cambria", "Garamond", "Palatino Linotype",
      "Book Antiqua", "Georgia"];
    const monoFonts = ["Courier New", "Consolas", "Lucida Sans Unicode"];

    if (serifFonts.includes(ff)) {
      if (bold && italic) return PDFLib.StandardFonts.TimesRomanBoldItalic;
      if (bold) return PDFLib.StandardFonts.TimesRomanBold;
      if (italic) return PDFLib.StandardFonts.TimesRomanItalic;
      return PDFLib.StandardFonts.TimesRoman;
    }
    if (monoFonts.includes(ff)) {
      if (bold && italic) return PDFLib.StandardFonts.CourierBoldOblique;
      if (bold) return PDFLib.StandardFonts.CourierBold;
      if (italic) return PDFLib.StandardFonts.CourierOblique;
      return PDFLib.StandardFonts.Courier;
    }
    // Default: sans-serif (Helvetica)
    if (bold && italic) return PDFLib.StandardFonts.HelveticaBoldOblique;
    if (bold) return PDFLib.StandardFonts.HelveticaBold;
    if (italic) return PDFLib.StandardFonts.HelveticaOblique;
    return PDFLib.StandardFonts.Helvetica;
  }

  // 1. Apply whiteout rectangles
  for (const ann of annotations.filter(a => a.type === "whiteout")) {
    const pageIndex = ann.page - 1;
    if (pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const { width: pw, height: ph } = page.getSize();
    page.drawRectangle({
      x: (ann.x / 100) * pw,
      y: ph - ((ann.y / 100) * ph) - ((ann.height / 100) * ph),
      width: (ann.width / 100) * pw,
      height: (ann.height / 100) * ph,
      color: PDFLib.rgb(1, 1, 1),
    });
  }

  // 1.5 Apply modified text items (cover original + draw new text)
  for (const [id, mod] of modifiedTextItems) {
    const pageIndex = mod.page - 1;
    if (pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const { width: pw, height: ph } = page.getSize();

    // Cover the original text with a white rectangle
    page.drawRectangle({
      x: (mod.leftPct / 100) * pw,
      y: ph - ((mod.topPct / 100) * ph) - ((mod.heightPct / 100) * ph),
      width: (mod.widthPct / 100) * pw,
      height: (mod.heightPct / 100) * ph,
      color: PDFLib.rgb(1, 1, 1),
    });

    // Draw the new text
    const standardFontName = getStandardFont(mod.fontFamily, mod.bold, mod.italic);
    const font = await getFont(standardFontName);
    const x = (mod.leftPct / 100) * pw;
    const y = ph - ((mod.topPct / 100) * ph) - (mod.fontSize * 0.6);

    page.drawText(mod.newText, {
      x,
      y,
      size: mod.fontSize,
      font,
      color: PDFLib.rgb(
        parseInt(mod.color.slice(1, 3), 16) / 255,
        parseInt(mod.color.slice(3, 5), 16) / 255,
        parseInt(mod.color.slice(5, 7), 16) / 255,
      ),
    });
  }

  // 2. Apply highlights
  for (const ann of annotations.filter(a => a.type === "highlight")) {
    const pageIndex = ann.page - 1;
    if (pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const { width: pw, height: ph } = page.getSize();
    page.drawRectangle({
      x: (ann.x / 100) * pw,
      y: ph - ((ann.y / 100) * ph) - ((ann.height / 100) * ph),
      width: (ann.width / 100) * pw,
      height: (ann.height / 100) * ph,
      color: PDFLib.rgb(1, 0.94, 0),
      opacity: 0.3,
    });
  }

  // 3. Apply text annotations
  for (const ann of annotations.filter(a => a.type === "text")) {
    const pageIndex = ann.page - 1;
    if (pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const { width: pw, height: ph } = page.getSize();

    const standardFontName = getStandardFont(ann.fontFamily, ann.bold, ann.italic);
    const font = await getFont(standardFontName);

    const x = (ann.x / 100) * pw;
    const y = ph - ((ann.y / 100) * ph) - (ann.fontSize * 0.8);

    const lines = (ann.text || "").split("\n");
    const lineHeight = ann.fontSize * 1.3;
    lines.forEach((line, i) => {
      if (line.trim()) {
        page.drawText(line, {
          x,
          y: y - i * lineHeight,
          size: ann.fontSize,
          font,
          color: PDFLib.rgb(
            parseInt(ann.color.slice(1, 3), 16) / 255,
            parseInt(ann.color.slice(3, 5), 16) / 255,
            parseInt(ann.color.slice(5, 7), 16) / 255,
          ),
        });
      }
    });
  }

  // 4. Embed drawings
  for (const [pageNum, dataUrl] of drawings) {
    const pageIndex = pageNum - 1;
    if (pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const { width: pw, height: ph } = page.getSize();

    try {
      const base64 = dataUrl.split(",")[1];
      const pngBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const pngImage = await pdfDoc.embedPng(pngBytes);
      page.drawImage(pngImage, { x: 0, y: 0, width: pw, height: ph });
    } catch (e) {
      console.error(`Failed to embed drawing on page ${pageNum}:`, e);
    }
  }

  return pdfDoc.save();
}

// ─── PdfPageView Component ──────────────────────────────────────────
function PdfPageView({
  pageNum,
  pageImage,
  pageWidth,
  pageHeight,
  activeTool,
  annotations,
  selectedAnnotation,
  onSelectAnnotation,
  onMoveAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
  onAddAnnotationAt,
  onDrawingEnd,
  drawingDataUrl,
  textItems,
  editorZoom,
  modifiedTextItems,
  onModifyTextItem,
  onModifyTextItemCancel,
  editingTextItem,
  onUpdateEditingText,
  onEditingTextItemChange,
}: {
  pageNum: number;
  pageImage: string;
  pageWidth: number;
  pageHeight: number;
  activeTool: EditorTool;
  annotations: TextAnnotation[];
  selectedAnnotation: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onMoveAnnotation: (id: string, x: number, y: number) => void;
  onRemoveAnnotation: (id: string) => void;
  onUpdateAnnotation: (id: string, updates: Partial<TextAnnotation>) => void;
  onAddAnnotationAt: (page: number, xPct: number, yPct: number) => void;
  onDrawingEnd: (pageNum: number, dataUrl: string) => void;
  drawingDataUrl: string | undefined;
  textItems: TextItem[];
  editorZoom: number;
  modifiedTextItems: Map<string, ModifiedTextItem>;
  onModifyTextItem: (mod: ModifiedTextItem) => void;
  onModifyTextItemCancel: (textItemId: string) => void;
  editingTextItem: TextItem | null;
  onUpdateEditingText: (updates: { fontFamily?: string; fontSize?: number; bold?: boolean; italic?: boolean; underline?: boolean }) => void;
  onEditingTextItemChange: (item: TextItem | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; annX: number; annY: number; annWidth: number; annHeight: number } | null>(null);
  const [draggingAnnId, setDraggingAnnId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);
  const [rectCurrent, setRectCurrent] = useState<{ x: number; y: number } | null>(null);
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [editingTextItemId, setEditingTextItemId] = useState<string | null>(null);
  // Track the initial text when editing starts, so React children don't overwrite user edits
  const editingInitialTextRef = useRef<string>("");

  // Auto-focus the contentEditable text item when editing starts
  useEffect(() => {
    if (editingTextItemId) {
      const timer = setTimeout(() => {
        const el = document.querySelector(`[data-text-item-id="${editingTextItemId}"]`) as HTMLElement;
        if (el) {
          el.focus();
          // Select all text when entering edit mode (Sejda behavior)
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [editingTextItemId]);

  // Initialize / size the drawing canvas
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    // If we have existing drawing data, restore it
    if (drawingDataUrl) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, pageWidth, pageHeight);
      };
      img.src = drawingDataUrl;
    }
  }, [pageWidth, pageHeight, drawingDataUrl]);

  // Click handler for adding annotations
  const handlePageClick = useCallback((e: React.MouseEvent<HTMLDivElement | HTMLCanvasElement>) => {
    if (activeTool === "select") return;
    if (activeTool === "draw" || activeTool === "eraser") return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === "text") {
      onAddAnnotationAt(pageNum, xPct, yPct);
    }
  }, [activeTool, pageNum, onAddAnnotationAt]);

  // Mouse down for highlight/whiteout drag
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement | HTMLCanvasElement>) => {
    if (activeTool !== "highlight" && activeTool !== "whiteout" && activeTool !== "draw" && activeTool !== "eraser") return;
    const container = e.currentTarget;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === "highlight" || activeTool === "whiteout") {
      setRectStart({ x: xPct, y: yPct });
      setRectCurrent({ x: xPct, y: yPct });
    }

    if (activeTool === "draw" || activeTool === "eraser") {
      setIsDrawing(true);
      isDrawingRef.current = true;
      const canvas = drawCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(px, py);
      if (activeTool === "draw") {
        ctx.strokeStyle = "#DC2626";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      } else {
        ctx.strokeStyle = "rgba(255,255,255,1)";
        ctx.lineWidth = 20;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = "destination-out";
      }
    }
  }, [activeTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement | HTMLCanvasElement>) => {
    // Handle highlight/whiteout rectangle drawing
    if (rectStart && (activeTool === "highlight" || activeTool === "whiteout")) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;
      setRectCurrent({ x: xPct, y: yPct });
    }

    // Handle freehand drawing
    if (isDrawingRef.current && (activeTool === "draw" || activeTool === "eraser")) {
      const canvas = drawCanvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      ctx.lineTo(px, py);
      ctx.stroke();
    }
  }, [rectStart, activeTool]);

  const handleMouseUp = useCallback(() => {
    // Finish highlight/whiteout rectangle
    if (rectStart && rectCurrent && (activeTool === "highlight" || activeTool === "whiteout")) {
      const x = Math.min(rectStart.x, rectCurrent.x);
      const y = Math.min(rectStart.y, rectCurrent.y);
      const width = Math.abs(rectCurrent.x - rectStart.x);
      const height = Math.abs(rectCurrent.y - rectStart.y);
      if (width > 1 && height > 1) {
        onAddAnnotationAt(pageNum, x, y);
        // The onAddAnnotationAt will create based on activeTool type
      }
      setRectStart(null);
      setRectCurrent(null);
    }

    // Finish freehand drawing
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      setIsDrawing(false);
      const canvas = drawCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.globalCompositeOperation = "source-over";
        const dataUrl = canvas.toDataURL("image/png");
        onDrawingEnd(pageNum, dataUrl);
      }
    }
  }, [rectStart, rectCurrent, activeTool, pageNum, onAddAnnotationAt, onDrawingEnd]);

  // Drag annotation handlers
  const handleAnnMouseDown = useCallback((e: React.MouseEvent, ann: TextAnnotation) => {
    if (activeTool !== "select") return;
    e.stopPropagation();
    e.preventDefault();
    onSelectAnnotation(ann.id);
    setDraggingAnnId(ann.id);
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      annX: ann.x,
      annY: ann.y,
      annWidth: ann.width,
      annHeight: ann.height,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      const dx = ev.clientX - dragStartRef.current.startX;
      const dy = ev.clientY - dragStartRef.current.startY;
      const dxPct = (dx / cRect.width) * 100;
      const dyPct = (dy / cRect.height) * 100;
      const newX = Math.max(0, Math.min(100 - dragStartRef.current.annWidth, dragStartRef.current.annX + dxPct));
      const newY = Math.max(0, Math.min(100 - dragStartRef.current.annHeight, dragStartRef.current.annY + dyPct));
      onMoveAnnotation(ann.id, Math.round(newX * 10) / 10, Math.round(newY * 10) / 10);
    };

    const handleMouseUp = () => {
      setDraggingAnnId(null);
      dragStartRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [activeTool, onSelectAnnotation, onMoveAnnotation]);

  // Compute the rectangle preview for highlight/whiteout
  const rectPreview = rectStart && rectCurrent ? {
    x: Math.min(rectStart.x, rectCurrent.x),
    y: Math.min(rectStart.y, rectCurrent.y),
    width: Math.abs(rectCurrent.x - rectStart.x),
    height: Math.abs(rectCurrent.y - rectStart.y),
  } : null;

  const pageAnnotations = annotations.filter(a => a.page === pageNum);

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-[#6B7280] mb-2 font-medium">Page {pageNum}</p>
      <div
        className="relative bg-white shadow-[0_2px_12px_rgba(0,0,0,0.12)]"
        style={{ width: pageWidth, height: pageHeight }}
      >
        {/* Background PDF image */}
        <img
          src={pageImage}
          alt={`Page ${pageNum}`}
          className="absolute top-0 left-0 block"
          style={{ width: pageWidth, height: pageHeight }}
          draggable={false}
        />

        {/* Drawing canvas overlay */}
        <canvas
          ref={drawCanvasRef}
          className="absolute top-0 left-0"
          style={{
            width: pageWidth,
            height: pageHeight,
            pointerEvents: (activeTool === "draw" || activeTool === "eraser") ? "auto" : "none",
            cursor: (activeTool === "draw") ? "crosshair" : (activeTool === "eraser") ? "cell" : "default",
            zIndex: 5,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* ─── Sejda-style inline text editing ─────────────────────── */}
        {/* Each text item is a single element that becomes contentEditable when clicked.
            This is exactly how Sejda works: the SAME span transitions between display
            and edit mode. No separate overlay needed. */}
        {textItems.map((item) => {
          const isEditing = editingTextItemId === item.id;
          const modified = modifiedTextItems.get(item.id);
          const isModified = !!modified;

          // Position values for the onModifyTextItem callback
          const leftPct = parseFloat(item.left) || 0;
          const topPct = parseFloat(item.top) || 0;
          const fontHeightPx = parseFloat(item.fontHeight) || 12;
          const widthPct = item.width ? Math.max((item.width / item.viewportWidth) * 100, 2) : 2;
          const heightPct = Math.max((fontHeightPx / item.viewportHeight) * 100, 1);

          // Display scaling: PDF points → display pixels
          const fontHeightValue = parseFloat(item.fontHeight) || 12;
          const scaleXValue = parseFloat(item.scaleX) || 1;
          const rotateValue = item.rotate || "0deg";
          const displayScale = pageWidth / item.viewportWidth;
          const scaledFontSize = fontHeightValue * displayScale;

          // When actively editing, use the editingTextItem's font (from toolbar)
          const editingFontFamily = isEditing && editingTextItem ? editingTextItem.fontFamily : undefined;
          const editingFontHeight = isEditing && editingTextItem ? parseFloat(editingTextItem.fontHeight) || 0 : 0;

          // Display values: editing > modified > original
          const displayFontFamily = editingFontFamily || modified?.fontFamily || item.fontFamily;
          const displayFontSize = isEditing
            ? (editingFontHeight > 0 ? editingFontHeight * displayScale : scaledFontSize)
            : (modified ? modified.fontSize * displayScale : scaledFontSize);

          // Bold/Italic/Underline: editing > modified > original
          const displayBold = isEditing && editingTextItem ? editingTextItem.bold : (modified?.bold ?? item.bold);
          const displayItalic = isEditing && editingTextItem ? editingTextItem.italic : (modified?.italic ?? item.italic);
          const displayUnderline = isEditing && editingTextItem ? editingTextItem.underline : (modified ? false : item.underline);

          // When edited or editing: show text with white background to cover canvas text
          // When not edited: text is transparent so canvas text shows through, BUT the div
          // must contain actual text content to have proper width for the clickable area.
          // This is exactly how pdfjs TextLayer works: transparent text over canvas for selection.
          const showAsEdited = isModified || isEditing;
          const displayText = modified?.newText || item.text;

          // When edit-text tool is active, ALL text items need to be interactive.
          // When other tools are active, only modified items need pointer events.
          const isEditTextTool = activeTool === "edit-text";

          return (
            <div
              key={item.id}
              data-text-item-id={item.id}
              data-font-face={item.origFontName}
              className="absolute"
              contentEditable={isEditing}
              suppressContentEditableWarning
              style={{
                left: item.left,
                top: item.top,
                fontSize: `${displayFontSize}px`,
                fontFamily: getCssFontStack(displayFontFamily),
                fontWeight: displayBold ? "bold" : "normal",
                fontStyle: displayItalic ? "italic" : "normal",
                textDecoration: displayUnderline ? "underline" : "none",
                transform: `rotate(${rotateValue}) scaleX(${scaleXValue})`,
                transformOrigin: "0% 0%",
                // When editing/modified: black text on white bg to cover canvas text (Sejda style)
                // When not edited: transparent text — canvas text shows through, but div has
                // proper width because text content is still rendered (just invisible)
                color: showAsEdited ? (modified?.color || "#000000") : "transparent",
                backgroundColor: showAsEdited ? "white" : "transparent",
                zIndex: isEditing ? 20 : isModified ? 20 : (isEditTextTool ? 6 : 6),
                overflow: isEditing ? "visible" : "hidden",
                whiteSpace: "pre",
                cursor: isEditTextTool ? (isEditing ? "text" : "pointer") : "default",
                lineHeight: 1.2,
                // When edit-text tool is active, show ALL text items with a faint dashed outline
                // so the user can see where to click. On hover, the outline becomes solid blue.
                outline: isEditing ? "1px solid rgba(2, 130, 229, 0.5)"
                        : isModified ? "none"
                        : isEditTextTool ? "1px dashed rgba(2, 130, 229, 0.25)" : "none",
                outlineOffset: "2px",
                userSelect: isEditing ? "text" : "none",
                // All text items must be clickable when edit-text tool is active
                pointerEvents: isEditTextTool || isModified ? "auto" : "none",
                padding: "0 2px",
                minWidth: isEditing ? "20px" : undefined,
                caretColor: isEditing ? "#000000" : "transparent",
              } as React.CSSProperties}
              // Sejda-style hover: blue solid outline when text tool active
              onMouseEnter={(e) => {
                if (!isEditing && activeTool === "edit-text") {
                  e.currentTarget.style.outlineColor = "#0282e5";
                  e.currentTarget.style.outlineStyle = "solid";
                  e.currentTarget.style.backgroundColor = "rgba(2, 130, 229, 0.06)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isEditing && activeTool === "edit-text") {
                  e.currentTarget.style.outlineColor = "rgba(2, 130, 229, 0.25)";
                  e.currentTarget.style.outlineStyle = "dashed";
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
              onClick={(e) => {
                if (activeTool === "edit-text" && !isEditing) {
                  e.stopPropagation();
                  e.preventDefault();
                  editingInitialTextRef.current = displayText;
                  setEditingTextItemId(item.id);
                  onEditingTextItemChange(item);
                }
              }}
              onBlur={(e) => {
                if (!isEditing) return; // guard
                const newText = e.currentTarget.innerText.trim();
                const currentFontFamily = editingTextItem?.fontFamily || item.fontFamily;
                const currentFontSize = parseFloat(editingTextItem?.fontHeight || item.fontHeight) || fontHeightPx;
                const currentBold = editingTextItem?.bold ?? item.bold;
                const currentItalic = editingTextItem?.italic ?? item.italic;
                // Save if text changed OR font/size/style changed from original
                const fontChanged = currentFontFamily !== item.fontFamily || currentFontSize !== fontHeightPx || currentBold !== item.bold || currentItalic !== item.italic;
                if ((newText !== item.text || fontChanged) && newText !== "") {
                  onModifyTextItem({
                    textItemId: item.id,
                    page: pageNum,
                    originalText: item.text,
                    newText: newText || item.text,
                    fontFamily: currentFontFamily,
                    fontSize: currentFontSize,
                    bold: currentBold,
                    italic: currentItalic,
                    color: "#000000",
                    leftPct,
                    topPct,
                    widthPct,
                    heightPct,
                  });
                }
                setEditingTextItemId(null);
                onEditingTextItemChange(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingTextItemId(null);
                  onEditingTextItemChange(null);
                }
              }}
            >
              {/* When editing, use dangerouslySetInnerHTML to prevent React from
                  reconciling/overwriting the contentEditable DOM content on re-renders
                  (e.g., when the user changes font from the toolbar). When not editing,
                  use regular React children. */}
              {/* CRITICAL: Always render the text content so the div has proper width.
                  When not editing/modified, text is transparent (color: transparent) so the
                  canvas-rendered text shows through. This is how pdfjs TextLayer works — the
                  text layer has transparent text positioned exactly over the canvas for selection.
                  When editing, use dangerouslySetInnerHTML to prevent React from overwriting
                  user edits on re-renders (e.g., when font changes from toolbar). */}
              {isEditing
                ? <span dangerouslySetInnerHTML={{ __html: editingInitialTextRef.current }} />
                : displayText}
            </div>
          );
        })}

        {/* Empty text layer message */}
        {activeTool === "edit-text" && textItems.length === 0 && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-amber-800 text-xs font-medium shadow-sm z-20"
          >
            No editable text detected on this page.
          </div>
        )}

        {/* Annotation overlays */}
        {pageAnnotations.map((ann) => {
          const isSelected = selectedAnnotation === ann.id;
          const isEditing = editingAnnId === ann.id;

          if (ann.type === "highlight") {
            return (
              <div
                key={ann.id}
                className={`absolute ${activeTool === "select" ? "cursor-move" : "cursor-default"}`}
                style={{
                  left: `${ann.x}%`,
                  top: `${ann.y}%`,
                  width: `${ann.width}%`,
                  height: `${ann.height}%`,
                  backgroundColor: "rgba(250, 204, 21, 0.3)",
                  border: isSelected ? "2px solid #EAB308" : "1px dashed rgba(234, 179, 8, 0.5)",
                  zIndex: isSelected ? 12 : 8,
                }}
                onMouseDown={(e) => handleAnnMouseDown(e, ann)}
                onClick={(e) => { e.stopPropagation(); if (activeTool === "select") onSelectAnnotation(ann.id); }}
              >
                {isSelected && (
                  <button
                    className="absolute -top-2 -right-2 size-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center z-50"
                    onClick={(e) => { e.stopPropagation(); onRemoveAnnotation(ann.id); }}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            );
          }

          if (ann.type === "whiteout") {
            return (
              <div
                key={ann.id}
                className={`absolute ${activeTool === "select" ? "cursor-move" : "cursor-default"}`}
                style={{
                  left: `${ann.x}%`,
                  top: `${ann.y}%`,
                  width: `${ann.width}%`,
                  height: `${ann.height}%`,
                  backgroundColor: "white",
                  border: isSelected ? "2px solid #9CA3AF" : "1px solid rgba(156, 163, 175, 0.3)",
                  zIndex: isSelected ? 12 : 9,
                }}
                onMouseDown={(e) => handleAnnMouseDown(e, ann)}
                onClick={(e) => { e.stopPropagation(); if (activeTool === "select") onSelectAnnotation(ann.id); }}
              >
                {isSelected && (
                  <button
                    className="absolute -top-2 -right-2 size-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center z-50"
                    onClick={(e) => { e.stopPropagation(); onRemoveAnnotation(ann.id); }}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            );
          }

          // Text annotation
          // Scale font size from PDF points to display pixels for consistent rendering
          const viewportWForAnn = textItems[0]?.viewportWidth || pageWidth;
          const textAnnDisplayScale = pageWidth / viewportWForAnn;
          const textAnnScaledFontSize = ann.fontSize * textAnnDisplayScale;

          return (
            <div
              key={ann.id}
              className={`absolute ${activeTool === "select" ? "cursor-move" : "cursor-default"}`}
              style={{
                left: `${ann.x}%`,
                top: `${ann.y}%`,
                width: `${ann.width}%`,
                minHeight: `${ann.height}%`,
                zIndex: isSelected ? 12 : 10,
              }}
              onMouseDown={(e) => handleAnnMouseDown(e, ann)}
              onClick={(e) => { e.stopPropagation(); if (activeTool === "select") onSelectAnnotation(ann.id); }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (activeTool === "select") {
                  setEditingAnnId(ann.id);
                  onSelectAnnotation(ann.id);
                }
              }}
            >
              <div
                contentEditable={isEditing}
                suppressContentEditableWarning
                className="outline-none whitespace-pre-wrap break-words"
                style={{
                  fontSize: `${textAnnScaledFontSize}px`,
                  fontFamily: getCssFontStack(ann.fontFamily),
                  color: ann.color,
                  fontWeight: ann.bold ? "bold" : "normal",
                  fontStyle: ann.italic ? "italic" : "normal",
                  textDecoration: ann.underline ? "underline" : "none",
                  border: isSelected ? "2px solid #0D9488" : "1px dashed rgba(13, 148, 136, 0.3)",
                  borderRadius: "2px",
                  padding: "2px 4px",
                  backgroundColor: isSelected ? "rgba(13, 148, 136, 0.05)" : "transparent",
                  minWidth: "60px",
                }}
                onBlur={(e) => {
                  setEditingAnnId(null);
                  onUpdateAnnotation(ann.id, { text: e.currentTarget.innerText });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setEditingAnnId(null);
                    (e.target as HTMLElement).blur();
                  }
                }}
              >
                {ann.text || (isEditing ? "" : "Type here")}
              </div>
              {isSelected && !isEditing && (
                <button
                  className="absolute -top-2 -right-2 size-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center z-50"
                  onClick={(e) => { e.stopPropagation(); onRemoveAnnotation(ann.id); }}
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Rectangle preview for highlight/whiteout drag */}
        {rectPreview && (activeTool === "highlight" || activeTool === "whiteout") && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${rectPreview.x}%`,
              top: `${rectPreview.y}%`,
              width: `${rectPreview.width}%`,
              height: `${rectPreview.height}%`,
              backgroundColor: activeTool === "highlight" ? "rgba(250, 204, 21, 0.3)" : "rgba(255, 255, 255, 0.8)",
              border: activeTool === "highlight" ? "2px dashed #EAB308" : "2px dashed #9CA3AF",
              zIndex: 15,
            }}
          />
        )}

        {/* Click overlay for text/highlight/whiteout tools */}
        {(activeTool === "text" || activeTool === "highlight" || activeTool === "whiteout") && (
          <div
            ref={containerRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{
              cursor: activeTool === "text" ? "text" : "crosshair",
              zIndex: (activeTool === "highlight" || activeTool === "whiteout") ? 4 : 3,
            }}
            onClick={handlePageClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        )}

        {/* Select tool overlay for deselecting */}
        {activeTool === "select" && (
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{ zIndex: 1, cursor: "default" }}
            onClick={() => onSelectAnnotation(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── PdfEditorToolbar Component (v3 — annotation properties) ───────
function PdfEditorToolbar({
  activeTool,
  onToolChange,
  selectedAnnotation,
  annotations,
  onUpdateAnnotation,
  zoomLevel,
  onZoomChange,
  onSave,
  totalPages,
  hasEdits,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  editingTextItem,
  onUpdateEditingText,
}: {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  selectedAnnotation: string | null;
  annotations: TextAnnotation[];
  onUpdateAnnotation: (id: string, updates: Partial<TextAnnotation>) => void;
  zoomLevel: number;
  onZoomChange: (level: number) => void;
  onSave: () => void;
  totalPages: number;
  hasEdits: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  editingTextItem: TextItem | null;
  onUpdateEditingText: (updates: { fontFamily?: string; fontSize?: number; bold?: boolean; italic?: boolean; underline?: boolean }) => void;
}) {
  const selectedAnn = selectedAnnotation ? annotations.find(a => a.id === selectedAnnotation) : null;
  const isTextAnn = selectedAnn?.type === "text";
  // Also show text controls when edit-text tool is active and a text item is being edited
  const isEditingPdfText = activeTool === "edit-text" && editingTextItem !== null;

  const tools: { tool: EditorTool; icon: React.ReactNode; label: string }[] = [
    { tool: "select", icon: <MousePointer2 className="size-4" />, label: "Select" },
    { tool: "text", icon: <Type className="size-4" />, label: "Add Text" },
    { tool: "edit-text", icon: <Type className="size-4" />, label: "Edit Text" },
    { tool: "highlight", icon: <Highlighter className="size-4" />, label: "Highlight" },
    { tool: "whiteout", icon: <Square className="size-4" />, label: "Whiteout" },
    { tool: "draw", icon: <Paintbrush className="size-4" />, label: "Draw" },
    { tool: "eraser", icon: <Eraser className="size-4" />, label: "Eraser" },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm">
      {/* Main Toolbar Row */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#F3F4F6] flex-wrap">
        {/* Tool Buttons */}
        {tools.map(({ tool, icon, label }) => (
          <button
            key={tool}
            onClick={() => onToolChange(tool)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTool === tool
                ? "bg-[#0D9488]/10 text-[#0D9488]"
                : "text-[#6B7280] hover:bg-[#F3F4F6]"
            }`}
            title={label}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}

        <div className="w-px h-6 bg-[#E5E7EB] mx-1" />

        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-md text-[#6B7280] hover:bg-[#F3F4F6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Undo"
        >
          <Undo2 className="size-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-md text-[#6B7280] hover:bg-[#F3F4F6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Redo"
        >
          <Redo2 className="size-4" />
        </button>

        <div className="w-px h-6 bg-[#E5E7EB] mx-1" />

        {/* Text annotation formatting controls — shown for both Add Text and Edit Text */}
        {(isTextAnn || isEditingPdfText) && (
          <>
            {/* Font Family */}
            <select
              value={isEditingPdfText ? editingTextItem!.fontFamily : selectedAnn!.fontFamily}
              onChange={(e) => {
                if (isEditingPdfText) {
                  onUpdateEditingText({ fontFamily: e.target.value });
                } else {
                  onUpdateAnnotation(selectedAnnotation!, { fontFamily: e.target.value });
                }
              }}
              className="h-7 rounded-md border border-[#E5E7EB] text-xs px-1.5 bg-white text-[#374151] max-w-[170px] hover:border-[#9CA3AF] focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] outline-none"
            >
              {annotationFontFamilies.map((f) => (
                <option key={f.value} value={f.value}>{f.label}{"alt" in f && f.alt ? ` (${f.alt})` : ""}</option>
              ))}
            </select>

            {/* Font Size */}
            <select
              value={isEditingPdfText ? Math.round(parseFloat(editingTextItem!.fontHeight) || 12) : selectedAnn!.fontSize}
              onChange={(e) => {
                if (isEditingPdfText) {
                  onUpdateEditingText({ fontSize: parseInt(e.target.value) });
                } else {
                  onUpdateAnnotation(selectedAnnotation!, { fontSize: parseInt(e.target.value) });
                }
              }}
              className="h-7 rounded-md border border-[#E5E7EB] text-xs px-1.5 bg-white text-[#374151] w-[55px] hover:border-[#9CA3AF] focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] outline-none"
            >
              {annotationFontSizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <div className="w-px h-6 bg-[#E5E7EB] mx-1" />

            {/* Bold */}
            <button
              onClick={() => {
                if (isEditingPdfText) {
                  // Toggle bold on the editing text item
                  onUpdateEditingText({ bold: !editingTextItem!.bold });
                } else {
                  onUpdateAnnotation(selectedAnnotation!, { bold: !selectedAnn!.bold });
                }
              }}
              className={`p-1.5 rounded-md transition-colors ${
                (isEditingPdfText ? editingTextItem!.bold : selectedAnn!.bold) ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6]"
              }`}
              title="Bold"
            >
              <Bold className="size-4" />
            </button>
            {/* Italic */}
            <button
              onClick={() => {
                if (isEditingPdfText) {
                  // Toggle italic on the editing text item
                  onUpdateEditingText({ italic: !editingTextItem!.italic });
                } else {
                  onUpdateAnnotation(selectedAnnotation!, { italic: !selectedAnn!.italic });
                }
              }}
              className={`p-1.5 rounded-md transition-colors ${
                (isEditingPdfText ? editingTextItem!.italic : selectedAnn!.italic) ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6]"
              }`}
              title="Italic"
            >
              <Italic className="size-4" />
            </button>
            {/* Underline */}
            <button
              onClick={() => {
                if (isEditingPdfText) {
                  onUpdateEditingText({ underline: !editingTextItem!.underline });
                } else {
                  onUpdateAnnotation(selectedAnnotation!, { underline: !selectedAnn!.underline });
                }
              }}
              className={`p-1.5 rounded-md transition-colors ${
                (isEditingPdfText ? editingTextItem!.underline : selectedAnn!.underline) ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6]"
              }`}
              title="Underline"
            >
              <Underline className="size-4" />
            </button>

            <div className="w-px h-6 bg-[#E5E7EB] mx-1" />

            {/* Color */}
            {!isEditingPdfText && (
              <div className="relative">
                <button
                  className="p-1.5 rounded-md text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
                  title="Text Color"
                >
                  <Baseline className="size-4" />
                  <div
                    className="h-[3px] w-4 mx-auto -mt-0.5 rounded-full"
                    style={{ backgroundColor: selectedAnn!.color }}
                  />
                </button>
                <input
                  type="color"
                  value={selectedAnn!.color}
                  onChange={(e) => onUpdateAnnotation(selectedAnnotation!, { color: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            )}

            <div className="w-px h-6 bg-[#E5E7EB] mx-1" />
          </>
        )}

        {/* Disabled formatting controls when no text annotation or edit-text item selected */}
        {!isTextAnn && !isEditingPdfText && (
          <>
            <select disabled className="h-7 rounded-md border border-[#E5E7EB] text-xs px-1.5 bg-[#F9FAFB] text-[#9CA3AF] max-w-[110px] opacity-50">
              <option>Font</option>
            </select>
            <select disabled className="h-7 rounded-md border border-[#E5E7EB] text-xs px-1.5 bg-[#F9FAFB] text-[#9CA3AF] w-[55px] opacity-50">
              <option>Size</option>
            </select>
            <div className="w-px h-6 bg-[#E5E7EB] mx-1" />
            <button disabled className="p-1.5 rounded-md text-[#9CA3AF] opacity-50 cursor-not-allowed" title="Bold"><Bold className="size-4" /></button>
            <button disabled className="p-1.5 rounded-md text-[#9CA3AF] opacity-50 cursor-not-allowed" title="Italic"><Italic className="size-4" /></button>
            <button disabled className="p-1.5 rounded-md text-[#9CA3AF] opacity-50 cursor-not-allowed" title="Underline"><Underline className="size-4" /></button>
            <div className="w-px h-6 bg-[#E5E7EB] mx-1" />
            <button disabled className="p-1.5 rounded-md text-[#9CA3AF] opacity-50 cursor-not-allowed" title="Color"><Baseline className="size-4" /></button>
            <div className="w-px h-6 bg-[#E5E7EB] mx-1" />
          </>
        )}

        <div className="flex-1" />

        {/* Edited indicator */}
        {hasEdits && (
          <Badge className="bg-[#CCFBF1] text-[#0D9488] border-0 text-xs mr-2">
            Edited
          </Badge>
        )}

        {/* Page count */}
        <span className="text-xs text-[#6B7280] font-medium px-2">
          {totalPages} page{totalPages !== 1 ? "s" : ""}
        </span>

        <div className="w-px h-6 bg-[#E5E7EB] mx-1" />

        {/* Zoom controls */}
        <button
          onClick={() => onZoomChange(zoomLevels[Math.max(0, zoomLevels.indexOf(zoomLevel) - 1)])}
          className="p-1.5 rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={zoomLevel <= 50}
          title="Zoom Out"
        >
          <ZoomOut className="size-4" />
        </button>
        <span className="text-xs text-[#374151] w-10 text-center font-medium">{zoomLevel}%</span>
        <button
          onClick={() => onZoomChange(zoomLevels[Math.min(zoomLevels.length - 1, zoomLevels.indexOf(zoomLevel) + 1)])}
          className="p-1.5 rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={zoomLevel >= 200}
          title="Zoom In"
        >
          <ZoomIn className="size-4" />
        </button>

        <div className="w-px h-6 bg-[#E5E7EB] mx-1" />

        {/* Save Button */}
        <Button
          onClick={onSave}
          size="sm"
          className="bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs ml-1"
        >
          <Save className="size-3.5 mr-1" />
          Save
        </Button>
      </div>

      {/* Tool hint */}
      <div className="px-3 py-1 bg-[#F8F7F4] text-xs text-[#9CA3AF]">
        {toolHints[activeTool]}
        {isTextAnn && " — Use the formatting controls above to style the selected text."}
      </div>
    </div>
  );
}

// ─── Draggable Field Component ──────────────────────────────────────
function DraggableField({
  field,
  signerName,
  signerColor,
  signerIdx,
  isSelected,
  containerRef,
  onSelect,
  onMove,
  onRemove,
}: {
  field: SignField;
  signerName: string;
  signerColor: string;
  signerIdx: number;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ startX: number; startY: number; fieldX: number; fieldY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setDragging(true);
    dragStart.current = {
      startX: e.clientX,
      startY: e.clientY,
      fieldX: field.x,
      fieldY: field.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    onSelect();
    setDragging(true);
    const touch = e.touches[0];
    dragStart.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      fieldX: field.x,
      fieldY: field.y,
    };
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart.current || !containerRef.current) return;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const dx = e.clientX - dragStart.current.startX;
      const dy = e.clientY - dragStart.current.startY;
      const dxPercent = (dx / containerRect.width) * 100;
      const dyPercent = (dy / containerRect.height) * 100;
      const newX = Math.max(0, Math.min(100 - field.width, dragStart.current.fieldX + dxPercent));
      const newY = Math.max(0, Math.min(100 - field.height, dragStart.current.fieldY + dyPercent));
      onMove(field.id, Math.round(newX * 10) / 10, Math.round(newY * 10) / 10);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragStart.current || !containerRef.current) return;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.current.startX;
      const dy = touch.clientY - dragStart.current.startY;
      const dxPercent = (dx / containerRect.width) * 100;
      const dyPercent = (dy / containerRect.height) * 100;
      const newX = Math.max(0, Math.min(100 - field.width, dragStart.current.fieldX + dxPercent));
      const newY = Math.max(0, Math.min(100 - field.height, dragStart.current.fieldY + dyPercent));
      onMove(field.id, Math.round(newX * 10) / 10, Math.round(newY * 10) / 10);
    };

    const handleEnd = () => {
      setDragging(false);
      dragStart.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [dragging, field.id, field.width, field.height, containerRef, onMove]);

  return (
    <div
      className={`absolute rounded cursor-move select-none group/field ${
        isSelected ? "shadow-lg z-20" : "z-10"
      }`}
      style={{
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.width}%`,
        height: `${field.height}%`,
        borderColor: signerColor,
        backgroundColor: dragging ? `${signerColor}25` : `${signerColor}12`,
        borderWidth: isSelected ? "2.5px" : "1.5px",
        borderStyle: "solid",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <p className="text-[8px] px-1 truncate leading-tight" style={{ color: signerColor }}>
        {signerName}
      </p>
      <p className="text-[10px] font-medium text-[#111827] px-1 truncate capitalize leading-tight">
        {fieldTypes.find((ft) => ft.type === field.type)?.icon || ""} {field.label}
      </p>
      {isSelected && (
        <button
          className="absolute -top-2 -right-2 size-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center transition-opacity"
          onClick={(e) => { e.stopPropagation(); onRemove(field.id); }}
          onTouchEnd={(e) => { e.stopPropagation(); onRemove(field.id); }}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
function UploadVaultSignContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Editor state (v3: page image + annotation overlay)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  // Keep a separate copy of original PDF bytes for Save (pdfjs transfers the ArrayBuffer to its worker,
  // which detaches it from the main thread, causing "Cannot perform Construct on a detached ArrayBuffer")
  const originalPdfBytesRef = useRef<Uint8Array | null>(null);
  const [pageImages, setPageImages] = useState<Map<number, string>>(new Map());
  const [pageDimensions, setPageDimensions] = useState<Map<number, { width: number; height: number }>>(new Map());
  const [totalPages, setTotalPages] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const [editorZoom, setEditorZoom] = useState(100);
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<Map<number, string>>(new Map());
  const [editedPdfBytes, setEditedPdfBytes] = useState<Uint8Array | null>(null);
  const [textItems, setTextItems] = useState<Map<number, TextItem[]>>(new Map());
  const [editingTextItem, setEditingTextItem] = useState<TextItem | null>(null);
  const [modifiedTextItems, setModifiedTextItems] = useState<Map<string, ModifiedTextItem>>(new Map());

  // Undo/Redo history
  const [annotationHistory, setAnnotationHistory] = useState<TextAnnotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Step 2 — Document Details & Signers
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("custom");
  const [personalMessage, setPersonalMessage] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [signingOrder, setSigningOrder] = useState("sequential");
  const [signers, setSigners] = useState<SignerForm[]>([
    { name: "", email: "", role: "Candidate", party_number: 2, signing_order_position: 2 },
  ]);

  // Step 3 — Place Fields
  const [signFields, setSignFields] = useState<SignField[]>([]);
  const [activeSignerTab, setActiveSignerTab] = useState(1);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [fieldPage, setFieldPage] = useState(1);
  const [fieldTotalPages, setFieldTotalPages] = useState(1);
  const [fieldZoom, setFieldZoom] = useState(100);
  const [fieldPdfData, setFieldPdfData] = useState<ArrayBuffer | null>(null);
  const fieldContainerRef = useRef<HTMLDivElement | null>(null);
  const fieldPageWrapperRef = useRef<HTMLDivElement | null>(null);
  const fieldCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fieldCanvasDims, setFieldCanvasDims] = useState({ width: 0, height: 0 });
  const fieldDimsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fieldRenderError, setFieldRenderError] = useState(false);

  // Step 4
  const [legalConsent, setLegalConsent] = useState(false);

  // ─── When file is uploaded, read as ArrayBuffer ────────────
  useEffect(() => {
    if (uploadedFile && !pdfData) {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        // Immediately save a copy of the raw bytes before pdfjs can transfer/detach the ArrayBuffer
        originalPdfBytesRef.current = new Uint8Array(arrayBuffer.slice(0));
        setPdfData(arrayBuffer);
      };
      reader.onerror = () => {
        toast.error("Failed to read the PDF file");
      };
      reader.readAsArrayBuffer(uploadedFile);
      if (!documentName) {
        setDocumentName(uploadedFile.name.replace(/\.pdf$/i, ""));
      }
    }
  }, [uploadedFile, pdfData, documentName]);

  // ─── Render PDF pages as images + extract text items ──────
  useEffect(() => {
    if (!pdfData) return;

    setIsRendering(true);
    setRenderError(false);

    const renderPages = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        // IMPORTANT: Use a copy of the PDF bytes, NOT pdfData directly.
        // pdfjs transfers the ArrayBuffer to the Web Worker, which DETACHES it.
        // After getDocument(), pdfData is detached and any new Uint8Array(pdfData) will throw.
        const pdfCopy = originalPdfBytesRef.current
          ? new Uint8Array(originalPdfBytesRef.current)
          : new Uint8Array(pdfData.slice(0));
        const pdf = await pdfjsLib.getDocument({
          data: pdfCopy,
          cMapUrl: "/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/standard_fonts/",
          useSystemFonts: true,
        }).promise;
        setTotalPages(pdf.numPages);

        const newImages = new Map<number, string>();
        const newDims = new Map<number, { width: number; height: number }>();
        const newTextItems = new Map<number, TextItem[]>();
        const renderScale = 2;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: renderScale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          newImages.set(i, canvas.toDataURL("image/png"));

          const baseViewport = page.getViewport({ scale: 1 });
          const containerWidth = Math.max(500, Math.min(window.innerWidth - 80, 800));
          const displayScale = containerWidth / baseViewport.width;
          newDims.set(i, {
            width: Math.round(baseViewport.width * displayScale),
            height: Math.round(baseViewport.height * displayScale),
          });

          // Extract text items for edit-text tool
          // Phase 1: Try pdfjs TextLayer API for pixel-perfect positioning
          // Phase 2: Fallback to direct textContent.items positioning
          try {
            const textContent = await page.getTextContent();
            const vp = page.getViewport({ scale: 1 });
            const pageW = vp.width;
            const pageH = vp.height;
            const items: TextItem[] = [];

            // Filter to items with actual text content
            const textItemsArr = textContent.items.filter((item: any) => item.str && item.str.trim());
            console.log(`[VaultSign] Page ${i}: textContent has ${textContent.items.length} items, ${textItemsArr.length} with text`);

            if (textItemsArr.length === 0) {
              console.warn(`[VaultSign] Page ${i}: No text items found — PDF may have corrupted streams or no selectable text`);
              newTextItems.set(i, []);
              continue;
            }

            // Try TextLayer API first (gives pixel-perfect CSS positioning)
            let textLayerSuccess = false;
            try {
              const tempContainer = document.createElement("div");
              tempContainer.style.position = "absolute";
              tempContainer.style.left = "-9999px";
              tempContainer.style.top = "0";
              tempContainer.style.width = `${pageW}px`;
              tempContainer.style.height = `${pageH}px`;
              tempContainer.className = "textLayer";
              document.body.appendChild(tempContainer);

              const textLayer = new pdfjsLib.TextLayer({
                textContentSource: textContent,
                container: tempContainer,
                viewport: vp,
              });
              await textLayer.render();

              const spans = tempContainer.querySelectorAll("span:not(.markedContent span)");
              console.log(`[VaultSign] Page ${i} TextLayer: ${spans.length} spans rendered`);
              let itemIdx = 0;

              // Log first 3 items for debugging
              let debugCount = 0;

              spans.forEach((span) => {
                const style = (span as HTMLElement).style;
                const text = span.textContent || "";
                if (!text.trim()) return;

                // TextLayer ALREADY outputs left/top as CSS percentages (e.g., "12.34%").
                // Do NOT convert them again — just extract the numeric percentage value.
                const leftPct = parseFloat(style.left) || 0;
                const topPct = parseFloat(style.top) || 0;

                // Strip "px" suffix from --font-height if present (TextLayer adds it)
                const fontHeightRaw = style.getPropertyValue("--font-height") || "12";
                const fontHeight = fontHeightRaw.replace("px", "").trim();
                const scaleX = style.getPropertyValue("--scale-x") || "1";
                const rotate = style.getPropertyValue("--rotate") || "0deg";
                const origFontName = (textItemsArr[itemIdx] as any)?.fontName || "";

                // On HiDPI/Retina screens, TextLayer includes devicePixelRatio in --scale-x,
                // which would stretch text horizontally. Normalize it.
                const scaleXNum = parseFloat(scaleX) || 1;
                const normalizedScaleX = window.devicePixelRatio > 1
                  ? scaleXNum / window.devicePixelRatio
                  : scaleXNum;

                // Detect bold/italic from the PDF font name
                const lowerFontName = origFontName.toLowerCase();
                const isBold = lowerFontName.includes("bold") || lowerFontName.includes("black") || lowerFontName.includes("heavy");
                const isItalic = lowerFontName.includes("italic") || lowerFontName.includes("oblique");

                items.push({
                  id: `text-${i}-${itemIdx}`,
                  text,
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  fontHeight,
                  scaleX: `${normalizedScaleX}`,
                  rotate,
                  fontFamily: mapPdfFontToAnnotationFont(origFontName),
                  origFontName,
                  width: (textItemsArr[itemIdx] as any)?.width || 0,
                  viewportWidth: pageW,
                  viewportHeight: pageH,
                  bold: isBold,
                  italic: isItalic,
                  underline: false,
                });
                // Debug: log first 3 items to verify positioning
                if (debugCount < 3) {
                  console.log(`[VaultSign]   item[${itemIdx}]: left="${leftPct.toFixed(2)}%" top="${topPct.toFixed(2)}%" fontHeight="${fontHeight}" scaleX="${normalizedScaleX}" text="${text.substring(0, 30)}"`);
                  debugCount++;
                }
                itemIdx++;
              });

              document.body.removeChild(tempContainer);
              textLayerSuccess = items.length > 0;
            } catch (tlErr) {
              console.warn(`TextLayer rendering failed for page ${i}, falling back to direct positioning:`, tlErr);
              // Clean up temp container if it was added
              const orphan = document.querySelector(".textLayer[style*='-9999px']");
              if (orphan && orphan.parentNode) orphan.parentNode.removeChild(orphan);
            }

            // Phase 2: Fallback — compute positions directly from textContent.items transform
            if (!textLayerSuccess) {
              textItemsArr.forEach((txtItem: any, idx: number) => {
                const tx = txtItem.transform; // [scaleX, shearX, shearY, scaleY, translateX, translateY]
                if (!tx || tx.length < 6) return;

                const text = txtItem.str;
                const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]); // Math.sqrt(shearY² + scaleY²)
                const leftPct = (tx[4] / pageW) * 100;
                const topPct = ((pageH - tx[5]) / pageH) * 100; // PDF Y is bottom-up
                const widthPts = txtItem.width || (text.length * fontSize * 0.6);
                const scaleXVal = tx[0] !== 0 ? Math.abs(tx[0] / fontSize) : 1;
                const origFontName = txtItem.fontName || "";

                items.push({
                  id: `text-${i}-${idx}`,
                  text,
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  fontHeight: `${fontSize}`,
                  scaleX: `${scaleXVal}`,
                  rotate: "0deg",
                  fontFamily: mapPdfFontToAnnotationFont(origFontName),
                  origFontName,
                  width: widthPts,
                  viewportWidth: pageW,
                  viewportHeight: pageH,
                  bold: origFontName.toLowerCase().includes("bold"),
                  italic: origFontName.toLowerCase().includes("italic") || origFontName.toLowerCase().includes("oblique"),
                  underline: false,
                });
              });
            }

            newTextItems.set(i, items);
            console.log(`[VaultSign] Page ${i}: extracted ${items.length} text items (textLayerSuccess=${textLayerSuccess})`);
          } catch (textErr) {
            console.error(`Text extraction error on page ${i}:`, textErr);
            newTextItems.set(i, []);
          }
        }

        setPageImages(newImages);
        setPageDimensions(newDims);
        setTextItems(newTextItems);
        console.log(`[VaultSign] Total text items across all pages:`, Array.from(newTextItems.entries()).map(([k, v]) => `page ${k}: ${v.length}`).join(', '));
        setIsRendering(false);
      } catch (err) {
        console.error("PDF rendering error:", err);
        setRenderError(true);
        setIsRendering(false);
      }
    };

    renderPages();
  }, [pdfData]);

  // ─── Undo/Redo helpers ──────────────────────────────────────
  const pushHistory = useCallback((newAnnotations: TextAnnotation[]) => {
    setAnnotationHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, newAnnotations];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setAnnotations(annotationHistory[newIndex]);
    setSelectedAnnotation(null);
  }, [historyIndex, annotationHistory]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= annotationHistory.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setAnnotations(annotationHistory[newIndex]);
    setSelectedAnnotation(null);
  }, [historyIndex, annotationHistory]);

  // ─── Annotation handlers ─────────────────────────────────────
  const handleAddAnnotationAt = useCallback((page: number, xPct: number, yPct: number) => {
    let newAnn: TextAnnotation;

    if (activeTool === "text") {
      newAnn = {
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        page,
        x: xPct,
        y: yPct,
        width: 30,
        height: 4,
        text: "",
        fontSize: 14,
        fontFamily: "Helvetica",
        color: "#111827",
        bold: false,
        italic: false,
        underline: false,
        type: "text",
      };
    } else if (activeTool === "highlight") {
      newAnn = {
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        page,
        x: xPct,
        y: yPct,
        width: 25,
        height: 2,
        text: "",
        fontSize: 14,
        fontFamily: "Helvetica",
        color: "#111827",
        bold: false,
        italic: false,
        underline: false,
        type: "highlight",
      };
    } else if (activeTool === "whiteout") {
      newAnn = {
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        page,
        x: xPct,
        y: yPct,
        width: 20,
        height: 2,
        text: "",
        fontSize: 14,
        fontFamily: "Helvetica",
        color: "#111827",
        bold: false,
        italic: false,
        underline: false,
        type: "whiteout",
      };
    } else {
      return;
    }

    const newAnnotations = [...annotations, newAnn];
    setAnnotations(newAnnotations);
    setSelectedAnnotation(newAnn.id);
    pushHistory(newAnnotations);
  }, [activeTool, annotations, pushHistory]);

  const handleMoveAnnotation = useCallback((id: string, x: number, y: number) => {
    setAnnotations((prev) => prev.map(a => a.id === id ? { ...a, x, y } : a));
  }, []);

  const handleRemoveAnnotation = useCallback((id: string) => {
    const newAnnotations = annotations.filter(a => a.id !== id);
    setAnnotations(newAnnotations);
    setSelectedAnnotation(null);
    pushHistory(newAnnotations);
  }, [annotations, pushHistory]);

  const handleUpdateAnnotation = useCallback((id: string, updates: Partial<TextAnnotation>) => {
    setAnnotations((prev) => {
      const newAnns = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      // Don't push to history on every keystroke, just update state
      return newAnns;
    });
  }, []);

  const handleDrawingEnd = useCallback((pageNum: number, dataUrl: string) => {
    setDrawings((prev) => {
      const next = new Map(prev);
      next.set(pageNum, dataUrl);
      return next;
    });
  }, []);

  // ─── Handle text modification from edit-text tool ───────────────
  const handleModifyTextItem = useCallback((mod: ModifiedTextItem) => {
    setModifiedTextItems((prev) => {
      const next = new Map(prev);
      next.set(mod.textItemId, mod);
      return next;
    });
  }, []);

  const handleModifyTextItemCancel = useCallback((textItemId: string) => {
    // No-op: just used to signal cancel (no changes to modifiedTextItems)
  }, []);

  // ─── Check if any edits have been made ────────────────────
  const hasEdits = annotations.length > 0 || drawings.size > 0 || modifiedTextItems.size > 0;

  // ─── Save Edited PDF (pdf-lib only) ───────────────────────
  const handleSave = useCallback(async () => {
    const originalBytes = originalPdfBytesRef.current;
    if (!originalBytes) return;
    try {
      const modifiedBytes = await saveEditedPdf(
        originalBytes,
        annotations,
        drawings,
        modifiedTextItems,
      );
      setEditedPdfBytes(modifiedBytes);
      toast.success("PDF saved with edits");
    } catch (err) {
      console.error("Save PDF error:", err);
      toast.error("Failed to save PDF");
    }
  }, [annotations, drawings, modifiedTextItems]);

  // ─── Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    if (step !== 1) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't delete if user is editing text in a contentEditable
        if ((e.target as HTMLElement)?.contentEditable === "true") return;
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (selectedAnnotation) {
          handleRemoveAnnotation(selectedAnnotation);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, selectedAnnotation, handleRemoveAnnotation, handleUndo, handleRedo]);

  // ─── Field Placement PDF Rendering (Step 3) ─────────────────────────
  useEffect(() => {
    if (step !== 3 || !fieldPdfData) return;

    let cancelled = false;
    setFieldRenderError(false);

    const renderPdf = async (attempt = 0) => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(fieldPdfData.slice(0)), // copy to prevent detachment
          cMapUrl: "/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/standard_fonts/",
          useSystemFonts: true,
        });
        const pdf = await loadingTask.promise;

        if (cancelled) return;
        setFieldTotalPages(pdf.numPages);

        const pageNum = fieldPage;
        if (pageNum < 1 || pageNum > pdf.numPages) return;

        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const containerEl = fieldContainerRef.current;
        const containerWidth = containerEl ? containerEl.offsetWidth - 2 : 800;
        const baseScale = Math.min(containerWidth / baseViewport.width, 2);
        const scale = baseScale * (fieldZoom / 100);
        const finalScale = Math.max(0.3, Math.min(scale, 3));
        const viewport = page.getViewport({ scale: finalScale });

        const canvas = fieldCanvasRef.current;
        if (!canvas) {
          if (attempt < 10) {
            setTimeout(() => { if (!cancelled) renderPdf(attempt + 1); }, 200);
          }
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (fieldDimsDebounceRef.current) clearTimeout(fieldDimsDebounceRef.current);
        fieldDimsDebounceRef.current = setTimeout(() => {
          if (!cancelled) setFieldCanvasDims({ width: viewport.width, height: viewport.height });
        }, 50);

        await page.render({
          canvasContext: context,
          viewport: viewport,
        } as any).promise;
      } catch (err) {
        console.error("Field PDF render error:", err);
        if (!cancelled) setFieldRenderError(true);
      }
    };

    renderPdf();
    return () => {
      cancelled = true;
      if (fieldDimsDebounceRef.current) clearTimeout(fieldDimsDebounceRef.current);
    };
  }, [step, fieldPdfData, fieldPage, fieldZoom]);

  // ─── Get signers for field placement ──
  const allSigners: { id: string; name: string; party: number }[] = [
    { id: "party_1", name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "You (Sender)", party: 1 },
    ...signers.map((s) => ({ id: `party_${s.party_number}`, name: s.name || `Party ${s.party_number}`, party: s.party_number })),
  ];

  // ─── Step Handlers ────────────────────────────────────────────────
  const handleStep1Next = async () => {
    if (!uploadedFile) return toast.error("Please upload a PDF file first");
    // If there are edits, save them into the PDF first
    if (hasEdits) {
      await handleSave();
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!documentName.trim()) return toast.error("Document name is required");
    if (!expiryDate) return toast.error("Expiry date is required");
    if (new Date(expiryDate) <= new Date()) return toast.error("Expiry must be in the future");

    const invalid = signers.find((s) => !s.name.trim() || !s.email.trim());
    if (invalid) return toast.error("All signers must have a name and email");

    const emails = signers.map((s) => s.email.trim().toLowerCase());
    const duplicateEmails = emails.filter((e, i) => emails.indexOf(e) !== i);
    if (duplicateEmails.length > 0) {
      toast.error(`Duplicate email found: ${[...new Set(duplicateEmails)].join(", ")}. Each signer must have a unique email.`);
      return;
    }

    // Set the PDF data for field placement — use edited version if available
    // IMPORTANT: Use originalPdfBytesRef, not pdfData (which may be detached by pdfjs)
    if (editedPdfBytes) {
      setFieldPdfData(new Uint8Array(editedPdfBytes).buffer as ArrayBuffer);
    } else if (originalPdfBytesRef.current) {
      setFieldPdfData(new Uint8Array(originalPdfBytesRef.current).buffer as ArrayBuffer);
    }

    setStep(3);
  };

  const handleStep3Next = () => {
    const recipients = allSigners.filter((s) => s.party > 1);
    const recipientFieldCounts = recipients.map((s) => ({
      ...s,
      count: signFields.filter((f) => f.assigned_to_signer_id === s.id).length,
    }));
    const missing = recipientFieldCounts.filter((s) => s.count === 0);
    if (missing.length > 0) return toast.error(`Each recipient needs at least 1 field. Missing: ${missing.map((m) => m.name).join(", ")}`);
    setStep(4);
  };

  const handleAddField = (type: string) => {
    const activeSigner = allSigners[activeSignerTab];
    if (!activeSigner) return;
    const field: SignField = {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      page: fieldPage,
      x: 10 + Math.random() * 30,
      y: 20 + signFields.filter((f) => f.page === fieldPage).length * 10,
      width: type === "checkbox" ? 8 : 25,
      height: type === "checkbox" ? 5 : 6,
      assigned_to_signer_id: activeSigner.id,
      label: fieldTypes.find((ft) => ft.type === type)?.label || type,
      required: true,
      value: null,
    };
    setSignFields((prev) => [...prev, field]);
  };

  const handleRemoveField = (fieldId: string) => {
    setSignFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedField === fieldId) setSelectedField(null);
  };

  const handleMoveField = useCallback((fieldId: string, x: number, y: number) => {
    setSignFields((prev) => prev.map((f) => f.id === fieldId ? { ...f, x, y } : f));
  }, []);

  const handleUpdateField = (fieldId: string, updates: Partial<SignField>) => {
    setSignFields((prev) => prev.map((f) => f.id === fieldId ? { ...f, ...updates } : f));
  };

  // ─── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!legalConsent) return toast.error("You must agree to the legal consent");
    setLoading(true);

    try {
      // 1. Create document
      const createRes = await fetch("/api/vaultsign/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: null,
          document_name: documentName,
          document_type: documentType,
          signing_order: signingOrder,
          expiry_date: expiryDate,
          personal_message: personalMessage || null,
          placeholder_values: {},
          signers: signers.map((s) => ({
            name: s.name,
            email: s.email,
            role: s.role,
            party_number: s.party_number,
            signing_order_position: signingOrder === "sequential" ? s.signing_order_position : s.party_number,
          })),
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to create document");
      }

      const { document } = await createRes.json();

      // 2. Upload PDF — use edited PDF if available
      if (editedPdfBytes) {
        const editedFile = new File([editedPdfBytes as BlobPart], uploadedFile?.name || "document.pdf", { type: "application/pdf" });
        const formData = new FormData();
        formData.append("file", editedFile);
        formData.append("document_id", document.id.toString());
        const uploadRes = await fetch("/api/vaultsign/documents/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload edited PDF");
      } else if (uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("document_id", document.id.toString());
        const uploadRes = await fetch("/api/vaultsign/documents/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload PDF");
      }

      // 3. Save sign fields
      await fetch(`/api/vaultsign/documents/${document.id}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign_fields: signFields }),
      });

      // 4. Send for signature
      const sendRes = await fetch(`/api/vaultsign/documents/${document.id}/send`, {
        method: "POST",
      });

      if (!sendRes.ok) {
        const err = await sendRes.json();
        throw new Error(err.error || "Failed to send document");
      }

      toast.success("Document sent for signature");
      router.push(`/recruiter/vaultsign/${document.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to send document");
    } finally {
      setLoading(false);
    }
  };

  // ─── Compute zoom-scaled page dimensions ────────────
  const zoomFactor = editorZoom / 100;

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
          Upload Custom PDF
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">Upload a PDF document, annotate it, then save it for signing.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center justify-center size-8 rounded-full text-sm font-medium ${
              s === step ? "bg-[#0D9488] text-white" : s < step ? "bg-[#CCFBF1] text-[#0D9488]" : "bg-[#F3F4F6] text-[#9CA3AF]"
            }`}>
              {s < step ? <Check className="size-4" /> : s}
            </div>
            {s < 4 && <div className={`w-12 h-0.5 ${s < step ? "bg-[#0D9488]" : "bg-[#E5E7EB]"}`} />}
          </div>
        ))}
      </div>
      <div className="text-center mb-6">
        <p className="text-sm text-[#6B7280]">
          {step === 1 && "Step 1: Upload & Annotate PDF"}
          {step === 2 && "Step 2: Document Details & Signers"}
          {step === 3 && "Step 3: Place Fields on Document"}
          {step === 4 && "Step 4: Review & Send"}
        </p>
      </div>

      {/* ── STEP 1: Upload & Annotate PDF ─────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Upload Area */}
          {!uploadedFile ? (
            <div>
              <label className="flex flex-col items-center justify-center p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer hover:border-[#0D9488]/50 border-[#E5E7EB] bg-white">
                <Upload className="size-12 text-[#9CA3AF] mb-3" />
                <p className="text-base font-medium text-[#111827]">Click to upload PDF</p>
                <p className="text-sm text-[#6B7280] mt-1">or drag and drop your file here</p>
                <p className="text-xs text-[#9CA3AF] mt-2">PDF only, max 25MB</p>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > 25 * 1024 * 1024) { toast.error("File too large (max 25MB)"); return; }
                    if (f && f.type !== "application/pdf") { toast.error("Only PDF files are allowed"); return; }
                    setUploadedFile(f || null);
                  }}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#CCFBF1]/30 border border-[#0D9488]/20">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-9 rounded-lg bg-[#0D9488]">
                    <FileSignature className="size-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111827]">{uploadedFile.name}</p>
                    <p className="text-xs text-[#6B7280]">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPdfData(null);
                    setUploadedFile(null);
                    setPageImages(new Map());
                    setPageDimensions(new Map());
                    setTotalPages(0);
                    setEditorZoom(100);
                    setActiveTool("select");
                    setAnnotations([]);
                    setSelectedAnnotation(null);
                    setDrawings(new Map());
                    setEditedPdfBytes(null);
                    setRenderError(false);
                    setAnnotationHistory([]);
                    setHistoryIndex(-1);
                    setTextItems(new Map());
                  }}
                  className="text-sm text-[#0D9488] hover:text-[#0F766E] font-medium transition-colors"
                >
                  Remove & upload different file
                </button>
              </div>

              {/* Rendering Loading State */}
              {isRendering && (
                <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-white border border-[#E5E7EB]">
                  <Loader2 className="size-8 text-[#0D9488] animate-spin mb-3" />
                  <p className="text-sm text-[#6B7280]">Rendering PDF pages...</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">This may take a moment for large documents</p>
                </div>
              )}

              {/* Render Error */}
              {renderError && !isRendering && (
                <div className="border border-[#DC2626]/30 rounded-xl bg-[#FEF2F2] p-6 text-center">
                  <AlertCircle className="size-8 text-[#DC2626] mx-auto mb-2" />
                  <p className="text-sm text-[#DC2626] font-medium">Failed to render document</p>
                  <p className="text-xs text-[#6B7280] mt-1">Try re-uploading the PDF.</p>
                </div>
              )}

              {/* PDF Editor - shown after rendering completes */}
              {!isRendering && !renderError && pageImages.size > 0 && (
                <>
                  {/* Toolbar */}
                  <PdfEditorToolbar
                    activeTool={activeTool}
                    onToolChange={setActiveTool}
                    selectedAnnotation={selectedAnnotation}
                    annotations={annotations}
                    onUpdateAnnotation={handleUpdateAnnotation}
                    zoomLevel={editorZoom}
                    onZoomChange={setEditorZoom}
                    onSave={handleSave}
                    totalPages={totalPages}
                    hasEdits={hasEdits}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    canUndo={historyIndex > 0}
                    canRedo={historyIndex < annotationHistory.length - 1}
                    editingTextItem={editingTextItem}
                    onUpdateEditingText={(updates) => {
                      if (!editingTextItem) return;
                      setEditingTextItem({
                        ...editingTextItem,
                        fontFamily: updates.fontFamily ?? editingTextItem.fontFamily,
                        // fontHeight is stored as a plain number string (e.g., "12"), not "12px"
                        fontHeight: updates.fontSize ? `${updates.fontSize}` : editingTextItem.fontHeight,
                        bold: updates.bold ?? editingTextItem.bold,
                        italic: updates.italic ?? editingTextItem.italic,
                        underline: updates.underline ?? editingTextItem.underline,
                      });
                    }}
                  />

                  {/* Page Views */}
                  <div
                    className="overflow-y-auto rounded-xl"
                    style={{ maxHeight: "80vh", backgroundColor: "#E5E7EB" }}
                  >
                    <div className="flex flex-col items-center gap-8 py-8 px-4">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pn) => {
                        const dims = pageDimensions.get(pn);
                        if (!dims) return null;
                        const scaledWidth = Math.round(dims.width * zoomFactor);
                        const scaledHeight = Math.round(dims.height * zoomFactor);

                        return (
                          <PdfPageView
                            key={pn}
                            pageNum={pn}
                            pageImage={pageImages.get(pn) || ""}
                            pageWidth={scaledWidth}
                            pageHeight={scaledHeight}
                            activeTool={activeTool}
                            annotations={annotations}
                            selectedAnnotation={selectedAnnotation}
                            onSelectAnnotation={setSelectedAnnotation}
                            onMoveAnnotation={handleMoveAnnotation}
                            onRemoveAnnotation={handleRemoveAnnotation}
                            onUpdateAnnotation={handleUpdateAnnotation}
                            onAddAnnotationAt={handleAddAnnotationAt}
                            onDrawingEnd={handleDrawingEnd}
                            drawingDataUrl={drawings.get(pn)}
                            textItems={textItems.get(pn) || []}
                            editorZoom={editorZoom}
                            modifiedTextItems={modifiedTextItems}
                            onModifyTextItem={handleModifyTextItem}
                            onModifyTextItemCancel={handleModifyTextItemCancel}
                            editingTextItem={editingTextItem}
                            onUpdateEditingText={(updates) => {
                              if (!editingTextItem) return;
                              setEditingTextItem({
                                ...editingTextItem,
                                fontFamily: updates.fontFamily ?? editingTextItem.fontFamily,
                                fontHeight: updates.fontSize ? `${updates.fontSize}` : editingTextItem.fontHeight,
                                bold: updates.bold ?? editingTextItem.bold,
                                italic: updates.italic ?? editingTextItem.italic,
                                underline: updates.underline ?? editingTextItem.underline,
                              });
                            }}
                            onEditingTextItemChange={setEditingTextItem}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Edit count indicator */}
                  {hasEdits && (
                    <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                      <Type className="size-3" />
                      <span>
                        {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
                        {modifiedTextItems.size > 0 && `, ${modifiedTextItems.size} text edit${modifiedTextItems.size !== 1 ? "s" : ""}`}
                        {drawings.size > 0 && ` and ${drawings.size} page${drawings.size !== 1 ? "s" : ""} with drawings`}.
                        Click Save to apply changes.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Document Details & Signers ────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Document Details */}
          <div className="space-y-4 bg-white rounded-2xl border border-[#E5E7EB] p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-[#F3F4F6]">
                <FileSignature className="size-4 text-[#0D9488]" />
              </div>
              <h3 className="text-sm font-semibold text-[#111827]">Document Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="sm text-[#111827]">Document Name *</Label>
                <Input value={documentName} onChange={(e) => setDocumentName(e.target.value)} className="mt-1 border-[#E5E7EB]" />
              </div>
              <div>
                <Label className="sm text-[#111827]">Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="mt-1 border-[#E5E7EB]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="sm text-[#111827]">Personal Message (Optional)</Label>
              <Textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value.slice(0, 500))}
                placeholder="Add a message to your recipients..."
                className="mt-1 border-[#E5E7EB]"
                rows={3}
              />
              <p className="text-xs text-[#9CA3AF] mt-1">{personalMessage.length}/500</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="sm text-[#111827]">Document Expires On *</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} min={new Date(Date.now() + 86400000).toISOString().split("T")[0]} className="mt-1 border-[#E5E7EB]" />
              </div>
              <div>
                <Label className="sm text-[#111827]">Signing Order</Label>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setSigningOrder("sequential")}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm transition-all ${
                      signingOrder === "sequential" ? "border-[#0D9488] bg-[#CCFBF1]/30" : "border-[#E5E7EB]"
                    }`}
                  >
                    <ArrowRight className="size-4" />
                    <div className="text-left">
                      <div className="font-medium text-[#111827]">Sequential</div>
                      <div className="text-[10px] text-[#6B7280]">Signers sign one after another</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSigningOrder("parallel")}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm transition-all ${
                      signingOrder === "parallel" ? "border-[#166534] bg-[#DCFCE7]/30" : "border-[#E5E7EB]"
                    }`}
                  >
                    <ArrowRight className="size-4" />
                    <div className="text-left">
                      <div className="font-medium text-[#111827]">Parallel</div>
                      <div className="text-[10px] text-[#6B7280]">All signers receive at once</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Signers */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>Who needs to sign?</h2>

            {/* Party 1 - Sender */}
            <div className="p-5 rounded-2xl border border-[#0D9488] bg-[#CCFBF1]/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-[#0D9488] text-white border-0 text-xs">Party 1</Badge>
                <span className="text-sm font-medium text-[#111827]">You (Sender)</span>
                <Badge variant="secondary" className="text-xs bg-[#CCFBF1] text-[#0D9488]">Document Creator</Badge>
              </div>
              <p className="text-sm text-[#6B7280]">{user?.firstName} {user?.lastName} &middot; {user?.email}</p>
              <p className="text-xs text-[#9CA3AF] mt-1">You are the sender. Only recipients need to sign through VaultSign.</p>
            </div>

            {/* Other Signers */}
            {signers.map((signer, i) => (
              <div key={i} className="p-5 rounded-2xl border border-[#E5E7EB] bg-white relative">
                <button
                  onClick={() => setSigners((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-3 right-3 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                  disabled={signers.length <= 1}
                >
                  <X className="size-4" />
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <GripVertical className="size-4 text-[#9CA3AF]" />
                  <Badge className="border-0 text-xs" style={{ backgroundColor: `${partyColors[Math.min(signer.party_number - 1, 3)]}20`, color: partyColors[Math.min(signer.party_number - 1, 3)] }}>
                    Party {signer.party_number}
                  </Badge>
                  {signingOrder === "sequential" && (
                    <Badge variant="secondary" className="text-xs">Signs #{signer.signing_order_position}</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-[#6B7280]">Full Name</Label>
                    <Input value={signer.name} onChange={(e) => {
                      const updated = [...signers]; updated[i] = { ...updated[i], name: e.target.value }; setSigners(updated);
                    }} className="mt-1 border-[#E5E7EB]" placeholder="Signer name" />
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B7280]">Email</Label>
                    <Input type="email" value={signer.email} onChange={(e) => {
                      const updated = [...signers]; updated[i] = { ...updated[i], email: e.target.value }; setSigners(updated);
                    }} className="mt-1 border-[#E5E7EB]" placeholder="signer@email.com" />
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-[#6B7280]">Role</Label>
                  <Select value={signer.role} onValueChange={(v) => {
                    const updated = [...signers]; updated[i] = { ...updated[i], role: v }; setSigners(updated);
                  }}>
                    <SelectTrigger className="mt-1 border-[#E5E7EB]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            <Button variant="ghost" onClick={() => setSigners((prev) => {
              const existingParties = prev.map((s) => s.party_number);
              const maxParty = Math.max(2, ...existingParties);
              return [...prev, { name: "", email: "", role: "Candidate", party_number: maxParty + 1, signing_order_position: maxParty + 1 }];
            })} className="text-[#0D9488]">
              <Plus className="size-4 mr-2" /> Add Signer
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Place Fields ──────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            Place Fields on Document
          </h2>
          <p className="text-sm text-[#6B7280]">Click a field type, then it will be placed on the document for the selected signer. Drag fields to reposition them.</p>

          <div className="flex gap-4">
            {/* Left Panel */}
            <div className="w-[260px] shrink-0 space-y-4">
              {/* Signer Tabs */}
              <div>
                <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-2">Signer</p>
                <div className="flex flex-col gap-1">
                  {allSigners.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSignerTab(i)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeSignerTab === i ? "text-white" : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                      }`}
                      style={activeSignerTab === i ? { backgroundColor: partyColors[Math.min(s.party - 1, 3)] } : {}}
                    >
                      <span className="truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#9CA3AF] mt-2">Placing fields for: <strong>{allSigners[activeSignerTab]?.name}</strong></p>
              </div>

              {/* Field Types */}
              <div>
                <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-2">Field Types</p>
                {fieldTypes.map((ft) => (
                  <button
                    key={ft.type}
                    onClick={() => handleAddField(ft.type)}
                    className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#111827] hover:border-[#0D9488]/50 transition-all cursor-pointer"
                  >
                    <span>{ft.icon}</span>
                    <span>{ft.label}</span>
                  </button>
                ))}
              </div>

              {/* Selected Field Properties */}
              {selectedField && (() => {
                const field = signFields.find((f) => f.id === selectedField);
                if (!field) return null;
                return (
                  <div className="p-3 rounded-xl border border-[#E5E7EB] bg-[#F8F7F4] space-y-2">
                    <p className="text-xs font-medium text-[#9CA3AF] uppercase">Selected Field</p>
                    <p className="text-sm text-[#111827] capitalize">{field.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-[#6B7280]">Assigned to: {allSigners.find((s) => s.id === field.assigned_to_signer_id)?.name || field.assigned_to_signer_id}</p>
                    <div>
                      <Label className="text-xs text-[#6B7280]">Label</Label>
                      <Input value={field.label} onChange={(e) => handleUpdateField(field.id, { label: e.target.value })} className="mt-1 border-[#E5E7EB] text-sm" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-[#6B7280]">Required</Label>
                      <Switch checked={field.required} onCheckedChange={(v) => handleUpdateField(field.id, { required: v })} />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveField(field.id)} className="text-[#DC2626] w-full">
                      <Trash2 className="size-3 mr-1" /> Remove Field
                    </Button>
                  </div>
                );
              })()}

              {/* Placed Fields List */}
              <div>
                <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-2">Placed Fields ({signFields.length})</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {signFields.map((f) => {
                    const signerIdx = allSigners.findIndex((s) => s.id === f.assigned_to_signer_id);
                    const signerColor = partyColors[Math.min(Math.max(signerIdx, 0), 3)];
                    return (
                      <button
                        key={f.id}
                        onClick={() => { setSelectedField(f.id); setFieldPage(f.page); }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-all ${
                          selectedField === f.id ? "bg-[#F3F4F6]" : "hover:bg-[#F8F7F4]"
                        }`}
                      >
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: signerColor }} />
                        <span className="truncate flex-1">{f.label}</span>
                        <span className="text-[#9CA3AF]">P{f.page}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveField(f.id); }} className="text-[#9CA3AF] hover:text-[#DC2626]">
                          <X className="size-3" />
                        </button>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Panel - PDF Viewer for Fields */}
            <div className="flex-1 space-y-3">
              {/* PDF Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="size-8 border-[#E5E7EB]" onClick={() => setFieldPage((p) => Math.max(1, p - 1))} disabled={fieldPage <= 1}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-sm text-[#6B7280]">Page {fieldPage} of {fieldTotalPages}</span>
                  <Button variant="outline" size="icon" className="size-8 border-[#E5E7EB]" onClick={() => setFieldPage((p) => Math.min(fieldTotalPages, p + 1))} disabled={fieldPage >= fieldTotalPages}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="size-8 border-[#E5E7EB]" onClick={() => setFieldZoom((z) => zoomLevels[Math.max(0, zoomLevels.indexOf(z) - 1)])} disabled={fieldZoom <= 50}>
                    <MinusIcon className="size-4" />
                  </Button>
                  <span className="text-xs text-[#6B7280] w-10 text-center">{fieldZoom}%</span>
                  <Button variant="outline" size="icon" className="size-8 border-[#E5E7EB]" onClick={() => setFieldZoom((z) => zoomLevels[Math.min(zoomLevels.length - 1, zoomLevels.indexOf(z) + 1)])} disabled={fieldZoom >= 200}>
                    +
                  </Button>
                </div>
              </div>

              {/* PDF Canvas with Fields Overlay */}
              {fieldRenderError && (
                <div className="border border-[#DC2626]/30 rounded-xl bg-[#FEF2F2] p-6 text-center mb-3">
                  <AlertCircle className="size-8 text-[#DC2626] mx-auto mb-2" />
                  <p className="text-sm text-[#DC2626] font-medium">Failed to load document preview</p>
                  <p className="text-xs text-[#6B7280] mt-1">Try refreshing the page or re-uploading the PDF.</p>
                </div>
              )}
              <div
                ref={fieldContainerRef}
                className="relative bg-white border border-[#E5E7EB] rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.07)] overflow-auto"
                style={{ minHeight: "500px" }}
                onClick={() => setSelectedField(null)}
              >
                {fieldPdfData && !fieldRenderError ? (
                  <div
                    ref={fieldPageWrapperRef}
                    className="relative inline-block"
                    style={{
                      width: fieldCanvasDims.width ? `${fieldCanvasDims.width}px` : "100%",
                      height: fieldCanvasDims.height ? `${fieldCanvasDims.height}px` : "auto",
                    }}
                  >
                    <canvas ref={fieldCanvasRef} className="block" />
                    {signFields.filter((f) => f.page === fieldPage).map((f) => {
                      const signerIdx = allSigners.findIndex((s) => s.id === f.assigned_to_signer_id);
                      const signerColor = partyColors[Math.min(Math.max(signerIdx, 0), 3)];
                      return (
                        <DraggableField
                          key={f.id}
                          field={f}
                          signerName={allSigners[signerIdx]?.name || "Unknown"}
                          signerColor={signerColor}
                          signerIdx={signerIdx}
                          isSelected={selectedField === f.id}
                          containerRef={fieldPageWrapperRef}
                          onSelect={() => setSelectedField(f.id)}
                          onMove={handleMoveField}
                          onRemove={handleRemoveField}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <FileSignature className="size-16 mx-auto text-[#9CA3AF] mb-4" />
                    <p className="text-sm text-[#9CA3AF]">No document loaded. Go back and upload a PDF.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Review & Send ──────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 space-y-6">
            {/* Document */}
            <div>
              <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-2">Document</p>
              <h3 className="text-lg font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>{documentName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-[#F3F4F6] text-[#6B7280] border-0">{typeLabels[documentType]}</Badge>
                {personalMessage && <span className="text-sm text-[#6B7280]">Message included</span>}
                {hasEdits && <Badge className="bg-[#CCFBF1] text-[#0D9488] border-0">Edited</Badge>}
                {editedPdfBytes && <Badge className="bg-[#CCFBF1] text-[#0D9488] border-0">Edited PDF</Badge>}
              </div>
            </div>

            {/* Signers */}
            <div>
              <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">Signers</p>
              <div className="space-y-2">
                {/* Sender */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#CCFBF1]/20 border border-[#0D9488]/20">
                  <div className="flex items-center justify-center size-8 rounded-full" style={{ backgroundColor: partyColors[0] }}>
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111827]">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-[#6B7280]">{user?.email} &middot; Sender</p>
                  </div>
                </div>
                {/* Other signers */}
                {signers.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                    <div className="flex items-center justify-center size-8 rounded-full" style={{ backgroundColor: partyColors[Math.min(s.party_number - 1, 3)] }}>
                      <span className="text-white text-xs font-bold">{s.party_number}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{s.name || "Unnamed"}</p>
                      <p className="text-xs text-[#6B7280]">{s.email} &middot; {s.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fields */}
            <div>
              <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">Sign Fields ({signFields.length})</p>
              {signFields.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {signFields.map((f) => {
                    const signerIdx = allSigners.findIndex((s) => s.id === f.assigned_to_signer_id);
                    const signerColor = partyColors[Math.min(Math.max(signerIdx, 0), 3)];
                    return (
                      <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg border border-[#E5E7EB] text-sm">
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: signerColor }} />
                        <span className="capitalize">{f.type.replace(/_/g, " ")}</span>
                        <span className="text-[#9CA3AF]">P{f.page}</span>
                        <span className="ml-auto text-[#9CA3AF] text-xs">{f.required ? "Required" : "Optional"}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#9CA3AF]">No fields placed</p>
              )}
            </div>

            {/* Legal Consent */}
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
              <div className="flex items-start gap-3">
                <Switch checked={legalConsent} onCheckedChange={setLegalConsent} />
                <div>
                  <p className="text-sm font-medium text-[#111827]">Legal Consent</p>
                  <p className="text-xs text-[#6B7280] mt-1">
                    I confirm that this document is legitimate and I have the authority to request signatures.
                    I understand that this document will be sent for electronic signature and that all parties
                    will be bound by the terms outlined in the document.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation Buttons ──────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="border-[#E5E7EB]"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          {step < 4 ? (
            <Button
              onClick={() => {
                if (step === 1) handleStep1Next();
                else if (step === 2) handleStep2Next();
                else if (step === 3) handleStep3Next();
              }}
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white"
            >
              Continue
              <ArrowRight className="size-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !legalConsent}
              className="bg-[#0D9488] hover:bg-[#0F766E] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <FileSignature className="size-4 mr-2" />
                  Send for Signature
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page Export ────────────────────────────────────────────────────
export default function UploadVaultSignPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 text-[#0D9488] animate-spin" />
      </div>
    }>
      <UploadVaultSignContent />
    </Suspense>
  );
}

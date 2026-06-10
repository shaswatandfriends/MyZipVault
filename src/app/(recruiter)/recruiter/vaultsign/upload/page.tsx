"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, ArrowRight, ArrowLeft, GripVertical,
  Plus, X, Loader2, FileSignature, Check,
  ChevronLeft, ChevronRight, Trash2, MinusIcon, AlertCircle,
  Save, Type, Highlighter, Square,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Paintbrush, Eraser, MousePointer2, Undo2, Redo2, Baseline,
  Scissors, Move, Link2, FileText, Pencil, ZoomIn, ZoomOut,
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

interface TextAnnotation {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  alignment: "left" | "center" | "right" | "justify";
  type: "text" | "highlight" | "shape" | "drawing";
}

interface ExtractedTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
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

const fieldTypes = [
  { type: "signature", label: "Signature", icon: "✍️" },
  { type: "date", label: "Date Signed", icon: "📅" },
  { type: "full_name", label: "Full Name", icon: "🔤" },
  { type: "initials", label: "Initials", icon: "📝" },
  { type: "email", label: "Email", icon: "✉️" },
  { type: "text", label: "Text Field", icon: "📋" },
  { type: "checkbox", label: "Checkbox", icon: "☑️" },
];

const partyColors = ["#166534", "#0D9488", "#7C3AED", "#D97706"];
const roleOptions = ["Candidate", "Client Employer", "Witness", "Recruiter"];
const zoomLevels = [50, 75, 100, 125, 150, 200];

const fontFamilies = [
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
  { value: "Palatino", label: "Palatino" },
  { value: "Impact", label: "Impact" },
  { value: "Comic Sans MS", label: "Comic Sans MS" },
];

const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

type EditorTool = "select" | "text" | "highlight" | "shape" | "draw" | "eraser";

// ─── Save Edited PDF with pdf-lib ──────────────────────────────────
async function saveEditedPdf(
  originalPdfBytes: Uint8Array,
  annotations: TextAnnotation[],
  drawingData: Map<number, ImageData>
): Promise<Uint8Array> {
  const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
  const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();

  for (const ann of annotations) {
    const pageIndex = ann.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const { width: pw, height: ph } = page.getSize();

    const x = (ann.x / 100) * pw;
    const y = ph - ((ann.y / 100) * ph) - (ann.fontSize || 14);

    if (ann.type === "text") {
      const lines = (ann.text || "").split("\n");
      const lineHeight = (ann.fontSize || 14) * 1.3;
      lines.forEach((line, i) => {
        if (line.trim()) {
          page.drawText(line, {
            x,
            y: y - i * lineHeight,
            size: ann.fontSize || 14,
            font: ann.bold ? helveticaBold : helveticaFont,
            color: PDFLib.rgb(
              parseInt(ann.color.slice(1, 3), 16) / 255,
              parseInt(ann.color.slice(3, 5), 16) / 255,
              parseInt(ann.color.slice(5, 7), 16) / 255
            ),
          });
        }
      });
    } else if (ann.type === "highlight") {
      page.drawRectangle({
        x,
        y: ph - ((ann.y / 100) * ph) - ((ann.height / 100) * ph),
        width: (ann.width / 100) * pw,
        height: (ann.height / 100) * ph,
        color: PDFLib.rgb(
          parseInt(ann.color.slice(1, 3), 16) / 255,
          parseInt(ann.color.slice(3, 5), 16) / 255,
          parseInt(ann.color.slice(5, 7), 16) / 255
        ),
        opacity: 0.3,
      });
    } else if (ann.type === "shape") {
      page.drawRectangle({
        x,
        y: ph - ((ann.y / 100) * ph) - ((ann.height / 100) * ph),
        width: (ann.width / 100) * pw,
        height: (ann.height / 100) * ph,
        borderColor: PDFLib.rgb(
          parseInt(ann.color.slice(1, 3), 16) / 255,
          parseInt(ann.color.slice(3, 5), 16) / 255,
          parseInt(ann.color.slice(5, 7), 16) / 255
        ),
        borderWidth: 1.5,
        opacity: 0.1,
      });
    }
  }

  // Embed drawing canvases as images
  for (const [pageNum, imageData] of drawingData) {
    const pageIndex = pageNum - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const { width: pw, height: ph } = page.getSize();

    // Convert ImageData to PNG using a temporary canvas
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.putImageData(imageData, 0, 0);
    const pngDataUrl = tempCanvas.toDataURL("image/png");
    const pngBase64 = pngDataUrl.split(",")[1];
    const pngBytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));

    try {
      const pngImage = await pdfDoc.embedPng(pngBytes);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pw,
        height: ph,
        opacity: 0.8,
      });
    } catch (imgErr) {
      console.error("Failed to embed drawing image:", imgErr);
    }
  }

  return pdfDoc.save();
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

// ─── Draggable Text Annotation Component ──────────────────────────────
function DraggableTextAnnotation({
  annotation,
  isSelected,
  containerRef,
  onSelect,
  onMove,
  onRemove,
  onUpdate,
  activeTool,
}: {
  annotation: TextAnnotation;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<TextAnnotation>) => void;
  activeTool: EditorTool;
}) {
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const dragStart = useRef<{ startX: number; startY: number; fieldX: number; fieldY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (editing) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    if (activeTool === "select") {
      setDragging(true);
      dragStart.current = {
        startX: e.clientX,
        startY: e.clientY,
        fieldX: annotation.x,
        fieldY: annotation.y,
      };
    }
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
      const newX = Math.max(0, Math.min(100 - annotation.width, dragStart.current.fieldX + dxPercent));
      const newY = Math.max(0, Math.min(100 - annotation.height, dragStart.current.fieldY + dyPercent));
      onMove(annotation.id, Math.round(newX * 10) / 10, Math.round(newY * 10) / 10);
    };

    const handleEnd = () => {
      setDragging(false);
      dragStart.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
    };
  }, [dragging, annotation.id, annotation.width, annotation.height, containerRef, onMove]);

  const isHighlight = annotation.type === "highlight";
  const isShape = annotation.type === "shape";
  const isDrawing = annotation.type === "drawing";

  const pointerEvents = (activeTool === "select" || activeTool === "text") ? "auto" : "none";

  return (
    <div
      className={`absolute group/annotation ${
        isSelected ? "z-20" : "z-10"
      }`}
      style={{
        left: `${annotation.x}%`,
        top: `${annotation.y}%`,
        width: `${annotation.width}%`,
        minHeight: `${annotation.height}%`,
        ...(isHighlight ? { backgroundColor: `${annotation.color}40` } : {}),
        pointerEvents,
        cursor: activeTool === "select" ? "move" : activeTool === "text" ? "text" : "default",
        userSelect: editing ? "text" : "none",
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {(isHighlight || isShape) && isSelected && (
        <div
          className="absolute inset-0 rounded"
          style={{
            border: `2px dashed ${annotation.color}`,
            backgroundColor: isHighlight ? `${annotation.color}30` : "transparent",
          }}
        />
      )}
      {isShape && !isSelected && (
        <div
          className="absolute inset-0 rounded"
          style={{
            border: `1.5px solid ${annotation.color}`,
            backgroundColor: `${annotation.color}10`,
          }}
        />
      )}
      {!isHighlight && !isShape && !isDrawing && (
        <div
          className={`rounded px-1 ${
            isSelected ? "ring-2 ring-[#0D9488] ring-offset-1" : "hover:ring-1 hover:ring-[#0D9488]/40"
          }`}
          style={{
            fontSize: `${annotation.fontSize}px`,
            fontFamily: annotation.fontFamily,
            color: annotation.color,
            fontWeight: annotation.bold ? 700 : 400,
            fontStyle: annotation.italic ? "italic" : "normal",
            textDecoration: [
              annotation.underline ? "underline" : "",
              annotation.strikethrough ? "line-through" : "",
            ].filter(Boolean).join(" ") || "none",
            textAlign: annotation.alignment,
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          {editing ? (
            <textarea
              autoFocus
              value={annotation.text}
              onChange={(e) => onUpdate(annotation.id, { text: e.target.value })}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditing(false);
              }}
              className="w-full bg-transparent border-none outline-none resize-none p-0"
              style={{
                fontSize: `${annotation.fontSize}px`,
                fontFamily: annotation.fontFamily,
                color: annotation.color,
                fontWeight: annotation.bold ? 700 : 400,
                fontStyle: annotation.italic ? "italic" : "normal",
                textDecoration: [
                  annotation.underline ? "underline" : "",
                  annotation.strikethrough ? "line-through" : "",
                ].filter(Boolean).join(" ") || "none",
                textAlign: annotation.alignment,
                minHeight: "1.5em",
              }}
            />
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>{annotation.text || "Double-click to edit"}</span>
          )}
        </div>
      )}
      {isSelected && !editing && (
        <button
          className="absolute -top-2 -right-2 size-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); onRemove(annotation.id); }}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

// ─── Editable PDF Page Renderer ─────────────────────────────────────
function EditablePdfPageRenderer({
  pdfDoc,
  pageNum,
  zoomLevel,
  pageAnnotations,
  selectedAnnotation,
  activeTool,
  onSelectAnnotation,
  onMoveAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
  onAddAnnotationAt,
  onDrawEnd,
}: {
  pdfDoc: any; // PDFDocumentProxy
  pageNum: number;
  zoomLevel: number;
  pageAnnotations: TextAnnotation[];
  selectedAnnotation: string | null;
  activeTool: EditorTool;
  onSelectAnnotation: (id: string | null) => void;
  onMoveAnnotation: (id: string, x: number, y: number) => void;
  onRemoveAnnotation: (id: string) => void;
  onUpdateAnnotation: (id: string, updates: Partial<TextAnnotation>) => void;
  onAddAnnotationAt: (pageNum: number, xPercent: number, yPercent: number, type: "text" | "highlight" | "shape") => void;
  onDrawEnd: (pageNum: number, imageData: ImageData) => void;
}) {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageWrapperRef = useRef<HTMLDivElement | null>(null);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });
  const dimsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const [extractedText, setExtractedText] = useState<ExtractedTextItem[]>([]);

  // Render this page and extract text whenever pdfDoc or zoom changes
  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;

    const renderPage = async (attempt = 0) => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = Math.max(600, window.innerWidth - 100);
        const baseScale = Math.min(containerWidth / baseViewport.width, 2);
        const scale = baseScale * (zoomLevel / 100);
        const finalScale = Math.max(0.3, Math.min(scale, 3));
        const viewport = page.getViewport({ scale: finalScale });

        const canvas = bgCanvasRef.current;
        if (!canvas) {
          if (attempt < 10) {
            setTimeout(() => { if (!cancelled) renderPage(attempt + 1); }, 150);
          }
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Size the draw overlay canvas
        const drawCanvas = drawCanvasRef.current;
        if (drawCanvas) {
          drawCanvas.width = viewport.width;
          drawCanvas.height = viewport.height;
        }

        if (dimsDebounceRef.current) clearTimeout(dimsDebounceRef.current);
        dimsDebounceRef.current = setTimeout(() => {
          if (!cancelled) setCanvasDims({ width: viewport.width, height: viewport.height });
        }, 50);

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // Extract text content
        if (!cancelled) {
          try {
            const textContent = await page.getTextContent();
            const textItems: ExtractedTextItem[] = [];
            for (const item of textContent.items) {
              const ti = item as any;
              if (!ti.str || ti.str.trim() === "") continue;
              // transform: [scaleX, skewX, skewY, scaleY, x, y]
              const tx = ti.transform[4] * finalScale;
              const ty = viewport.height - ti.transform[5] * finalScale;
              const fontSize = Math.abs(ti.transform[3]) * finalScale || 12;
              textItems.push({
                text: ti.str,
                x: tx,
                y: ty - fontSize * 0.85, // adjust baseline
                width: ti.width * finalScale,
                height: fontSize * 1.2,
                fontSize,
                fontFamily: "sans-serif",
              });
            }
            if (!cancelled) setExtractedText(textItems);
          } catch (textErr) {
            console.error(`Text extraction error page ${pageNum}:`, textErr);
          }
        }
      } catch (err) {
        console.error(`PDF render error page ${pageNum}:`, err);
      }
    };

    renderPage();
    return () => {
      cancelled = true;
      if (dimsDebounceRef.current) clearTimeout(dimsDebounceRef.current);
    };
  }, [pdfDoc, pageNum, zoomLevel]);

  // Drawing handlers
  const handleDrawStart = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "draw" && activeTool !== "eraser") return;
    e.stopPropagation();
    setIsDrawing(true);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawStartRef.current = { x, y };
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      if (activeTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = 20;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "#DC2626";
        ctx.lineWidth = 2;
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [activeTool]);

  const handleDrawMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || (activeTool !== "draw" && activeTool !== "eraser")) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, [isDrawing, activeTool]);

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    drawStartRef.current = null;
    // Capture draw canvas content
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    // Check if there are any non-transparent pixels
    const hasContent = imageData.data.some((v, i) => i % 4 === 3 && v > 0);
    if (hasContent) {
      onDrawEnd(pageNum, imageData);
    }
  }, [isDrawing, pageNum, onDrawEnd]);

  // Handle click on the page background to add annotations
  const handlePageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== "text" && activeTool !== "highlight" && activeTool !== "shape") return;
    const wrapper = pageWrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    onAddAnnotationAt(pageNum, xPercent, yPercent, activeTool as "text" | "highlight" | "shape");
  }, [activeTool, pageNum, onAddAnnotationAt]);

  const isDrawMode = activeTool === "draw" || activeTool === "eraser";
  const isTextMode = activeTool === "select" || activeTool === "text";

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-[#6B7280] mb-2 font-medium">Page {pageNum}</p>
      <div
        ref={pageWrapperRef}
        className="relative bg-white shadow-[0_2px_12px_rgba(0,0,0,0.12)]"
        style={{
          width: canvasDims.width ? `${canvasDims.width}px` : "auto",
          height: canvasDims.height ? `${canvasDims.height}px` : "auto",
        }}
        onClick={(e) => {
          // Only handle if the target is the wrapper itself or the text overlay
          const target = e.target as HTMLElement;
          if (target === pageWrapperRef.current || target.classList.contains("text-overlay-layer")) {
            handlePageClick(e);
            if (activeTool === "select") {
              onSelectAnnotation(null);
            }
          }
        }}
      >
        {/* Layer 1: Canvas background - rendered PDF page */}
        <canvas ref={bgCanvasRef} className="block" />

        {/* Layer 2: Drawing canvas - for pen/eraser strokes */}
        <canvas
          ref={drawCanvasRef}
          className="absolute top-0 left-0"
          style={{
            cursor: activeTool === "draw" ? "crosshair" : activeTool === "eraser" ? "cell" : "default",
            pointerEvents: isDrawMode ? "auto" : "none",
            zIndex: 5,
          }}
          onMouseDown={handleDrawStart}
          onMouseMove={handleDrawMove}
          onMouseUp={handleDrawEnd}
          onMouseLeave={handleDrawEnd}
        />

        {/* Layer 3: Editable text overlay - extracted PDF text */}
        <div
          className="text-overlay-layer absolute top-0 left-0 w-full h-full"
          style={{
            pointerEvents: isTextMode ? "auto" : "none",
            cursor: activeTool === "text" ? "text" : activeTool === "select" ? "text" : "default",
            zIndex: 2,
          }}
        >
          {extractedText.map((item, i) => (
            <span
              key={`text-${pageNum}-${i}`}
              contentEditable={activeTool === "select" || activeTool === "text"}
              suppressContentEditableWarning
              className="absolute outline-none hover:bg-[#0D9488]/5 focus:bg-[#0D9488]/10 rounded-sm transition-colors"
              style={{
                left: `${item.x}px`,
                top: `${item.y}px`,
                fontSize: `${item.fontSize}px`,
                fontFamily: item.fontFamily,
                lineHeight: "1.2",
                whiteSpace: "pre",
                color: "transparent",
                minWidth: `${Math.max(item.width, 2)}px`,
                caretColor: "#0D9488",
              }}
              onFocus={(e) => {
                // Make text visible when focused
                (e.target as HTMLElement).style.color = "rgba(0,0,0,0.85)";
                (e.target as HTMLElement).style.backgroundColor = "rgba(13,148,136,0.08)";
              }}
              onBlur={(e) => {
                // Make text transparent again when blurred (but keep if content changed)
                const el = e.target as HTMLElement;
                const originalText = item.text;
                if (el.innerText.trim() === originalText.trim()) {
                  el.style.color = "transparent";
                  el.style.backgroundColor = "transparent";
                } else {
                  el.style.color = "rgba(220,38,38,0.9)"; // Red for edited text
                  el.style.backgroundColor = "rgba(220,38,38,0.05)";
                }
              }}
            >
              {item.text}
            </span>
          ))}
        </div>

        {/* Layer 4: Annotation overlays (highlights, shapes, added text boxes) */}
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            pointerEvents: isTextMode ? "auto" : "none",
            zIndex: 10,
          }}
        >
          {pageAnnotations.map((a) => (
            <DraggableTextAnnotation
              key={a.id}
              annotation={a}
              isSelected={selectedAnnotation === a.id}
              containerRef={pageWrapperRef}
              onSelect={() => onSelectAnnotation(a.id)}
              onMove={(id, x, y) => onMoveAnnotation(id, x, y)}
              onRemove={onRemoveAnnotation}
              onUpdate={onUpdateAnnotation}
              activeTool={activeTool}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Editable PDF Viewer Component ──────────────────────────────────
function EditablePdfViewer({
  pdfData,
  annotations,
  selectedAnnotation,
  activeTool,
  zoomLevel,
  onTotalPagesChange,
  onSelectAnnotation,
  onMoveAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
  onAddAnnotationAt,
  onDrawEnd,
}: {
  pdfData: ArrayBuffer | null;
  annotations: TextAnnotation[];
  selectedAnnotation: string | null;
  activeTool: EditorTool;
  zoomLevel: number;
  onTotalPagesChange: (pages: number) => void;
  onSelectAnnotation: (id: string | null) => void;
  onMoveAnnotation: (id: string, x: number, y: number) => void;
  onRemoveAnnotation: (id: string) => void;
  onUpdateAnnotation: (id: string, updates: Partial<TextAnnotation>) => void;
  onAddAnnotationAt: (pageNum: number, xPercent: number, yPercent: number, type: "text" | "highlight" | "shape") => void;
  onDrawEnd: (pageNum: number, imageData: ImageData) => void;
}) {
  const [pdfRenderError, setPdfRenderError] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const pdfDocRef = useRef<any>(null); // PDFDocumentProxy

  // Load PDF document once when pdfData changes
  useEffect(() => {
    if (!pdfData) {
      pdfDocRef.current = null;
      setTotalPages(0);
      return;
    }

    let cancelled = false;
    setPdfRenderError(false);

    const loadPdf = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        // Use new Uint8Array to prevent ArrayBuffer detachment
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfData) });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        onTotalPagesChange(pdf.numPages);
      } catch (err) {
        console.error("PDF load error:", err);
        if (!cancelled) setPdfRenderError(true);
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [pdfData]);

  if (!pdfData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-2xl border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] min-h-[500px]">
        <Upload className="size-16 text-[#9CA3AF] mb-4" />
        <p className="text-lg font-medium text-[#6B7280]">Upload a PDF to preview</p>
        <p className="text-sm text-[#9CA3AF] mt-1">Supported: PDF files up to 25MB</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pdfRenderError && (
        <div className="border border-[#DC2626]/30 rounded-xl bg-[#FEF2F2] p-6 text-center mb-3">
          <AlertCircle className="size-8 text-[#DC2626] mx-auto mb-2" />
          <p className="text-sm text-[#DC2626] font-medium">Failed to load document preview</p>
          <p className="text-xs text-[#6B7280] mt-1">Try re-uploading the PDF.</p>
        </div>
      )}
      <div
        className="overflow-y-auto rounded-xl"
        style={{ maxHeight: "80vh", backgroundColor: "#E5E7EB" }}
        onClick={() => onSelectAnnotation(null)}
      >
        <div className="flex flex-col items-center gap-8 py-8 px-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pn) => (
            <EditablePdfPageRenderer
              key={pn}
              pdfDoc={pdfDocRef.current}
              pageNum={pn}
              zoomLevel={zoomLevel}
              pageAnnotations={annotations.filter((a) => a.page === pn)}
              selectedAnnotation={selectedAnnotation}
              activeTool={activeTool}
              onSelectAnnotation={onSelectAnnotation}
              onMoveAnnotation={onMoveAnnotation}
              onRemoveAnnotation={onRemoveAnnotation}
              onUpdateAnnotation={onUpdateAnnotation}
              onAddAnnotationAt={onAddAnnotationAt}
              onDrawEnd={onDrawEnd}
            />
          ))}
        </div>
      </div>

      {/* Annotation count indicator */}
      {annotations.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <Type className="size-3" />
          <span>{annotations.length} annotation{annotations.length !== 1 ? "s" : ""} added</span>
        </div>
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

  // Step 1 — Upload & Edit
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [editorTotalPages, setEditorTotalPages] = useState(1);
  const [editorZoom, setEditorZoom] = useState(100);
  const [editedPdfBytes, setEditedPdfBytes] = useState<Uint8Array | null>(null);
  const [drawingData, setDrawingData] = useState<Map<number, ImageData>>(new Map());

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

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<TextAnnotation[][]>([]);
  const [redoStack, setRedoStack] = useState<TextAnnotation[][]>([]);

  // ─── When file is uploaded, read as ArrayBuffer ────────────
  useEffect(() => {
    if (uploadedFile && !pdfData) {
      const reader = new FileReader();
      reader.onload = () => {
        setPdfData(reader.result as ArrayBuffer);
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

  // ─── Annotation Handlers ────────────────────────────────────────────
  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-19), annotations]);
    setRedoStack([]);
  }, [annotations]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, annotations]);
    setAnnotations(prev);
    setUndoStack((u) => u.slice(0, -1));
  }, [undoStack, annotations]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, annotations]);
    setAnnotations(next);
    setRedoStack((r) => r.slice(0, -1));
  }, [redoStack, annotations]);

  const handleAddAnnotation = (type: "text" | "highlight" | "shape") => {
    pushUndo();
    const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const annotation: TextAnnotation = {
      id,
      page: 1,
      x: 10 + Math.random() * 30,
      y: 20 + annotations.length * 5,
      width: type === "highlight" ? 60 : 25,
      height: type === "highlight" ? 3 : 5,
      text: type === "text" ? "Type here" : "",
      fontSize: 14,
      fontFamily: "Arial",
      color: type === "highlight" ? "#FBBF24" : type === "shape" ? "#0D9488" : "#111827",
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      alignment: "left",
      type,
    };
    setAnnotations((prev) => [...prev, annotation]);
    setSelectedAnnotation(id);
    setActiveTool("select");
    toast.success(`${type === "text" ? "Text" : type === "highlight" ? "Highlight" : "Shape"} added — drag to position, double-click to edit`);
  };

  // Add annotation at specific page position (for click-to-add)
  const handleAddAnnotationAt = useCallback((pageNum: number, xPercent: number, yPercent: number, type: "text" | "highlight" | "shape") => {
    const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const annotation: TextAnnotation = {
      id,
      page: pageNum,
      x: xPercent,
      y: yPercent,
      width: type === "highlight" ? 60 : 25,
      height: type === "highlight" ? 3 : 5,
      text: type === "text" ? "Type here" : "",
      fontSize: 14,
      fontFamily: "Arial",
      color: type === "highlight" ? "#FBBF24" : type === "shape" ? "#0D9488" : "#111827",
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      alignment: "left",
      type,
    };
    setAnnotations((prev) => [...prev, annotation]);
    setSelectedAnnotation(id);
    toast.success(`${type === "text" ? "Text" : type === "highlight" ? "Highlight" : "Shape"} added at click position`);
  }, []);

  const handleMoveAnnotation = useCallback((id: string, x: number, y: number) => {
    setAnnotations((prev) => prev.map((a) => a.id === id ? { ...a, x, y } : a));
  }, []);

  const handleRemoveAnnotation = (id: string) => {
    pushUndo();
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedAnnotation === id) setSelectedAnnotation(null);
  };

  const handleUpdateAnnotation = (id: string, updates: Partial<TextAnnotation>) => {
    setAnnotations((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
  };

  const handleApplyFormat = (property: string, value: any) => {
    if (!selectedAnnotation) return;
    pushUndo();
    handleUpdateAnnotation(selectedAnnotation, { [property]: value });
  };

  // Handle drawing data collection
  const handleDrawEnd = useCallback((pageNum: number, imageData: ImageData) => {
    setDrawingData((prev) => new Map(prev).set(pageNum, imageData));
  }, []);

  // ─── Field Placement PDF Rendering (Step 3) ─────────────────────────
  useEffect(() => {
    if (step !== 3 || !fieldPdfData) return;

    let cancelled = false;
    setFieldRenderError(false);

    const renderPdf = async (attempt = 0) => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const loadingTask = pdfjsLib.getDocument({ data: fieldPdfData });
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
        }).promise;
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
  const handleSave = async () => {
    if (!pdfData) return;
    try {
      const modifiedBytes = await saveEditedPdf(
        new Uint8Array(pdfData),
        annotations,
        drawingData
      );
      setEditedPdfBytes(modifiedBytes);
      toast.success("PDF saved with edits");
    } catch (err) {
      console.error("Save PDF error:", err);
      toast.error("Failed to save PDF");
    }
  };

  const handleStep1Next = async () => {
    if (!uploadedFile) return toast.error("Please upload a PDF file first");
    // If there are annotations or drawings, save them into the PDF first
    if (annotations.length > 0 || drawingData.size > 0) {
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
    const pdfForField = editedPdfBytes ? editedPdfBytes.buffer as ArrayBuffer : pdfData;
    if (pdfForField && !fieldPdfData) {
      setFieldPdfData(pdfForField);
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
        const editedFile = new File([editedPdfBytes], uploadedFile?.name || "document.pdf", { type: "application/pdf" });
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

  // ─── Get selected annotation for property panel ──
  const selectedAnn = selectedAnnotation ? annotations.find((a) => a.id === selectedAnnotation) : null;

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
          Upload Custom PDF
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">Upload a PDF document, preview and edit it, then save it for future signing.</p>
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
          {step === 1 && "Step 1: Upload & Edit PDF"}
          {step === 2 && "Step 2: Document Details & Signers"}
          {step === 3 && "Step 3: Place Fields on Document"}
          {step === 4 && "Step 4: Review & Send"}
        </p>
      </div>

      {/* ── STEP 1: Upload & Edit PDF ─────────────────────────────── */}
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
                    setAnnotations([]);
                    setSelectedAnnotation(null);
                    setEditorTotalPages(1);
                    setEditorZoom(100);
                    setEditedPdfBytes(null);
                    setDrawingData(new Map());
                  }}
                  className="text-sm text-[#0D9488] hover:text-[#0F766E] font-medium transition-colors"
                >
                  Remove & upload different file
                </button>
              </div>

              {/* ── PDF Editor Toolbar (Word-like) ── */}
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm">
                {/* Main Toolbar Row */}
                <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#F3F4F6]">
                  {/* Select tool */}
                  <button
                    onClick={() => setActiveTool("select")}
                    className={`p-2 rounded-md transition-colors ${activeTool === "select" ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]"}`}
                    title="Select & Move"
                  >
                    <MousePointer2 className="size-[18px]" />
                  </button>

                  {/* Text tool */}
                  <button
                    onClick={() => setActiveTool("text")}
                    className={`p-2 rounded-md transition-colors ${activeTool === "text" ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]"}`}
                    title="Add Text — click on page to place"
                  >
                    <Type className="size-[18px]" />
                  </button>

                  {/* Pencil / Draw */}
                  <button
                    onClick={() => setActiveTool("draw")}
                    className={`p-2 rounded-md transition-colors ${activeTool === "draw" ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]"}`}
                    title="Draw / Pen"
                  >
                    <Pencil className="size-[18px]" />
                  </button>

                  {/* Highlighter */}
                  <button
                    onClick={() => setActiveTool("highlight")}
                    className={`p-2 rounded-md transition-colors ${activeTool === "highlight" ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]"}`}
                    title="Highlight — click on page to place"
                  >
                    <Highlighter className="size-[18px]" />
                  </button>

                  {/* Shape */}
                  <button
                    onClick={() => setActiveTool("shape")}
                    className={`p-2 rounded-md transition-colors ${activeTool === "shape" ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]"}`}
                    title="Add Shape — click on page to place"
                  >
                    <Square className="size-[18px]" />
                  </button>

                  {/* Eraser */}
                  <button
                    onClick={() => setActiveTool("eraser")}
                    className={`p-2 rounded-md transition-colors ${activeTool === "eraser" ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]"}`}
                    title="Eraser"
                  >
                    <Eraser className="size-[18px]" />
                  </button>

                  {/* Divider */}
                  <div className="w-px h-6 bg-[#E5E7EB] mx-1" />

                  {/* Undo / Redo */}
                  <button
                    onClick={handleUndo}
                    className={`p-2 rounded-md transition-colors ${undoStack.length === 0 ? "text-[#D1D5DB] cursor-not-allowed" : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]"}`}
                    title="Undo"
                    disabled={undoStack.length === 0}
                  >
                    <Undo2 className="size-[18px]" />
                  </button>
                  <button
                    onClick={handleRedo}
                    className={`p-2 rounded-md transition-colors ${redoStack.length === 0 ? "text-[#D1D5DB] cursor-not-allowed" : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]"}`}
                    title="Redo"
                    disabled={redoStack.length === 0}
                  >
                    <Redo2 className="size-[18px]" />
                  </button>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Edited indicator */}
                  {editedPdfBytes && (
                    <Badge className="bg-[#CCFBF1] text-[#0D9488] border-0 text-xs mr-2">
                      Edited
                    </Badge>
                  )}

                  {/* Page count */}
                  <span className="text-xs text-[#6B7280] font-medium px-2">{editorTotalPages} page{editorTotalPages !== 1 ? "s" : ""}</span>

                  {/* Divider */}
                  <div className="w-px h-6 bg-[#E5E7EB] mx-1" />

                  {/* Zoom controls */}
                  <button
                    onClick={() => setEditorZoom((z) => zoomLevels[Math.max(0, zoomLevels.indexOf(z) - 1)])}
                    className="p-1.5 rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={editorZoom <= 50}
                    title="Zoom Out"
                  >
                    <ZoomOut className="size-4" />
                  </button>
                  <span className="text-xs text-[#374151] w-10 text-center font-medium">{editorZoom}%</span>
                  <button
                    onClick={() => setEditorZoom((z) => zoomLevels[Math.min(zoomLevels.length - 1, zoomLevels.indexOf(z) + 1)])}
                    className="p-1.5 rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={editorZoom >= 200}
                    title="Zoom In"
                  >
                    <ZoomIn className="size-4" />
                  </button>
                </div>

                {/* Formatting Row - appears when text annotation is selected */}
                {selectedAnn && selectedAnn.type === "text" && (
                  <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#F3F4F6] flex-wrap">
                    {/* Font Family */}
                    <select
                      value={selectedAnn.fontFamily}
                      onChange={(e) => handleApplyFormat("fontFamily", e.target.value)}
                      className="h-7 rounded-md border border-[#E5E7EB] text-xs px-1.5 bg-white text-[#374151] max-w-[130px] hover:border-[#9CA3AF] focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] outline-none"
                    >
                      {fontFamilies.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    {/* Font Size */}
                    <select
                      value={selectedAnn.fontSize}
                      onChange={(e) => handleApplyFormat("fontSize", parseInt(e.target.value))}
                      className="h-7 rounded-md border border-[#E5E7EB] text-xs px-1.5 bg-white text-[#374151] w-[55px] hover:border-[#9CA3AF] focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488] outline-none"
                    >
                      {fontSizes.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                    <div className="w-px h-5 bg-[#E5E7EB] mx-0.5" />

                    {/* Bold */}
                    <button
                      onClick={() => handleApplyFormat("bold", !selectedAnn.bold)}
                      className={`p-1.5 rounded-md transition-colors ${selectedAnn.bold ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6]"}`}
                      title="Bold"
                    >
                      <Bold className="size-4" />
                    </button>
                    {/* Italic */}
                    <button
                      onClick={() => handleApplyFormat("italic", !selectedAnn.italic)}
                      className={`p-1.5 rounded-md transition-colors ${selectedAnn.italic ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6]"}`}
                      title="Italic"
                    >
                      <Italic className="size-4" />
                    </button>
                    {/* Underline */}
                    <button
                      onClick={() => handleApplyFormat("underline", !selectedAnn.underline)}
                      className={`p-1.5 rounded-md transition-colors ${selectedAnn.underline ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6]"}`}
                      title="Underline"
                    >
                      <Underline className="size-4" />
                    </button>
                    {/* Strikethrough */}
                    <button
                      onClick={() => handleApplyFormat("strikethrough", !selectedAnn.strikethrough)}
                      className={`p-1.5 rounded-md transition-colors ${selectedAnn.strikethrough ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6]"}`}
                      title="Strikethrough"
                    >
                      <Strikethrough className="size-4" />
                    </button>

                    <div className="w-px h-5 bg-[#E5E7EB] mx-0.5" />

                    {/* Text Color */}
                    <div className="relative">
                      <button
                        className="p-1.5 rounded-md text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
                        title="Text Color"
                      >
                        <Baseline className="size-4" />
                        <div
                          className="h-[3px] w-4 mx-auto -mt-0.5 rounded-full"
                          style={{ backgroundColor: selectedAnn.color }}
                        />
                      </button>
                      <input
                        type="color"
                        value={selectedAnn.color}
                        onChange={(e) => handleApplyFormat("color", e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>

                    <div className="w-px h-5 bg-[#E5E7EB] mx-0.5" />

                    {/* Alignment */}
                    <button
                      onClick={() => handleApplyFormat("alignment", "left")}
                      className={`p-1.5 rounded-md transition-colors ${selectedAnn.alignment === "left" ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6]"}`}
                      title="Align Left"
                    >
                      <AlignLeft className="size-4" />
                    </button>
                    <button
                      onClick={() => handleApplyFormat("alignment", "center")}
                      className={`p-1.5 rounded-md transition-colors ${selectedAnn.alignment === "center" ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6]"}`}
                      title="Align Center"
                    >
                      <AlignCenter className="size-4" />
                    </button>
                    <button
                      onClick={() => handleApplyFormat("alignment", "right")}
                      className={`p-1.5 rounded-md transition-colors ${selectedAnn.alignment === "right" ? "bg-[#0D9488]/10 text-[#0D9488]" : "text-[#6B7280] hover:bg-[#F3F4F6]"}`}
                      title="Align Right"
                    >
                      <AlignRight className="size-4" />
                    </button>

                    <div className="w-px h-5 bg-[#E5E7EB] mx-0.5" />

                    {/* Delete */}
                    <button
                      onClick={() => handleRemoveAnnotation(selectedAnn.id)}
                      className="p-1.5 rounded-md text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}

                {/* Tool hint */}
                <div className="px-3 py-1 bg-[#F8F7F4] text-xs text-[#9CA3AF]">
                  {activeTool === "select" && "Click text to edit, drag annotations to move, double-click to edit text"}
                  {activeTool === "text" && "Click anywhere on the page to add a text annotation"}
                  {activeTool === "draw" && "Click and drag to draw on the PDF"}
                  {activeTool === "eraser" && "Click and drag to erase drawn strokes"}
                  {activeTool === "highlight" && "Click on the page to add a highlight"}
                  {activeTool === "shape" && "Click on the page to add a rectangle shape"}
                </div>
              </div>

              {/* PDF Editor */}
              <EditablePdfViewer
                pdfData={pdfData}
                annotations={annotations}
                selectedAnnotation={selectedAnnotation}
                activeTool={activeTool}
                zoomLevel={editorZoom}
                onTotalPagesChange={setEditorTotalPages}
                onSelectAnnotation={setSelectedAnnotation}
                onMoveAnnotation={handleMoveAnnotation}
                onRemoveAnnotation={handleRemoveAnnotation}
                onUpdateAnnotation={handleUpdateAnnotation}
                onAddAnnotationAt={handleAddAnnotationAt}
                onDrawEnd={handleDrawEnd}
              />
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
                {annotations.length > 0 && <Badge className="bg-[#CCFBF1] text-[#0D9488] border-0">{annotations.length} annotation{annotations.length !== 1 ? "s" : ""}</Badge>}
                {editedPdfBytes && <Badge className="bg-[#CCFBF1] text-[#0D9488] border-0">Edited PDF</Badge>}
              </div>
            </div>

            {/* Signers */}
            <div>
              <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">Signers</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#CCFBF1]/20">
                  <span className="size-3 rounded-full" style={{ backgroundColor: partyColors[0] }} />
                  <div>
                    <span className="text-sm font-medium text-[#111827]">{user?.firstName} {user?.lastName}</span>
                    <span className="text-xs text-[#6B7280] ml-2">Sender</span>
                  </div>
                  <span className="ml-auto text-xs text-[#6B7280]">
                    {signingOrder === "sequential" ? "Signs #1" : "Signs simultaneously"}
                  </span>
                  <span className="text-xs text-[#9CA3AF]">
                    {signFields.filter((f) => f.assigned_to_signer_id === "party_1").length} fields
                  </span>
                </div>
                {signers.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F7F4]">
                    <span className="size-3 rounded-full" style={{ backgroundColor: partyColors[Math.min(i + 1, 3)] }} />
                    <div>
                      <span className="text-sm font-medium text-[#111827]">{s.name || "Unnamed"}</span>
                      <span className="text-xs text-[#6B7280] ml-2">{s.role}</span>
                    </div>
                    <span className="ml-auto text-xs text-[#6B7280]">
                      {signingOrder === "sequential" ? `Signs #${i + 2}` : "Signs simultaneously"}
                    </span>
                    <span className="text-xs text-[#9CA3AF]">
                      {signFields.filter((f) => f.assigned_to_signer_id === `party_${s.party_number}`).length} fields
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div>
              <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">Settings</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-[#6B7280]">Signing Order:</span> <span className="text-[#111827] capitalize">{signingOrder}</span></div>
                <div><span className="text-[#6B7280]">Expires:</span> <span className="text-[#111827]">{new Date(expiryDate).toLocaleDateString()}</span></div>
              </div>
            </div>

            {/* Legal Consent */}
            <div className="pt-4 border-t border-[#E5E7EB]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={legalConsent} onChange={(e) => setLegalConsent(e.target.checked)} className="mt-1 accent-[#0D9488]" />
                <span className="text-sm text-[#6B7280]">
                  I confirm that I have the right to request signatures on this document and all parties have agreed to use electronic signatures.
                </span>
              </label>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!legalConsent || loading}
              className="w-full bg-[#0D9488] hover:bg-[#0F766E] py-4 text-base font-semibold"
            >
              {loading ? (
                <><Loader2 className="size-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                "Send for Signature"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        {step > 1 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} className="text-[#6B7280]">
            <ArrowLeft className="size-4 mr-2" /> Back
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => router.push("/recruiter/vaultsign")} className="text-[#6B7280]">
            <ArrowLeft className="size-4 mr-2" /> Cancel
          </Button>
        )}
        {step === 1 && uploadedFile && (
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleSave} className="border-[#0D9488] text-[#0D9488] hover:bg-[#CCFBF1]">
              <Save className="size-4 mr-2" /> Save
            </Button>
            <Button onClick={handleStep1Next} className="bg-[#0D9488] hover:bg-[#0F766E]">
              Save and Next: Add Signers <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        )}
        {step === 2 && (
          <Button onClick={handleStep2Next} className="bg-[#0D9488] hover:bg-[#0F766E]">
            Next: Place Fields <ArrowRight className="size-4 ml-2" />
          </Button>
        )}
        {step === 3 && (
          <Button onClick={handleStep3Next} className="bg-[#0D9488] hover:bg-[#0F766E]">
            Next: Review & Send <ArrowRight className="size-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function UploadVaultSignPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin text-[#0D9488]" /></div>}>
      <UploadVaultSignContent />
    </Suspense>
  );
}

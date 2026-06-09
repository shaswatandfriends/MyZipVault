"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, ArrowRight, ArrowLeft, Plus, X, Loader2, FileSignature,
  Check, ChevronLeft, ChevronRight, Trash2, GripVertical, AlertCircle,
  LayoutTemplate, Save, Send,
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
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  assigned_to_signer_id: string;
  label: string;
  required: boolean;
  value: string | null;
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
  { type: "signature", label: "Signature", icon: "\u270D\uFE0F" },
  { type: "date", label: "Date Signed", icon: "\uD83D\uDCC5" },
  { type: "full_name", label: "Full Name", icon: "\uD83C\uDD70\uFE0F" },
  { type: "initials", label: "Initials", icon: "\uD83D\uDCDD" },
  { type: "email", label: "Email", icon: "\u2709\uFE0F" },
  { type: "text", label: "Text Field", icon: "\uD83D\uDCCB" },
  { type: "checkbox", label: "Checkbox", icon: "\u2611\uFE0F" },
];

const partyColors = ["#166534", "#0D9488", "#7C3AED", "#D97706"];
const roleOptions = ["Candidate", "Client Employer", "Witness", "Recruiter"];
const zoomLevels = [50, 75, 100, 125, 150, 200];

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
export default function UploadCustomPdfPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Upload & Details
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("custom");
  const [personalMessage, setPersonalMessage] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [signingOrder, setSigningOrder] = useState("sequential");

  // Step 2: Signers & Fields
  const [signers, setSigners] = useState<SignerForm[]>([
    { name: "", email: "", role: "Candidate", party_number: 2, signing_order_position: 2 },
  ]);
  const [signFields, setSignFields] = useState<SignField[]>([]);
  const [activeSignerTab, setActiveSignerTab] = useState(0);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfPageWrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });
  const canvasDimsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pdfRenderError, setPdfRenderError] = useState(false);

  // Step 3: Review & Save
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingAndSending, setSavingAndSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Handle file upload ───────────────────────────────────────────
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large (max 25MB)");
      return;
    }
    setUploadedFile(file);
    // Default document name to file name without extension
    const nameWithoutExt = file.name.replace(/\.pdf$/i, "");
    if (!documentName.trim()) {
      setDocumentName(nameWithoutExt);
    }
  }, [documentName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // ─── PDF rendering with pdfjs-dist ────────────────────────────────
  useEffect(() => {
    if ((step !== 2 && step !== 3) || !pdfUrl) return;

    let cancelled = false;
    setPdfRenderError(false);

    const renderPdf = async (attempt = 0) => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        } catch {
          try { pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"; } catch {}
        }

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        if (cancelled) return;
        setTotalPages(pdf.numPages);

        const pageNum = currentPage;
        if (pageNum < 1 || pageNum > pdf.numPages) return;

        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const containerEl = pdfContainerRef.current;
        const containerWidth = containerEl ? containerEl.offsetWidth - 2 : 800;
        const baseScale = Math.min(containerWidth / baseViewport.width, 2);
        const scale = baseScale * (zoomLevel / 100);
        const finalScale = Math.max(0.3, Math.min(scale, 3));
        const viewport = page.getViewport({ scale: finalScale });

        const canvas = canvasRef.current;
        if (!canvas) {
          if (attempt < 3) {
            setTimeout(() => { if (!cancelled) renderPdf(attempt + 1); }, 100);
          }
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (canvasDimsDebounceRef.current) clearTimeout(canvasDimsDebounceRef.current);
        canvasDimsDebounceRef.current = setTimeout(() => {
          if (!cancelled) setCanvasDims({ width: viewport.width, height: viewport.height });
        }, 50);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error("PDF render error:", err);
        if (!cancelled) setPdfRenderError(true);
      }
    };

    renderPdf();
    return () => {
      cancelled = true;
      if (canvasDimsDebounceRef.current) clearTimeout(canvasDimsDebounceRef.current);
    };
  }, [step, pdfUrl, currentPage, zoomLevel]);

  // ─── Create PDF preview URL when file is uploaded ─────────────────
  useEffect(() => {
    if (uploadedFile && !pdfUrl) {
      const objUrl = URL.createObjectURL(uploadedFile);
      setPdfUrl(objUrl);
    }
  }, [uploadedFile, pdfUrl]);

  // ─── Cleanup object URLs on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      if (pdfUrl && pdfUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []);

  // ─── Get signers for field placement ──────────────────────────────
  const allSigners: { id: string; name: string; party: number }[] = [
    ...signers.map((s) => ({ id: `party_${s.party_number}`, name: s.name || `Party ${s.party_number}`, party: s.party_number })),
  ];

  // ─── Step 1 Validation ───────────────────────────────────────────
  const isStep1Valid = uploadedFile && documentName.trim() && expiryDate && new Date(expiryDate) > new Date();

  // ─── Step Handlers ────────────────────────────────────────────────
  const handleStep1Next = () => {
    if (!uploadedFile) return toast.error("Please upload a PDF file");
    if (!documentName.trim()) return toast.error("Document name is required");
    if (!expiryDate) return toast.error("Expiry date is required");
    if (new Date(expiryDate) <= new Date()) return toast.error("Expiry must be in the future");
    setStep(2);
  };

  const handleStep2Next = () => {
    const invalid = signers.find((s) => !s.name.trim() || !s.email.trim());
    if (invalid) return toast.error("All signers must have a name and email");

    const emails = signers.map((s) => s.email.trim().toLowerCase());
    const duplicateEmails = emails.filter((e, i) => emails.indexOf(e) !== i);
    if (duplicateEmails.length > 0) {
      toast.error(`Duplicate email found: ${[...new Set(duplicateEmails)].join(", ")}. Each signer must have a unique email.`);
      return;
    }

    setStep(3);
  };

  const handleAddField = (type: string) => {
    const activeSigner = allSigners[activeSignerTab];
    if (!activeSigner) return;
    const field: SignField = {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      page: currentPage,
      x: 10 + Math.random() * 30,
      y: 20 + signFields.filter((f) => f.page === currentPage).length * 10,
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

  // ─── Save Flow ────────────────────────────────────────────────────
  const handleSave = async (sendAfterSave: boolean) => {
    if (sendAfterSave) {
      setSavingAndSending(true);
    } else {
      setSavingDraft(true);
    }

    try {
      // 1. Create document
      const createRes = await fetch("/api/vaultsign/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_name: documentName,
          document_type: documentType,
          signing_order: signingOrder,
          expiry_date: expiryDate,
          personal_message: personalMessage || null,
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

      // 2. Upload PDF
      if (uploadedFile) {
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

      // 4. If "Save & Send", send for signature
      if (sendAfterSave) {
        const sendRes = await fetch(`/api/vaultsign/documents/${document.id}/send`, {
          method: "POST",
        });
        if (!sendRes.ok) {
          const err = await sendRes.json();
          throw new Error(err.error || "Failed to send document");
        }
        toast.success("Document saved and sent for signature \u2713");
      } else {
        toast.success("Document saved as draft \u2713");
      }

      // 5. Redirect to document detail page
      router.push(`/recruiter/vaultsign/${document.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to save document");
    } finally {
      setSavingDraft(false);
      setSavingAndSending(false);
    }
  };

  // ─── PDF Preview Component (reused across steps) ──────────────────
  const renderPdfPreview = () => (
    <div className="space-y-3">
      {/* Page & Zoom Controls */}
      <div className="flex items-center justify-between bg-[#F8F7F4] rounded-xl p-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-[#6B7280] min-w-[80px] text-center">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {zoomLevels.map((z) => (
            <button
              key={z}
              onClick={() => setZoomLevel(z)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                zoomLevel === z
                  ? "bg-[#166534] text-white"
                  : "text-[#6B7280] hover:bg-[#E5E7EB]"
              }`}
            >
              {z}%
            </button>
          ))}
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={pdfContainerRef}
        className="border border-[#E5E7EB] rounded-xl overflow-auto bg-[#F3F4F6] max-h-[600px]"
        onClick={() => setSelectedField(null)}
      >
        {pdfRenderError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="size-10 text-[#DC2626] mb-3" />
            <p className="text-sm font-medium text-[#DC2626]">Failed to render PDF preview</p>
            <p className="text-xs text-[#9CA3AF] mt-1">The file may be corrupted or password-protected.</p>
          </div>
        ) : (
          <div
            ref={pdfPageWrapperRef}
            className="relative mx-auto"
            style={{
              width: canvasDims.width || "auto",
              height: canvasDims.height || "auto",
            }}
          >
            <canvas ref={canvasRef} className="block" />

            {/* Sign fields overlay */}
            {signFields
              .filter((f) => f.page === currentPage)
              .map((field) => {
                const signerIdx = allSigners.findIndex((s) => s.id === field.assigned_to_signer_id);
                const signerColor = partyColors[Math.min(Math.max(signerIdx, 0), 3)];
                const signerName = allSigners[signerIdx]?.name || `Party ${field.assigned_to_signer_id}`;
                return (
                  <DraggableField
                    key={field.id}
                    field={field}
                    signerName={signerName}
                    signerColor={signerColor}
                    signerIdx={signerIdx}
                    isSelected={selectedField === field.id}
                    containerRef={pdfPageWrapperRef}
                    onSelect={() => setSelectedField(field.id)}
                    onMove={handleMoveField}
                    onRemove={handleRemoveField}
                  />
                );
              })}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Step Labels ──────────────────────────────────────────────────
  const stepLabels = [
    "Upload & Details",
    "Add Signers & Place Fields",
    "Review & Save",
  ];

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
          Upload Custom PDF
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Upload a PDF document, preview and edit it, then save it for future signing.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center justify-center size-8 rounded-full text-sm font-medium transition-all ${
              s === step ? "bg-[#166534] text-white" : s < step ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F3F4F6] text-[#9CA3AF]"
            }`}>
              {s < step ? <Check className="size-4" /> : s}
            </div>
            {s < 3 && <div className={`w-16 h-0.5 transition-all ${s < step ? "bg-[#166534]" : "bg-[#E5E7EB]"}`} />}
          </div>
        ))}
      </div>
      <div className="text-center mb-6">
        <p className="text-sm text-[#6B7280]">
          Step {step}: {stepLabels[step - 1]}
        </p>
      </div>

      {/* ── STEP 1: Upload & Details ─────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Upload Area */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#CCFBF1]">
                <Upload className="size-5 text-[#0D9488]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#111827]">Upload PDF</h3>
                <p className="text-xs text-[#6B7280]">Select a PDF file to get started</p>
              </div>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                isDragOver
                  ? "border-[#166534] bg-[#DCFCE7]/20"
                  : uploadedFile
                    ? "border-[#166534] bg-[#DCFCE7]/10"
                    : "border-[#E5E7EB] hover:border-[#166534]/50 bg-[#FAFAFA]"
              }`}
            >
              {uploadedFile ? (
                <>
                  <div className="flex items-center justify-center size-12 rounded-full bg-[#DCFCE7] mb-3">
                    <Check className="size-6 text-[#166534]" />
                  </div>
                  <p className="text-sm font-medium text-[#111827]">{uploadedFile.name}</p>
                  <p className="text-xs text-[#6B7280] mt-1">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-[#0D9488]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                      setDocumentName("");
                      if (pdfUrl && pdfUrl.startsWith("blob:")) {
                        URL.revokeObjectURL(pdfUrl);
                      }
                      setPdfUrl(null);
                    }}
                  >
                    Remove & upload a different file
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="size-10 text-[#9CA3AF] mb-3" />
                  <p className="text-sm font-medium text-[#111827]">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-1">PDF only, max 25MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
            </div>
          </div>

          {/* Document Details Form + PDF Preview side by side */}
          {uploadedFile && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Document Details */}
              <div className="space-y-4 bg-white rounded-2xl border border-[#E5E7EB] p-6">
                <h3 className="font-semibold text-[#111827] flex items-center gap-2">
                  <FileSignature className="size-5 text-[#166534]" />
                  Document Details
                </h3>

                <div>
                  <Label className="text-sm text-[#111827]">
                    Document Name <span className="text-[#DC2626]">*</span>
                  </Label>
                  <Input
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    className="mt-1 border-[#E5E7EB]"
                    placeholder="Enter document name"
                  />
                </div>

                <div>
                  <Label className="text-sm text-[#111827]">Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="mt-1 border-[#E5E7EB]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm text-[#111827]">Personal Message (Optional)</Label>
                  <Textarea
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value.slice(0, 500))}
                    placeholder="Add a message to your recipients..."
                    className="mt-1 border-[#E5E7EB]"
                    rows={3}
                  />
                  <p className="text-xs text-[#9CA3AF] mt-1">{personalMessage.length}/500</p>
                </div>

                <div>
                  <Label className="text-sm text-[#111827]">
                    Expiry Date <span className="text-[#DC2626]">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                    className="mt-1 border-[#E5E7EB]"
                  />
                </div>

                <div>
                  <Label className="text-sm text-[#111827]">Signing Order</Label>
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => setSigningOrder("sequential")}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm transition-all ${
                        signingOrder === "sequential" ? "border-[#166534] bg-[#DCFCE7]/30" : "border-[#E5E7EB]"
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
                        signingOrder === "parallel" ? "border-[#0D9488] bg-[#CCFBF1]/30" : "border-[#E5E7EB]"
                      }`}
                    >
                      <LayoutTemplate className="size-4" />
                      <div className="text-left">
                        <div className="font-medium text-[#111827]">Parallel</div>
                        <div className="text-[10px] text-[#6B7280]">All signers receive at once</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: PDF Preview */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
                <h3 className="font-semibold text-[#111827] flex items-center gap-2 mb-4">
                  <FileSignature className="size-5 text-[#0D9488]" />
                  PDF Preview
                </h3>
                {renderPdfPreview()}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              className="border-[#E5E7EB] text-[#374151]"
              onClick={() => router.push("/recruiter/vaultsign")}
            >
              <ArrowLeft className="size-4 mr-2" /> Cancel
            </Button>
            <Button
              className="bg-[#166534] hover:bg-[#14532D]"
              disabled={!isStep1Valid}
              onClick={handleStep1Next}
            >
              Next: Add Signers <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Add Signers & Place Fields ────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Signer Form + Field Types */}
            <div className="space-y-4">
              {/* Signer Section */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-4">
                <h3 className="font-semibold text-[#111827] text-sm" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                  Signers
                </h3>

                {/* Party 1 - Sender (info card) */}
                <div className="p-4 rounded-xl border border-[#166534] bg-[#DCFCE7]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-[#166534] text-white border-0 text-xs">Party 1</Badge>
                    <span className="text-sm font-medium text-[#111827]">You (Sender)</span>
                    <Badge variant="secondary" className="text-xs bg-[#DCFCE7] text-[#166534]">Document Creator</Badge>
                  </div>
                  <p className="text-sm text-[#6B7280]">{user?.firstName} {user?.lastName} &middot; {user?.email}</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">You are the sender. Only recipients need to sign through VaultSign.</p>
                </div>

                {/* Other Signers */}
                {signers.map((signer, i) => (
                  <div key={i} className="p-4 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] relative">
                    <button
                      onClick={() => setSigners((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-3 right-3 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                      disabled={signers.length <= 1}
                    >
                      <X className="size-4" />
                    </button>
                    <div className="flex items-center gap-2 mb-3">
                      <GripVertical className="size-4 text-[#9CA3AF]" />
                      <Badge
                        className="border-0 text-xs"
                        style={{
                          backgroundColor: `${partyColors[Math.min(signer.party_number - 1, 3)]}20`,
                          color: partyColors[Math.min(signer.party_number - 1, 3)],
                        }}
                      >
                        Party {signer.party_number}
                      </Badge>
                      {signingOrder === "sequential" && (
                        <Badge variant="secondary" className="text-xs">Signs #{signer.signing_order_position}</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <Label className="text-xs text-[#6B7280]">Full Name</Label>
                        <Input
                          value={signer.name}
                          onChange={(e) => {
                            const updated = [...signers];
                            updated[i] = { ...updated[i], name: e.target.value };
                            setSigners(updated);
                          }}
                          className="mt-1 border-[#E5E7EB] text-sm"
                          placeholder="Signer name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[#6B7280]">Email</Label>
                        <Input
                          type="email"
                          value={signer.email}
                          onChange={(e) => {
                            const updated = [...signers];
                            updated[i] = { ...updated[i], email: e.target.value };
                            setSigners(updated);
                          }}
                          className="mt-1 border-[#E5E7EB] text-sm"
                          placeholder="signer@email.com"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[#6B7280]">Role</Label>
                        <Select
                          value={signer.role}
                          onValueChange={(v) => {
                            const updated = [...signers];
                            updated[i] = { ...updated[i], role: v };
                            setSigners(updated);
                          }}
                        >
                          <SelectTrigger className="mt-1 border-[#E5E7EB] text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  onClick={() =>
                    setSigners((prev) => {
                      const existingParties = prev.map((s) => s.party_number);
                      const maxParty = Math.max(2, ...existingParties);
                      return [
                        ...prev,
                        { name: "", email: "", role: "Candidate", party_number: maxParty + 1, signing_order_position: maxParty + 1 },
                      ];
                    })
                  }
                  className="text-[#166534] w-full"
                >
                  <Plus className="size-4 mr-2" /> Add Signer
                </Button>
              </div>

              {/* Signer Tabs for Field Placement */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
                <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">Placing fields for</p>
                <div className="flex flex-col gap-1">
                  {allSigners.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSignerTab(i)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeSignerTab === i
                          ? "text-white"
                          : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                      }`}
                      style={activeSignerTab === i ? { backgroundColor: partyColors[Math.min(s.party - 1, 3)] } : {}}
                    >
                      <span className="truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Field Types */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-2">
                <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">Add Fields</p>
                {fieldTypes.map((ft) => (
                  <button
                    key={ft.type}
                    onClick={() => handleAddField(ft.type)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#111827] hover:border-[#166534]/50 transition-all cursor-pointer"
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
                  <div className="p-4 rounded-2xl border border-[#E5E7EB] bg-[#F8F7F4] space-y-3">
                    <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">Selected Field</p>
                    <p className="text-sm text-[#111827] capitalize">{field.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-[#6B7280]">
                      Assigned to: {allSigners.find((s) => s.id === field.assigned_to_signer_id)?.name || field.assigned_to_signer_id}
                    </p>
                    <div>
                      <Label className="text-xs text-[#6B7280]">Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                        className="mt-1 border-[#E5E7EB] text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280]">Assigned Signer</Label>
                      <Select
                        value={field.assigned_to_signer_id}
                        onValueChange={(v) => handleUpdateField(field.id, { assigned_to_signer_id: v })}
                      >
                        <SelectTrigger className="mt-1 border-[#E5E7EB] text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allSigners.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} (Party {s.party})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-[#6B7280]">Required</Label>
                      <Switch
                        checked={field.required}
                        onCheckedChange={(v) => handleUpdateField(field.id, { required: v })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveField(field.id)}
                      className="text-[#DC2626] w-full"
                    >
                      <Trash2 className="size-3 mr-1" /> Remove Field
                    </Button>
                  </div>
                );
              })()}

              {/* Placed Fields List */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
                <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-2">
                  Placed Fields ({signFields.length})
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {signFields.length === 0 ? (
                    <p className="text-xs text-[#9CA3AF] text-center py-3">No fields placed yet</p>
                  ) : (
                    signFields.map((f) => {
                      const signerIdx = allSigners.findIndex((s) => s.id === f.assigned_to_signer_id);
                      const signerColor = partyColors[Math.min(Math.max(signerIdx, 0), 3)];
                      return (
                        <button
                          key={f.id}
                          onClick={() => {
                            setSelectedField(f.id);
                            setCurrentPage(f.page);
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-all ${
                            selectedField === f.id ? "bg-[#F0FDFA] ring-1 ring-[#0D9488]/30" : "hover:bg-[#F3F4F6]"
                          }`}
                        >
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: signerColor }}
                          />
                          <span className="truncate text-[#111827]">
                            {fieldTypes.find((ft) => ft.type === f.type)?.icon} {f.label}
                          </span>
                          <span className="text-[#9CA3AF] ml-auto shrink-0">p{f.page}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right: PDF Preview with field placement */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] p-6">
              <h3 className="font-semibold text-[#111827] mb-4 flex items-center gap-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                <FileSignature className="size-5 text-[#0D9488]" />
                Place Fields on Document
              </h3>
              <p className="text-sm text-[#6B7280] mb-4">
                Click a field type on the left to add it. Drag fields to reposition them. Click a field to edit its properties.
              </p>
              {renderPdfPreview()}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              className="border-[#E5E7EB] text-[#374151]"
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="size-4 mr-2" /> Back
            </Button>
            <Button
              className="bg-[#166534] hover:bg-[#14532D]"
              onClick={handleStep2Next}
            >
              Next: Review & Save <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Review & Save ─────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Document Details Summary */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4">
              <h3 className="font-semibold text-[#111827] flex items-center gap-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                <FileSignature className="size-5 text-[#166534]" />
                Document Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm text-[#6B7280]">Document Name</span>
                  <span className="text-sm font-medium text-[#111827] text-right max-w-[60%]">{documentName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Type</span>
                  <Badge className="bg-[#F3F4F6] text-[#6B7280] border-0 text-xs">
                    {typeLabels[documentType] || documentType}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Signing Order</span>
                  <Badge className={`border-0 text-xs ${signingOrder === "sequential" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#CCFBF1] text-[#0D9488]"}`}>
                    {signingOrder === "sequential" ? "Sequential" : "Parallel"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Expiry Date</span>
                  <span className="text-sm font-medium text-[#111827]">
                    {new Date(expiryDate).toLocaleDateString()}
                  </span>
                </div>
                {personalMessage && (
                  <div>
                    <span className="text-sm text-[#6B7280]">Personal Message</span>
                    <p className="text-sm text-[#111827] mt-1 bg-[#F8F7F4] p-3 rounded-xl">
                      {personalMessage}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">PDF File</span>
                  <span className="text-sm font-medium text-[#111827] flex items-center gap-1">
                    <Check className="size-4 text-[#166534]" />
                    {uploadedFile?.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Signers Summary */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4">
              <h3 className="font-semibold text-[#111827] flex items-center gap-2" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                <Check className="size-5 text-[#166534]" />
                Signers & Fields
              </h3>

              {/* Party 1 info */}
              <div className="p-3 rounded-xl border border-[#166534] bg-[#DCFCE7]/20">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#166534] text-white border-0 text-xs">Party 1</Badge>
                  <span className="text-sm font-medium text-[#111827]">You (Sender)</span>
                </div>
              </div>

              {/* Other signers */}
              {signers.map((s, i) => {
                const signerId = `party_${s.party_number}`;
                const fieldCount = signFields.filter((f) => f.assigned_to_signer_id === signerId).length;
                const color = partyColors[Math.min(s.party_number - 1, 3)];
                return (
                  <div key={i} className="p-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="size-3 rounded-full" style={{ backgroundColor: color }} />
                      <Badge className="border-0 text-xs" style={{ backgroundColor: `${color}20`, color }}>
                        Party {s.party_number}
                      </Badge>
                      <span className="text-sm font-medium text-[#111827]">{s.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#6B7280]">
                      <span>{s.email}</span>
                      <Badge variant="secondary" className="text-[10px]">{s.role}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-[#6B7280]">Fields placed:</span>
                      <Badge className={`${fieldCount > 0 ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#DC2626]"} border-0 text-[10px]`}>
                        {fieldCount}
                      </Badge>
                    </div>
                  </div>
                );
              })}

              {/* Total Fields Summary */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8F7F4]">
                <span className="text-sm text-[#6B7280]">Total Fields</span>
                <span className="text-sm font-semibold text-[#111827]">{signFields.length}</span>
              </div>

              {/* Field type breakdown */}
              {signFields.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-[#9CA3AF] uppercase tracking-wider">Field Breakdown</p>
                  {fieldTypes.map((ft) => {
                    const count = signFields.filter((f) => f.type === ft.type).length;
                    if (count === 0) return null;
                    return (
                      <div key={ft.type} className="flex items-center justify-between text-xs py-1">
                        <span className="text-[#6B7280]">
                          {ft.icon} {ft.label}
                        </span>
                        <span className="font-medium text-[#111827]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* PDF Preview */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
            <h3 className="font-semibold text-[#111827] flex items-center gap-2 mb-4" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              <FileSignature className="size-5 text-[#0D9488]" />
              Document Preview
            </h3>
            {renderPdfPreview()}
          </div>

          {/* Navigation & Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
            <Button
              variant="outline"
              className="border-[#E5E7EB] text-[#374151]"
              onClick={() => setStep(2)}
            >
              <ArrowLeft className="size-4 mr-2" /> Back to Edit
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-[#E5E7EB] text-[#374151] hover:bg-[#F8F7F4]"
                onClick={() => router.push("/recruiter/vaultsign")}
                disabled={savingDraft || savingAndSending}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="border-[#166534] text-[#166534] hover:bg-[#DCFCE7]/30"
                onClick={() => handleSave(false)}
                disabled={savingDraft || savingAndSending}
              >
                {savingDraft ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Save className="size-4 mr-2" />
                )}
                Save as Draft
              </Button>
              <Button
                className="bg-[#166534] hover:bg-[#14532D]"
                onClick={() => handleSave(true)}
                disabled={savingDraft || savingAndSending}
              >
                {savingAndSending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Send className="size-4 mr-2" />
                )}
                Save & Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutTemplate, Upload, ArrowRight, ArrowLeft, GripVertical,
  Plus, X, Loader2, FileSignature, Search as SearchIcon, Check,
  ChevronLeft, ChevronRight, Trash2, MinusIcon,
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
interface Template {
  id: number;
  name: string;
  description: string | null;
  document_type: string;
  placeholder_fields: string;
  predefined_sign_fields: string;
  preview_url?: string;
}

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

  // Touch support for mobile
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
export default function NewVaultSignDocument() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [mode, setMode] = useState<"template" | "upload" | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("custom");
  const [personalMessage, setPersonalMessage] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [signingOrder, setSigningOrder] = useState("sequential");
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Step 2
  const [signers, setSigners] = useState<SignerForm[]>([
    { name: "", email: "", role: "Candidate", party_number: 2, signing_order_position: 2 },
  ]);

  // Step 3
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

  // Step 4
  const [legalConsent, setLegalConsent] = useState(false);

  // Created document id (for upload after creation)
  const [createdDocId, setCreatedDocId] = useState<number | null>(null);

  // ─── Fetch templates ────────────────────────────────────────────────
  useEffect(() => {
    if (mode === "template") {
      fetch("/api/vaultsign/templates")
        .then((r) => r.json())
        .then((d) => setTemplates(d.templates || []))
        .catch(() => {});
    }
  }, [mode]);

  // ─── When template selected ─────────────────────────────────────────
  useEffect(() => {
    if (selectedTemplate) {
      setDocumentName(selectedTemplate.name);
      setDocumentType(selectedTemplate.document_type);
      try {
        const fields = JSON.parse(selectedTemplate.placeholder_fields || "[]");
        const vals: Record<string, string> = {};
        fields.forEach((f: any) => { vals[f.key] = ""; });
        setPlaceholderValues(vals);
      } catch {}

      // Pre-populate sign fields from template
      try {
        const predefined = JSON.parse(selectedTemplate.predefined_sign_fields || "[]");
        if (predefined.length > 0) {
          setSignFields(predefined.map((f: any) => ({
            id: f.id || `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: f.type || "signature",
            page: f.page || 1,
            x: f.x || 10,
            y: f.y || 20,
            width: f.width || 25,
            height: f.height || 6,
            assigned_to_signer_id: f.assigned_to_party || "party_2",
            label: f.label || "Signature",
            required: true,
            value: null,
          })));
        }
      } catch {}
    }
  }, [selectedTemplate]);

  // ─── PDF rendering with pdfjs-dist ────────────────────────────────
  useEffect(() => {
    if (step !== 3 || !pdfUrl) return;

    let cancelled = false;

    const renderPdf = async (attempt = 0) => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        if (cancelled) return;
        setTotalPages(pdf.numPages);

        const pageNum = currentPage;
        if (pageNum < 1 || pageNum > pdf.numPages) return;

        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        // Auto-fit to container width, then apply zoom multiplier
        const baseViewport = page.getViewport({ scale: 1 });
        const containerEl = pdfContainerRef.current;
        const containerWidth = containerEl ? containerEl.clientWidth - 2 : 800; // subtract border
        const baseScale = Math.min(containerWidth / baseViewport.width, 2);
        const scale = baseScale * (zoomLevel / 100);
        const finalScale = Math.max(0.3, Math.min(scale, 3));
        const viewport = page.getViewport({ scale: finalScale });

        const canvas = canvasRef.current;
        if (!canvas) {
          // Retry if canvas ref isn't available yet
          if (attempt < 3) {
            setTimeout(() => { if (!cancelled) renderPdf(attempt + 1); }, 100);
          }
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Store canvas dimensions for accurate overlay sizing
        setCanvasDims({ width: viewport.width, height: viewport.height });

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error("PDF render error:", err);
      }
    };

    renderPdf();
    return () => { cancelled = true; };
  }, [step, pdfUrl, currentPage, zoomLevel]);

  // ─── Get all signers including Party 1 ────────────────────────────
  const allSigners: { id: string; name: string; party: number }[] = [
    { id: "party_1", name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "You (Sender)", party: 1 },
    ...signers.map((s) => ({ id: `party_${s.party_number}`, name: s.name || `Party ${s.party_number}`, party: s.party_number })),
  ];

  // ─── Step Handlers ────────────────────────────────────────────────
  const handleStep1Next = async () => {
    if (!documentName.trim()) return toast.error("Document name is required");
    if (!expiryDate) return toast.error("Expiry date is required");
    if (new Date(expiryDate) <= new Date()) return toast.error("Expiry must be in the future");

    // We need a PDF URL for Step 3
    if (selectedTemplate) {
      // Get template preview URL
      try {
        const res = await fetch(`/api/superadmin/vaultsign/templates/${selectedTemplate.id}/preview`);
        if (res.ok) {
          const data = await res.json();
          setPdfUrl(data.url);
        } else {
          toast.error("Could not load template PDF preview");
        }
      } catch {
        toast.error("Could not load template PDF preview");
      }
      setStep(2);
    } else if (uploadedFile) {
      // Revoke previous blob URL to prevent memory leak
      if (pdfUrl && pdfUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfUrl);
      }
      // Create object URL from uploaded file for preview
      const objUrl = URL.createObjectURL(uploadedFile);
      setPdfUrl(objUrl);
      setStep(2);
    } else {
      return toast.error("Please select a template or upload a PDF");
    }
  };

  const handleStep2Next = () => {
    const invalid = signers.find((s) => !s.name.trim() || !s.email.trim());
    if (invalid) return toast.error("All signers must have a name and email");
    setStep(3);
  };

  const handleStep3Next = () => {
    const signerFieldCounts = allSigners.map((s) => ({
      ...s,
      count: signFields.filter((f) => f.assigned_to_signer_id === s.id).length,
    }));
    const missing = signerFieldCounts.filter((s) => s.count === 0);
    if (missing.length > 0) return toast.error(`Each signer needs at least 1 field. Missing: ${missing.map((m) => m.name).join(", ")}`);
    setStep(4);
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

  // ─── Cleanup object URLs on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      // Revoke object URL to prevent memory leak
      if (pdfUrl && pdfUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          template_id: selectedTemplate?.id || null,
          document_name: documentName,
          document_type: documentType,
          signing_order: signingOrder,
          expiry_date: expiryDate,
          personal_message: personalMessage || null,
          placeholder_values: placeholderValues,
          signers: signers.map((s, i) => ({
            name: s.name,
            email: s.email,
            role: s.role,
            party_number: s.party_number,
            signing_order_position: signingOrder === "sequential" ? i + 2 : 2,
          })),
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to create document");
      }

      const { document } = await createRes.json();
      setCreatedDocId(document.id);

      // 2. Upload PDF if custom upload
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

      // 4. Send for signature
      const sendRes = await fetch(`/api/vaultsign/documents/${document.id}/send`, {
        method: "POST",
      });

      if (!sendRes.ok) {
        const err = await sendRes.json();
        throw new Error(err.error || "Failed to send document");
      }

      toast.success("Document sent for signature ✓");
      router.push(`/recruiter/vaultsign/${document.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to send document");
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center justify-center size-8 rounded-full text-sm font-medium ${
              s === step ? "bg-[#166534] text-white" : s < step ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F3F4F6] text-[#9CA3AF]"
            }`}>
              {s < step ? <Check className="size-4" /> : s}
            </div>
            {s < 4 && <div className={`w-12 h-0.5 ${s < step ? "bg-[#166534]" : "bg-[#E5E7EB]"}`} />}
          </div>
        ))}
      </div>
      <div className="text-center mb-6">
        <p className="text-sm text-[#6B7280]">
          {step === 1 && "Step 1: Choose Document"}
          {step === 2 && "Step 2: Add Signers"}
          {step === 3 && "Step 3: Place Fields on Document"}
          {step === 4 && "Step 4: Review & Send"}
        </p>
      </div>

      {/* ── STEP 1 ────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => { setMode("template"); setSelectedTemplate(null); }}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${
                mode === "template" ? "border-[#166534] bg-[#DCFCE7]/30" : "border-[#E5E7EB] bg-white hover:border-[#166534]/50"
              }`}
            >
              <LayoutTemplate className="size-8 text-[#166534] mb-3" />
              <h3 className="font-semibold text-[#111827]">Use a Template</h3>
              <p className="text-sm text-[#6B7280] mt-1">Start from a pre-built template with placeholder fields already set up.</p>
            </button>
            <button
              onClick={() => { setMode("upload"); setSelectedTemplate(null); }}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${
                mode === "upload" ? "border-[#0D9488] bg-[#CCFBF1]/30" : "border-[#E5E7EB] bg-white hover:border-[#0D9488]/50"
              }`}
            >
              <Upload className="size-8 text-[#0D9488] mb-3" />
              <h3 className="font-semibold text-[#111827]">Upload Custom PDF</h3>
              <p className="text-sm text-[#6B7280] mt-1">Upload any PDF document. You can edit it before sending.</p>
            </button>
          </div>

          {/* Template Grid */}
          {mode === "template" && (
            <div>
              <h3 className="text-sm font-medium text-[#111827] mb-3">Select a Template</h3>
              {templates.length === 0 ? (
                <p className="text-sm text-[#9CA3AF]">No templates available. Contact your admin to create templates.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedTemplate?.id === t.id ? "border-[#166534] bg-[#DCFCE7]/30" : "border-[#E5E7EB] bg-white hover:border-[#166534]/50"
                      }`}
                    >
                      <FileSignature className="size-6 text-[#166534] mb-2" />
                      <h4 className="font-medium text-[#111827] text-sm">{t.name}</h4>
                      <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">{t.description || "No description"}</p>
                      <Badge className="mt-2 text-[10px] bg-[#F3F4F6] text-[#6B7280] border-0">
                        {typeLabels[t.document_type] || t.document_type}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* File Upload */}
          {mode === "upload" && (
            <div>
              <label className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                uploadedFile ? "border-[#166534] bg-[#DCFCE7]/20" : "border-[#E5E7EB] hover:border-[#166534]/50"
              }`}>
                <Upload className="size-8 text-[#9CA3AF] mb-2" />
                <p className="text-sm font-medium text-[#111827]">
                  {uploadedFile ? uploadedFile.name : "Click to upload PDF"}
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">PDF only, max 25MB</p>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > 25 * 1024 * 1024) { toast.error("File too large (max 25MB)"); return; }
                    setUploadedFile(f || null);
                  }}
                />
              </label>
            </div>
          )}

          {/* Form Fields */}
          {(selectedTemplate || uploadedFile) && (
            <div className="space-y-4 bg-white rounded-2xl border border-[#E5E7EB] p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-[#111827]">Document Name</Label>
                  <Input value={documentName} onChange={(e) => setDocumentName(e.target.value)} className="mt-1 border-[#E5E7EB]" />
                </div>
                <div>
                  <Label className="text-sm text-[#111827]">Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="mt-1 border-[#E5E7EB]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-[#111827]">Document Expires On</Label>
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} min={new Date(Date.now() + 86400000).toISOString().split("T")[0]} className="mt-1 border-[#E5E7EB]" />
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

              {/* Placeholder Variables */}
              {selectedTemplate && Object.keys(placeholderValues).length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-[#111827]">Fill in Template Variables</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {Object.entries(placeholderValues).map(([key, value]) => (
                      <div key={key}>
                        <Label className="text-xs text-[#6B7280]">{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</Label>
                        <Input
                          value={value}
                          onChange={(e) => setPlaceholderValues((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder={`Enter ${key.replace(/_/g, " ")}`}
                          className="mt-1 border-[#E5E7EB]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2 ────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>Who needs to sign?</h2>

          {/* Party 1 - Sender */}
          <div className="p-5 rounded-2xl border border-[#166534] bg-[#DCFCE7]/20">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-[#166534] text-white border-0 text-xs">Party 1</Badge>
              <span className="text-sm font-medium text-[#111827]">You (Sender)</span>
              <Badge variant="secondary" className="text-xs bg-[#DCFCE7] text-[#166534]">Signs first</Badge>
            </div>
            <p className="text-sm text-[#6B7280]">{user?.firstName} {user?.lastName} &middot; {user?.email}</p>
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
                <Badge className="border-0 text-xs" style={{ backgroundColor: `${partyColors[Math.min(i + 1, 3)]}20`, color: partyColors[Math.min(i + 1, 3)] }}>
                  Party {i + 2}
                </Badge>
                {signingOrder === "sequential" && (
                  <Badge variant="secondary" className="text-xs">Signs #{i + 2}</Badge>
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
            // Calculate next party_number to avoid duplicates
            const existingParties = prev.map((s) => s.party_number);
            const maxParty = Math.max(2, ...existingParties);
            return [...prev, { name: "", email: "", role: "Candidate", party_number: maxParty + 1, signing_order_position: maxParty + 1 }];
          })} className="text-[#166534]">
            <Plus className="size-4 mr-2" /> Add Signer
          </Button>
        </div>
      )}

      {/* ── STEP 3 — PDF Field Placement ──────────────────────────── */}
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
                      style={activeSignerTab === i ? { backgroundColor: partyColors[Math.min(i, 3)] } : {}}
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
                    className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#111827] hover:border-[#166534]/50 transition-all cursor-pointer"
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
                        onClick={() => { setSelectedField(f.id); setCurrentPage(f.page); }}
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

            {/* Right Panel - PDF Viewer */}
            <div className="flex-1 space-y-3">
              {/* PDF Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="size-8 border-[#E5E7EB]" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-sm text-[#6B7280]">Page {currentPage} of {totalPages}</span>
                  <Button variant="outline" size="icon" className="size-8 border-[#E5E7EB]" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="size-8 border-[#E5E7EB]" onClick={() => setZoomLevel((z) => zoomLevels[Math.max(0, zoomLevels.indexOf(z) - 1)])} disabled={zoomLevel <= 50}>
                    <MinusIcon className="size-4" />
                  </Button>
                  <span className="text-xs text-[#6B7280] w-10 text-center">{zoomLevel}%</span>
                  <Button variant="outline" size="icon" className="size-8 border-[#E5E7EB]" onClick={() => setZoomLevel((z) => zoomLevels[Math.min(zoomLevels.length - 1, zoomLevels.indexOf(z) + 1)])} disabled={zoomLevel >= 200}>
                    +
                  </Button>
                </div>
              </div>

              {/* PDF Canvas with Fields Overlay */}
              <div
                ref={pdfContainerRef}
                className="relative bg-white border border-[#E5E7EB] rounded-xl shadow-[0_4px_6px_rgba(0,0,0,0.07)] overflow-auto"
                style={{ minHeight: "500px" }}
                onClick={() => setSelectedField(null)}
              >
                {pdfUrl ? (
                  <div
                    ref={pdfPageWrapperRef}
                    id="pdf-page-wrapper"
                    className="relative inline-block"
                    style={{
                      width: canvasDims.width ? `${canvasDims.width}px` : "100%",
                      height: canvasDims.height ? `${canvasDims.height}px` : "auto",
                    }}
                  >
                    <canvas ref={canvasRef} className="block" />
                    {/* Placed Fields Overlay */}
                    {signFields.filter((f) => f.page === currentPage).map((f) => {
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
                          containerRef={pdfPageWrapperRef}
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
                    <p className="text-sm text-[#9CA3AF]">No document loaded. Go back and select a template or upload a PDF.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4 ────────────────────────────────────────────────── */}
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
              </div>
            </div>

            {/* Signers */}
            <div>
              <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">Signers</p>
              <div className="space-y-2">
                {/* Party 1 */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#DCFCE7]/20">
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
                {/* Other signers */}
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
                <input type="checkbox" checked={legalConsent} onChange={(e) => setLegalConsent(e.target.checked)} className="mt-1 accent-[#166534]" />
                <span className="text-sm text-[#6B7280]">
                  I confirm that I have the right to request signatures on this document and all parties have agreed to use electronic signatures.
                </span>
              </label>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!legalConsent || loading}
              className="w-full bg-[#166534] hover:bg-[#14532D] py-4 text-base font-semibold"
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

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        {step > 1 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} className="text-[#6B7280]">
            <ArrowLeft className="size-4 mr-2" /> Back
          </Button>
        ) : <div />}
        {step === 1 && (
          <Button onClick={handleStep1Next} className="bg-[#166534] hover:bg-[#14532D]">
            Next: Add Signers →
          </Button>
        )}
        {step === 2 && (
          <Button onClick={handleStep2Next} className="bg-[#166534] hover:bg-[#14532D]">
            Next: Place Fields →
          </Button>
        )}
        {step === 3 && (
          <Button onClick={handleStep3Next} className="bg-[#166534] hover:bg-[#14532D]">
            Next: Review & Send →
          </Button>
        )}
      </div>
    </div>
  );
}

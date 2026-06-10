"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle, Check, Loader2, FileSignature, Shield, Eye
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────
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

interface OtherSigner {
  name: string;
  status: string;
}

interface SigningData {
  document_name: string;
  document_url: string | null;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  sign_fields: SignField[];
  personal_message: string | null;
  other_signers: OtherSigner[];
  waiting_for?: string;
  waitingFor?: string; // API returns camelCase
}

type ErrorType = "expired" | "voided" | "already_signed" | "not_your_turn" | "invalid" | null;

const signatureFonts = [
  { name: "Dancing Script", label: "Cursive" },
  { name: "Great Vibes", label: "Elegant" },
  { name: "Pacifico", label: "Casual" },
  { name: "Sacramento", label: "Formal" },
];

// ─── Signature Modal ────────────────────────────────────────────────
function SignatureModal({
  signerName,
  onConfirm,
  onCancel,
}: {
  signerName: string;
  onConfirm: (data: { type: string; font: string; text: string; image_base64: string }) => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = useState<"type" | "draw">("type");
  const [typedName, setTypedName] = useState(signerName);
  const [selectedFont, setSelectedFont] = useState(0);
  const [drawnData, setDrawnData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const canConfirm = tab === "type" ? (typedName.trim().length > 0 && selectedFont >= 0) : !!drawnData;

  const handleConfirm = () => {
    if (tab === "type") {
      // Render typed signature to canvas
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 400, 100);
        ctx.font = `36px "${signatureFonts[selectedFont].name}"`;
        ctx.fillStyle = "#111827";
        ctx.fillText(typedName, 20, 65);
      }
      onConfirm({
        type: "typed",
        font: signatureFonts[selectedFont].name,
        text: typedName,
        image_base64: canvas.toDataURL("image/png"),
      });
    } else if (drawnData) {
      onConfirm({
        type: "drawn",
        font: "",
        text: signerName,
        image_base64: drawnData,
      });
    }
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    drawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    // Scale from CSS display coordinates to canvas pixel coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (("touches" in e) ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX) * scaleX;
    const y = (("touches" in e) ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY) * scaleY;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    // Scale from CSS display coordinates to canvas pixel coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (("touches" in e) ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX) * scaleX;
    const y = (("touches" in e) ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY) * scaleY;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setDrawnData(canvas.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setDrawnData(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
        <h3 className="text-lg font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>Create Your Signature</h3>
        <p className="text-sm text-[#6B7280]">{signerName}</p>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("type")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === "type" ? "bg-[#166534] text-white" : "bg-[#F3F4F6] text-[#6B7280]"
            }`}
          >
            Type Your Signature
          </button>
          <button
            onClick={() => setTab("draw")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === "draw" ? "bg-[#166534] text-white" : "bg-[#F3F4F6] text-[#6B7280]"
            }`}
          >
            Draw Your Signature
          </button>
        </div>

        {tab === "type" && (
          <div className="space-y-3">
            <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} className="border-[#E5E7EB]" placeholder="Your name" />
            <div className="grid grid-cols-2 gap-2">
              {signatureFonts.map((font, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedFont(i)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    selectedFont === i ? "border-[#166534] bg-[#DCFCE7]/30" : "border-[#E5E7EB]"
                  }`}
                >
                  <span className="text-2xl" style={{ fontFamily: `"${font.name}", cursive` }}>{typedName || signerName}</span>
                  <p className="text-[10px] text-[#9CA3AF] mt-1">{font.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "draw" && (
          <div className="space-y-2">
            <canvas
              ref={canvasRef}
              width={350}
              height={120}
              className="w-full border border-[#E5E7EB] rounded-lg bg-white cursor-crosshair"
              style={{ touchAction: "none" }}
              aria-label="Signature drawing pad - draw your signature here"
              role="img"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            <Button variant="ghost" size="sm" onClick={clearCanvas} className="text-[#6B7280]">Clear</Button>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm} className="flex-1 bg-[#166534] hover:bg-[#14532D]">
            Use This Signature
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function VaultSignSigningPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [data, setData] = useState<SigningData | null>(null);
  const [error, setError] = useState<ErrorType>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signatureModalField, setSignatureModalField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  // Per-field signature data: keyed by field ID
  const [fieldSignatures, setFieldSignatures] = useState<Record<string, {
    type: string;
    font: string;
    text: string;
    image_base64: string;
  }>>({});
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const [activeFieldInput, setActiveFieldInput] = useState<SignField | null>(null);

  // Ref for the PDF canvas wrapper (used for accurate field positioning)
  const pdfWrapperRef = useRef<HTMLDivElement | null>(null);
  // Ref for the PDF canvas element (replaces getElementById)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Ref for the container div to measure available width
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Store the rendered canvas dimensions for accurate overlay sizing
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });
  // PDF loading and error states
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfRenderError, setPdfRenderError] = useState(false);
  // Presigned URL refresh timer ref
  const presignedUrlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSigningData = useCallback(async () => {
    try {
      const res = await fetch(`/api/vaultsign/sign/${token}`);
      if (res.ok) {
        const d = await res.json();
        if (d.waitingFor) {
          setError("not_your_turn");
          setData(d);
        } else {
          setData(d);
          // Pre-fill field values
          const vals: Record<string, string> = {};
          d.sign_fields.forEach((f: SignField) => {
            if (f.type === "date") vals[f.id] = new Date().toLocaleDateString();
            if (f.type === "full_name") vals[f.id] = d.signer_name;
            if (f.type === "email") vals[f.id] = d.signer_email || "";
          });
          setFieldValues(vals);
        }
      } else {
        const d = await res.json();
        if (d.error?.includes("not been sent")) setError("invalid");
        else if (d.error?.includes("expired")) setError("expired");
        else if (d.error?.includes("voided")) setError("voided");
        else if (d.error?.includes("already signed")) setError("already_signed");
        else if (d.error?.includes("declined")) setError("invalid");
        else setError("invalid");
      }
    } catch {
      setError("invalid");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchSigningData(); }, [fetchSigningData]);

  // ─── Presigned URL refresh timer (every 5 minutes) ───────────────
  // Pre-signed URLs expire in 15 min. Refresh every 5 min to keep PDF preview alive.
  useEffect(() => {
    if (!data?.document_url) return;
    presignedUrlTimerRef.current = setInterval(() => {
      fetchSigningData();
    }, 5 * 60 * 1000);
    return () => {
      if (presignedUrlTimerRef.current) clearInterval(presignedUrlTimerRef.current);
    };
  }, [data?.document_url, fetchSigningData]);

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Dancing+Script&family=Great+Vibes&family=Pacifico&family=Sacramento&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  // Render PDF when document_url is available
  useEffect(() => {
    if (!data?.document_url) return;
    let cancelled = false;
    setPdfRenderError(false);
    setPdfLoading(true);

    const renderPdf = async (attempt = 0) => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        // Fetch PDF as ArrayBuffer for reliable rendering
        const pdfResponse = await fetch(data.document_url!);
        const pdfArrayBuffer = await pdfResponse.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setPdfTotalPages(pdf.numPages);

        const page = await pdf.getPage(pdfPage);
        if (cancelled) return;

        // Calculate scale based on actual container width for auto-fit
        // Use offsetWidth instead of clientWidth to avoid scrollbar width issues
        const baseViewport = page.getViewport({ scale: 1 });
        const containerEl = containerRef.current;
        const containerWidth = containerEl ? containerEl.offsetWidth - 2 : 800; // subtract border
        const scale = Math.min(containerWidth / baseViewport.width, 2);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) {
          // Retry if canvas ref isn't available yet
          if (attempt < 10) {
            setTimeout(() => { if (!cancelled) renderPdf(attempt + 1); }, 200);
          }
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Store canvas dimensions for overlay sizing
        setCanvasDims({ width: viewport.width, height: viewport.height });

        await page.render({ canvasContext: context, viewport }).promise;
        if (!cancelled) setPdfLoading(false);
      } catch (err) {
        console.error("PDF render error on signing page:", err);
        if (!cancelled) {
          setPdfRenderError(true);
          setPdfLoading(false);
        }
      }
    };

    renderPdf();
    return () => { cancelled = true; };
  }, [data?.document_url, pdfPage]);

  // Check all required fields filled
  const requiredFields = data?.sign_fields.filter((f) => f.required) || [];
  const filledRequired = requiredFields.filter((f) => {
    if (f.type === "signature") return !!fieldSignatures[f.id];
    return !!fieldValues[f.id]?.trim();
  });
  const progress = requiredFields.length > 0 ? filledRequired.length / requiredFields.length : 1;
  const allSignatureFieldsFilled = data?.sign_fields
    .filter((f) => f.type === "signature")
    .every((f) => !!fieldSignatures[f.id]) ?? true;
  const canSign = progress === 1 && consent1 && consent2 && allSignatureFieldsFilled;

  const handleSubmit = async () => {
    if (!canSign || !data) return;

    // Validate that all signature field positions are within page bounds
    const outOfBounds = data.sign_fields.filter(
      (f) => f.y + f.height > 95 || f.x + f.width > 98
    );
    if (outOfBounds.length > 0) {
      toast.error(`${outOfBounds.length} field(s) are positioned too close to the page edge. Please contact the sender.`);
      return;
    }

    setSubmitting(true);
    try {
      const field_values = data.sign_fields.map((f) => ({
        field_id: f.id,
        value: f.type === "signature" ? "signed" : (fieldValues[f.id] || ""),
      }));

      // Send all per-field signature data
      const allSignatures = Object.fromEntries(
        Object.entries(fieldSignatures).map(([fieldId, sigData]) => [fieldId, sigData])
      );

      // Use the first signature as the primary signature_data for backward compat
      const primarySignature = Object.values(fieldSignatures)[0] || null;

      const res = await fetch(`/api/vaultsign/sign/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_values,
          signature_data: primarySignature,
          all_signatures: allSignatures,
          consent_agreed: true,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        router.push(`/sign/${token}/complete?allSigned=${d.allSigned ? "true" : "false"}`);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to submit signature");
      }
    } catch {
      toast.error("Failed to submit signature");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vaultsign/sign/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason }),
      });
      if (res.ok) {
        toast.success("Document declined");
        setError("already_signed");
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to decline");
      }
    } catch {
      toast.error("Failed to decline");
    } finally {
      setSubmitting(false);
      setShowDeclineModal(false);
    }
  };

  const handleFieldClick = (field: SignField) => {
    if (field.type === "signature") {
      setSignatureModalField(field.id);
    } else if (field.type === "checkbox") {
      setFieldValues((prev) => ({
        ...prev,
        [field.id]: prev[field.id] === "checked" ? "" : "checked",
      }));
    } else if (field.type === "date") {
      // Read-only date field — nothing to edit (auto-filled with current date)
    } else if (field.type === "email") {
      // Read-only email field — nothing to edit (auto-filled from signer email)
    } else {
      setActiveFieldInput(field);
    }
  };

  // ─── Error States ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
        <Loader2 className="size-8 animate-spin text-[#166534]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4] p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="size-12 text-[#DC2626] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>This signing link is no longer valid</h2>
          <p className="text-sm text-[#6B7280] mt-2">
            {error === "expired" && "This document has expired."}
            {error === "voided" && "This document was voided by the sender."}
            {error === "already_signed" && "You have already signed this document."}
            {error === "not_your_turn" && `${data?.waitingFor || "Another signer"} needs to sign before you. You will receive an email when it is your turn.`}
            {error === "invalid" && "This signing link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ─── Main Signing UI ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Top Bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-[#166534] flex items-center justify-center text-xs font-bold text-white">ZV</div>
          <span className="text-sm font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>VaultSign</span>
        </div>
        <span className="text-xs text-[#9CA3AF]">Powered by MyZipVault</span>
      </div>

      <div className="max-w-[900px] mx-auto py-8 px-4 space-y-6">
        {/* Document Info Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
          <h1 className="text-xl font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>{data.document_name}</h1>
          <p className="text-sm text-[#6B7280] mt-1">{data.signer_name}, your signature is requested</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-[#F3F4F6] text-[#6B7280] border-0">{data.signer_role}</Badge>
          </div>
        </div>

        {/* Personal Message */}
        {data.personal_message && (
          <div className="bg-[#DCFCE7]/20 rounded-xl border-l-4 border-[#166534] p-4">
            <p className="text-sm text-[#111827]">{data.personal_message}</p>
          </div>
        )}

        {/* Other Signers */}
        {data.other_signers.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {data.other_signers.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={`size-2.5 rounded-full ${
                  s.status === "signed" ? "bg-[#166534]" : s.status === "viewed" ? "bg-[#0D9488]" : "bg-[#9CA3AF]"
                }`} />
                <span className="text-[#6B7280]">{s.name}</span>
                {s.status === "signed" && <Check className="size-3 text-[#166534]" />}
              </div>
            ))}
          </div>
        )}

        {/* Document Preview with Fields */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4">
          <h3 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider">Document</h3>

          {/* PDF Viewer with Fields Overlay */}
          {data.document_url && (
            <div className="space-y-2">
              {/* PDF Loading Skeleton */}
              {pdfLoading && (
                <div className="border border-[#E5E7EB] rounded-xl bg-[#F8F7F4] p-8 flex flex-col items-center justify-center min-h-[300px]">
                  <Loader2 className="size-8 animate-spin text-[#166534] mb-3" />
                  <p className="text-sm text-[#6B7280]">Loading document preview...</p>
                </div>
              )}
              {/* PDF Render Error */}
              {pdfRenderError && !pdfLoading && (
                <div className="border border-[#DC2626]/30 rounded-xl bg-[#FEF2F2] p-6 text-center">
                  <AlertCircle className="size-8 text-[#DC2626] mx-auto mb-2" />
                  <p className="text-sm text-[#DC2626] font-medium">Failed to load document preview</p>
                  <p className="text-xs text-[#6B7280] mt-1">You can still sign the document. The preview will be available in the final signed copy.</p>
                </div>
              )}
              <div ref={containerRef} className={`overflow-auto border border-[#E5E7EB] rounded-xl bg-[#F8F7F4] ${pdfLoading || pdfRenderError ? 'hidden' : ''}`}>
                {/* 
                  The wrapper div is sized exactly to the canvas dimensions.
                  Fields use percentage-based positioning relative to this wrapper.
                  This ensures signature fields appear at the correct position on the PDF.
                */}
                <div
                  ref={pdfWrapperRef}
                  className="relative inline-block"
                  style={{
                    width: canvasDims.width ? `${canvasDims.width}px` : "100%",
                    height: canvasDims.height ? `${canvasDims.height}px` : "auto",
                  }}
                >
                  <canvas ref={canvasRef} className="block" />
                  {/* Overlay sign fields at their positions */}
                  {data.sign_fields.filter((f) => f.page === pdfPage).map((field) => {
                    const isFilled = field.type === "signature"
                      ? !!fieldSignatures[field.id]
                      : !!(fieldValues[field.id]?.trim());
                    const sigData = fieldSignatures[field.id];

                    return (
                      <div
                        key={field.id}
                        className="absolute rounded cursor-pointer hover:shadow-md transition-shadow"
                        style={{
                          left: `${field.x}%`,
                          top: `${field.y}%`,
                          width: `${field.width}%`,
                          height: `${field.height}%`,
                          backgroundColor: isFilled
                            ? "rgba(22, 101, 52, 0.06)"
                            : "rgba(22, 101, 52, 0.08)",
                          border: isFilled
                            ? "1.5px solid #166534"
                            : "1.5px dashed #166534",
                        }}
                        onClick={() => handleFieldClick(field)}
                      >
                        <p className="text-[8px] px-1 truncate leading-tight text-[#166534]">{field.label}</p>
                        {field.type === "signature" && sigData && (
                          <img
                            src={sigData.image_base64}
                            alt="Signature"
                            className="w-full h-[60%] object-contain pointer-events-none"
                            style={{ imageRendering: "auto" }}
                          />
                        )}
                        {field.type !== "signature" && field.type !== "checkbox" && fieldValues[field.id] && (
                          <p className="text-[9px] px-1 truncate text-[#111827]">{fieldValues[field.id]}</p>
                        )}
                        {field.type === "checkbox" && (
                          <div className="flex items-center justify-center h-full">
                            {fieldValues[field.id] === "checked" ? (
                              <Check className="size-4 text-[#166534]" />
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {pdfTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" className="border-[#E5E7EB]" onClick={() => setPdfPage((p) => Math.max(1, p - 1))} disabled={pdfPage <= 1}>
                    &#9664;
                  </Button>
                  <span className="text-xs text-[#6B7280]">Page {pdfPage} of {pdfTotalPages}</span>
                  <Button variant="outline" size="sm" className="border-[#E5E7EB]" onClick={() => setPdfPage((p) => Math.min(pdfTotalPages, p + 1))} disabled={pdfPage >= pdfTotalPages}>
                    &#9654;
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Fallback when no PDF */}
          {!data.document_url && (
            <div className="bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] min-h-[200px] p-8 text-center">
              <FileSignature className="size-16 mx-auto text-[#9CA3AF] mb-2" />
              <p className="text-sm text-[#9CA3AF]">{data.document_name}</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Document preview not available</p>
            </div>
          )}

          {/* Field Legend - shows which fields still need filling */}
          {data.sign_fields.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[#9CA3AF] uppercase tracking-wider">Fields to Complete</h3>
              <div className="flex flex-wrap gap-2">
                {data.sign_fields.map((field) => {
                  const isFilled = field.type === "signature" ? !!fieldSignatures[field.id] : !!(fieldValues[field.id]?.trim());
                  return (
                    <button
                      key={field.id}
                      onClick={() => {
                        setPdfPage(field.page);
                        handleFieldClick(field);
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isFilled
                          ? "bg-[#DCFCE7] text-[#166534] border border-[#166534]/20"
                          : "bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] hover:border-[#166534]/50"
                      }`}
                    >
                      {isFilled ? <Check className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
                      <span>{field.label}</span>
                      {field.required && !isFilled && <span className="text-[#DC2626]">*</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Progress + Consent + Submit */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-[#6B7280]">{filledRequired.length} of {requiredFields.length} required fields completed</span>
              <span className="font-medium text-[#111827]">{Math.round(progress * 100)}%</span>
            </div>
            <div className="w-full bg-[#F3F4F6] rounded-full h-2">
              <div className="bg-[#166534] h-2 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>

          {/* Consent */}
          <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={consent1} onChange={(e) => setConsent1(e.target.checked)} className="mt-1 accent-[#166534]" />
              <span className="text-sm text-[#6B7280]">
                I agree to use electronic signatures and understand this is legally binding under the Electronic Signatures in Global and National Commerce Act (E-SIGN Act).
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={consent2} onChange={(e) => setConsent2(e.target.checked)} className="mt-1 accent-[#166534]" />
              <span className="text-sm text-[#6B7280]">
                I have read and reviewed the complete document before signing.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!canSign || submitting}
            className="w-full bg-[#166534] hover:bg-[#14532D] py-4 text-base font-semibold"
          >
            {submitting ? (
              <><Loader2 className="size-4 mr-2 animate-spin" /> Submitting Signature...</>
            ) : (
              "Sign Document"
            )}
          </Button>

          {/* Decline */}
          <div className="text-center pt-2">
            <button onClick={() => setShowDeclineModal(true)} className="text-[13px] text-[#9CA3AF] hover:text-[#DC2626] transition-colors">
              I do not wish to sign this document
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-xs text-[#9CA3AF]">Secured by MyZipVault VaultSign</p>
        </div>
      </div>

      {/* Signature Modal - opens for specific field */}
      {signatureModalField && (
        <SignatureModal
          signerName={data.signer_name}
          onConfirm={(sigData) => {
            setFieldSignatures((prev) => ({
              ...prev,
              [signatureModalField]: sigData,
            }));
            setSignatureModalField(null);
          }}
          onCancel={() => setSignatureModalField(null)}
        />
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>Are you sure you want to decline?</h3>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason for declining (optional)"
              className="border-[#E5E7EB]"
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowDeclineModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleDecline} disabled={submitting} className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : "Decline Document"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Field Input Popover */}
      {activeFieldInput && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setActiveFieldInput(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-semibold text-[#111827]">{activeFieldInput.label}</h3>
              <p className="text-xs text-[#6B7280] capitalize mt-0.5">{activeFieldInput.type.replace(/_/g, " ")} field</p>
            </div>

            {activeFieldInput.type === "checkbox" ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fieldValues[activeFieldInput.id] === "checked"}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [activeFieldInput.id]: e.target.checked ? "checked" : "" }))}
                  className="accent-[#166534] size-4"
                />
                <span className="text-sm text-[#111827]">{activeFieldInput.label}</span>
              </label>
            ) : (
              <Input
                value={fieldValues[activeFieldInput.id] || ""}
                onChange={(e) => setFieldValues((prev) => ({ ...prev, [activeFieldInput.id]: e.target.value }))}
                className="border-[#E5E7EB]"
                placeholder={`Enter ${activeFieldInput.label.toLowerCase()}`}
                autoFocus
              />
            )}

            <div className="flex gap-2">
              <Button onClick={() => setActiveFieldInput(null)} className="flex-1 bg-[#166534] hover:bg-[#14532D]">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

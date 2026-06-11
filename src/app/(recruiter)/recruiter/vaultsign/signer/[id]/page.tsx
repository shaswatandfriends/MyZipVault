"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { VaultSignErrorBoundary } from "@/components/vaultsign/vaultsign-error-boundary";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Send, Plus, Trash2, X, Loader2,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, MousePointer2, Move,
  PanelRightIcon
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { SIGNER_COLORS, FIELD_TYPE_LABELS, FIELD_TYPE_ICONS, type SignField, type SignFieldType } from "@/lib/vaultsign/types";

export default function PdfSignerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [docId, setDocId] = useState<string>("");
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docName, setDocName] = useState("");
  const [signers, setSigners] = useState<any[]>([]);
  const [signFields, setSignFields] = useState<SignField[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [newSignerRole, setNewSignerRole] = useState("Candidate");
  const [showAddSigner, setShowAddSigner] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showRightPanel, setShowRightPanel] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store PDF document object for page-by-page rendering (declared before fetchDocument)
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const renderTaskRef = useRef<any>(null);
  const [showHeaderFooter, setShowHeaderFooter] = useState(true);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setDocId(p.id));
  }, [params]);

  // Helper: fetch with AbortController timeout
  const fetchWithTimeout = useCallback(async (url: string, options: RequestInit = {}, timeoutMs: number = 15000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }, []);

  // Fetch document
  const fetchDocument = useCallback(async () => {
    if (!docId) return;
    try {
      setLoading(true);
      setPdfError(null);
      const res = await fetchWithTimeout(`/api/vaultsign/documents/${docId}`, {}, 15000);
      if (!res.ok) throw new Error("Failed to fetch document");
      const data = await res.json();
      setDocument(data);
      setDocName(data.document_name);
      setSigners(data.signers || []);
      setSignFields(data.sign_fields || []);

      // Resolve PDF URL based on document source_type
      let resolvedPdfUrl = "";
      const isPdfSource = data.source_type === "pdf";

      // Strategy 1: Try the direct signed URL API (works for both PDF and Word docs)
      try {
        const signedRes = await fetchWithTimeout(`/api/vaultsign/documents/${docId}/signed-url`, {}, 10000);
        if (signedRes.ok) {
          const signedData = await signedRes.json();
          if (signedData.signed_url) {
            resolvedPdfUrl = signedData.signed_url;
          }
        }
      } catch {
        console.warn("Signed URL API failed, trying fallback...");
      }

      // Strategy 2: Only for non-PDF (Word) docs — try export-pdf with timeout
      // NOTE: export-pdf POST is for converting Word docs to PDF and can hang,
      // so we skip it for PDF source_type documents entirely.
      if (!resolvedPdfUrl && !isPdfSource) {
        try {
          const pdfRes = await fetchWithTimeout(
            `/api/vaultsign/documents/${docId}/export-pdf`,
            { method: "POST" },
            30000 // 30s timeout for Word-to-PDF conversion
          );
          if (pdfRes.ok) {
            const pdfData = await pdfRes.json();
            resolvedPdfUrl = pdfData.pdf_url;
          } else {
            const errBody = await pdfRes.json().catch(() => ({}));
            console.warn("Export-PDF failed:", errBody.error);
          }
        } catch (err: any) {
          if (err?.name === "AbortError") {
            console.warn("Export-PDF timed out after 30s");
            toast.error("Word-to-PDF conversion timed out. Try uploading a PDF instead.");
          } else {
            console.warn("Export-PDF request failed:", err);
          }
        }
      }

      // Strategy 3: Fall back to the stored URL directly
      if (!resolvedPdfUrl) {
        if (isPdfSource && data.original_file_url) {
          resolvedPdfUrl = data.original_file_url;
        } else if (data.edited_pdf_url) {
          resolvedPdfUrl = data.edited_pdf_url;
        } else if (data.original_file_url) {
          resolvedPdfUrl = data.original_file_url;
        }
      }

      if (resolvedPdfUrl) {
        setPdfUrl(resolvedPdfUrl);
      } else {
        setPdfError("No PDF URL available for this document");
        toast.error("Could not load PDF file");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.error("Document fetch timed out");
        toast.error("Document loading timed out. Please try again.");
        setPdfError("Document loading timed out");
      } else {
        console.error("Fetch error:", err);
        toast.error("Failed to load document");
        setPdfError("Failed to load document");
      }
    } finally {
      setLoading(false);
    }
  }, [docId, fetchWithTimeout]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // Load PDF document object
  useEffect(() => {
    if (!pdfUrl || typeof window === "undefined") return;

    let cancelled = false;
    const loadPdf = async () => {
      try {
        setPdfError(null);
        setPdfDoc(null);
        const pdfjsLib = await import("pdfjs-dist");

        // Ensure worker is configured before loading
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

        // Handle different URL types
        let loadingTask;
        if (pdfUrl.startsWith("data:application/pdf;base64,")) {
          // Base64 data URL — decode and use Uint8Array for reliable loading
          const base64 = pdfUrl.split(",")[1];
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          loadingTask = pdfjsLib.getDocument({ data: bytes } as any);
        } else if (pdfUrl.startsWith("data:")) {
          // Other data URL — try direct loading as fallback
          loadingTask = pdfjsLib.getDocument(pdfUrl as any);
        } else if (pdfUrl.startsWith("http") || pdfUrl.startsWith("/")) {
          // HTTP or relative URL — try with CORS settings
          loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            withCredentials: false,
          } as any);
        } else {
          loadingTask = pdfjsLib.getDocument(pdfUrl as any);
        }

        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
      } catch (err: any) {
        if (cancelled) return;
        console.error("PDF load error:", err);
        const msg = err?.message || "Failed to load PDF";
        setPdfError(msg.includes("worker") ? "PDF worker failed to load. Please refresh the page." : msg);
        toast.error("Failed to render PDF");
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  // Render current page when page or scale changes
  useEffect(() => {
    if (!pdfDoc) return;

    let cancelled = false;
    const renderPage = async () => {
      try {
        // Cancel any in-progress render
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch {}
        }

        setRendering(true);
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        // Wait a tick for the canvas ref to be available
        await new Promise((r) => setTimeout(r, 50));

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const viewport = page.getViewport({ scale: scale * 1.5 });

        // Set canvas pixel dimensions for sharp rendering
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Set CSS display dimensions explicitly based on viewport to avoid distortion
        canvas.style.width = `${viewport.width / 1.5}px`;
        canvas.style.height = `${viewport.height / 1.5}px`;

        const renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException" || cancelled) return;
        console.error("PDF page render error:", err);
      } finally {
        if (!cancelled) setRendering(false);
      }
    };

    renderPage();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage, scale]);

  // Save fields
  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/vaultsign/documents/${docId}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign_fields: signFields, show_header_footer: showHeaderFooter }),
      });
      if (res.ok) {
        toast.success("Fields saved");
      }
    } catch {
      toast.error("Failed to save fields");
    } finally {
      setSaving(false);
    }
  };

  // Send for signature
  const handleSend = async () => {
    try {
      await handleSave();
      const res = await fetch(`/api/vaultsign/documents/${docId}/send`, { method: "POST" });
      if (res.ok) {
        toast.success("Document sent for signature");
        router.push("/recruiter/vaultsign");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send document");
      }
    } catch {
      toast.error("Failed to send document");
    }
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
  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index));
    setSignFields(signFields.filter((f) => f.assigned_to_signer_index !== index));
  };

  // Add sign field on PDF at default position
  const addFieldToPdf = (type: SignFieldType, signerIndex: number) => {
    const newField: SignField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      page: currentPage,
      x_percent: 10,
      y_percent: 10 + signFields.filter((f) => f.page === currentPage).length * 8,
      width_percent: type === "checkbox" ? 3 : 20,
      height_percent: type === "signature" ? 6 : 3,
      assigned_to_signer_index: signerIndex,
      label: FIELD_TYPE_LABELS[type],
      required: true,
      value: null,
    };
    setSignFields([...signFields, newField]);
  };

  // Remove field
  const removeField = (fieldId: string) => {
    setSignFields(signFields.filter((f) => f.id !== fieldId));
    if (selectedField === fieldId) setSelectedField(null);
  };

  // Handle field drag
  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedField(fieldId);
    setDraggingField(fieldId);
    const field = signFields.find((f) => f.id === fieldId);
    if (field && canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - (field.x_percent / 100) * rect.width,
        y: e.clientY - (field.y_percent / 100) * rect.height,
      });
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingField || !canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const field = signFields.find((f) => f.id === draggingField);
    if (!field) return;

    const xPercent = Math.max(0, Math.min(100, ((e.clientX - dragOffset.x) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - dragOffset.y) / rect.height) * 100));

    setSignFields(signFields.map((f) =>
      f.id === draggingField ? { ...f, x_percent: xPercent, y_percent: yPercent } : f
    ));
  }, [draggingField, dragOffset, signFields]);

  const handleMouseUp = useCallback(() => {
    setDraggingField(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex flex-col">
        {/* Skeleton Top Bar */}
        <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-6 w-px" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-28" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        {/* Skeleton Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Skeleton PDF Canvas */}
          <div className="flex-1 flex flex-col">
            <div className="bg-white border-b border-[#E5E7EB] px-4 py-2 flex items-center justify-center gap-3">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-6 w-px" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-8 w-8" />
            </div>
            <div className="flex-1 p-6 flex items-start justify-center">
              <Skeleton className="w-full max-w-[800px] h-[600px] rounded-lg" />
            </div>
          </div>
          {/* Skeleton Right Panel */}
          <div className="hidden lg:flex w-72 border-l border-[#E5E7EB] bg-white flex-col">
            <div className="p-3 border-b border-[#E5E7EB]">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48 mt-1" />
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

  // Right panel content (shared between inline and Sheet)
  const rightPanelContent = (
    <>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Header & Footer */}
          <div>
            <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-[#F8F7F4] border border-[#E5E7EB]">
              <div>
                <span className="text-xs font-medium text-[#374151]">Header & Footer</span>
                <p className="text-[9px] text-[#9CA3AF]">Company header and footer on document</p>
              </div>
              <button 
                onClick={() => setShowHeaderFooter(!showHeaderFooter)} 
                className={`w-9 h-5 rounded-full transition-colors ${showHeaderFooter ? 'bg-[#166534]' : 'bg-[#D1D5DB]'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${showHeaderFooter ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

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
                  <Button size="sm" className="flex-1 h-7 text-xs bg-[#166534] hover:bg-[#14532D]" onClick={addSigner}>Add</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddSigner(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

          {/* Field Palette */}
          <div>
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase mb-2">Add Fields</h4>
            {signers.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] p-2">Add signers first</p>
            ) : (
              signers.map((signer, index) => (
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
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] px-1.5 border-[#E5E7EB]"
                        onClick={() => addFieldToPdf(type, index)}
                      >
                        {FIELD_TYPE_ICONS[type]} {FIELD_TYPE_LABELS[type]}
                      </Button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Field list */}
          <div>
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase mb-2">Placed Fields</h4>
            {signFields.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] p-2">No fields placed yet</p>
            ) : (
              signFields.map((field) => {
                const color = SIGNER_COLORS[field.assigned_to_signer_index % SIGNER_COLORS.length];
                return (
                  <div
                    key={field.id}
                    className={`flex items-center justify-between p-1.5 rounded border mb-1 cursor-pointer transition-colors ${
                      selectedField === field.id ? "border-[#166534] bg-[#F0FDF4]" : "border-[#E5E7EB]"
                    }`}
                    onClick={() => {
                      setSelectedField(field.id);
                      setCurrentPage(field.page);
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-[#374151]">
                        {FIELD_TYPE_ICONS[field.type]} {field.label} — p{field.page}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 text-[#9CA3AF] hover:text-[#DC2626]"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(field.id);
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                );
              })
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
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Mobile panel toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-[#6B7280] lg:hidden"
            onClick={() => setShowRightPanel(true)}
          >
            <PanelRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/recruiter/vaultsign")}
            className="text-[#6B7280] hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Back</span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="font-semibold text-[#111827] truncate">{docName}</h1>
          <Badge variant="outline" className="text-xs bg-[#F8F7F4] hidden sm:inline-flex">
            PDF Document — Read Only
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="border-[#E5E7EB] text-[#166534]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            <span className="hidden sm:inline">Save Fields</span>
          </Button>
          <Button
            size="sm"
            className="bg-[#166534] hover:bg-[#14532D] text-white"
            onClick={handleSend}
          >
            <Send className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Send for Signature</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Canvas — full width on mobile */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Page navigation */}
          <div className="bg-white border-b border-[#E5E7EB] px-4 py-2 flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-[#6B7280]">
              Page {currentPage} of {numPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <Button variant="ghost" size="sm" onClick={() => setScale(Math.max(0.5, scale - 0.1))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-[#6B7280]">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={() => setScale(Math.min(2, scale + 0.1))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Canvas area */}
          <div className="flex-1 overflow-auto p-4 lg:p-6" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            <div ref={canvasContainerRef} className="relative mx-auto" style={{ maxWidth: "800px" }}>
              {/* PDF Error State */}
              {pdfError && !pdfDoc && (
                <div className="w-full min-h-[500px] bg-white rounded-lg border border-[#E5E7EB] shadow-lg flex flex-col items-center justify-center gap-4 p-8">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                    <X className="h-8 w-8 text-[#DC2626]" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-[#111827] mb-1">Failed to render PDF</h3>
                    <p className="text-sm text-[#6B7280] max-w-md">{pdfError}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPdfError(null);
                      fetchDocument();
                    }}
                    className="border-[#166534] text-[#166534]"
                  >
                    Try Again
                  </Button>
                </div>
              )}

              {/* PDF Loading State */}
              {!pdfDoc && !pdfError && pdfUrl && (
                <div className="w-full min-h-[500px] bg-white rounded-lg border border-[#E5E7EB] shadow-lg flex flex-col items-center justify-center gap-4 p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-[#166534]" />
                  <p className="text-sm text-[#6B7280]">Loading PDF...</p>
                </div>
              )}

              {/* No PDF URL State */}
              {!pdfUrl && !pdfError && (
                <div className="w-full min-h-[500px] bg-white rounded-lg border border-[#E5E7EB] shadow-lg flex flex-col items-center justify-center gap-4 p-8">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                    <MousePointer2 className="h-8 w-8 text-[#9CA3AF]" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-[#111827] mb-1">No PDF Available</h3>
                    <p className="text-sm text-[#6B7280]">This document does not have a PDF file associated with it.</p>
                  </div>
                </div>
              )}

              {/* PDF Canvas */}
              {pdfDoc && (
                <canvas
                  ref={(el) => { canvasRef.current = el; }}
                  className="shadow-lg rounded-lg border border-[#E5E7EB]"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              )}

              {/* Rendering indicator */}
              {rendering && pdfDoc && (
                <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-[#166534]" />
                  <span className="text-[10px] text-[#6B7280]">Rendering...</span>
                </div>
              )}

              {/* Sign field overlays */}
              {signFields
                .filter((f) => f.page === currentPage)
                .map((field) => {
                  const color = SIGNER_COLORS[field.assigned_to_signer_index % SIGNER_COLORS.length];
                  const isSelected = selectedField === field.id;
                  return (
                    <div
                      key={field.id}
                      className={`absolute cursor-move vaultsign-field-drag flex items-center justify-center text-xs font-medium rounded border-2 transition-shadow ${
                        isSelected ? "shadow-lg ring-2 ring-offset-1" : "shadow-sm hover:shadow-md"
                      }`}
                      style={{
                        left: `${field.x_percent}%`,
                        top: `${field.y_percent}%`,
                        width: `${field.width_percent}%`,
                        height: `${field.height_percent}%`,
                        borderColor: color,
                        backgroundColor: `${color}15`,
                        color: color,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, field.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedField(field.id);
                      }}
                    >
                      <span className="truncate px-1">
                        {FIELD_TYPE_ICONS[field.type]} {field.label}
                      </span>
                      {isSelected && (
                        <button
                          className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#DC2626] text-white flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeField(field.id);
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Panel — Signers & Fields (desktop only) */}
        <div className="hidden lg:flex w-72 border-l border-[#E5E7EB] bg-white flex-col">
          <div className="p-3 border-b border-[#E5E7EB]">
            <h3 className="font-semibold text-sm text-[#111827]">Signers & Fields</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">Add signers, then drag fields onto the PDF</p>
          </div>
          {rightPanelContent}
        </div>
      </div>

      {/* Mobile: Right panel as bottom Sheet */}
      <Sheet open={showRightPanel} onOpenChange={setShowRightPanel}>
        <SheetContent side="bottom" className="h-[70vh] p-0 flex flex-col rounded-t-lg">
          <SheetHeader className="p-3 border-b border-[#E5E7EB]">
            <SheetTitle className="text-sm">Signers & Fields</SheetTitle>
            <SheetDescription className="text-xs">Add signers, then drag fields onto the PDF</SheetDescription>
          </SheetHeader>
          {rightPanelContent}
        </SheetContent>
      </Sheet>
    </div>
    </VaultSignErrorBoundary>
  );
}

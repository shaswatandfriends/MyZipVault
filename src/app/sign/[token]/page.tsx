"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { VaultSignErrorBoundary } from "@/components/vaultsign/vaultsign-error-boundary";
import { toast } from "sonner";
import SignaturePad from "signature_pad";
import {
  Loader2, Shield, FileText, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Check, X, AlertTriangle
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SIGNER_COLORS, type SignField, type SignFieldType, FIELD_TYPE_LABELS, FIELD_TYPE_ICONS } from "@/lib/vaultsign/types";

const SIGNATURE_FONTS = [
  { name: "Dancing Script", value: "'Dancing Script', cursive" },
  { name: "Great Vibes", value: "'Great Vibes', cursive" },
  { name: "Pacifico", value: "'Pacifico', cursive" },
  { name: "Sacramento", value: "'Sacramento', cursive" },
];

export default function PublicSigningPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [signingData, setSigningData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [agreeToElectronic, setAgreeToElectronic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [signaturePadData, setSignaturePadData] = useState<string>("");
  const [typedSignature, setTypedSignature] = useState("");
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].value);
  const [uploadedSignature, setUploadedSignature] = useState<string>("");
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadRef = useRef<SignaturePad | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Store PDF document object for page-by-page rendering
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  // Fetch signing data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/vaultsign/sign/${token}`);
        const data = await res.json();
        
        if (!res.ok && !data.already_completed && !data.already_signed) {
          setError(data.error || "Failed to load signing data");
          return;
        }

        // If document is already completed or signer already signed, redirect to complete page
        if (data.already_completed || data.already_signed) {
          router.replace(`/sign/${token}/complete`);
          return;
        }

        setSigningData(data);

        if (data.document?.pdf_url) {
          setPdfUrl(data.document.pdf_url);
        }

        // Initialize field values
        if (data.document?.sign_fields) {
          const initial: Record<string, string> = {};
          for (const field of data.document.sign_fields) {
            if (field.type === "date") {
              initial[field.id] = new Date().toLocaleDateString();
            } else if (field.type === "full_name") {
              initial[field.id] = data.signer?.name || "";
            } else if (field.type === "email") {
              initial[field.id] = data.signer?.email || "";
            }
          }
          setFieldValues(initial);
        }
      } catch (err) {
        setError("Failed to load signing data");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [token]);

  // Load PDF document object
  useEffect(() => {
    if (!pdfUrl || typeof window === "undefined") return;

    let cancelled = false;
    const loadPdf = async () => {
      try {
        setPdfDoc(null);
        const pdfjsLib = await import("pdfjs-dist");

        // Ensure worker is configured
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

        let loadingTask;

        // Handle different URL types
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
          loadingTask = pdfjsLib.getDocument(pdfUrl as any);
        } else if (pdfUrl.startsWith("http") || pdfUrl.startsWith("/")) {
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
          canvas,
          canvasContext: context,
          viewport: viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException" || cancelled) return;
        console.error("PDF page render error:", err);
      }
    };

    renderPage();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage, scale]);

  // Initialize signature pad
  useEffect(() => {
    if (showSignatureModal && sigCanvasRef.current && !sigPadRef.current) {
      sigPadRef.current = new SignaturePad(sigCanvasRef.current, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(0, 0, 0)",
        minWidth: 1,
        maxWidth: 2.5,
      });
    }
    return () => {
      sigPadRef.current = null;
    };
  }, [showSignatureModal]);

  // Open signature modal for a field
  const openSignatureModal = (fieldId: string) => {
    setActiveFieldId(fieldId);
    setSignaturePadData("");
    setTypedSignature(signingData?.signer?.name || "");
    setUploadedSignature("");
    setShowSignatureModal(true);
  };

  // Apply signature
  const applySignature = () => {
    if (!activeFieldId) return;

    let signatureData: any = null;

    // Determine which tab is active based on data
    if (signaturePadData) {
      signatureData = {
        type: "drawn",
        image_base64: signaturePadData,
      };
    } else if (uploadedSignature) {
      signatureData = {
        type: "uploaded",
        image_base64: uploadedSignature,
      };
    } else if (typedSignature) {
      signatureData = {
        type: "typed",
        font: selectedFont,
        text: typedSignature,
      };
    }

    if (signatureData) {
      setFieldValues({ ...fieldValues, [activeFieldId]: "signed" });
      // Store signature data for submission
      setSigningData({
        ...signingData,
        _signatureData: {
          ...(signingData._signatureData || {}),
          [activeFieldId]: signatureData,
        },
      });
      setShowSignatureModal(false);
      toast.success("Signature applied");
    } else {
      toast.error("Please create a signature first");
    }
  };

  // Clear signature pad
  const clearSignaturePad = () => {
    sigPadRef.current?.clear();
    setSignaturePadData("");
  };

  // Handle file upload for signature
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedSignature(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit all signatures
  const handleSubmit = async () => {
    if (!agreeToElectronic) {
      toast.error("You must agree to use electronic records and signatures");
      return;
    }

    // Check all required fields are filled
    const myFields: SignField[] = signingData?.document?.sign_fields || [];
    const missingRequired = myFields.filter(
      (f) => f.required && !fieldValues[f.id]
    );
    if (missingRequired.length > 0) {
      toast.error(`Please fill all required fields: ${missingRequired.map((f) => f.label).join(", ")}`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/vaultsign/sign/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_values: fieldValues,
          signature_data: signingData._signatureData || {},
          agree_to_electronic: true,
        }),
      });

      if (res.ok) {
        router.push(`/sign/${token}/complete`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit signature");
      }
    } catch {
      toast.error("Failed to submit signature");
    } finally {
      setSubmitting(false);
    }
  };

  // Decline to sign
  const handleDecline = async () => {
    try {
      const res = await fetch(`/api/vaultsign/sign/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason }),
      });
      if (res.ok) {
        toast.info("You have declined to sign this document");
        setShowDeclineModal(false);
        setError("You have declined to sign this document.");
      }
    } catch {
      toast.error("Failed to decline");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-text-secondary">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-border p-8 max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-status-amber mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Unable to Sign</h2>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  const myFields: SignField[] = signingData?.document?.sign_fields || [];

  return (
    <VaultSignErrorBoundary>
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header — compact on mobile */}
      <div className="bg-white border-b border-border px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div>
            <h1 className="font-semibold text-foreground text-base sm:text-lg">VaultSign</h1>
            <p className="text-[10px] sm:text-xs text-text-secondary">by MyZipVault</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right">
            <p className="text-xs sm:text-sm font-medium text-foreground">{signingData?.signer?.name}</p>
            <p className="text-[10px] sm:text-xs text-text-secondary">{signingData?.signer?.email}</p>
          </div>
        </div>
      </div>

      {/* Document info — compact on mobile */}
      <div className="bg-white border-b border-border px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="font-medium text-xs sm:text-sm text-foreground truncate">{signingData?.document?.document_name}</span>
          <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{signingData?.document?.document_type}</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-status-red border-status-red-border/30 hover:bg-status-red-bg text-xs flex-shrink-0 h-7"
          onClick={() => setShowDeclineModal(true)}
        >
          Decline
        </Button>
      </div>

      {/* Main content — stacked on mobile, side-by-side on lg+ */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* PDF viewer */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Page navigation — compact on mobile */}
          <div className="bg-white border-b border-border px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs sm:text-sm text-text-secondary">{currentPage}/{numPages}</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))} disabled={currentPage >= numPages}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setScale(Math.max(0.5, scale - 0.1))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] sm:text-xs text-text-secondary">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setScale(Math.min(2, scale + 0.1))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Canvas — full width on mobile */}
          <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
            <div className="relative mx-auto" style={{ maxWidth: "800px" }}>
              <canvas
                ref={(el) => { canvasRef.current = el; }}
                className="shadow-lg rounded-lg border border-border"
                style={{ maxWidth: "100%", height: "auto" }}
              />

              {/* Sign field overlays for this signer */}
              {myFields
                .filter((f) => f.page === currentPage)
                .map((field) => {
                  const isFilled = !!fieldValues[field.id];
                  const color = SIGNER_COLORS[0]; // Always first color for this signer's fields
                  return (
                    <div
                      key={field.id}
                      className={`absolute cursor-pointer vaultsign-field-drag flex items-center justify-center text-xs font-medium rounded border-2 transition-all ${
                        isFilled ? "border-green-500 bg-green-50/80" : "border-primary bg-primary-light/80 hover:bg-primary-light/80"
                      }`}
                      style={{
                        left: `${field.x_percent}%`,
                        top: `${field.y_percent}%`,
                        width: `${field.width_percent}%`,
                        height: `${field.height_percent}%`,
                      }}
                      onClick={() => {
                        if (field.type === "signature") {
                          openSignatureModal(field.id);
                        }
                      }}
                    >
                      {isFilled ? (
                        <span className="text-green-700 truncate px-1">✓ Signed</span>
                      ) : (
                        <span className="text-primary truncate px-1">
                          {field.type === "signature" ? "Click to Sign" : `${FIELD_TYPE_ICONS[field.type]} ${field.label}`}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right panel / Bottom section on mobile — Fields to fill */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-white flex flex-col max-h-[50vh] lg:max-h-none">
          <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Your Fields to Fill</h3>
              <p className="text-xs text-text-secondary mt-0.5">Fill in all required fields</p>
            </div>
            <Badge variant="outline" className="text-[10px] lg:hidden">
              {Object.keys(fieldValues).filter((k) => fieldValues[k]).length}/{myFields.length}
            </Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 sm:p-4 space-y-3">
              {myFields.map((field) => (
                <div key={field.id} className="p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">{FIELD_TYPE_ICONS[field.type]}</span>
                    <span className="text-sm font-medium text-foreground">{field.label}</span>
                    {field.required && <Badge variant="outline" className="text-[10px] h-4 text-status-red border-status-red-border/30">Required</Badge>}
                  </div>

                  {field.type === "signature" ? (
                    <Button
                      variant="outline"
                      className={`w-full h-12 border-dashed border-primary/30 text-primary hover:bg-primary-light ${!fieldValues[field.id] ? "animate-vaultsign-pulse-green" : ""}`}
                      onClick={() => openSignatureModal(field.id)}
                    >
                      {fieldValues[field.id] ? (
                        <><Check className="h-4 w-4 mr-1" /> Signature Applied</>
                      ) : (
                        <><FileText className="h-4 w-4 mr-1" /> Click to Sign</>
                      )}
                    </Button>
                  ) : (
                    <Input
                      value={fieldValues[field.id] || ""}
                      onChange={(e) => setFieldValues({ ...fieldValues, [field.id]: e.target.value })}
                      placeholder={field.label}
                      className="h-9 text-sm"
                    />
                  )}
                </div>
              ))}

              {myFields.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">No fields assigned to you</p>
              )}
            </div>
          </ScrollArea>

          {/* Agreement & Submit */}
          <div className="p-3 sm:p-4 border-t border-border space-y-3 flex-shrink-0">
            <div className="flex items-start gap-2">
              <Checkbox
                id="agree-electronic"
                checked={agreeToElectronic}
                onCheckedChange={(checked) => setAgreeToElectronic(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="agree-electronic" className="text-xs text-foreground leading-relaxed cursor-pointer">
                I agree to use electronic records and signatures. I understand that my electronic signature is legally binding.
              </label>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary-hover text-white"
              onClick={handleSubmit}
              disabled={!agreeToElectronic || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              Complete Signing
            </Button>
          </div>
        </div>
      </div>

      {/* Signature Modal — full screen on mobile */}
      <Dialog open={showSignatureModal} onOpenChange={setShowSignatureModal}>
        <DialogContent className="sm:max-w-lg w-[calc(100%-1rem)] h-[90vh] sm:h-auto max-h-none sm:max-h-none flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create Your Signature</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="draw" className="w-full flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="draw">Draw</TabsTrigger>
              <TabsTrigger value="type">Type</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="draw" className="mt-4 flex-1 flex flex-col">
              <div className="border border-border rounded-lg overflow-hidden bg-white flex-1 min-h-[180px] sm:min-h-[200px]">
                <canvas
                  ref={sigCanvasRef}
                  width={460}
                  height={200}
                  className="w-full h-full touch-none"
                  onTouchEnd={() => {
                    if (sigPadRef.current) {
                      setSignaturePadData(sigPadRef.current.toDataURL());
                    }
                  }}
                  onMouseUp={() => {
                    if (sigPadRef.current) {
                      setSignaturePadData(sigPadRef.current.toDataURL());
                    }
                  }}
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button variant="outline" size="sm" onClick={clearSignaturePad}>
                  Clear
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="type" className="mt-4">
              <Input
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Type your name"
                className="mb-3"
              />
              <div className="space-y-2">
                <p className="text-xs text-text-secondary">Choose a font style:</p>
                <div className="grid grid-cols-2 gap-2">
                  {SIGNATURE_FONTS.map((font) => (
                    <button
                      key={font.value}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        selectedFont === font.value
                          ? "border-primary bg-primary-light"
                          : "border-border hover:border-primary/30"
                      }`}
                      onClick={() => setSelectedFont(font.value)}
                    >
                      <span style={{ fontFamily: font.value, fontSize: "18px" }}>
                        {typedSignature || "Preview"}
                      </span>
                      <p className="text-[10px] text-text-secondary mt-1">{font.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                {uploadedSignature ? (
                  <div className="space-y-3">
                    <img
                      src={uploadedSignature}
                      alt="Uploaded signature"
                      className="max-h-32 mx-auto"
                    />
                    <Button variant="outline" size="sm" onClick={() => setUploadedSignature("")}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="max-w-xs mx-auto"
                    />
                    <p className="text-xs text-text-secondary mt-2">Upload an image of your signature</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowSignatureModal(false)}>
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary-hover" onClick={applySignature}>
              Apply Signature
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline Modal */}
      <Dialog open={showDeclineModal} onOpenChange={setShowDeclineModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline to Sign</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            Are you sure you want to decline signing this document? This action cannot be undone.
          </p>
          <Input
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason for declining (optional)"
            className="mt-2"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeclineModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline}>
              Decline
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
    </VaultSignErrorBoundary>
  );
}

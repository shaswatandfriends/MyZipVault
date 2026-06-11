"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Upload, FileText, FileSignature,
  LayoutTemplate, Loader2, Plus, Trash2, X, Check
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VaultSignErrorBoundary } from "@/components/vaultsign/vaultsign-error-boundary";

const DOCUMENT_TYPES = [
  { value: "right_to_represent", label: "Right to Represent" },
  { value: "pre_offer_acceptance", label: "Pre-Offer Acceptance" },
  { value: "offer_letter", label: "Offer Letter" },
  { value: "nda", label: "NDA" },
  { value: "background_check_authorization", label: "Background Check Authorization" },
  { value: "employment_contract", label: "Employment Contract" },
  { value: "onboarding_form", label: "Onboarding Form" },
  { value: "custom", label: "Custom" },
];

const SIGNER_ROLES = ["Candidate", "Recruiter", "Client Employer", "Witness", "Other"];

export default function NewDocumentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#166534]" />
      </div>
    }>
      <NewDocumentContent />
    </Suspense>
  );
}

function NewDocumentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateIdParam = searchParams.get("template_id");

  const [step, setStep] = useState(1);
  const [source, setSource] = useState<"template" | "upload_docx" | "upload_pdf" | "blank" | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    templateIdParam ? parseInt(templateIdParam) : null
  );
  const [templates, setTemplates] = useState<any[]>([]);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("custom");
  const [signingOrder, setSigningOrder] = useState("sequential");
  const [expiryDays, setExpiryDays] = useState("30");
  const [personalMessage, setPersonalMessage] = useState("");
  const [signers, setSigners] = useState<Array<{ name: string; email: string; role: string }>>([
    { name: "", email: "", role: "Candidate" },
  ]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedHtmlContent, setUploadedHtmlContent] = useState<string | null>(null);
  const [uploadedSourceType, setUploadedSourceType] = useState<"word" | "pdf" | null>(null);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/vaultsign/templates");
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } catch (err) {
        console.error("Templates fetch error:", err);
      }
    };
    fetchTemplates();
  }, []);

  // Auto-fill from template selection
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t: any) => t.id === selectedTemplateId);
      if (template) {
        setDocName(template.name);
        setDocType(template.document_type);
        setSource("template");
      }
    }
  }, [selectedTemplateId, templates]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, expectedType: "docx" | "pdf") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (expectedType === "docx" && ext !== "docx" && ext !== "doc") {
      toast.error("Please upload a .docx file");
      return;
    }
    if (expectedType === "pdf" && ext !== "pdf") {
      toast.error("Please upload a .pdf file");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/vaultsign/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setUploadedFileUrl(data.document_url);
      setUploadedSourceType(data.source_type);
      if (data.html_content) {
        setUploadedHtmlContent(data.html_content);
      }
      if (!docName) {
        setDocName(file.name.replace(/\.[^.]+$/, ""));
      }
      toast.success("File uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Add signer
  const addSigner = () => {
    setSigners([...signers, { name: "", email: "", role: "Candidate" }]);
  };

  // Remove signer
  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  // Update signer
  const updateSigner = (index: number, field: string, value: string) => {
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: value };
    setSigners(updated);
  };

  // Create document and redirect
  const handleCreate = async () => {
    if (!docName) {
      toast.error("Please enter a document name");
      return;
    }

    try {
      setCreating(true);

      const body: any = {
        document_name: docName,
        document_type: docType,
        source_type: source === "template" ? "word" : uploadedSourceType || "word",
        template_id: selectedTemplateId,
        original_file_url: uploadedFileUrl,
        tiptap_content: uploadedHtmlContent || undefined,
        signing_order: signingOrder,
        expiry_date: new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000).toISOString(),
        personal_message: personalMessage || undefined,
        signers: signers
          .filter((s) => s.name && s.email)
          .map((s, i) => ({
            name: s.name,
            email: s.email,
            role: s.role,
            signer_index: i,
            signing_order_position: i + 1,
          })),
      };

      const res = await fetch("/api/vaultsign/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create document");
      }

      const doc = await res.json();

      // Redirect to appropriate editor
      const route = doc.source_type === "pdf"
        ? `/recruiter/vaultsign/signer/${doc.id}`
        : `/recruiter/vaultsign/editor/${doc.id}`;

      router.push(route);
    } catch (err: any) {
      toast.error(err.message || "Failed to create document");
    } finally {
      setCreating(false);
    }
  };

  return (
    <VaultSignErrorBoundary>
    <div className="min-h-screen bg-[#F8F7F4]">
      <div className="max-w-3xl mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/recruiter/vaultsign")} className="text-[#6B7280]">
            <ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Back</span>
          </Button>
          <h1 className="text-xl font-bold text-[#111827]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            New Document
          </h1>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { num: 1, label: "Source" },
            { num: 2, label: "Details" },
            { num: 3, label: "Signers" },
            { num: 4, label: "Create" },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div className={`flex items-center gap-1 sm:gap-2 ${step >= s.num ? "text-[#166534]" : "text-[#9CA3AF]"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step > s.num ? "bg-[#166534] text-white" : step === s.num ? "bg-[#166534] text-white" : "bg-[#E5E7EB] text-[#9CA3AF]"
                }`}>
                  {step > s.num ? <Check className="h-3 w-3" /> : s.num}
                </div>
                <span className="text-[10px] sm:text-xs font-medium hidden sm:inline">{s.label}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 min-w-[8px] ${step > s.num ? "bg-[#166534]" : "bg-[#E5E7EB]"}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Choose source */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#111827]">Choose Document Source</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card
                className={`rounded-2xl cursor-pointer transition-all border-2 ${
                  source === "template" ? "border-[#166534] bg-[#F0FDF4]" : "border-[#E5E7EB] hover:border-[#166534]/30"
                }`}
                onClick={() => setSource("template")}
              >
                <CardContent className="p-4 text-center">
                  <LayoutTemplate className="h-8 w-8 mx-auto text-[#166534] mb-2" />
                  <p className="font-medium text-[#111827]">From Template</p>
                  <p className="text-xs text-[#6B7280]">Start with a pre-built template</p>
                </CardContent>
              </Card>

              <Card
                className={`rounded-2xl cursor-pointer transition-all border-2 ${
                  source === "upload_docx" ? "border-[#166534] bg-[#F0FDF4]" : "border-[#E5E7EB] hover:border-[#166534]/30"
                }`}
                onClick={() => setSource("upload_docx")}
              >
                <CardContent className="p-4 text-center">
                  <FileText className="h-8 w-8 mx-auto text-[#166534] mb-2" />
                  <p className="font-medium text-[#111827]">Upload .docx</p>
                  <p className="text-xs text-[#6B7280]">Full rich text editing</p>
                </CardContent>
              </Card>

              <Card
                className={`rounded-2xl cursor-pointer transition-all border-2 ${
                  source === "upload_pdf" ? "border-[#166534] bg-[#F0FDF4]" : "border-[#E5E7EB] hover:border-[#166534]/30"
                }`}
                onClick={() => setSource("upload_pdf")}
              >
                <CardContent className="p-4 text-center">
                  <FileSignature className="h-8 w-8 mx-auto text-[#166534] mb-2" />
                  <p className="font-medium text-[#111827]">Upload .pdf</p>
                  <p className="text-xs text-[#6B7280]">Place fields on read-only PDF</p>
                </CardContent>
              </Card>

              <Card
                className={`rounded-2xl cursor-pointer transition-all border-2 ${
                  source === "blank" ? "border-[#166534] bg-[#F0FDF4]" : "border-[#E5E7EB] hover:border-[#166534]/30"
                }`}
                onClick={() => setSource("blank")}
              >
                <CardContent className="p-4 text-center">
                  <Plus className="h-8 w-8 mx-auto text-[#166534] mb-2" />
                  <p className="font-medium text-[#111827]">Blank Document</p>
                  <p className="text-xs text-[#6B7280]">Start from scratch</p>
                </CardContent>
              </Card>
            </div>

            {/* Template selector */}
            {source === "template" && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-[#111827]">Select Template</Label>
                <Select
                  value={selectedTemplateId?.toString() || ""}
                  onValueChange={(val) => setSelectedTemplateId(parseInt(val))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t: any) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name} — {t.document_type} ({t.source_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* File upload */}
            {(source === "upload_docx" || source === "upload_pdf") && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-[#111827]">
                  Upload {source === "upload_docx" ? ".docx" : ".pdf"} File
                </Label>
                <div className="mt-1">
                  <Input
                    type="file"
                    accept={source === "upload_docx" ? ".docx,.doc" : ".pdf"}
                    onChange={(e) => handleFileUpload(e, source === "upload_docx" ? "docx" : "pdf")}
                    disabled={uploading}
                    className="max-w-md"
                  />
                  {uploading && <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</p>}
                  {uploadedFileUrl && <Badge className="mt-2 bg-[#DCFCE7] text-[#166534] border-0"><Check className="h-3 w-3 mr-1" /> File uploaded</Badge>}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button
                className="bg-[#166534] hover:bg-[#14532D] text-white"
                onClick={() => setStep(2)}
                disabled={!source || ((source === "upload_docx" || source === "upload_pdf") && !uploadedFileUrl) || (source === "template" && !selectedTemplateId)}
              >
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Document details */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#111827]">Document Details</h2>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Document Name</Label>
                <Input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g., Employment Contract"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Signing Order</Label>
                  <Select value={signingOrder} onValueChange={setSigningOrder}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sequential">Sequential</SelectItem>
                      <SelectItem value="parallel">Parallel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Expires In (days)</Label>
                  <Input
                    type="number"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    min="1"
                    max="365"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Personal Message (optional)</Label>
                <Textarea
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="Add a message for the signers..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button className="bg-[#166534] hover:bg-[#14532D] text-white" onClick={() => setStep(3)} disabled={!docName}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Signers */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#111827]">Add Signers</h2>
            <p className="text-sm text-[#6B7280]">
              {signingOrder === "sequential"
                ? "Signers will sign in order. Each signer must sign before the next."
                : "All signers can sign at the same time."}
            </p>

            <div className="space-y-3">
              {signers.map((signer, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-xl border border-[#E5E7EB] bg-white">
                  <div className="w-8 h-8 rounded-full bg-[#166534] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Full name"
                      value={signer.name}
                      onChange={(e) => updateSigner(index, "name", e.target.value)}
                    />
                    <Input
                      placeholder="Email address"
                      type="email"
                      value={signer.email}
                      onChange={(e) => updateSigner(index, "email", e.target.value)}
                    />
                    <Select value={signer.role} onValueChange={(val) => updateSigner(index, "role", val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SIGNER_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {signers.length > 1 && (
                    <Button variant="ghost" size="sm" className="text-[#9CA3AF] hover:text-[#DC2626]" onClick={() => removeSigner(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button variant="outline" className="border-dashed w-full" onClick={addSigner}>
              <Plus className="h-4 w-4 mr-1" /> Add Another Signer
            </Button>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button className="bg-[#166534] hover:bg-[#14532D] text-white" onClick={() => setStep(4)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Create */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#111827]">Review & Create</h2>

            <Card className="rounded-2xl border-[#E5E7EB]">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Document Name</span>
                  <span className="text-sm font-medium text-[#111827]">{docName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Source</span>
                  <Badge variant="outline">{source === "template" ? "Template" : source === "upload_docx" ? "Word Upload" : source === "upload_pdf" ? "PDF Upload" : "Blank"}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Type</span>
                  <span className="text-sm text-[#111827]">{DOCUMENT_TYPES.find((t) => t.value === docType)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Signing Order</span>
                  <Badge variant="outline">{signingOrder}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Expires</span>
                  <span className="text-sm text-[#111827]">{expiryDays} days</span>
                </div>
                <div>
                  <span className="text-sm text-[#6B7280]">Signers ({signers.filter((s) => s.name && s.email).length})</span>
                  <div className="mt-1 space-y-1">
                    {signers.filter((s) => s.name && s.email).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 rounded-full bg-[#166534] text-white flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </div>
                        <span className="text-[#111827]">{s.name}</span>
                        <span className="text-[#6B7280]">({s.email})</span>
                        <Badge variant="outline" className="text-[10px]">{s.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                className="bg-[#166534] hover:bg-[#14532D] text-white"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Create Document
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </VaultSignErrorBoundary>
  );
}

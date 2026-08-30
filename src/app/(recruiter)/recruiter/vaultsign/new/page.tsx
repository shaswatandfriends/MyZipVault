"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Upload, FileSignature,
  LayoutTemplate, Loader2, Plus, Trash2, X, Check, Users
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
  const leadIdParam = searchParams.get("lead");

  const [step, setStep] = useState(1);
  const [source, setSource] = useState<"template" | "upload_pdf" | "blank" | null>(null);
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
  const [uploadedSourceType, setUploadedSourceType] = useState<"pdf" | null>(null);

  // ─── BOB: Lead selection ──────────────────────────────────────
  // When the recruiter arrives via ?lead=X (from the BOB candidate
  // profile "Send VaultSign doc" button), we pre-select that lead
  // and auto-fill the first signer's name + email from the lead.
  const [leads, setLeads] = useState<Array<{ id: number; first_name: string; last_name: string; email: string | null; specialty: string | null; pipeline_stage: string }>>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(
    leadIdParam ? parseInt(leadIdParam) : null
  );

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

  // ─── Fetch BOB leads for the lead selector ────────────────────
  // Shows the recruiter's own BOB + company pool (so they can send to
  // any claimable candidate too — sending auto-claims them).
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch("/api/recruiter/bob?view=my_bob&limit=500");
        if (res.ok) {
          const data = await res.json();
          setLeads(data.leads || []);
        }
      } catch (err) {
        console.error("Leads fetch error:", err);
      }
    };
    fetchLeads();
  }, []);

  // ─── Auto-fill first signer from selected lead ────────────────
  useEffect(() => {
    if (selectedLeadId) {
      const lead = leads.find((l) => l.id === selectedLeadId);
      if (lead) {
        const updatedSigners = [...signers];
        updatedSigners[0] = {
          name: `${lead.first_name} ${lead.last_name}`.trim(),
          email: lead.email || "",
          role: "Candidate",
        };
        setSigners(updatedSigners);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeadId, leads]);

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
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf") {
      toast.error("Please upload a .pdf file");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/vaultsign/documents", {
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
        source_type: source === "template" || source === "blank" ? "word" : uploadedSourceType || "pdf",
        template_id: selectedTemplateId,
        original_file_url: uploadedFileUrl,
        signing_order: signingOrder,
        expiry_date: new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000).toISOString(),
        personal_message: personalMessage || undefined,
        candidate_lead_id: selectedLeadId,
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

      // Redirect to appropriate page:
      // - PDF uploads → signer page (place sign fields on the PDF)
      // - Blank/Template → Word editor (compose or edit content first)
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
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/recruiter/vaultsign")} className="text-text-secondary">
            <ArrowLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Back</span>
          </Button>
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
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
              <div className={`flex items-center gap-1 sm:gap-2 ${step >= s.num ? "text-primary" : "text-text-muted"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step > s.num ? "bg-primary text-white" : step === s.num ? "bg-primary text-white" : "bg-surface-3 text-text-muted"
                }`}>
                  {step > s.num ? <Check className="h-3 w-3" /> : s.num}
                </div>
                <span className="text-[10px] sm:text-xs font-medium hidden sm:inline">{s.label}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 min-w-[8px] ${step > s.num ? "bg-primary" : "bg-surface-3"}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Choose source */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Choose Document Source</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card
                className={`rounded-2xl cursor-pointer transition-all border-2 ${
                  source === "template" ? "border-primary bg-primary-light" : "border-border hover:border-primary/30"
                }`}
                onClick={() => setSource("template")}
              >
                <CardContent className="p-4 text-center">
                  <LayoutTemplate className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="font-medium text-foreground">From Template</p>
                  <p className="text-xs text-text-secondary">Start with a pre-built template</p>
                </CardContent>
              </Card>

              <Card
                className={`rounded-2xl cursor-pointer transition-all border-2 ${
                  source === "upload_pdf" ? "border-primary bg-primary-light" : "border-border hover:border-primary/30"
                }`}
                onClick={() => setSource("upload_pdf")}
              >
                <CardContent className="p-4 text-center">
                  <FileSignature className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="font-medium text-foreground">Upload PDF</p>
                  <p className="text-xs text-text-secondary">Edit your Word file, save as PDF, then upload for signing</p>
                </CardContent>
              </Card>

              <Card
                className={`rounded-2xl cursor-pointer transition-all border-2 ${
                  source === "blank" ? "border-primary bg-primary-light" : "border-border hover:border-primary/30"
                }`}
                onClick={() => setSource("blank")}
              >
                <CardContent className="p-4 text-center">
                  <Plus className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="font-medium text-foreground">Blank Document</p>
                  <p className="text-xs text-text-secondary">Create your own template (RTR, offer letter, etc.)</p>
                </CardContent>
              </Card>
            </div>

            {/* Template selector */}
            {source === "template" && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-foreground">Select Template</Label>
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
            {source === "upload_pdf" && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-foreground">
                  Upload PDF File
                </Label>
                <div className="mt-1">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e)}
                    disabled={uploading}
                    className="max-w-md"
                  />
                  {uploading && <p className="text-xs text-text-secondary mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</p>}
                  {uploadedFileUrl && <Badge className="mt-2 bg-primary-light text-primary border-0"><Check className="h-3 w-3 mr-1" /> File uploaded</Badge>}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button
                className="bg-primary hover:bg-primary-hover text-white"
                onClick={() => setStep(2)}
                disabled={!source || (source === "upload_pdf" && !uploadedFileUrl) || (source === "template" && !selectedTemplateId)}
              >
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Document details */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Document Details</h2>

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
              <Button className="bg-primary hover:bg-primary-hover text-white" onClick={() => setStep(3)} disabled={!docName}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Signers */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Add Signers</h2>
            <p className="text-sm text-text-secondary">
              {signingOrder === "sequential"
                ? "Signers will sign in order. Each signer must sign before the next."
                : "All signers can sign at the same time."}
            </p>

            {/* BOB Lead selector — links this document to a candidate lead
                so the status engine can auto-update the lead when sent/signed/declined */}
            {leads.length > 0 && (
              <div className="p-3 rounded-xl border border-primary/30 bg-primary/5">
                <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                  <Users className="h-3.5 w-3.5" /> Link to BOB candidate (recommended)
                </Label>
                <Select
                  value={selectedLeadId?.toString() ?? ""}
                  onValueChange={(val) => setSelectedLeadId(val && val !== "__none__" ? parseInt(val) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a candidate from your BOB to auto-fill their details..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None (manual entry) —</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id.toString()}>
                        {lead.first_name} {lead.last_name}
                        {lead.email ? ` · ${lead.email}` : ""}
                        {lead.specialty ? ` · ${lead.specialty}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-text-muted mt-1.5">
                  Linking to a BOB candidate enables automatic status updates —
                  sending an RTR moves them to "Interested", signing moves them through
                  the pipeline, declining counts toward the 5-denial auto-not-interested rule.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {signers.map((signer, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-white">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
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
                    <Button variant="ghost" size="sm" className="text-text-muted hover:text-status-red" onClick={() => removeSigner(index)}>
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
              <Button className="bg-primary hover:bg-primary-hover text-white" onClick={() => setStep(4)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Create */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Review & Create</h2>

            <Card className="rounded-2xl border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Document Name</span>
                  <span className="text-sm font-medium text-foreground">{docName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Source</span>
                  <Badge variant="outline">{source === "template" ? "Template" : source === "upload_pdf" ? "PDF Upload" : "Blank"}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Type</span>
                  <span className="text-sm text-foreground">{DOCUMENT_TYPES.find((t) => t.value === docType)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Signing Order</span>
                  <Badge variant="outline">{signingOrder}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Expires</span>
                  <span className="text-sm text-foreground">{expiryDays} days</span>
                </div>
                <div>
                  <span className="text-sm text-text-secondary">Signers ({signers.filter((s) => s.name && s.email).length})</span>
                  <div className="mt-1 space-y-1">
                    {signers.filter((s) => s.name && s.email).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </div>
                        <span className="text-foreground">{s.name}</span>
                        <span className="text-text-secondary">({s.email})</span>
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
                className="bg-primary hover:bg-primary-hover text-white"
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

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import {
  Send,
  User,
  ClipboardCheck,
  FileText,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Info,
  Coins,
  Loader2,
  Search,
  Mail,
  Phone,
  Briefcase,
  Stethoscope,
  Layers,
  Plus,
} from "@/lib/icons";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChecklistTemplate {
  id: number;
  profession: string;
  specialty: string;
  name: string;
  skillCount: number;
}

interface Bundle {
  id: number;
  name: string;
  description: string | null;
  checklist_template_id: number;
  documents: string; // JSON array
  credit_cost: number;
  checklist_template: { id: number; name: string; profession: string; specialty: string };
}

interface CandidateInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  specialty: string;
}

type DocumentOption = "resume" | "bls" | "acls" | "references" | "other_credentials";

const DOCUMENT_OPTIONS: { key: DocumentOption; label: string }[] = [
  { key: "resume", label: "Resume" },
  { key: "bls", label: "BLS" },
  { key: "acls", label: "ACLS" },
  { key: "references", label: "References" },
  { key: "other_credentials", label: "Other Credentials" },
];

// Map frontend document keys to API-expected values
const DOCUMENT_API_MAP: Record<DocumentOption, string> = {
  resume: "resume",
  bls: "credential",
  acls: "credential",
  references: "reference",
  other_credentials: "credential",
};

const STEPS = ["Candidate Info", "Checklist", "Documents", "Review"];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SendRequestPage() {
  return (
    <React.Suspense fallback={<div className="p-6"><Skeleton className="h-96 w-full" /></div>}>
      <RecruiterSendPage />
    </React.Suspense>
  );
}

function RecruiterSendPage() {
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("lead");

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successCandidateName, setSuccessCandidateName] = useState("");

  // Step 1 — Candidate Info
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    specialty: "",
  });

  // ─── BOB: Lead selection ──────────────────────────────────────
  // Lets the recruiter pick a lead from their BOB to auto-fill the
  // candidate info. Also auto-links the Send Request to the lead so
  // the status engine fires onDocRequested.
  const [leads, setLeads] = useState<Array<{ id: number; first_name: string; last_name: string; email: string | null; phone: string | null; job_title: string | null; specialty: string | null }>>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(
    leadIdParam ? parseInt(leadIdParam) : null
  );

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

  // Auto-fill candidate info when a lead is selected
  useEffect(() => {
    if (selectedLeadId) {
      const lead = leads.find((l) => l.id === selectedLeadId);
      if (lead) {
        setCandidateInfo({
          firstName: lead.first_name,
          lastName: lead.last_name,
          email: lead.email || "",
          phone: lead.phone || "",
          jobTitle: lead.job_title || "",
          specialty: lead.specialty || "",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeadId, leads]);

  // Email check state
  const [emailCheckStatus, setEmailCheckStatus] = useState<
    "idle" | "checking" | "exists_candidate" | "exists_non_candidate" | "available"
  >("idle");
  const [existingCandidateName, setExistingCandidateName] = useState("");

  // Step 2 — Checklist Selection
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Bundles
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [selectedBundleId, setSelectedBundleId] = useState<number | null>(null);

  // Step 3 — Document Selection
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentOption[]>([]);

  // ─── Debounced Email Check ──────────────────────────────────────────────

  const checkEmailExists = useCallback(async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailCheckStatus("idle");
      return;
    }

    setEmailCheckStatus("checking");
    try {
      const res = await fetch(
        `/api/recruiter/check-email?email=${encodeURIComponent(email)}`
      );
      if (!res.ok) {
        setEmailCheckStatus("idle");
        return;
      }
      const data = await res.json();
      if (data.exists && data.isCandidate) {
        setEmailCheckStatus("exists_candidate");
        setExistingCandidateName(data.candidateName || "");
      } else if (data.exists && !data.isCandidate) {
        setEmailCheckStatus("exists_non_candidate");
        setExistingCandidateName("");
      } else {
        setEmailCheckStatus("available");
      }
    } catch {
      setEmailCheckStatus("idle");
    }
  }, []);

  // Debounce the email check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkEmailExists(candidateInfo.email);
    }, 500);
    return () => clearTimeout(timer);
  }, [candidateInfo.email, checkEmailExists]);

  // ─── Fetch Checklist Templates ─────────────────────────────────────────

  useEffect(() => {
    if (currentStep === 1 && templates.length === 0) {
      fetchTemplates();
      fetchBundles();
    }
  }, [currentStep, templates.length]);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/checklists/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load checklist templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchBundles = async () => {
    try {
      const res = await fetch("/api/recruiter/bundles");
      if (res.ok) {
        const data = await res.json();
        setBundles(data.bundles || []);
      }
    } catch {
      // Bundles are optional — silent fail
    }
  };

  // ─── Bundle Selection Handler ─────────────────────────────────────────
  // When a bundle is selected, auto-fill the checklist template + documents.
  // When deselected (custom), clear selections so user can pick manually.
  const handleBundleSelect = (bundleId: number | null) => {
    setSelectedBundleId(bundleId);

    if (bundleId === null) {
      // Custom — don't change existing selections, just let user pick manually
      return;
    }

    const bundle = bundles.find((b) => b.id === bundleId);
    if (!bundle) return;

    // Auto-select the checklist template
    setSelectedTemplateId(bundle.checklist_template_id);

    // Map bundle document types to frontend DocumentOption types
    let docs: string[] = [];
    try {
      docs = JSON.parse(bundle.documents);
    } catch {
      docs = [];
    }

    const mappedDocs: DocumentOption[] = [];
    if (docs.includes("resume")) mappedDocs.push("resume");
    if (docs.includes("credential")) mappedDocs.push("other_credentials");
    if (docs.includes("reference")) mappedDocs.push("references");

    setSelectedDocuments(mappedDocs);
  };

  // ─── Validation ────────────────────────────────────────────────────────

  const isStep1Valid = () => {
    return (
      candidateInfo.firstName.trim() !== "" &&
      candidateInfo.lastName.trim() !== "" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateInfo.email) &&
      emailCheckStatus !== "exists_non_candidate"
    );
  };

  const isStep2Valid = () => selectedTemplateId !== null;

  const isStepCurrentValid = () => {
    switch (currentStep) {
      case 0:
        return isStep1Valid();
      case 1:
        return isStep2Valid();
      case 2:
        return true; // Documents are optional
      case 3:
        return true;
      default:
        return false;
    }
  };

  // ─── Navigation ────────────────────────────────────────────────────────

  const goNext = () => {
    if (currentStep < 3 && isStepCurrentValid()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ─── Submit ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
      const documents = selectedDocuments.map((doc) => DOCUMENT_API_MAP[doc]);

      const res = await fetch("/api/recruiter/send-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: candidateInfo.firstName,
          lastName: candidateInfo.lastName,
          email: candidateInfo.email,
          phone: candidateInfo.phone || undefined,
          jobTitle: candidateInfo.jobTitle || undefined,
          specialty: candidateInfo.specialty || undefined,
          checklistTemplateId: selectedTemplateId,
          documents,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to send request");
      }

      const data = await res.json();
      setSuccessCandidateName(`${candidateInfo.firstName} ${candidateInfo.lastName}`);
      setIsSuccess(true);
      toast({
        title: "Request Sent!",
        description: data.message || `Verification request sent to ${candidateInfo.firstName} ${candidateInfo.lastName}.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to send request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Credit Calculation ────────────────────────────────────────────────

  const totalCredits = 1 + selectedDocuments.length; // 1 for checklist + 1 per doc

  // ─── Selected Template ─────────────────────────────────────────────────

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // ─── Reset Form ────────────────────────────────────────────────────────

  const handleReset = () => {
    setCurrentStep(0);
    setCandidateInfo({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      jobTitle: "",
      specialty: "",
    });
    setSelectedTemplateId(null);
    setSelectedDocuments([]);
    setIsSuccess(false);
    setSuccessCandidateName("");
    setEmailCheckStatus("idle");
    setExistingCandidateName("");
  };

  // ─── Toggle Document ───────────────────────────────────────────────────

  const toggleDocument = (doc: DocumentOption) => {
    setSelectedDocuments((prev) =>
      prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]
    );
  };

  // ─── Specialty Options from Templates ──────────────────────────────────

  const specialtyOptions = Array.from(
    new Set(templates.map((t) => t.specialty).filter(Boolean))
  ).sort();

  // ─── Success State ─────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Send Request"
          description="Send checklist and verification requests to healthcare candidates."
        />
        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="rounded-full bg-emerald-100 p-4 mb-4">
              <CheckCircle2 className="size-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold">Request Sent!</h2>
            <p className="mt-2 text-muted-foreground">
              Request sent to <span className="font-semibold text-foreground">{successCandidateName}</span>!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The candidate will receive an email with instructions to complete the verification process.
            </p>
            <Button
              onClick={handleReset}
              className="mt-6 gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="size-4" />
              Send Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Form ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send Request"
        description="Send checklist and verification requests to healthcare candidates."
      />

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Step {currentStep + 1} of {STEPS.length}
              </span>
              <span className="text-muted-foreground">
                {STEPS[currentStep]}
              </span>
            </div>
            <Progress value={((currentStep + 1) / STEPS.length) * 100} className="h-2" />
            <div className="flex justify-between">
              {STEPS.map((step, idx) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => {
                    if (idx < currentStep) setCurrentStep(idx);
                  }}
                  className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                    idx === currentStep
                      ? "text-emerald-600 font-semibold"
                      : idx < currentStep
                        ? "text-emerald-500 cursor-pointer hover:text-emerald-700"
                        : "text-muted-foreground"
                  }`}
                  disabled={idx > currentStep}
                >
                  <div
                    className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                      idx === currentStep
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : idx < currentStep
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-muted-foreground/30 text-muted-foreground/50"
                    }`}
                  >
                    {idx < currentStep ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span className="hidden sm:block">{step}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {currentStep === 0 && (
        <Step1CandidateInfo
          candidateInfo={candidateInfo}
          setCandidateInfo={setCandidateInfo}
          emailCheckStatus={emailCheckStatus}
          existingCandidateName={existingCandidateName}
          specialtyOptions={specialtyOptions}
          leads={leads}
          selectedLeadId={selectedLeadId}
          onSelectLead={(id) => setSelectedLeadId(id)}
        />
      )}

      {currentStep === 1 && (
        <Step2ChecklistSelection
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          setSelectedTemplateId={setSelectedTemplateId}
          loading={templatesLoading}
          bundles={bundles}
          selectedBundleId={selectedBundleId}
          onSelectBundle={handleBundleSelect}
        />
      )}

      {currentStep === 2 && (
        <Step3DocumentSelection
          selectedDocuments={selectedDocuments}
          toggleDocument={toggleDocument}
          totalCredits={totalCredits}
        />
      )}

      {currentStep === 3 && (
        <Step4ReviewConfirm
          candidateInfo={candidateInfo}
          selectedTemplate={selectedTemplate}
          selectedDocuments={selectedDocuments}
          totalCredits={totalCredits}
        />
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="flex gap-2">
          {currentStep < 3 ? (
            <Button
              onClick={goNext}
              disabled={!isStepCurrentValid()}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              Next
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Confirm & Send
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Candidate Info ──────────────────────────────────────────────

function Step1CandidateInfo({
  candidateInfo,
  setCandidateInfo,
  emailCheckStatus,
  existingCandidateName,
  specialtyOptions,
  leads,
  selectedLeadId,
  onSelectLead,
}: {
  candidateInfo: CandidateInfo;
  setCandidateInfo: React.Dispatch<React.SetStateAction<CandidateInfo>>;
  emailCheckStatus: "idle" | "checking" | "exists_candidate" | "exists_non_candidate" | "available";
  existingCandidateName: string;
  specialtyOptions: string[];
  leads: Array<{ id: number; first_name: string; last_name: string; email: string | null; phone: string | null; job_title: string | null; specialty: string | null }>;
  selectedLeadId: number | null;
  onSelectLead: (id: number | null) => void;
}) {
  const updateField = (field: keyof CandidateInfo, value: string) => {
    setCandidateInfo((prev) => ({ ...prev, [field]: value }));
  };

  const isValid =
    candidateInfo.firstName.trim() !== "" &&
    candidateInfo.lastName.trim() !== "" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateInfo.email);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-5 text-emerald-600" />
          Candidate Information
        </CardTitle>
        <CardDescription>
          Enter the candidate&apos;s details. An invitation will be sent if they don&apos;t have an account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* BOB Lead Selector — auto-fills candidate info from the recruiter's BOB */}
        {leads.length > 0 && (
          <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
            <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
              <User className="size-3.5" /> Select from Book of Business (recommended)
            </Label>
            <Select
              value={selectedLeadId?.toString() ?? ""}
              onValueChange={(val) => onSelectLead(val && val !== "__none__" ? parseInt(val) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a candidate from your BOB to auto-fill..." />
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
              Linking to a BOB candidate enables automatic status tracking — the lead moves to
              &quot;Doc Pending&quot; when you send this request.
            </p>
          </div>
        )}

        {/* Name Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="firstName"
                placeholder="Jane"
                value={candidateInfo.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="lastName"
                placeholder="Doe"
                value={candidateInfo.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="jane.doe@example.com"
              value={candidateInfo.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="pl-9 pr-10"
            />
            {emailCheckStatus === "checking" && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {emailCheckStatus === "available" && (
              <CheckCircle2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-emerald-500" />
            )}
            {emailCheckStatus === "exists_candidate" && (
              <Info className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-amber-500" />
            )}
            {emailCheckStatus === "exists_non_candidate" && (
              <Info className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-destructive" />
            )}
          </div>

          {/* Email Status Banners */}
          {emailCheckStatus === "exists_candidate" && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              <Info className="size-4" />
              <AlertTitle>Existing Candidate</AlertTitle>
              <AlertDescription>
                {existingCandidateName
                  ? `${existingCandidateName} already has an account. The request will be sent to this existing candidate.`
                  : "This candidate already exists in the system. The request will be sent to their existing account."}
              </AlertDescription>
            </Alert>
          )}

          {emailCheckStatus === "exists_non_candidate" && (
            <Alert variant="destructive">
              <Info className="size-4" />
              <AlertTitle>Email Unavailable</AlertTitle>
              <AlertDescription>
                A user with this email already exists with a different role. Please use a different email address.
              </AlertDescription>
            </Alert>
          )}

          {emailCheckStatus === "available" && candidateInfo.email && (
            <Alert className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
              <CheckCircle2 className="size-4" />
              <AlertTitle>New Candidate</AlertTitle>
              <AlertDescription>
                This email is not in the system. An invitation will be sent to create an account.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={candidateInfo.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Job Title & Specialty */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="jobTitle"
                placeholder="Travel Nurse"
                value={candidateInfo.jobTitle}
                onChange={(e) => updateField("jobTitle", e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <Select
              value={candidateInfo.specialty}
              onValueChange={(val) => updateField("specialty", val)}
            >
              <SelectTrigger className="w-full">
                <Stethoscope className="mr-2 size-4 text-muted-foreground" />
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                {specialtyOptions.length > 0 ? (
                  specialtyOptions.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="ICU">ICU</SelectItem>
                    <SelectItem value="ER">ER</SelectItem>
                    <SelectItem value="MedSurg">MedSurg</SelectItem>
                    <SelectItem value="Tele">Telemetry</SelectItem>
                    <SelectItem value="L&D">Labor & Delivery</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                    <SelectItem value="NICU">NICU</SelectItem>
                    <SelectItem value="PACU">PACU</SelectItem>
                    <SelectItem value="Oncology">Oncology</SelectItem>
                    <SelectItem value="Behavioral Health">Behavioral Health</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Validation hint */}
        {!isValid && candidateInfo.email && (
          <p className="text-xs text-muted-foreground">
            Please fill in all required fields (*) to continue.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Step 2: Checklist Selection ─────────────────────────────────────────

function Step2ChecklistSelection({
  templates,
  selectedTemplateId,
  setSelectedTemplateId,
  loading,
  bundles,
  selectedBundleId,
  onSelectBundle,
}: {
  templates: ChecklistTemplate[];
  selectedTemplateId: number | null;
  setSelectedTemplateId: (id: number | null) => void;
  loading: boolean;
  bundles: Bundle[];
  selectedBundleId: number | null;
  onSelectBundle: (id: number | null) => void;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-emerald-600" />
            Select Checklist Template
          </CardTitle>
          <CardDescription>Loading templates...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-emerald-600" />
            Select Checklist Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8 text-center">
            <Search className="size-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No checklist templates available.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Bundle Selector (always visible — shows empty state if no bundles) ─── */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-5 text-primary" />
            Use a Bundle (optional)
          </CardTitle>
          <CardDescription>
            Select a pre-built bundle to auto-fill the checklist + documents. Or skip this and select manually below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bundles.length === 0 ? (
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-dashed border-border">
              <div>
                <p className="text-sm font-medium text-foreground">No bundles created yet</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Create compliance bundles (e.g. "RN Bundle", "Physician Bundle") to pre-fill checklists + documents in one click.
                </p>
              </div>
              <a href="/recruiter/bundles">
                <Button size="sm" variant="outline">
                  <Plus className="size-3.5 mr-1" /> Create Bundle
                </Button>
              </a>
            </div>
          ) : (
            <>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSelectBundle(null)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedBundleId === null
                    ? "border-primary bg-primary text-white"
                    : "border-border text-text-secondary hover:bg-surface-2"
                }`}
              >
                Custom
              </button>
              {bundles.map((bundle) => {
                let docCount = 0;
                try {
                  docCount = JSON.parse(bundle.documents).length;
                } catch {
                  docCount = 0;
                }
                return (
                  <button
                    key={bundle.id}
                    onClick={() => onSelectBundle(bundle.id)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedBundleId === bundle.id
                        ? "border-primary bg-primary text-white"
                        : "border-border text-text-secondary hover:bg-surface-2"
                    }`}
                  >
                    {bundle.name}
                    <Badge
                      variant="secondary"
                      className={`text-xs ${selectedBundleId === bundle.id ? "bg-white/20 text-white" : ""}`}
                    >
                      {bundle.credit_cost} cr
                    </Badge>
                  </button>
                );
              })}
            </div>
            {selectedBundleId !== null && (
              <div className="mt-3 p-3 bg-background rounded-lg border border-border">
                <p className="text-xs text-text-secondary">
                  ✓ Bundle applied — checklist and documents auto-selected below. You can still modify your selections.
                </p>
              </div>
            )}
            </>
          )}
          </CardContent>
        </Card>

      {/* ─── Checklist Template Selection ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-emerald-600" />
            Select Checklist Template
          </CardTitle>
          <CardDescription>
            Choose the checklist template to send to the candidate. Only one checklist can be selected.
          </CardDescription>
        </CardHeader>
        <CardContent>
        <RadioGroup
          value={selectedTemplateId?.toString() ?? ""}
          onValueChange={(val) => setSelectedTemplateId(Number(val))}
          className="space-y-3 max-h-96 overflow-y-auto pr-1"
        >
          {templates.map((template) => (
            <label
              key={template.id}
              htmlFor={`template-${template.id}`}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                selectedTemplateId === template.id
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                  : "hover:bg-accent"
              }`}
            >
              <RadioGroupItem
                value={template.id.toString()}
                id={`template-${template.id}`}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{template.name}</span>
                  {template.skillCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {template.skillCount} skills
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    {template.profession}
                  </Badge>
                  {template.specialty && (
                    <Badge variant="outline" className="text-xs">
                      {template.specialty}
                    </Badge>
                  )}
                </div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 3: Document Selection ──────────────────────────────────────────

function Step3DocumentSelection({
  selectedDocuments,
  toggleDocument,
  totalCredits,
}: {
  selectedDocuments: DocumentOption[];
  toggleDocument: (doc: DocumentOption) => void;
  totalCredits: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5 text-emerald-600" />
          Document Selection
        </CardTitle>
        <CardDescription>
          Select which documents to request from the candidate. Each document costs 1 credit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DOCUMENT_OPTIONS.map((doc) => {
            const isSelected = selectedDocuments.includes(doc.key);
            return (
              <label
                key={doc.key}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "hover:bg-accent"
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleDocument(doc.key)}
                />
                <div className="flex-1">
                  <span className="font-medium text-sm">{doc.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs gap-1">
                  <Coins className="size-3" />
                  1 credit
                </Badge>
              </label>
            );
          })}
        </div>

        {/* Credit Deduction Preview */}
        <div className="rounded-lg border bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:from-emerald-950/30 dark:to-teal-950/30">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Credit Deduction Preview</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                1 credit for checklist + {selectedDocuments.length} credit{selectedDocuments.length !== 1 ? "s" : ""} for documents
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="size-5 text-emerald-600" />
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {totalCredits}
              </span>
              <span className="text-sm text-muted-foreground">credits</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 4: Review & Confirm ────────────────────────────────────────────

function Step4ReviewConfirm({
  candidateInfo,
  selectedTemplate,
  selectedDocuments,
  totalCredits,
}: {
  candidateInfo: CandidateInfo;
  selectedTemplate: ChecklistTemplate | undefined;
  selectedDocuments: DocumentOption[];
  totalCredits: number;
}) {
  return (
    <div className="space-y-4">
      {/* Candidate Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4 text-emerald-600" />
            Candidate Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="font-medium">
                {candidateInfo.firstName} {candidateInfo.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="font-medium">{candidateInfo.email}</dd>
            </div>
            {candidateInfo.phone && (
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="font-medium">{candidateInfo.phone}</dd>
              </div>
            )}
            {candidateInfo.jobTitle && (
              <div>
                <dt className="text-xs text-muted-foreground">Job Title</dt>
                <dd className="font-medium">{candidateInfo.jobTitle}</dd>
              </div>
            )}
            {candidateInfo.specialty && (
              <div>
                <dt className="text-xs text-muted-foreground">Specialty</dt>
                <dd className="font-medium">{candidateInfo.specialty}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Checklist Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="size-4 text-emerald-600" />
            Selected Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTemplate ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{selectedTemplate.name}</span>
              <Badge variant="outline" className="text-xs">
                {selectedTemplate.profession}
              </Badge>
              {selectedTemplate.specialty && (
                <Badge variant="outline" className="text-xs">
                  {selectedTemplate.specialty}
                </Badge>
              )}
              {selectedTemplate.skillCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedTemplate.skillCount} skills
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No checklist selected</p>
          )}
        </CardContent>
      </Card>

      {/* Documents Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-emerald-600" />
            Requested Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDocuments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedDocuments.map((doc) => (
                <Badge key={doc} variant="secondary" className="gap-1">
                  <FileText className="size-3" />
                  {DOCUMENT_OPTIONS.find((d) => d.key === doc)?.label}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No additional documents selected
            </p>
          )}
        </CardContent>
      </Card>

      {/* Total Credits — Prominent Display */}
      <Card className="border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                Total Credits to Deduct
              </h3>
              <p className="text-sm text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">
                1 for checklist
                {selectedDocuments.length > 0 &&
                  ` + ${selectedDocuments.length} for document${selectedDocuments.length > 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="size-8 text-emerald-600" />
              <span className="text-5xl font-bold text-emerald-700 dark:text-emerald-300">
                {totalCredits}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

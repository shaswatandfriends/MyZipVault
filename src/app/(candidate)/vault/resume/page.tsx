"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Loader2,
  Sparkles,
  Bot,
  Send,
  CheckCircle2,
  AlertCircle,
  Zap,
  Plus,
  Eye,
  TrendingUp,
  Clock,
  Briefcase,
  GraduationCap,
  Award,
  Wrench,
  User,
} from "@/lib/icons";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────

interface ResumeParsedData {
  contact?: {
    fullName?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  summary?: string;
  experience?: {
    facility: string;
    unit: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  education?: {
    school: string;
    degree: string;
    graduationYear: string;
  }[];
  certifications?: {
    name: string;
    issuer: string;
    year: string;
  }[];
  skills?: string[];
}

interface ResumeVersion {
  id: number;
  fileUrl: string | null;
  isBuilderResume: boolean;
  hasParsedData: boolean;
  parsedData: ResumeParsedData | null;
  createdAt: string;
}

interface ATSScore {
  score: number;
  breakdown: { category: string; score: number; feedback: string }[];
  suggestions: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_RESUMES = 3;

// ─── Helpers ────────────────────────────────────────────────────────

/** Calculate resume completeness as a percentage (0-100) */
function calculateCompleteness(data: ResumeParsedData | null): number {
  if (!data) return 0;
  const checks = [
    !!data.contact?.fullName,
    !!data.contact?.email,
    !!data.contact?.phone,
    !!data.summary,
    !!(data.experience && data.experience.length > 0),
    !!(data.education && data.education.length > 0),
    !!(data.certifications && data.certifications.length > 0),
    !!(data.skills && data.skills.length >= 3),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

/** Get missing sections for display */
function getMissingSections(data: ResumeParsedData | null): string[] {
  if (!data) return ["Contact info", "Summary", "Experience", "Education", "Certifications", "Skills"];
  const missing: string[] = [];
  if (!data.contact?.fullName) missing.push("Name");
  if (!data.contact?.email) missing.push("Email");
  if (!data.contact?.phone) missing.push("Phone");
  if (!data.summary) missing.push("Summary");
  if (!data.experience?.length) missing.push("Experience");
  if (!data.education?.length) missing.push("Education");
  if (!data.certifications?.length) missing.push("Certifications");
  if (!data.skills || data.skills.length < 3) missing.push("Skills (need 3+)");
  return missing;
}

// ─── SVG Gauge Component ────────────────────────────────────────────

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Needs Work" : "Poor";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Score arc — animated */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
    </div>
  );
}

// ─── Typing Indicator ───────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-muted rounded-2xl rounded-bl-sm w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 bg-muted-foreground/60 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ResumePage() {
  const [resumes, setResumes] = useState<ResumeVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/resume/versions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setResumes(data.resumes || []);
      if (data.resumes.length > 0 && !selectedResumeId) {
        setSelectedResumeId(data.resumes[0].id);
      }
    } catch {
      toast.error("Failed to load resumes");
    } finally {
      setIsLoading(false);
    }
  }, [selectedResumeId]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const selectedResume = resumes.find((r) => r.id === selectedResumeId);
  const canAddMore = resumes.length < MAX_RESUMES;
  const completeness = selectedResume?.parsedData
    ? calculateCompleteness(selectedResume.parsedData)
    : 0;

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/candidate/resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      toast.success("Resume uploaded");
      setIsUploadOpen(false);
      fetchResumes();
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this resume version? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/candidate/resume/versions?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Resume deleted");
      if (selectedResumeId === id) setSelectedResumeId(null);
      fetchResumes();
    } catch {
      toast.error("Failed to delete resume");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Resume"
        description="Upload, optimize, and build your professional healthcare resume."
      />

      {/* ─── Dashboard Header ───────────────────────────────────── */}
      {resumes.length > 0 && (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Completeness */}
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <svg width="56" height="56" className="-rotate-90">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke={completeness >= 80 ? "#10b981" : completeness >= 50 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 24}
                      strokeDashoffset={2 * Math.PI * 24 - (completeness / 100) * 2 * Math.PI * 24}
                      style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{completeness}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completeness</p>
                  <p className="text-sm font-medium mt-0.5">
                    {completeness === 100 ? "All sections filled!" : `${getMissingSections(selectedResume?.parsedData ?? null).length} sections missing`}
                  </p>
                </div>
              </div>

              {/* Versions */}
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="size-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Versions</p>
                  <p className="text-sm font-medium mt-0.5">
                    {resumes.length} of {MAX_RESUMES} used
                  </p>
                </div>
              </div>

              {/* Last Updated */}
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Clock className="size-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium mt-0.5">
                    {selectedResume
                      ? new Date(selectedResume.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Missing sections bar */}
            {completeness < 100 && selectedResume?.parsedData && (
              <div className="mt-4 pt-4 border-t flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Missing:</span>
                {getMissingSections(selectedResume.parsedData).map((s) => (
                  <Badge key={s} variant="outline" className="text-xs gap-1 text-amber-600 border-amber-200 bg-amber-50">
                    <AlertCircle className="size-3" />
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {resumes.length} / {MAX_RESUMES} versions
          </Badge>
          {!canAddMore && (
            <span className="text-xs text-amber-600">
              Delete one to add a new version
            </span>
          )}
        </div>
        <Button
          onClick={() => canAddMore ? setIsUploadOpen(true) : toast.error(`Maximum ${MAX_RESUMES} versions. Delete one first.`)}
          disabled={!canAddMore}
          className="gap-2"
        >
          <Plus className="size-4" />
          Upload Resume
        </Button>
      </div>

      {/* ─── Empty State — upgraded ─────────────────────────────── */}
      {resumes.length === 0 ? (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Hero section with gradient */}
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-cyan-950/30 p-12 text-center">
              <div className="inline-flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25 mb-6">
                <FileText className="size-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Build Your Resume</h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
                Upload an existing resume for AI-powered ATS scoring, or chat with{" "}
                <span className="font-semibold text-emerald-600">Tedo AI</span> to build one from scratch — no writing required.
              </p>
              <div className="flex gap-3 mt-8 justify-center">
                <Button onClick={() => setIsUploadOpen(true)} className="gap-2 shadow-md">
                  <Upload className="size-4" />
                  Upload Resume
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("tedo")}
                  className="gap-2 shadow-sm"
                >
                  <Bot className="size-4" />
                  Chat with Tedo
                </Button>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border">
              <div className="bg-background p-6 text-center">
                <div className="inline-flex items-center justify-center size-10 rounded-lg bg-primary/10 mb-3">
                  <Sparkles className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">AI Parse</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a PDF — we extract every section automatically
                </p>
              </div>
              <div className="bg-background p-6 text-center">
                <div className="inline-flex items-center justify-center size-10 rounded-lg bg-blue-500/10 mb-3">
                  <Zap className="size-5 text-blue-500" />
                </div>
                <h3 className="font-semibold text-sm">ATS Score</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  See how your resume ranks against Applicant Tracking Systems
                </p>
              </div>
              <div className="bg-background p-6 text-center">
                <div className="inline-flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 mb-3">
                  <Bot className="size-5 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-sm">Tedo AI Builder</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Chat naturally — Tedo writes your resume for you
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="overview" className="gap-1.5">
              <FileText className="size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="ats" className="gap-1.5">
              <Zap className="size-4" />
              ATS Tools
            </TabsTrigger>
            <TabsTrigger value="tedo" className="gap-1.5">
              <Bot className="size-4" />
              Tedo AI
            </TabsTrigger>
          </TabsList>

          {/* ─── Tab 1: Overview ─────────────────────────────────── */}
          <TabsContent value="overview" className="mt-6">
            <OverviewTab
              resumes={resumes}
              selectedResumeId={selectedResumeId}
              onSelect={setSelectedResumeId}
              onDelete={handleDelete}
            />
          </TabsContent>

          {/* ─── Tab 2: ATS Tools ────────────────────────────────── */}
          <TabsContent value="ats" className="mt-6">
            <ATSToolsTab resume={selectedResume} onResumeChanged={fetchResumes} />
          </TabsContent>

          {/* ─── Tab 3: Tedo AI Chat ─────────────────────────────── */}
          <TabsContent value="tedo" className="mt-6">
            <TedoChatTab onResumeCreated={fetchResumes} canAddMore={canAddMore} />
          </TabsContent>
        </Tabs>
      )}

      {/* Upload Dialog */}
      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUpload={handleUpload}
        isUploading={isUploading}
      />
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────────

function OverviewTab({
  resumes,
  selectedResumeId,
  onSelect,
  onDelete,
}: {
  resumes: ResumeVersion[];
  selectedResumeId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Resume selector */}
      {resumes.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {resumes.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                selectedResumeId === r.id
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border hover:bg-accent"
              }`}
            >
              {r.isBuilderResume ? "AI Built" : "Uploaded"}
              {" · "}
              {new Date(r.createdAt).toLocaleDateString()}
            </button>
          ))}
        </div>
      )}

      {/* Resume cards */}
      {resumes.map((resume) => (
        <Card key={resume.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className={`size-9 rounded-lg flex items-center justify-center ${
                  resume.isBuilderResume
                    ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                    : "bg-blue-500/10"
                }`}>
                  {resume.isBuilderResume ? (
                    <Bot className="size-5 text-white" />
                  ) : (
                    <FileText className="size-5 text-blue-500" />
                  )}
                </div>
                {resume.isBuilderResume ? "AI-Built Resume" : "Uploaded Resume"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {new Date(resume.createdAt).toLocaleDateString()}
                </Badge>
                {resume.fileUrl && (
                  <Button size="sm" variant="ghost" className="gap-1 h-8" asChild>
                    <a href={resume.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="size-3.5" />
                      Download
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 h-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(resume.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {resume.parsedData ? (
              <ParsedResumePreview data={resume.parsedData} />
            ) : (
              <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <AlertCircle className="size-4 shrink-0" />
                  Not parsed yet — go to ATS Tools to parse with AI
                </div>
                <Badge variant="outline" className="text-amber-600 border-amber-300">Raw upload</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ParsedResumePreview({ data }: { data: ResumeParsedData }) {
  const completeness = calculateCompleteness(data);
  return (
    <div className="space-y-4">
      {/* Completeness bar */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resume Completeness</span>
            <span className={`text-sm font-bold ${
              completeness >= 80 ? "text-emerald-600" : completeness >= 50 ? "text-amber-600" : "text-red-500"
            }`}>{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-1.5" />
        </div>
      </div>

      {/* Contact header — styled like a real resume */}
      {data.contact?.fullName && (
        <div className="text-center pb-3 border-b">
          <h3 className="font-bold text-lg tracking-tight">{data.contact.fullName}</h3>
          <p className="text-muted-foreground text-xs mt-1">
            {[data.contact.phone, data.contact.email, data.contact.address]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        </div>
      )}

      {/* Summary */}
      {data.summary && (
        <Section icon={<User className="size-3.5" />} title="Professional Summary">
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </Section>
      )}

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <Section icon={<Briefcase className="size-3.5" />} title="Experience">
          <div className="space-y-3">
            {data.experience.map((exp, i) => (
              <div key={i} className="border-l-2 border-primary/30 pl-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">
                    {exp.facility}
                    {exp.unit && <span className="text-muted-foreground font-normal"> · {exp.unit}</span>}
                  </p>
                  <Badge variant="outline" className="text-[10px]">
                    {exp.startDate} — {exp.endDate || "Present"}
                  </Badge>
                </div>
                {exp.description && (
                  <p className="text-xs mt-1 text-muted-foreground leading-relaxed">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <Section icon={<GraduationCap className="size-3.5" />} title="Education">
          <div className="space-y-1.5">
            {data.education.map((edu, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{edu.degree}</span>
                {edu.school && <span className="text-muted-foreground"> · {edu.school}</span>}
                {edu.graduationYear && <span className="text-muted-foreground text-xs"> ({edu.graduationYear})</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <Section icon={<Award className="size-3.5" />} title="Certifications">
          <div className="space-y-1">
            {data.certifications.map((cert, i) => (
              <div key={i} className="text-sm flex items-center justify-between">
                <span>{cert.name}</span>
                <span className="text-xs text-muted-foreground">{cert.year}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Skills */}
      {data.skills && data.skills.length > 0 && (
        <Section icon={<Wrench className="size-3.5" />} title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-xs py-0.5">
                {s}
              </Badge>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      {children}
    </div>
  );
}

// ─── ATS Tools Tab ──────────────────────────────────────────────────

function ATSToolsTab({
  resume,
  onResumeChanged,
}: {
  resume: ResumeVersion | undefined;
  onResumeChanged: () => void;
}) {
  const [isParsing, setIsParsing] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [atsScore, setAtsScore] = useState<ATSScore | null>(null);

  if (!resume) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="size-8 mx-auto mb-2 opacity-50" />
          Upload or select a resume first to use ATS tools.
        </CardContent>
      </Card>
    );
  }

  const handleParse = async () => {
    setIsParsing(true);
    try {
      if (!resume.fileUrl) {
        toast.error("No file to parse");
        return;
      }
      const fileRes = await fetch(resume.fileUrl);
      const blob = await fileRes.blob();
      const text = await blob.text();

      const parseRes = await fetch("/api/candidate/resume/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: resume.id, rawText: text.slice(0, 8000) }),
      });
      const data = await parseRes.json();
      if (!parseRes.ok) throw new Error(data.error);
      toast.success("Resume parsed with AI");
      onResumeChanged();
    } catch (err) {
      toast.error("Parse failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleScore = async () => {
    setIsScoring(true);
    setAtsScore(null);
    try {
      const res = await fetch("/api/candidate/resume/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: resume.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAtsScore(data);
    } catch (err) {
      toast.error("ATS score failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsScoring(false);
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const res = await fetch("/api/candidate/resume/ats-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: resume.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Resume optimized for ATS", {
        description: data.changes?.length
          ? `${data.changes.length} improvements made`
          : undefined,
      });
      onResumeChanged();
    } catch (err) {
      toast.error("Optimization failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action buttons — upgraded with gradients + hover effects */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Parse */}
        <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer" onClick={() => !isParsing && resume.fileUrl && handleParse()}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Sparkles className="size-4 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-sm">Parse with AI</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Extract structured data from your uploaded resume.
            </p>
            <Button
              onClick={(e) => { e.stopPropagation(); handleParse(); }}
              disabled={isParsing || !resume.fileUrl}
              className="w-full gap-2"
              size="sm"
            >
              {isParsing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isParsing ? "Parsing..." : "Parse Now"}
            </Button>
          </CardContent>
        </Card>

        {/* Score */}
        <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer" onClick={() => !isScoring && resume.hasParsedData && handleScore()}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Zap className="size-4 text-white" />
              </div>
              <h3 className="font-semibold text-sm">ATS Score</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Check how ATS-friendly your resume is.
            </p>
            <Button
              onClick={(e) => { e.stopPropagation(); handleScore(); }}
              disabled={isScoring || !resume.hasParsedData}
              variant="outline"
              className="w-full gap-2 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              size="sm"
            >
              {isScoring ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              {isScoring ? "Scoring..." : "Check Score"}
            </Button>
          </CardContent>
        </Card>

        {/* Optimize */}
        <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer" onClick={() => !isOptimizing && resume.hasParsedData && handleOptimize()}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <CheckCircle2 className="size-4 text-white" />
              </div>
              <h3 className="font-semibold text-sm">Optimize for ATS</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              AI-rewrite to maximize ATS compatibility.
            </p>
            <Button
              onClick={(e) => { e.stopPropagation(); handleOptimize(); }}
              disabled={isOptimizing || !resume.hasParsedData}
              className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              size="sm"
            >
              {isOptimizing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isOptimizing ? "Optimizing..." : "Optimize"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {!resume.hasParsedData && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          Parse your resume first to unlock ATS Score + Optimize tools.
        </div>
      )}

      {/* ─── ATS Score Result — upgraded with SVG gauge ──────── */}
      {atsScore && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-5 text-blue-600" />
              ATS Compatibility Score
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Overall score with SVG gauge */}
            <div className="flex items-center gap-6">
              <ScoreGauge score={atsScore.score} size={120} />
              <div className="flex-1">
                <p className="text-sm font-semibold mb-2">
                  {atsScore.score >= 80 ? "Excellent! Your resume is highly ATS-friendly." :
                   atsScore.score >= 60 ? "Good — with a few tweaks it'll be excellent." :
                   atsScore.score >= 40 ? "Needs work — several sections need attention." :
                   "Poor — major improvements needed for ATS compatibility."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on {atsScore.breakdown?.length || 0} categories including contact info, keywords, formatting, and content.
                </p>
              </div>
            </div>

            {/* Breakdown — with mini progress bars */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category Breakdown</p>
              {atsScore.breakdown?.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.category}</span>
                    <span className={`text-sm font-bold ${
                      item.score >= 80 ? "text-emerald-600" :
                      item.score >= 60 ? "text-amber-600" :
                      "text-red-500"
                    }`}>{item.score}/100</span>
                  </div>
                  <Progress
                    value={item.score}
                    className={`h-1.5 ${
                      item.score >= 80 ? "[&>div]:bg-emerald-500" :
                      item.score >= 60 ? "[&>div]:bg-amber-500" :
                      "[&>div]:bg-red-500"
                    }`}
                  />
                  <p className="text-xs text-muted-foreground">{item.feedback}</p>
                </div>
              ))}
            </div>

            {/* Suggestions */}
            {atsScore.suggestions && atsScore.suggestions.length > 0 && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                  <Sparkles className="size-4" />
                  Suggestions to improve:
                </p>
                <ul className="space-y-1.5">
                  {atsScore.suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                      <CheckCircle2 className="size-3 shrink-0 mt-0.5 text-blue-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tedo AI Chat Tab — upgraded ────────────────────────────────────

const QUICK_REPLIES = [
  "Tell me about your current role",
  "What certifications do you have?",
  "Describe your nursing experience",
  "Let's add your education",
];

function TedoChatTab({
  onResumeCreated,
  canAddMore,
}: {
  onResumeCreated: () => void;
  canAddMore: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeParsedData | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const startChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hi! I'm Tedo, your AI resume assistant. I'll help you build a professional healthcare resume through a quick chat. What's your name, and what kind of nursing do you do?",
      },
    ]);
    setIsComplete(false);
    setResumeData(null);
    setShowQuickReplies(true);
  };

  useEffect(() => {
    if (messages.length === 0) startChat();
  }, []);

  const handleSend = async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || isSending) return;
    const userMsg: ChatMessage = { role: "user", content: msgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);
    setShowQuickReplies(false);

    try {
      const res = await fetch("/api/candidate/resume/tedo-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          conversationHistory: messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);

      if (data.resumeData) {
        setResumeData(data.resumeData);
      }
      if (data.isComplete) {
        setIsComplete(true);
      }
    } catch (err) {
      toast.error("Tedo couldn't respond", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveResume = async () => {
    if (!resumeData) return;
    try {
      const res = await fetch("/api/candidate/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsedData: resumeData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Resume saved to your versions");
      onResumeCreated();
      setIsComplete(false);
      setMessages([]);
      setResumeData(null);
      setTimeout(startChat, 100);
    } catch (err) {
      toast.error("Failed to save resume", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const completeness = resumeData ? calculateCompleteness(resumeData) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* ─── Chat panel — upgraded ────────────────────────────── */}
      <Card className="lg:col-span-3 flex flex-col h-[600px] overflow-hidden">
        {/* Header with gradient + pulse */}
        <CardHeader className="border-b shrink-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/25">
                <Bot className="size-6 text-white" />
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" style={{ animationDuration: "2s" }} />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Tedo AI
                <span className="flex items-center gap-1 text-xs font-normal text-emerald-600">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Your conversational resume builder
              </p>
            </div>
          </div>
        </CardHeader>

        {/* Messages — better bubbles */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="size-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 mb-0.5">
                  <Bot className="size-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                    : "bg-background rounded-2xl rounded-bl-md border"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isSending && (
            <div className="flex items-end gap-2 justify-start">
              <div className="size-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 mb-0.5">
                <Bot className="size-4 text-white" />
              </div>
              <TypingDots />
            </div>
          )}

          {/* Quick reply suggestions */}
          {showQuickReplies && !isSending && messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1.5 rounded-full text-xs border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input — upgraded */}
        <div className="border-t p-3 shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-1 rounded-full"
            />
            <Button
              onClick={() => handleSend()}
              disabled={isSending || !input.trim()}
              size="icon"
              className="rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md"
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── Live preview — upgraded ──────────────────────────── */}
      <Card className="lg:col-span-2 h-[600px] flex flex-col overflow-hidden">
        <CardHeader className="border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="size-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Live Preview</h3>
            </div>
            <div className="flex items-center gap-2">
              {resumeData && (
                <Badge variant="outline" className={`text-xs ${
                  completeness >= 80 ? "text-emerald-600 border-emerald-200 bg-emerald-50" :
                  completeness >= 50 ? "text-amber-600 border-amber-200 bg-amber-50" :
                  "text-red-500 border-red-200 bg-red-50"
                }`}>
                  {completeness}% complete
                </Badge>
              )}
              {isComplete && canAddMore && (
                <Button
                  onClick={handleSaveResume}
                  size="sm"
                  className="gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md"
                >
                  <CheckCircle2 className="size-3.5" />
                  Save Resume
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 bg-muted/10">
          {resumeData ? (
            <div className="bg-background rounded-lg border p-4 shadow-sm">
              <ParsedResumePreview data={resumeData} />
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-16">
              <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-muted/50 mb-4">
                <Eye className="size-8 opacity-40" />
              </div>
              <p className="font-medium">Your resume will appear here</p>
              <p className="text-xs mt-1">As you chat with Tedo, your resume builds in real-time</p>
            </div>
          )}
          {isComplete && !canAddMore && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              You have {MAX_RESUMES} resumes. Delete one to save this new version.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Upload Dialog ──────────────────────────────────────────────────

function UploadDialog({
  open,
  onOpenChange,
  onUpload,
  isUploading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => void;
  isUploading: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (![".pdf", ".doc", ".docx"].includes(ext)) {
      toast.error("Please upload a PDF, DOC, or DOCX file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }
    onUpload(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Resume</DialogTitle>
        </DialogHeader>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:bg-accent hover:border-primary/50"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center justify-center size-14 rounded-xl bg-primary/10 mb-3">
                <Upload className="size-7 text-primary" />
              </div>
              <p className="text-sm font-medium">Click to upload or drag & drop</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOC, DOCX up to 10MB
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

      {/* Empty state */}
      {resumes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="size-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">No resumes yet</h2>
            <p className="mt-2 text-muted-foreground max-w-md">
              Upload an existing resume to get an ATS score, or chat with Tedo AI
              to build one from scratch.
            </p>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
                <Upload className="size-4" />
                Upload Resume
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTab("tedo")}
                className="gap-2"
              >
                <Bot className="size-4" />
                Chat with Tedo
              </Button>
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
        <Card key={resume.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-5 text-primary" />
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
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="size-4 text-amber-500" />
                  Not parsed yet — go to ATS Tools to parse with AI
                </div>
                <Badge variant="outline">Raw upload</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ParsedResumePreview({ data }: { data: ResumeParsedData }) {
  return (
    <div className="space-y-4 text-sm">
      {data.contact?.fullName && (
        <div>
          <h3 className="font-bold text-base">{data.contact.fullName}</h3>
          <p className="text-muted-foreground text-xs">
            {[data.contact.phone, data.contact.email, data.contact.address]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}
      {data.summary && (
        <div>
          <p className="font-semibold text-xs uppercase text-muted-foreground mb-1">
            Summary
          </p>
          <p className="text-sm">{data.summary}</p>
        </div>
      )}
      {data.experience && data.experience.length > 0 && (
        <div>
          <p className="font-semibold text-xs uppercase text-muted-foreground mb-2">
            Experience
          </p>
          <div className="space-y-2">
            {data.experience.map((exp, i) => (
              <div key={i} className="border-l-2 border-primary/30 pl-3">
                <p className="font-medium">
                  {exp.facility}
                  {exp.unit && <span className="text-muted-foreground"> · {exp.unit}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {exp.startDate} — {exp.endDate || "Present"}
                </p>
                {exp.description && (
                  <p className="text-xs mt-1">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {data.skills && data.skills.length > 0 && (
        <div>
          <p className="font-semibold text-xs uppercase text-muted-foreground mb-2">
            Skills
          </p>
          <div className="flex flex-wrap gap-1">
            {data.skills.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
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
      // Fetch the resume file and extract text client-side
      if (!resume.fileUrl) {
        toast.error("No file to parse");
        return;
      }
      const fileRes = await fetch(resume.fileUrl);
      const blob = await fileRes.blob();
      const text = await blob.text();

      // Simple text extraction (works for .txt; for PDF/DOCX we'd need pdfjs/mammoth)
      // For now, send whatever text we can extract
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
      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-5 text-primary" />
              <h3 className="font-semibold text-sm">Parse with AI</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Extract structured data from your uploaded resume.
            </p>
            <Button
              onClick={handleParse}
              disabled={isParsing || !resume.fileUrl}
              className="w-full gap-2"
              size="sm"
            >
              {isParsing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Parse
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="size-5 text-blue-600" />
              <h3 className="font-semibold text-sm">ATS Score</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Check how ATS-friendly your resume is.
            </p>
            <Button
              onClick={handleScore}
              disabled={isScoring || !resume.hasParsedData}
              variant="outline"
              className="w-full gap-2"
              size="sm"
            >
              {isScoring ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              Check Score
            </Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <h3 className="font-semibold text-sm">Optimize for ATS</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              AI-rewrite to maximize ATS compatibility.
            </p>
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || !resume.hasParsedData}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              size="sm"
            >
              {isOptimizing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Optimize
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

      {/* ATS Score Result */}
      {atsScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="size-5 text-blue-600" />
              ATS Compatibility Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall score */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="size-20 rounded-full flex items-center justify-center border-4 border-primary/20">
                  <span className="text-2xl font-bold text-primary">
                    {atsScore.score}
                  </span>
                </div>
              </div>
              <div>
                <p className="font-semibold">
                  {atsScore.score >= 80
                    ? "Excellent"
                    : atsScore.score >= 60
                    ? "Good"
                    : atsScore.score >= 40
                    ? "Needs Work"
                    : "Poor"}
                </p>
                <p className="text-sm text-muted-foreground">
                  out of 100 ATS compatibility
                </p>
              </div>
            </div>

            <Progress value={atsScore.score} className="h-2" />

            {/* Breakdown */}
            <div className="space-y-2">
              {atsScore.breakdown?.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-md bg-muted/30">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.category}</span>
                      <Badge
                        variant={
                          item.score >= 80
                            ? "default"
                            : item.score >= 60
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {item.score}/100
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.feedback}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Suggestions */}
            {atsScore.suggestions && atsScore.suggestions.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm font-semibold text-blue-800 mb-2">
                  Suggestions to improve:
                </p>
                <ul className="space-y-1">
                  {atsScore.suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                      <span className="text-blue-400">•</span>
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

// ─── Tedo AI Chat Tab ───────────────────────────────────────────────

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
  };

  useEffect(() => {
    if (messages.length === 0) startChat();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Chat panel */}
      <Card className="lg:col-span-2 flex flex-col h-[600px]">
        <CardHeader className="border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Bot className="size-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Tedo AI</h3>
              <p className="text-xs text-muted-foreground">
                Your conversational resume builder
              </p>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-3 flex gap-2 shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            size="icon"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </Card>

      {/* Live resume preview */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Live Preview</h3>
            {isComplete && canAddMore && (
              <Button
                onClick={handleSaveResume}
                size="sm"
                className="gap-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="size-3.5" />
                Save
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4">
          {resumeData ? (
            <ParsedResumePreview data={resumeData} />
          ) : (
            <div className="text-center text-muted-foreground text-sm py-12">
              <Eye className="size-8 mx-auto mb-2 opacity-50" />
              Your resume will appear here as Tedo builds it.
            </div>
          )}
          {isComplete && !canAddMore && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
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
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
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

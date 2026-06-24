"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload,
  Pencil,
  FileText,
  X,
  Plus,
  Trash2,
  Download,
  Loader2,
  Calendar,
  User,
  Briefcase,
  GraduationCap,
  Award,
  Wrench,
  Sparkles,
  Eye,
  MessageSquare,
  Send,
  Bot,
  Copy,
  Check,
  Clock,
  TrendingUp,
  FileCheck,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { clientZaiChatCompletion } from "@/lib/ai-client";
import Link from "next/link";

interface ResumeData {
  id: number;
  fileUrl: string | null;
  isBuilderResume: boolean;
  createdAt: string;
  parsedData: ResumeParsedData | null;
}

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
    year: string;
  }[];
  certifications?: {
    name: string;
    issuingOrg: string;
    year: string;
  }[];
  skills?: {
    skill: string;
    proficiency: string;
  }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type PageMode = "loading" | "hub" | "no-resume" | "builder" | "view";

// ---------- AI Assist Button Component ----------
function AiAssistButton({
  label,
  action,
  context,
  currentContent,
  onResult,
}: {
  label: string;
  action: string;
  context?: Record<string, unknown>;
  currentContent?: string;
  onResult: (result: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      // Build system and user prompts (same logic as server route)
      let systemPrompt = "";
      let userPrompt = "";

      switch (action) {
        case "generate_summary": {
          systemPrompt = `You are a professional resume writer specializing in healthcare staffing. Write a compelling professional summary for a healthcare professional's resume. The summary should be concise (2-4 sentences), highlight key qualifications, and be tailored to healthcare positions. Return ONLY the summary text, no additional commentary.`;
          userPrompt = context
            ? `Generate a professional summary based on this information:\n\n${JSON.stringify(context, null, 2)}`
            : "Generate a professional summary for an experienced healthcare professional (nurse/therapist/technician).";
          break;
        }
        case "improve_summary": {
          systemPrompt = `You are a professional resume writer specializing in healthcare staffing. Improve and enhance the given professional summary to make it more compelling, impactful, and tailored for healthcare positions. Keep it concise (2-4 sentences). Return ONLY the improved summary text, no additional commentary.`;
          userPrompt = `Improve this professional summary:\n\n"${currentContent}"`;
          break;
        }
        case "improve_experience": {
          systemPrompt = `You are a professional resume writer specializing in healthcare staffing. Improve and enhance the given work experience description to make it more impactful, using strong action verbs and quantifiable achievements where possible. Tailor it for healthcare positions. Return ONLY the improved description text, no additional commentary.`;
          userPrompt = `Improve this work experience description for a healthcare position:\n\n"${currentContent}"\n\nContext: ${context ? JSON.stringify(context) : "Healthcare professional"}`;
          break;
        }
        case "suggest_skills": {
          systemPrompt = `You are a healthcare staffing expert. Based on the provided context, suggest relevant healthcare skills that the candidate should include in their resume. Return a JSON array of objects with "skill" (string) and "proficiency" (one of: Beginner, Intermediate, Advanced, Expert) fields. Return ONLY the JSON array, no additional text.`;
          userPrompt = context
            ? `Suggest healthcare skills for this professional:\n\n${JSON.stringify(context, null, 2)}`
            : "Suggest common healthcare skills for an experienced nurse or healthcare professional.";
          break;
        }
        case "suggest_certifications": {
          systemPrompt = `You are a healthcare staffing expert. Based on the provided context, suggest relevant healthcare certifications that the candidate should pursue or include in their resume. Return a JSON array of objects with "name" (string), "issuingOrg" (string), and "year" (string) fields. Return ONLY the JSON array, no additional text.`;
          userPrompt = context
            ? `Suggest healthcare certifications for this professional:\n\n${JSON.stringify(context, null, 2)}`
            : "Suggest common healthcare certifications for an experienced nurse or healthcare professional.";
          break;
        }
        case "generate_full_resume": {
          systemPrompt = `You are a professional resume writer specializing in healthcare staffing. Generate complete resume data based on the provided information. Return a JSON object with this exact structure:
{
  "contact": { "fullName": "", "phone": "", "email": "", "address": "" },
  "summary": "",
  "experience": [{ "facility": "", "unit": "", "startDate": "", "endDate": "", "description": "" }],
  "education": [{ "school": "", "degree": "", "year": "" }],
  "certifications": [{ "name": "", "issuingOrg": "", "year": "" }],
  "skills": [{ "skill": "", "proficiency": "Intermediate" }]
}
Return ONLY valid JSON, no additional text or markdown.`;
          userPrompt = `Generate a complete healthcare resume based on this information:\n\n${JSON.stringify(context, null, 2)}`;
          break;
        }
        default: {
          toast.error("Unknown AI action");
          return;
        }
      }

      // Call AI through the proxy (uses triple-provider: Groq → Gemini → GLM)
      const completion = await clientZaiChatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const result = completion.choices?.[0]?.message?.content || "";

      if (!result) {
        toast.error("AI could not generate a suggestion");
        return;
      }

      // For structured actions, try to parse JSON
      if (["suggest_skills", "suggest_certifications", "generate_full_resume"].includes(action)) {
        try {
          const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
          const jsonStr = jsonMatch[1].trim();
          const parsed = JSON.parse(jsonStr);
          onResult(JSON.stringify(parsed));
        } catch {
          onResult(result);
        }
      } else {
        onResult(result);
      }
      toast.success("AI suggestion ready!");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      toast.error("AI assist failed", { description: errMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 dark:text-violet-400 dark:border-violet-800 dark:hover:bg-violet-950"
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Sparkles className="size-3.5" />
      )}
      {isLoading ? "Generating..." : label}
    </Button>
  );
}

// ---------- Live Resume Preview Component ----------
function ResumePreview({ data }: { data: ResumeParsedData }) {
  return (
    <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg border shadow-sm p-6 max-w-full text-sm">
      {/* Header */}
      <div className="text-center border-b pb-4 mb-4">
        <h1 className="text-xl font-bold">
          {data.contact?.fullName || "Your Name"}
        </h1>
        <div className="flex items-center justify-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
          {data.contact?.email && <span>{data.contact.email}</span>}
          {data.contact?.phone && (
            <>
              <span>|</span>
              <span>{data.contact.phone}</span>
            </>
          )}
          {data.contact?.address && (
            <>
              <span>|</span>
              <span>{data.contact.address}</span>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
            Professional Summary
          </h2>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{data.summary}</p>
        </div>
      )}

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Work Experience
          </h2>
          {data.experience.map((exp, idx) => (
            <div key={idx} className="mb-2 last:mb-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-xs">{exp.facility || "Facility"}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{exp.unit}</p>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 ml-2">
                  {exp.startDate}{exp.endDate ? ` — ${exp.endDate}` : exp.startDate ? " — Present" : ""}
                </p>
              </div>
              {exp.description && (
                <p className="text-xs mt-0.5 text-zinc-600 dark:text-zinc-400">{exp.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Education
          </h2>
          {data.education.map((edu, idx) => (
            <div key={idx} className="flex items-start justify-between mb-1 last:mb-0">
              <div>
                <p className="font-semibold text-xs">{edu.degree}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{edu.school}</p>
              </div>
              {edu.year && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 ml-2">{edu.year}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Certifications
          </h2>
          {data.certifications.map((cert, idx) => (
            <div key={idx} className="flex items-start justify-between mb-1 last:mb-0">
              <div>
                <p className="font-semibold text-xs">{cert.name}</p>
                {cert.issuingOrg && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{cert.issuingOrg}</p>
                )}
              </div>
              {cert.year && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0 ml-2">{cert.year}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {data.skills && data.skills.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Skills
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((s, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium"
              >
                {s.skill}{s.proficiency ? ` (${s.proficiency})` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- AI Chat Panel Component ----------
function AiChatPanel({
  resumeContext,
  onApplySuggestion,
}: {
  resumeContext: ResumeParsedData;
  onApplySuggestion: (action: string, result: unknown) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI resume assistant. I can help you improve your resume, suggest content, and answer questions about healthcare resume best practices. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change using both methods for reliability
  useEffect(() => {
    requestAnimationFrame(() => {
      // Method 1: Direct scrollTop on the scrollable container
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
      // Method 2: scrollIntoView as backup
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [messages, isSending]);

  const handleSend = async (message?: string) => {
    const trimmed = (message || input).trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const systemPrompt = `You are an AI resume assistant for MyZipVault, a healthcare staffing compliance platform. You help candidates improve their resumes, suggest content, and answer questions about resume best practices for healthcare positions. Be helpful, concise, and professional. If asked about something unrelated to resumes or healthcare careers, politely redirect. Format your responses clearly with bullet points or paragraphs as appropriate.`;

      let userPrompt = trimmed;
      if (resumeContext) {
        userPrompt += `\n\nCandidate's current resume data for context:\n${JSON.stringify(resumeContext, null, 2)}`;
      }

      // Call AI through the proxy (uses triple-provider: Groq → Gemini → GLM)
      const completion = await clientZaiChatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const resultText = completion.choices?.[0]?.message?.content || "";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: resultText || "I couldn't generate a response." },
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, I encountered an error: ${errMsg}. Please try again later.` },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const quickActions = [
    { label: "Generate Summary", message: "Generate a professional summary for my resume" },
    { label: "Suggest Skills", message: "What skills should I add for a healthcare position?" },
    { label: "Improve Experience", message: "Help me improve my work experience descriptions" },
    { label: "Suggest Certifications", message: "What certifications are recommended for healthcare workers?" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] rounded-xl border bg-card text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <div className="size-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
          <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
        </div>
        <span className="text-sm font-semibold">AI Resume Assistant</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">AI</Badge>
      </div>

      {/* Scrollable messages - min-h-0 is critical for flex overflow to work */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3 scroll-smooth"
        ref={scrollAreaRef}
        style={{ scrollbarGutter: "stable" }}
      >
        <div className="space-y-3 pr-1">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="size-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="size-4 text-violet-600 dark:text-violet-400" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex gap-2 justify-start">
              <div className="size-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                <Bot className="size-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="bg-muted rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick actions */}
      {messages.length <= 1 && !isSending && (
        <div className="px-4 pb-2 shrink-0 border-t pt-2">
          <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Quick Actions</p>
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1 text-violet-600 border-violet-200 hover:bg-violet-50 dark:text-violet-400 dark:border-violet-800 dark:hover:bg-violet-950"
                onClick={() => handleSend(action.message)}
              >
                <Sparkles className="size-3" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 shrink-0 p-4 pt-2 border-t bg-card">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask AI to improve your resume..."
          className="flex-1"
          disabled={isSending}
        />
        <Button size="icon" onClick={() => handleSend()} disabled={isSending || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------- Main Page Component ----------
export default function CandidateResumePage() {
  const [mode, setMode] = useState<PageMode>("loading");
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [activeBuilderTab, setActiveBuilderTab] = useState("contact");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Builder state
  const [contact, setContact] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [summary, setSummary] = useState("");
  const [experiences, setExperiences] = useState<ResumeParsedData["experience"]>([]);
  const [education, setEducation] = useState<ResumeParsedData["education"]>([]);
  const [certifications, setCertifications] = useState<ResumeParsedData["certifications"]>([]);
  const [skills, setSkills] = useState<ResumeParsedData["skills"]>([]);

  // Build current preview data from builder state
  const currentPreviewData: ResumeParsedData = {
    contact,
    summary,
    experience: experiences,
    education,
    certifications,
    skills,
  };

  const fetchResume = useCallback(async () => {
    try {
      const res = await fetch("/api/candidate/resume");
      if (!res.ok) throw new Error("Failed to fetch resume");
      const data = await res.json();
      if (data.resume) {
        setResume(data.resume);
        setMode("hub");
      } else {
        setMode("no-resume");
      }
    } catch {
      toast.error("Failed to load resume");
      setMode("no-resume");
    }
  }, []);

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  const populateBuilderFromResume = (data: ResumeParsedData) => {
    if (data.contact) {
      setContact({
        fullName: data.contact.fullName || "",
        phone: data.contact.phone || "",
        email: data.contact.email || "",
        address: data.contact.address || "",
      });
    }
    setSummary(data.summary || "");
    setExperiences(data.experience || []);
    setEducation(data.education || []);
    setCertifications(data.certifications || []);
    setSkills(data.skills || []);
  };

  const handleUpload = async (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF and Word documents are accepted");
      return;
    }

    setIsUploading(true);
    try {
      // Convert file to base64 for JSON API (Vercel-compatible)
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1] || result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/candidate/resume/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_base64: fileBase64,
          file_name: file.name,
        }),
      });

      if (!res.ok) {
        if (res.status === 413) {
          toast.error("File too large", { description: "Maximum file size is 3MB for uploads. Try a smaller file." });
        } else {
          const data = await res.json().catch(() => ({ error: "Upload failed" }));
          toast.error("Upload failed", { description: data.error });
        }
        return;
      }

      toast.success("Resume uploaded and parsed successfully!");
      fetchResume();
    } catch {
      toast.error("Failed to upload resume");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleSaveBuilder = async () => {
    setIsSaving(true);
    try {
      const parsedData: ResumeParsedData = {
        contact,
        summary,
        experience: experiences,
        education,
        certifications,
        skills,
      };

      const res = await fetch("/api/candidate/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsedData }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("Save failed", { description: data.error });
        return;
      }

      toast.success("Resume saved successfully!");
      fetchResume();
    } catch {
      toast.error("Failed to save resume");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your resume?")) return;

    try {
      const res = await fetch("/api/candidate/resume", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error("Delete failed", { description: data.error });
        return;
      }
      toast.success("Resume deleted");
      setResume(null);
      setMode("no-resume");
      setContact({ fullName: "", phone: "", email: "", address: "" });
      setSummary("");
      setExperiences([]);
      setEducation([]);
      setCertifications([]);
      setSkills([]);
    } catch {
      toast.error("Failed to delete resume");
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/candidate/resume/export-pdf");
      if (!res.ok) {
        const data = await res.json();
        toast.error("Export failed", { description: data.error || "Failed to generate PDF" });
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume-${(resume?.parsedData?.contact?.fullName || "candidate").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Resume PDF exported successfully!");
    } catch {
      toast.error("Failed to export resume as PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate completeness
  const calcCompleteness = (data: ResumeParsedData | null) => {
    if (!data) return 0;
    let total = 6;
    let filled = 0;
    if (data.contact?.fullName) filled++;
    if (data.contact?.phone) filled++;
    if (data.contact?.email) filled++;
    if (data.summary) filled++;
    if (data.experience && data.experience.length > 0) { total++; filled++; }
    if (data.education && data.education.length > 0) { total++; filled++; }
    if (data.certifications && data.certifications.length > 0) { total++; filled++; }
    if (data.skills && data.skills.length > 0) { total++; filled++; }
    return Math.round((filled / total) * 100);
  };

  // Get context for AI suggestions
  const getAiContext = () => ({
    contact,
    summary,
    experience: experiences,
    education,
    certifications,
    skills,
  });

  // Loading state
  if (mode === "loading") {
    return (
      <div className="space-y-6">
        <PageHeader title="Resume" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  // ── Hub Mode (Resume Hub Overview) ──────────────────────────────────
  if (mode === "hub" && resume) {
    const parsed = resume.parsedData || {} as ResumeParsedData;
    const completeness = calcCompleteness(parsed);
    const lastUpdated = new Date(resume.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const resumeName = resume.isBuilderResume ? "Builder Resume" : "Uploaded Resume";

    return (
      <div className="space-y-6">
        {/* Hub Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resume Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your single source of truth for professional identity.
          </p>
        </div>

        {/* Current Resume Overview */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">Current Resume</p>
                <h2 className="text-xl font-bold mt-1">{resumeName}</h2>
                <p className="text-sm text-white/70 mt-1">
                  Last updated: {lastUpdated}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 max-w-[200px] h-2 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${completeness}%` }} />
                  </div>
                  <span className="text-sm font-bold">{completeness}% Complete</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setMode("view")}>
                  <Eye className="size-4" /> View Resume
                </Button>
                <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setMode("builder")}>
                  <Pencil className="size-4" /> Edit Resume
                </Button>
              </div>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-5 text-primary" />
                <span className="text-xs font-medium">Upload</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setMode("builder")}>
                <Pencil className="size-5 text-emerald-600" />
                <span className="text-xs font-medium">Build</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => { setMode("builder"); setShowAiChat(true); }}>
                <Sparkles className="size-5 text-violet-600" />
                <span className="text-xs font-medium">AI Assist</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={handleExportPdf} disabled={isExporting}>
                <Download className="size-5 text-blue-600" />
                <span className="text-xs font-medium">{isExporting ? "Exporting..." : "Export PDF"}</span>
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
            />
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Completeness", value: `${completeness}%`, icon: TrendingUp, color: "text-emerald-600" },
            { label: "Experience", value: `${parsed.experience?.length || 0} entries`, icon: Briefcase, color: "text-blue-600" },
            { label: "Certifications", value: `${parsed.certifications?.length || 0} listed`, icon: Award, color: "text-amber-600" },
            { label: "Skills", value: `${parsed.skills?.length || 0} skills`, icon: Wrench, color: "text-violet-600" },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold tabular-nums">{stat.value}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resume Sections Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quick Edit Sections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Resume Sections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Contact Info", filled: !!(parsed.contact?.fullName), href: "builder" },
                { label: "Professional Summary", filled: !!parsed.summary, href: "builder" },
                { label: "Work Experience", filled: (parsed.experience?.length || 0) > 0, href: "builder" },
                { label: "Education", filled: (parsed.education?.length || 0) > 0, href: "builder" },
                { label: "Certifications", filled: (parsed.certifications?.length || 0) > 0, href: "builder" },
                { label: "Skills", filled: (parsed.skills?.length || 0) > 0, href: "builder" },
              ].map((section, i) => (
                <button
                  key={i}
                  onClick={() => setMode("builder")}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`size-2 rounded-full ${section.filled ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                    <span className="text-sm font-medium">{section.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {section.filled ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Empty</span>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* AI Features */}
          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-violet-600" />
                AI Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => { setMode("builder"); setShowAiChat(true); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left"
              >
                <div className="size-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <Sparkles className="size-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">AI Resume Assistant</p>
                  <p className="text-xs text-muted-foreground">Chat with AI to improve your resume</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => { setMode("builder"); setShowAiChat(true); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left"
              >
                <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <FileCheck className="size-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">ATS Score Check</p>
                  <p className="text-xs text-muted-foreground">Check resume compatibility with ATS</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => { setMode("builder"); setShowAiChat(true); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left"
              >
                <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <TrendingUp className="size-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Tailor for Job</p>
                  <p className="text-xs text-muted-foreground">Create a job-specific resume version</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Credential Integration */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileCheck className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Sync with Vault</p>
                  <p className="text-xs text-muted-foreground">Pull licenses & certifications from your credential vault</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/vault/credentials">View Vault <ChevronRight className="size-3" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No Resume State
  if (mode === "no-resume") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Resume"
          description="Upload or build your professional resume for healthcare positions."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upload Option */}
          <Card
            className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center p-8 min-h-[300px]">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="size-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Upload Resume</h3>
              <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
                Drag & drop your resume file or click to browse. AI will automatically parse and extract your information.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Accepts PDF and Word documents
              </p>
              {isUploading && (
                <div className="flex items-center gap-2 mt-4 text-primary">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">Uploading & parsing...</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
              />
            </CardContent>
          </Card>

          {/* Builder Option */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="flex flex-col items-center justify-center p-8 min-h-[300px]">
              <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <Pencil className="size-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold">Use Resume Builder</h3>
              <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
                Create a professional healthcare resume step by step with our guided builder
              </p>
              <Button
                className="mt-6 gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setMode("builder")}
              >
                <Pencil className="size-4" />
                Start Building
              </Button>
            </CardContent>
          </Card>

          {/* AI Builder Option */}
          <Card className="hover:shadow-md transition-shadow border-violet-200 dark:border-violet-800">
            <CardContent className="flex flex-col items-center justify-center p-8 min-h-[300px]">
              <div className="size-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                <Sparkles className="size-8 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold">AI Resume Builder</h3>
              <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
                Let AI help you build a professional healthcare resume with smart suggestions and content generation
              </p>
              <Button
                className="mt-6 gap-2 bg-violet-600 hover:bg-violet-700"
                onClick={() => {
                  setMode("builder");
                  setShowAiChat(true);
                }}
              >
                <Sparkles className="size-4" />
                Start with AI
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Builder Mode
  if (mode === "builder") {
    // Determine grid columns based on which panels are open
    const rightPanelCount = (showPreview ? 1 : 0) + (showAiChat ? 1 : 0);
    const gridCols = rightPanelCount === 0
      ? "grid-cols-1"
      : rightPanelCount === 1
        ? "grid-cols-1 xl:grid-cols-[1fr_420px]"
        : "grid-cols-1 xl:grid-cols-[1fr_420px_380px]";

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMode("hub")} className="gap-1.5">
            <ChevronRight className="size-4 rotate-180" />
            Hub
          </Button>
        </div>
        <PageHeader
          title="Resume Builder"
          description="Build your professional healthcare resume"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={showAiChat ? "default" : "outline"}
                size="sm"
                className={`gap-1.5 ${!showAiChat ? "text-violet-600 border-violet-200 hover:bg-violet-50 dark:text-violet-400 dark:border-violet-800 dark:hover:bg-violet-950" : "bg-violet-600 hover:bg-violet-700"}`}
                onClick={() => setShowAiChat(!showAiChat)}
              >
                <Sparkles className="size-3.5" />
                {showAiChat ? "Hide AI" : "AI Assist"}
              </Button>
              <Button
                variant={showPreview ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="size-3.5" />
                {showPreview ? "Hide Preview" : "Live Preview"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (resume) setMode("view");
                  else setMode("no-resume");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveBuilder}
                disabled={isSaving}
                className="gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Resume"
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExporting} className="gap-1.5">
                {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                {isExporting ? "Exporting..." : "Export PDF"}
              </Button>
            </div>
          }
        />

        <div className={`grid gap-6 ${gridCols}`}>
          {/* Left: Builder Tabs (always shown) */}
          <div className="min-w-0">
            <Tabs value={activeBuilderTab} onValueChange={setActiveBuilderTab} className="space-y-4">
              <TabsList className="flex-wrap">
                <TabsTrigger value="contact" className="gap-1.5">
                  <User className="size-3.5" /> Contact
                </TabsTrigger>
                <TabsTrigger value="summary" className="gap-1.5">
                  <FileText className="size-3.5" /> Summary
                </TabsTrigger>
                <TabsTrigger value="experience" className="gap-1.5">
                  <Briefcase className="size-3.5" /> Experience
                </TabsTrigger>
                <TabsTrigger value="education" className="gap-1.5">
                  <GraduationCap className="size-3.5" /> Education
                </TabsTrigger>
                <TabsTrigger value="certifications" className="gap-1.5">
                  <Award className="size-3.5" /> Certifications
                </TabsTrigger>
                <TabsTrigger value="skills" className="gap-1.5">
                  <Wrench className="size-3.5" /> Skills
                </TabsTrigger>
              </TabsList>

              {/* Contact Tab */}
              <TabsContent value="contact">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          placeholder="John Smith"
                          value={contact.fullName}
                          onChange={(e) => setContact({ ...contact, fullName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          placeholder="(555) 123-4567"
                          value={contact.phone}
                          onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={contact.email}
                          onChange={(e) => setContact({ ...contact, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          placeholder="City, State"
                          value={contact.address}
                          onChange={(e) => setContact({ ...contact, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base">Professional Summary</CardTitle>
                      <AiAssistButton
                        label={summary ? "AI Improve" : "AI Generate"}
                        action={summary ? "improve_summary" : "generate_summary"}
                        context={getAiContext()}
                        currentContent={summary}
                        onResult={(r) => setSummary(r)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Write a brief summary of your professional background, key skills, and career objectives..."
                      rows={6}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: Use the AI Generate button to create or improve your summary with healthcare-specific language.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Experience Tab */}
              <TabsContent value="experience">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base">Work Experience</CardTitle>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() =>
                          setExperiences([
                            ...experiences,
                            { facility: "", unit: "", startDate: "", endDate: "", description: "" },
                          ])
                        }
                      >
                        <Plus className="size-3.5" /> Add Experience
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {experiences.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Briefcase className="size-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No experience entries yet</p>
                        <p className="text-xs mt-1">Add your work experience or use AI to help draft descriptions</p>
                      </div>
                    )}
                    {experiences.map((exp, idx) => (
                      <div key={idx}>
                        {idx > 0 && <Separator className="mb-4" />}
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Facility</Label>
                                <Input
                                  placeholder="Hospital Name"
                                  value={exp.facility}
                                  onChange={(e) => {
                                    const updated = [...experiences];
                                    updated[idx] = { ...exp, facility: e.target.value };
                                    setExperiences(updated);
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Unit / Department</Label>
                                <Input
                                  placeholder="ICU, ER, Med-Surg..."
                                  value={exp.unit}
                                  onChange={(e) => {
                                    const updated = [...experiences];
                                    updated[idx] = { ...exp, unit: e.target.value };
                                    setExperiences(updated);
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                  type="month"
                                  value={exp.startDate}
                                  onChange={(e) => {
                                    const updated = [...experiences];
                                    updated[idx] = { ...exp, startDate: e.target.value };
                                    setExperiences(updated);
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                  type="month"
                                  placeholder="Present"
                                  value={exp.endDate}
                                  onChange={(e) => {
                                    const updated = [...experiences];
                                    updated[idx] = { ...exp, endDate: e.target.value };
                                    setExperiences(updated);
                                  }}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Description</Label>
                                <AiAssistButton
                                  label="AI Improve"
                                  action="improve_experience"
                                  context={{ facility: exp.facility, unit: exp.unit }}
                                  currentContent={exp.description}
                                  onResult={(r) => {
                                    const updated = [...experiences];
                                    updated[idx] = { ...exp, description: r };
                                    setExperiences(updated);
                                  }}
                                />
                              </div>
                              <Textarea
                                placeholder="Describe your responsibilities and achievements..."
                                rows={3}
                                value={exp.description}
                                onChange={(e) => {
                                  const updated = [...experiences];
                                  updated[idx] = { ...exp, description: e.target.value };
                                  setExperiences(updated);
                                }}
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive shrink-0 mt-6"
                            onClick={() => setExperiences(experiences.filter((_, i) => i !== idx))}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Education Tab */}
              <TabsContent value="education">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Education</CardTitle>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => setEducation([...education, { school: "", degree: "", year: "" }])}
                      >
                        <Plus className="size-3.5" /> Add Education
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {education.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <GraduationCap className="size-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No education entries yet</p>
                      </div>
                    )}
                    {education.map((edu, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>School</Label>
                            <Input
                              placeholder="University Name"
                              value={edu.school}
                              onChange={(e) => {
                                const updated = [...education];
                                updated[idx] = { ...edu, school: e.target.value };
                                setEducation(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Degree</Label>
                            <Input
                              placeholder="BSN, MSN..."
                              value={edu.degree}
                              onChange={(e) => {
                                const updated = [...education];
                                updated[idx] = { ...edu, degree: e.target.value };
                                setEducation(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Year</Label>
                            <Input
                              placeholder="2020"
                              value={edu.year}
                              onChange={(e) => {
                                const updated = [...education];
                                updated[idx] = { ...edu, year: e.target.value };
                                setEducation(updated);
                              }}
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive shrink-0 mt-6"
                          onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Certifications Tab */}
              <TabsContent value="certifications">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base">Certifications</CardTitle>
                      <div className="flex gap-2">
                        <AiAssistButton
                          label="AI Suggest"
                          action="suggest_certifications"
                          context={getAiContext()}
                          onResult={(r) => {
                            try {
                              const suggested = JSON.parse(r);
                              if (Array.isArray(suggested)) {
                                const newCerts = suggested.map(
                                  (c: { name?: string; issuingOrg?: string; year?: string }) => ({
                                    name: c.name || "",
                                    issuingOrg: c.issuingOrg || "",
                                    year: c.year || "",
                                  })
                                );
                                setCertifications([...certifications, ...newCerts]);
                                toast.success(`Added ${newCerts.length} AI-suggested certifications`);
                              }
                            } catch {
                              toast.error("Could not parse AI suggestions");
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => setCertifications([...certifications, { name: "", issuingOrg: "", year: "" }])}
                        >
                          <Plus className="size-3.5" /> Add
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {certifications.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Award className="size-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No certifications added yet</p>
                        <p className="text-xs mt-1">Use AI Suggest to get healthcare certification recommendations</p>
                      </div>
                    )}
                    {certifications.map((cert, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              placeholder="BLS, ACLS..."
                              value={cert.name}
                              onChange={(e) => {
                                const updated = [...certifications];
                                updated[idx] = { ...cert, name: e.target.value };
                                setCertifications(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Issuing Org</Label>
                            <Input
                              placeholder="AHA, ANCC..."
                              value={cert.issuingOrg}
                              onChange={(e) => {
                                const updated = [...certifications];
                                updated[idx] = { ...cert, issuingOrg: e.target.value };
                                setCertifications(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Year</Label>
                            <Input
                              placeholder="2023"
                              value={cert.year}
                              onChange={(e) => {
                                const updated = [...certifications];
                                updated[idx] = { ...cert, year: e.target.value };
                                setCertifications(updated);
                              }}
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive shrink-0 mt-6"
                          onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base">Skills</CardTitle>
                      <div className="flex gap-2">
                        <AiAssistButton
                          label="AI Suggest"
                          action="suggest_skills"
                          context={getAiContext()}
                          onResult={(r) => {
                            try {
                              const suggested = JSON.parse(r);
                              if (Array.isArray(suggested)) {
                                const newSkills = suggested.map(
                                  (s: { skill?: string; proficiency?: string }) => ({
                                    skill: s.skill || "",
                                    proficiency: s.proficiency || "Intermediate",
                                  })
                                );
                                setSkills([...skills, ...newSkills]);
                                toast.success(`Added ${newSkills.length} AI-suggested skills`);
                              }
                            } catch {
                              toast.error("Could not parse AI suggestions");
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => setSkills([...skills, { skill: "", proficiency: "Intermediate" }])}
                        >
                          <Plus className="size-3.5" /> Add
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {skills.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wrench className="size-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No skills added yet</p>
                        <p className="text-xs mt-1">Use AI Suggest to get healthcare skill recommendations</p>
                      </div>
                    )}
                    {skills.map((s, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Skill</Label>
                            <Input
                              placeholder="IV Therapy, Patient Assessment..."
                              value={s.skill}
                              onChange={(e) => {
                                const updated = [...skills];
                                updated[idx] = { ...s, skill: e.target.value };
                                setSkills(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Proficiency</Label>
                            <Select
                              value={s.proficiency}
                              onValueChange={(value) => {
                                const updated = [...skills];
                                updated[idx] = { ...s, proficiency: value };
                                setSkills(updated);
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Beginner">Beginner</SelectItem>
                                <SelectItem value="Intermediate">Intermediate</SelectItem>
                                <SelectItem value="Advanced">Advanced</SelectItem>
                                <SelectItem value="Expert">Expert</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive shrink-0 mt-6"
                          onClick={() => setSkills(skills.filter((_, i) => i !== idx))}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel 1: Live Preview */}
          {showPreview && (
            <div className="xl:sticky xl:top-6 self-start">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="size-3.5" /> Live Preview
                </h3>
                <Badge variant="outline" className="text-xs">Auto</Badge>
              </div>
              <ScrollArea className="h-[calc(100vh-180px)] min-h-[500px]">
                <ResumePreview data={currentPreviewData} />
              </ScrollArea>
            </div>
          )}

          {/* Right Panel 2: AI Chat Assistant */}
          {showAiChat && (
            <div className="xl:sticky xl:top-6 self-start max-h-[calc(100vh-120px)]">
              <AiChatPanel
                resumeContext={currentPreviewData}
                onApplySuggestion={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // View Mode
  const completeness = calcCompleteness(resume?.parsedData ?? null);
  const filename = resume?.fileUrl
    ? resume.fileUrl.startsWith("data:")
      ? "Uploaded Resume"
      : resume.fileUrl.split("/").pop() || "Resume"
    : "Builder Resume";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setMode("hub")} className="gap-1.5">
          <ChevronRight className="size-4 rotate-180" />
          Hub
        </Button>
      </div>
      <PageHeader
        title="Resume"
        description="Your professional resume on file"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50 dark:text-violet-400 dark:border-violet-800 dark:hover:bg-violet-950"
              onClick={() => {
                if (resume?.parsedData) populateBuilderFromResume(resume.parsedData);
                else {
                  setContact({ fullName: "", phone: "", email: "", address: "" });
                  setSummary("");
                  setExperiences([]);
                  setEducation([]);
                  setCertifications([]);
                  setSkills([]);
                }
                setMode("builder");
                setShowAiChat(true);
              }}
            >
              <Sparkles className="size-4" />
              AI Edit
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                if (resume?.parsedData) populateBuilderFromResume(resume.parsedData);
                else {
                  setContact({ fullName: "", phone: "", email: "", address: "" });
                  setSummary("");
                  setExperiences([]);
                  setEducation([]);
                  setCertifications([]);
                  setSkills([]);
                }
                setMode("builder");
              }}
            >
              <Pencil className="size-4" />
              Edit in Builder
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExportPdf}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Replace
            </Button>
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50"
              onClick={handleDelete}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
            />
          </div>
        }
      />

      {/* Resume Preview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="size-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg">{filename}</h3>
                <Badge variant={resume?.isBuilderResume ? "default" : "secondary"} className="text-xs">
                  {resume?.isBuilderResume ? "Builder" : "Uploaded"}
                </Badge>
              </div>
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <Calendar className="size-3.5" />
                Added {resume?.createdAt ? new Date(resume.createdAt).toLocaleDateString() : "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completeness Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Resume Completeness</span>
            <span className="text-sm font-semibold text-primary">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {completeness < 50
              ? "Add more sections to strengthen your resume"
              : completeness < 100
                ? "Almost there! Fill in remaining details"
                : "Your resume is complete!"}
          </p>
        </CardContent>
      </Card>

      {/* Parsed Data Preview Cards */}
      {resume?.parsedData && (
        <div className="space-y-4">
          {/* Contact */}
          {resume.parsedData.contact && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <User className="size-4" /> Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {resume.parsedData.contact.fullName && (
                    <div><span className="text-muted-foreground">Name:</span> {resume.parsedData.contact.fullName}</div>
                  )}
                  {resume.parsedData.contact.phone && (
                    <div><span className="text-muted-foreground">Phone:</span> {resume.parsedData.contact.phone}</div>
                  )}
                  {resume.parsedData.contact.email && (
                    <div><span className="text-muted-foreground">Email:</span> {resume.parsedData.contact.email}</div>
                  )}
                  {resume.parsedData.contact.address && (
                    <div><span className="text-muted-foreground">Address:</span> {resume.parsedData.contact.address}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {resume.parsedData.summary && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <FileText className="size-4" /> Professional Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{resume.parsedData.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Experience */}
          {resume.parsedData.experience && resume.parsedData.experience.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="size-4" /> Work Experience ({resume.parsedData.experience.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {resume.parsedData.experience.map((exp, idx) => (
                  <div key={idx} className="border-l-2 border-primary/20 pl-3">
                    <p className="font-medium text-sm">{exp.facility}</p>
                    <p className="text-xs text-muted-foreground">{exp.unit}</p>
                    {(exp.startDate || exp.endDate) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {exp.startDate}{exp.endDate ? ` — ${exp.endDate}` : " — Present"}
                      </p>
                    )}
                    {exp.description && (
                      <p className="text-sm mt-1 text-muted-foreground">{exp.description}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Education */}
          {resume.parsedData.education && resume.parsedData.education.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="size-4" /> Education ({resume.parsedData.education.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resume.parsedData.education.map((edu, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{edu.degree}</p>
                      <p className="text-xs text-muted-foreground">{edu.school}</p>
                    </div>
                    {edu.year && (
                      <span className="text-xs text-muted-foreground shrink-0">{edu.year}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Certifications */}
          {resume.parsedData.certifications && resume.parsedData.certifications.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Award className="size-4" /> Certifications ({resume.parsedData.certifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {resume.parsedData.certifications.map((cert, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {cert.name}{cert.issuingOrg ? ` — ${cert.issuingOrg}` : ""}{cert.year ? ` (${cert.year})` : ""}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {resume.parsedData.skills && resume.parsedData.skills.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="size-4" /> Skills ({resume.parsedData.skills.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {resume.parsedData.skills.map((s, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {s.skill}{s.proficiency ? ` (${s.proficiency})` : ""}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* No parsed data available for uploaded resume */}
      {resume?.parsedData === null && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="size-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-2">
              Your uploaded resume file is on record, but the content could not be parsed automatically.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              You can use the Resume Builder to manually enter your information, or try uploading a different file format.
            </p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setContact({ fullName: "", phone: "", email: "", address: "" });
                setSummary("");
                setExperiences([]);
                setEducation([]);
                setCertifications([]);
                setSkills([]);
                setMode("builder");
              }}
            >
              <Pencil className="size-4" />
              Enter Details Manually
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

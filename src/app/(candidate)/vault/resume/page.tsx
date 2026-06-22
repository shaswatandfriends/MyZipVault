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
  Star,
  ShieldCheck,
  Share2,
  FileDown,
  ExternalLink,
  MoreVertical,
  ChevronRight,
  BarChart3,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { clientZaiChatCompletion } from "@/lib/ai-client";

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

type PageMode = "loading" | "no-resume" | "builder" | "view";

function escapeXml(value: string | undefined) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function crc32(bytes: Uint8Array) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function writeUint16(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function createZip(files: { name: string; content: string }[]) {
  const encoder = new TextEncoder();
  const output: number[] = [];
  const centralDirectory: number[] = [];

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const checksum = crc32(contentBytes);
    const offset = output.length;

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint32(output, checksum);
    writeUint32(output, contentBytes.length);
    writeUint32(output, contentBytes.length);
    writeUint16(output, nameBytes.length);
    writeUint16(output, 0);
    output.push(...nameBytes, ...contentBytes);

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, checksum);
    writeUint32(centralDirectory, contentBytes.length);
    writeUint32(centralDirectory, contentBytes.length);
    writeUint16(centralDirectory, nameBytes.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, offset);
    centralDirectory.push(...nameBytes);
  }

  const centralDirectoryOffset = output.length;
  output.push(...centralDirectory);
  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, files.length);
  writeUint16(output, files.length);
  writeUint32(output, centralDirectory.length);
  writeUint32(output, centralDirectoryOffset);
  writeUint16(output, 0);

  return new Uint8Array(output);
}

function createResumeDocx(data: ResumeParsedData) {
  const contact = data.contact || {};
  const paragraphs = [
    contact.fullName ? contact.fullName.toUpperCase() : "RESUME",
    [contact.email, contact.phone, contact.address].filter(Boolean).join("  |  "),
    "",
    "PROFESSIONAL SUMMARY",
    data.summary || "",
    "",
    "EXPERIENCE",
    ...(data.experience || []).flatMap((exp) => [
      `${exp.facility || "Healthcare Facility"}${exp.unit ? ` - ${exp.unit}` : ""}`,
      [exp.startDate, exp.endDate].filter(Boolean).join(" to "),
      exp.description || "",
      "",
    ]),
    "EDUCATION",
    ...(data.education || []).map((edu) => `${edu.degree || ""}${edu.school ? `, ${edu.school}` : ""}${edu.year ? ` (${edu.year})` : ""}`),
    "",
    "CERTIFICATIONS",
    ...(data.certifications || []).map((cert) => `${cert.name}${cert.issuingOrg ? ` - ${cert.issuingOrg}` : ""}${cert.year ? ` (${cert.year})` : ""}`),
    "",
    "SKILLS",
    ...(data.skills || []).map((skill) => `${skill.skill}${skill.proficiency ? ` - ${skill.proficiency}` : ""}`),
  ];

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs
      .filter((paragraph) => paragraph !== undefined)
      .map((paragraph) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(paragraph)}</w:t></w:r></w:p>`)
      .join("\n")}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

  return new Blob(
    [
      createZip([
        {
          name: "[Content_Types].xml",
          content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
        },
        {
          name: "_rels/.rels",
          content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
        },
        {
          name: "word/document.xml",
          content: documentXml,
        },
      ]),
    ],
    { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
  );
}

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

      // Call AI directly from the browser (bypasses Vercel server network issues)
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

      // Call AI directly from the browser (bypasses Vercel server network issues)
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
        setMode("view");
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

  const resetBuilder = () => {
    setContact({ fullName: "", phone: "", email: "", address: "" });
    setSummary("");
    setExperiences([]);
    setEducation([]);
    setCertifications([]);
    setSkills([]);
  };

  const openBuilder = () => {
    if (resume?.parsedData) populateBuilderFromResume(resume.parsedData);
    else resetBuilder();
    setMode("builder");
  };

  const openAiBuilder = () => {
    if (resume?.parsedData) populateBuilderFromResume(resume.parsedData);
    else resetBuilder();
    setMode("builder");
    setShowAiChat(true);
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
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/candidate/resume/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("Upload failed", { description: data.error });
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

  const handleExportDocx = () => {
    const data = resume?.parsedData;
    if (!data) {
      toast.error("Resume content is not available for DOCX export");
      return;
    }

    const blob = createResumeDocx(data);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-${(data.contact?.fullName || "candidate").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success("Resume DOCX exported successfully!");
  };

  const handleShareResume = async () => {
    const shareUrl = `${window.location.origin}/vault/resume`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "MyZipVault Resume",
          text: "View my resume in MyZipVault.",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Resume link copied");
      }
    } catch {
      toast.error("Unable to share resume");
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

  // No Resume State
  if (mode === "no-resume") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Resume Hub"
          description="Create one healthcare resume and keep it ready for sharing."
        />
        <Card
          className="border-dashed"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="size-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold">Healthcare Resume</h2>
                      <Badge variant="secondary">0% Complete</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload an existing PDF or DOCX, build one section by section, or start with AI assistance.
                    </p>
                  </div>
                </div>
                <div className="max-w-xl space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Resume completeness</span>
                    <span className="font-semibold text-primary">0%</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                <Button
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {isUploading ? "Uploading..." : "Upload Resume"}
                </Button>
                <Button variant="outline" className="gap-2" onClick={openBuilder}>
                  <Pencil className="size-4" />
                  Build Resume
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50 dark:text-violet-400 dark:border-violet-800 dark:hover:bg-violet-950"
                  onClick={openAiBuilder}
                >
                  <Sparkles className="size-4" />
                  AI Assist
                </Button>
              </div>
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resume Versions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Master Resume</p>
                  <p className="text-xs text-muted-foreground">Primary version for recruiter sharing</p>
                </div>
                <Badge variant="outline">Draft</Badge>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-muted-foreground">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Travel Nurse Resume</p>
                  <p className="text-xs">Create after your master resume is ready</p>
                </div>
                <Badge variant="secondary">Later</Badge>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-muted-foreground">
                <div className="min-w-0">
                  <p className="text-sm font-medium">ICU Resume</p>
                  <p className="text-xs">Tailor from your saved experience</p>
                </div>
                <Badge variant="secondary">Later</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Add contact details",
                "Import certifications",
                "Create professional summary",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <Check className="size-4 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
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
  const parsedData = resume?.parsedData ?? null;
  const resumeContact = parsedData?.contact || {};
  const displayName = resumeContact.fullName || "Shaswat Pandey";
  const updatedDate = "June 20, 2026";
  const primaryScore = Math.max(89, completeness);
  const credentialSync = [
    ["RN License", "Active • Expires Dec 31, 2026"],
    ["BLS Certification", "Active • Expires Feb 28, 2027"],
    ["ACLS Certification", "Active • Expires Feb 28, 2027"],
    ["PALS Certification", "Active • Expires Feb 28, 2027"],
    ["NIHSS Certification", "Active • Expires Aug 15, 2026"],
  ];
  const resumeVersions = [
    ["Master Resume", "v3.0 • Updated 2 days ago", "Current"],
    ["Travel Nurse Resume", "v2.1 • Updated 1 week ago", "Generated"],
    ["ICU Resume", "v1.3 • Updated 2 weeks ago", "Generated"],
    ["Case Manager Resume", "v1.0 • Updated 1 month ago", "Generated"],
  ];
  const recommendations = [
    ["Improve ATS Score", "Add more keywords like “Telemetry”, “Epic EMR”", BarChart3, "bg-green-100 text-green-700"],
    ["Add Certification", "Consider adding NIHSS certification", Award, "bg-violet-100 text-violet-700"],
    ["Enhance Summary", "Make your summary more impactful", Sparkles, "bg-orange-100 text-orange-700"],
  ];

  return (
    <div className="space-y-6">
      <p className="text-center text-xl font-medium text-slate-600">
        Your professional identity. Powered by AI. Backed by your credentials.
      </p>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_260px]">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 space-y-4">
                <div className="flex items-start gap-3">
                  <Star className="mt-1 size-7 shrink-0 fill-green-600 text-green-600" />
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-green-800">My Primary Resume</h1>
                    <p className="mt-3 text-xl font-semibold text-slate-900">RN – ICU / Travel Nurse</p>
                    <p className="mt-3 text-sm text-slate-500">Last Updated: {updatedDate} <span className="px-2">•</span> Version 3.0</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Badge className="bg-green-100 px-3 py-1 text-green-700 hover:bg-green-100">ACTIVE</Badge>
                      <span className="text-sm text-slate-500">This is your most up-to-date resume</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-3 md:grid-cols-4">
                  {[
                    ["ATS Score", "89%", "Excellent", "text-green-700"],
                    ["Completeness", "95%", "Almost Complete", "text-green-700"],
                    ["Total Sections", "12 / 12", "Completed", "text-blue-700"],
                    ["Last Modified", "2 Days Ago", "June 20, 2026", "text-slate-900"],
                  ].map(([label, value, helper, color]) => (
                    <div key={label} className="rounded-lg border bg-white p-4 text-center shadow-sm">
                      <p className="text-xs font-semibold text-slate-600">{label}</p>
                      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
                      <p className={`mt-1 text-xs ${color}`}>{helper}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center xl:w-36">
                <div className="relative size-32">
                  <svg className="-rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="rgb(220 252 231)" strokeWidth="14" />
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke="rgb(34 142 75)"
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 48}`}
                      strokeDashoffset={`${2 * Math.PI * 48 * (1 - primaryScore / 100)}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-green-800">{primaryScore}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardContent className="border-t bg-white p-5 lg:border-l lg:border-t-0">
            <h2 className="mb-4 text-sm font-semibold text-slate-800">Quick Actions</h2>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-3" onClick={openBuilder}>
                <Pencil className="size-4" />
                Edit Resume
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" onClick={handleExportPdf} disabled={isExporting}>
                {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Download PDF
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" onClick={handleExportDocx}>
                <FileDown className="size-4" />
                Download DOCX
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" onClick={handleShareResume}>
                <Share2 className="size-4" />
                Share Resume
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800" onClick={openAiBuilder}>
                <Sparkles className="size-4" />
                AI Improve Resume
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
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-5 text-green-700" />
              Resume Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
              <div className="border-b pb-3 text-center">
                <p className="text-sm font-bold tracking-wide text-slate-900">{displayName.toUpperCase()}, RN</p>
                <p className="mt-1 text-[10px] text-slate-500">Registered Nurse – ICU Specialist</p>
                <p className="mt-1 text-[9px] text-slate-500">{resumeContact.email || "shaswat@example.com"} • {resumeContact.phone || "(123) 456-7890"} • New York, NY</p>
              </div>
              <div className="space-y-4 pt-4 text-[10px] text-slate-700">
                <div>
                  <p className="mb-1 font-bold uppercase text-slate-900">Professional Summary</p>
                  <p>{parsedData?.summary || "Compassionate and dedicated Registered Nurse with 8+ years of experience in ICU and critical care settings. Skilled in patient assessment, advanced life support, and evidence-based care."}</p>
                </div>
                <div>
                  <p className="mb-1 font-bold uppercase text-slate-900">Experience</p>
                  <div className="flex justify-between font-semibold">
                    <span>{parsedData?.experience?.[0]?.facility || "ICU Registered Nurse"}</span>
                    <span>2019 – Present</span>
                  </div>
                  <p>{parsedData?.experience?.[0]?.unit || "City Hospital, New York, NY"}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    <li>Provide high-quality care to critically ill patients in a 20-bed ICU.</li>
                    <li>Collaborate with multidisciplinary teams to develop care plans.</li>
                    <li>Monitor patient condition and respond to urgent situations.</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-1 font-bold uppercase text-slate-900">Education</p>
                  <div className="flex justify-between">
                    <span>Bachelor of Science in Nursing (BSN)</span>
                    <span>2015 – 2019</span>
                  </div>
                  <p>XYZ University, New York, NY</p>
                </div>
                <div>
                  <p className="mb-1 font-bold uppercase text-slate-900">Certifications</p>
                  <ul className="list-disc pl-4">
                    <li>BLS – American Heart Association</li>
                    <li>ACLS – American Heart Association</li>
                    <li>PALS – American Heart Association</li>
                  </ul>
                </div>
              </div>
            </div>
            <Button variant="outline" className="mt-4 gap-2 border-green-600 text-green-700 hover:bg-green-50" onClick={handleExportPdf}>
              View Full Resume
              <ExternalLink className="size-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-5 text-green-700" />
              Credential Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border">
              {credentialSync.map(([title, detail]) => (
                <div key={title} className="flex items-center justify-between gap-4 border-b px-4 py-4 last:border-b-0">
                  <div>
                    <p className="font-semibold text-slate-800">{title}</p>
                    <p className="text-sm text-slate-500">{detail}</p>
                  </div>
                  <div className="flex size-5 items-center justify-center rounded-full bg-green-600 text-white">
                    <Check className="size-3.5" />
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="h-12 w-full justify-between text-green-700" onClick={() => { window.location.href = "/vault/credentials"; }}>
              View All Credentials
              <ChevronRight className="size-5" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck className="size-5 text-green-700" />
              Resume Versions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border">
              {resumeVersions.map(([title, detail, status]) => (
                <div key={title} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
                  <div className="flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">{title}</p>
                    <p className="text-sm text-slate-500">{detail}</p>
                  </div>
                  <Badge className={status === "Current" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-blue-50 text-blue-700 hover:bg-blue-50"}>
                    {status}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => toast.success(`${title} selected`)}>
                    <MoreVertical className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full gap-2 text-green-700 hover:bg-green-50 hover:text-green-800" onClick={openBuilder}>
              <Plus className="size-4" />
              Create New Version
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-5 text-violet-700" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border">
              {recommendations.map(([title, detail, Icon, tone]) => (
                <button
                  key={title as string}
                  type="button"
                  className="flex w-full items-center gap-4 border-b px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50"
                  onClick={openAiBuilder}
                >
                  <div className={`flex size-10 items-center justify-center rounded-full ${tone}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">{title as string}</p>
                    <p className="text-sm text-slate-500">{detail as string}</p>
                  </div>
                  <ChevronRight className="size-5 text-slate-400" />
                </button>
              ))}
            </div>
            <Button variant="ghost" className="w-full justify-center gap-2 text-violet-700 hover:bg-violet-50 hover:text-violet-800" onClick={openAiBuilder}>
              View All Suggestions
              <ChevronRight className="size-5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <Briefcase className="size-6 text-green-800" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Generate Job-Specific Resume</h2>
              <p className="text-sm text-slate-500">Create a tailored resume for a specific job in seconds.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input className="h-12 flex-1" placeholder="Paste Job Description here..." />
            <Button className="h-12 gap-2 bg-green-700 px-6 hover:bg-green-800" onClick={openAiBuilder}>
              <Sparkles className="size-4" />
              Generate Resume
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Mail,
  MessageSquare,
  Save,
  Eye,
  Variable,
  FileText,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ──────────────────────────────────────────────────────────
interface Template {
  id: number;
  templateKey: string;
  subject: string;
  body: string;
  updatedBy: number | null;
  updatedAt: string;
}

// ─── Variables Reference ────────────────────────────────────────────
const TEMPLATE_VARIABLES = [
  { name: "candidate_name", description: "Full name of the candidate" },
  { name: "organization_name", description: "Name of the staffing organization" },
  { name: "agency_name", description: "Name of the recruiting agency" },
  { name: "client_name", description: "Full name of the client/recruiter" },
  { name: "recruiter_name", description: "Full name of the recruiter" },
  { name: "facility_name", description: "Name of the healthcare facility" },
  { name: "checklist_name", description: "Name of the checklist template" },
  { name: "document_name", description: "Name of the credential/document" },
  { name: "expiry_date", description: "Expiration date of the credential" },
  { name: "days_remaining", description: "Days until credential expires" },
  { name: "verification_status", description: "Current verification status" },
  { name: "invite_link", description: "Onboarding invitation link" },
  { name: "share_link", description: "Link to the consent share" },
  { name: "login_link", description: "Link to log in to the platform" },
  { name: "reset_link", description: "Password reset link" },
  { name: "purchase_link", description: "Link to purchase credits" },
  { name: "manager_name", description: "Full name of the reference manager" },
  { name: "nurse_name", description: "Full name of the nurse/candidate" },
  { name: "review_notes", description: "Notes from the credential reviewer" },
  { name: "credits_remaining", description: "Number of credits remaining" },
  { name: "deletion_date", description: "Date the account will be deleted" },
  { name: "platform_name", description: "MyZipVault" },
];

const SAMPLE_DATA: Record<string, string> = {
  candidate_name: "Jane Nurse",
  organization_name: "Acme Staffing",
  agency_name: "Acme Staffing",
  client_name: "Sarah Recruiter",
  recruiter_name: "Sarah Recruiter",
  facility_name: "Sunrise Medical Center",
  checklist_name: "ICU Nurse Skills Checklist",
  document_name: "BLS Certification",
  expiry_date: "Apr 15, 2026",
  days_remaining: "14",
  verification_status: "Verified",
  invite_link: "https://myzipvault.com/onboard?token=abc123",
  share_link: "https://myzipvault.com/share/abc123",
  login_link: "https://myzipvault.com/login",
  reset_link: "https://myzipvault.com/reset?token=xyz789",
  purchase_link: "https://myzipvault.com/credits",
  manager_name: "Dr. Robert Chen",
  nurse_name: "Jane Nurse",
  review_notes: "Document appears to be expired. Please upload a current certification.",
  credits_remaining: "12",
  deletion_date: "Mar 20, 2026",
  platform_name: "MyZipVault",
};

// ─── Helper: extract {{variables}} from text ────────────────────────
function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}

// ─── Helper: replace variables with sample data ─────────────────────
function renderWithSampleData(text: string): string {
  let result = text;
  const variables = extractVariables(text);
  for (const v of variables) {
    if (SAMPLE_DATA[v]) {
      result = result.replaceAll(`{{${v}}}`, SAMPLE_DATA[v]);
    }
  }
  return result;
}

// ─── Skeleton ───────────────────────────────────────────────────────
function TemplateSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function SuperadminTemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [varsPanelOpen, setVarsPanelOpen] = useState(true);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [cursorTarget, setCursorTarget] = useState<"subject" | "body">("body");

  // Extract variables from current template
  const detectedSubjectVars = useMemo(() => extractVariables(editSubject), [editSubject]);
  const detectedBodyVars = useMemo(() => extractVariables(editBody), [editBody]);
  const allDetectedVars = useMemo(
    () => [...new Set([...detectedSubjectVars, ...detectedBodyVars])],
    [detectedSubjectVars, detectedBodyVars]
  );

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/superadmin/templates");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch templates");
      }
      const json = await res.json();
      setTemplates(json.templates);
      if (json.templates.length > 0 && !selectedKey) {
        setSelectedKey(json.templates[0].templateKey);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to load templates", { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [selectedKey]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Sync edit fields when selection changes
  useEffect(() => {
    const t = templates.find((t) => t.templateKey === selectedKey);
    if (t) {
      setEditSubject(t.subject);
      setEditBody(t.body);
    }
  }, [selectedKey, templates]);

  // Check SMS feature flag
  useEffect(() => {
    fetch("/api/superadmin/settings")
      .then((r) => r.json())
      .then((data) => {
        const flag = data.featureFlags?.find(
          (f: { flagName: string; isEnabled: boolean }) => f.flagName === "sms_notifications"
        );
        setSmsEnabled(flag?.isEnabled ?? false);
      })
      .catch(() => {});
  }, []);

  // Set test email from session user
  useEffect(() => {
    if (user?.email) setTestEmailAddress(user.email);
  }, [user]);

  const selectedTemplate = templates.find((t) => t.templateKey === selectedKey);

  const handleSave = async () => {
    if (!selectedKey) return;
    try {
      setSaving(true);
      const res = await fetch("/api/superadmin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: selectedKey,
          subject: editSubject,
          body: editBody,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      toast.success("Template saved successfully");
      fetchTemplates();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error("Save failed", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleInsertVariable = (varName: string) => {
    const varTag = `{{${varName}}}`;
    if (cursorTarget === "subject") {
      const el = subjectRef.current;
      if (el) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newSubject = editSubject.slice(0, start) + varTag + editSubject.slice(end);
        setEditSubject(newSubject);
        setTimeout(() => {
          el.selectionStart = el.selectionEnd = start + varTag.length;
          el.focus();
        }, 0);
      } else {
        setEditSubject(editSubject + varTag);
      }
    } else {
      const el = bodyRef.current;
      if (el) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newBody = editBody.slice(0, start) + varTag + editBody.slice(end);
        setEditBody(newBody);
        setTimeout(() => {
          el.selectionStart = el.selectionEnd = start + varTag.length;
          el.focus();
        }, 0);
      } else {
        setEditBody(editBody + varTag);
      }
    }
    toast.success(`Inserted {{${varName}}}`);
  };

  const handleSendTestEmail = async () => {
    if (!selectedKey || !testEmailAddress) return;
    try {
      setSendingTest(true);
      const res = await fetch("/api/superadmin/templates/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: selectedKey,
          subject: editSubject,
          body: editBody,
          toEmail: testEmailAddress,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send test email");
      toast.success("Test email sent", {
        description: `Sent to ${testEmailAddress}`,
      });
      setTestEmailOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send test email";
      toast.error("Send test email failed", { description: message });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email & SMS Templates"
        description="Edit system email and SMS templates. Use variables to personalize messages."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card><CardContent className="p-4"><TemplateSkeleton /></CardContent></Card>
          <Card className="lg:col-span-2"><CardContent className="p-4"><TemplateSkeleton /></CardContent></Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Template List Sidebar ──────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Mail className="size-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Templates</CardTitle>
                  <CardDescription>{templates.length} email templates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[28rem] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                {templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="size-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">No templates found</p>
                  </div>
                ) : (
                  templates.map((t) => (
                    <button
                      key={t.templateKey}
                      onClick={() => setSelectedKey(t.templateKey)}
                      className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-teal-50/50 ${
                        selectedKey === t.templateKey
                          ? "bg-teal-50 border-l-2 border-l-teal-600"
                          : ""
                      }`}
                    >
                      <p className="text-sm font-medium truncate">{t.templateKey.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{t.subject}</p>
                    </button>
                  ))
                )}
              </div>

              <Separator />

              {/* SMS Section */}
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">SMS Templates</span>
                  {smsEnabled ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-xs">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                  )}
                </div>
                {!smsEnabled && (
                  <p className="text-xs text-muted-foreground mt-1">
                    SMS notifications will be available in a future release.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Editor Panel ───────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {selectedTemplate ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <FileText className="size-4 text-emerald-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {selectedTemplate.templateKey.replace(/_/g, " ")}
                          </CardTitle>
                          <CardDescription>
                            Last updated: {new Date(selectedTemplate.updatedAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewOpen(true)}
                        >
                          <Eye className="size-4" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTestEmailOpen(true)}
                        >
                          <Send className="size-4" />
                          Send Test
                        </Button>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                          size="sm"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          <Save className="size-4" />
                          {saving ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject Line</Label>
                      <Input
                        ref={subjectRef}
                        id="subject"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        onFocus={() => setCursorTarget("subject")}
                        placeholder="Email subject line…"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="body">Email Body</Label>
                      <Textarea
                        ref={bodyRef}
                        id="body"
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        onFocus={() => setCursorTarget("body")}
                        placeholder="Email body content…"
                        className="min-h-[16rem] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use double curly braces for variables, e.g. {`{{candidate_name}}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* ── Detected Variables in This Template ──────────── */}
                {allDetectedVars.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-lg bg-violet-50 flex items-center justify-center">
                            <Variable className="size-4 text-violet-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base">Detected Variables</CardTitle>
                            <CardDescription>
                              {allDetectedVars.length} variable{allDetectedVars.length !== 1 ? "s" : ""} found in this template — click to insert at cursor
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {cursorTarget} field
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {allDetectedVars.map((v) => {
                          const meta = TEMPLATE_VARIABLES.find((tv) => tv.name === v);
                          const hasSample = SAMPLE_DATA[v] !== undefined;
                          return (
                            <button
                              key={v}
                              onClick={() => handleInsertVariable(v)}
                              className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors text-left"
                              title={meta?.description || `Insert {{${v}}}`}
                            >
                              <Plus className="size-3 text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <code className="text-xs font-mono text-violet-800">
                                {`{{${v}}}`}
                              </code>
                              {hasSample && (
                                <span className="text-xs text-muted-foreground">
                                  → {SAMPLE_DATA[v]}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Variable Reference ──────────────────────────────── */}
                <Card>
                  <CardHeader className="pb-3">
                    <button
                      className="flex items-center justify-between w-full"
                      onClick={() => setVarsPanelOpen(!varsPanelOpen)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                          <Variable className="size-4 text-teal-600" />
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-base">Available Variables</CardTitle>
                          <CardDescription>Click a variable to insert at cursor position</CardDescription>
                        </div>
                      </div>
                      {varsPanelOpen ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </button>
                  </CardHeader>
                  {varsPanelOpen && (
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {TEMPLATE_VARIABLES.map((v) => {
                          const isDetected = allDetectedVars.includes(v.name);
                          return (
                            <button
                              key={v.name}
                              onClick={() => handleInsertVariable(v.name)}
                              className={`flex items-start gap-2 p-2 rounded-md transition-colors text-left ${
                                isDetected
                                  ? "bg-violet-50 hover:bg-violet-100"
                                  : "hover:bg-teal-50"
                              }`}
                            >
                              <code
                                className={`text-xs font-mono px-1.5 py-0.5 rounded shrink-0 ${
                                  isDetected
                                    ? "bg-violet-100 text-violet-800"
                                    : "bg-teal-100 text-teal-800"
                                }`}
                              >
                                {`{{${v.name}}}`}
                              </code>
                              <span className="text-xs text-muted-foreground">{v.description}</span>
                              {isDetected && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0 ml-auto">
                                  used
                                </Badge>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Mail className="size-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">Select a template</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Choose a template from the sidebar to start editing.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Preview Dialog ──────────────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview with sample data filled in
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Subject</p>
                <p className="text-sm font-medium">{renderWithSampleData(editSubject)}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
                <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md max-h-96 overflow-y-auto">
                  {renderWithSampleData(editBody)}
                </div>
              </div>
              {allDetectedVars.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Variable Preview Mapping</p>
                    <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
                      {allDetectedVars.map((v) => (
                        <div key={v} className="flex items-center gap-2 text-xs">
                          <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {`{{${v}}}`}
                          </code>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">
                            {SAMPLE_DATA[v] || <span className="italic text-amber-600">No sample data</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send Test Email Dialog ──────────────────────────────────── */}
      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a preview of this template with sample data to your email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Recipient Email</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="your@email.com"
              />
              <p className="text-xs text-muted-foreground">
                The email will be sent with sample data replacing all template variables.
              </p>
            </div>
            {allDetectedVars.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Sample data that will be used:</p>
                <div className="bg-muted/50 rounded-md p-3 max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-1.5">
                    {allDetectedVars.map((v) => (
                      <div key={v} className="flex items-center gap-2 text-xs">
                        <code className="font-mono bg-background px-1.5 py-0.5 rounded">
                          {`{{${v}}}`}
                        </code>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">
                          {SAMPLE_DATA[v] || <span className="italic text-amber-600">N/A</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendTestEmail}
              disabled={sendingTest || !testEmailAddress}
              className="gap-2"
            >
              {sendingTest ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

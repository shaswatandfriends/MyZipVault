"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Mail,
  MessageSquare,
  Save,
  Eye,
  Variable,
  FileText,
} from "lucide-react";

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
  { name: "{{candidate_name}}", description: "Full name of the candidate" },
  { name: "{{agency_name}}", description: "Name of the recruiting agency" },
  { name: "{{facility_name}}", description: "Name of the healthcare facility" },
  { name: "{{checklist_name}}", description: "Name of the checklist template" },
  { name: "{{expiry_date}}", description: "Expiration date of the credential" },
  { name: "{{days_remaining}}", description: "Days until credential expires" },
  { name: "{{recruiter_name}}", description: "Full name of the recruiter" },
  { name: "{{verification_status}}", description: "Current verification status" },
  { name: "{{share_link}}", description: "Link to the consent share" },
  { name: "{{platform_name}}", description: "MyZipVault" },
];

const SAMPLE_DATA: Record<string, string> = {
  "{{candidate_name}}": "Jane Smith, RN",
  "{{agency_name}}": "MedStaff Pro",
  "{{facility_name}}": "Sunrise Medical Center",
  "{{checklist_name}}": "ICU Competency Checklist",
  "{{expiry_date}}": "Apr 15, 2026",
  "{{days_remaining}}": "14",
  "{{recruiter_name}}": "Mike Johnson",
  "{{verification_status}}": "Verified",
  "{{share_link}}": "https://myzipvault.com/share/abc123",
  "{{platform_name}}": "MyZipVault",
};

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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);

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

  const renderPreview = (text: string) => {
    let result = text;
    for (const [key, value] of Object.entries(SAMPLE_DATA)) {
      result = result.replaceAll(key, value);
    }
    return result;
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
                    <div className="flex items-center justify-between">
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewOpen(true)}
                        >
                          <Eye className="size-4" />
                          Preview
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
                        id="subject"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        placeholder="Email subject line…"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="body">Email Body</Label>
                      <Textarea
                        id="body"
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        placeholder="Email body content…"
                        className="min-h-[16rem] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use double curly braces for variables, e.g. {`{{candidate_name}}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* ── Variable Reference ──────────────────────────────── */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-teal-50 flex items-center justify-center">
                        <Variable className="size-4 text-teal-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Available Variables</CardTitle>
                        <CardDescription>Click a variable to copy it to clipboard</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TEMPLATE_VARIABLES.map((v) => (
                        <button
                          key={v.name}
                          onClick={() => {
                            navigator.clipboard.writeText(v.name);
                            toast.success(`Copied ${v.name}`);
                          }}
                          className="flex items-start gap-2 p-2 rounded-md hover:bg-teal-50 transition-colors text-left"
                        >
                          <code className="text-xs font-mono bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded shrink-0">
                            {v.name}
                          </code>
                          <span className="text-xs text-muted-foreground">{v.description}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
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
                <p className="text-sm font-medium">{renderPreview(editSubject)}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
                <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                  {renderPreview(editBody)}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

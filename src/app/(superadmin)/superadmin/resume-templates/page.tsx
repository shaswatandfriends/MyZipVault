"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Plus, Loader2, Trash2, Pencil, Save } from "@/lib/icons";

interface ResumeTemplate {
  id: number;
  name: string;
  description: string | null;
  layout_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updater: { id: number; first_name: string | null; last_name: string | null; email: string } | null;
}

export default function SuperAdminResumeTemplatesPage() {
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ResumeTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/resume-templates");
      const data = await res.json();
      if (res.ok) setTemplates(data.templates);
      else toast.error(data.error || "Failed to load templates");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openEditor = (template: ResumeTemplate | null) => {
    setEditing(template);
    setIsEditorOpen(true);
  };

  const handleSave = async (form: {
    name: string;
    description: string;
    layout_config: string;
    is_active: boolean;
  }) => {
    setSaving(true);
    try {
      const url = editing
        ? `/api/superadmin/resume-templates/${editing.id}`
        : "/api/superadmin/resume-templates";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          layout_config: form.layout_config,
          is_active: form.is_active,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editing ? "Template updated" : "Template created");
        setIsEditorOpen(false);
        setEditing(null);
        fetchTemplates();
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Soft-delete this template? It will be marked inactive; existing resumes keep their reference.")) return;
    try {
      const res = await fetch(`/api/superadmin/resume-templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Template deactivated");
        fetchTemplates();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="size-6" /> Resume Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Superadmin-managed resume layouts. Candidates pick one per version; Version 1 is default unless changed.
          </p>
        </div>
        <Button onClick={() => openEditor(null)}>
          <Plus className="size-4 mr-1" /> New Template
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : templates.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No templates yet.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground">ID #{tpl.id}</p>
                  </div>
                  <Badge variant={tpl.is_active ? "default" : "secondary"}>
                    {tpl.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {tpl.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{tpl.description}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  <p>Font: {tpl.layout_config?.font_family || "default"}</p>
                  <p>Sections: {(tpl.layout_config?.section_order || []).join(" → ") || "default"}</p>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEditor(tpl)}>
                    <Pencil className="size-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(tpl.id)}>
                    <Trash2 className="size-3.5 mr-1" /> Deactivate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isEditorOpen && (
        <TemplateEditor
          template={editing}
          onSave={handleSave}
          onCancel={() => { setIsEditorOpen(false); setEditing(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}

// ─── Template editor dialog ────────────────────────────────────────────
function TemplateEditor({
  template,
  onSave,
  onCancel,
  saving,
}: {
  template: ResumeTemplate | null;
  onSave: (form: { name: string; description: string; layout_config: string; is_active: boolean }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [layoutConfig, setLayoutConfig] = useState(
    template ? JSON.stringify(template.layout_config, null, 2) :
      JSON.stringify({
        font_family: "Inter, sans-serif",
        font_size: 11,
        heading_color: "#0b3d91",
        section_order: ["contact", "summary", "experience", "education", "skills"],
        spacing: "normal",
      }, null, 2)
  );
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    try {
      JSON.parse(layoutConfig); // validate JSON
      setJsonError(null);
      onSave({ name: name.trim(), description: description.trim(), layout_config: layoutConfig, is_active: isActive });
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Healthcare Standard" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short description for superadmin reference"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="layout_config">Layout Config (JSON)</Label>
            <Textarea
              id="layout_config"
              value={layoutConfig}
              onChange={(e) => setLayoutConfig(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
            {jsonError && <p className="text-xs text-red-600">Invalid JSON: {jsonError}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="is_active" />
            <Label htmlFor="is_active">Active (visible to candidates)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
            {template ? "Save changes" : "Create template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  FileText,
  ShieldCheck,
  Users,
  ClipboardCheck,
  AlertTriangle,
} from "@/lib/icons";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

interface Bundle {
  id: number;
  name: string;
  description: string | null;
  profession: string | null;
  specialty: string | null;
  documents: string;
  credit_cost: number;
  is_active: boolean;
  checklist_template: {
    id: number;
    name: string;
    profession: string;
    specialty: string;
  };
  creator: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

interface ChecklistTemplate {
  id: number;
  name: string;
  profession: string;
  specialty: string;
}

const DOC_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  checklist: { label: "Checklist", icon: ClipboardCheck },
  credential: { label: "Credentials", icon: ShieldCheck },
  resume: { label: "Resume", icon: FileText },
  reference: { label: "References", icon: Users },
};

export default function BundlesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "client_admin" || user?.role === "client_recruiter";

  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bundleLimit, setBundleLimit] = useState(5);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bundle | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formProfession, setFormProfession] = useState("");
  const [formSpecialty, setFormSpecialty] = useState("");
  const [formTemplateId, setFormTemplateId] = useState<string>("");
  const [formDocuments, setFormDocuments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBundles = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/recruiter/bundles");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBundles(data.bundles || []);
      setBundleLimit(data.bundleLimit || 5);
    } catch {
      toast.error("Failed to load bundles");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/checklists/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {
      // Templates fetch is non-critical
    }
  }, []);

  useEffect(() => {
    fetchBundles();
    fetchTemplates();
  }, [fetchBundles, fetchTemplates]);

  const openCreateDialog = () => {
    setEditingBundle(null);
    setFormName("");
    setFormDescription("");
    setFormProfession("");
    setFormSpecialty("");
    setFormTemplateId("");
    setFormDocuments([]);
    setShowCreateDialog(true);
  };

  const openEditDialog = (bundle: Bundle) => {
    setEditingBundle(bundle);
    setFormName(bundle.name);
    setFormDescription(bundle.description || "");
    setFormProfession(bundle.profession || "");
    setFormSpecialty(bundle.specialty || "");
    setFormTemplateId(String(bundle.checklist_template.id));
    try {
      setFormDocuments(JSON.parse(bundle.documents));
    } catch {
      setFormDocuments([]);
    }
    setShowCreateDialog(true);
  };

  const toggleDocument = (docType: string) => {
    setFormDocuments((prev) =>
      prev.includes(docType)
        ? prev.filter((d) => d !== docType)
        : [...prev, docType]
    );
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Bundle name is required");
      return;
    }
    if (!formTemplateId) {
      toast.error("Please select a checklist template");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formName,
        description: formDescription || undefined,
        profession: formProfession || undefined,
        specialty: formSpecialty || undefined,
        checklistTemplateId: Number(formTemplateId),
        documents: formDocuments,
      };

      const url = editingBundle
        ? `/api/recruiter/bundles/${editingBundle.id}`
        : "/api/recruiter/bundles";
      const method = editingBundle ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(editingBundle ? "Bundle updated" : "Bundle created");
        setShowCreateDialog(false);
        fetchBundles();
      } else {
        toast.error(data.error || "Failed to save bundle");
      }
    } catch {
      toast.error("Failed to save bundle");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (bundleId: number) => {
    try {
      const res = await fetch(`/api/recruiter/bundles/${bundleId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Bundle deleted");
        setDeleteTarget(null);
        fetchBundles();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete bundle");
      }
    } catch {
      toast.error("Failed to delete bundle");
    }
  };

  const canCreateMore = bundles.length < bundleLimit;

  // Calculate preview credit cost
  const previewCreditCost = 1 + formDocuments.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Bundles"
        description="Create reusable bundles of documents to request from candidates. Use them on the Send Request page for one-click selection."
      />

      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {bundles.length} / {bundleLimit} bundles used
          </Badge>
          {!canCreateMore && (
            <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
              <AlertTriangle className="size-3 mr-1" />
              Limit reached
            </Badge>
          )}
        </div>
        {isAdmin && (
          <Button
            onClick={openCreateDialog}
            disabled={!canCreateMore}
            className="gap-2"
          >
            <Plus className="size-4" />
            Create Bundle
          </Button>
        )}
      </div>

      {/* Limit reached warning */}
      {isAdmin && !canCreateMore && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Bundle limit reached ({bundleLimit} bundles)
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Delete an existing bundle to make room for a new one, or contact MyZipVault to purchase additional bundle slots.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bundles list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : bundles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="size-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No bundles yet</p>
            <p className="text-xs text-text-secondary mt-1 mb-4">
              Create a bundle to quickly request multiple documents from candidates with one click.
            </p>
            {isAdmin && canCreateMore && (
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="size-4" />
                Create Your First Bundle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bundles.map((bundle) => {
            let docs: string[] = [];
            try {
              docs = JSON.parse(bundle.documents);
            } catch {
              docs = [];
            }

            return (
              <Card key={bundle.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{bundle.name}</h3>
                      {bundle.description && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">{bundle.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      <CreditCard className="size-3 mr-1" />
                      {bundle.credit_cost} credits
                    </Badge>
                  </div>

                  {/* Checklist template */}
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardCheck className="size-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground truncate">
                      {bundle.checklist_template.name}
                    </span>
                  </div>

                  {/* Document types */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {docs.map((docType) => {
                      const config = DOC_LABELS[docType];
                      if (!config) return null;
                      const Icon = config.icon;
                      return (
                        <Badge key={docType} variant="secondary" className="text-xs gap-1">
                          <Icon className="size-3" />
                          {config.label}
                        </Badge>
                      );
                    })}
                  </div>

                  {/* Footer: profession/specialty + actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      {bundle.profession && <span>{bundle.profession}</span>}
                      {bundle.profession && bundle.specialty && <span>•</span>}
                      {bundle.specialty && <span>{bundle.specialty}</span>}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(bundle)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="size-4 text-text-secondary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(bundle)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBundle ? "Edit Bundle" : "Create Bundle"}</DialogTitle>
            <DialogDescription>
              {editingBundle
                ? "Update this compliance bundle."
                : "Create a reusable bundle of documents to request from candidates."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Bundle Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., ICU Nurse Standard Bundle"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What this bundle is used for..."
                rows={2}
              />
            </div>

            {/* Checklist Template */}
            <div className="space-y-1.5">
              <Label>Checklist Template *</Label>
              <Select value={formTemplateId} onValueChange={setFormTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a checklist template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} ({t.profession} / {t.specialty})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Documents to request */}
            <div className="space-y-2">
              <Label>Additional Documents to Request</Label>
              <p className="text-xs text-text-muted">
                Select what else to request alongside the checklist. Each adds 1 credit.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(DOC_LABELS).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = formDocuments.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleDocument(key)}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary-light text-primary"
                          : "border-border text-text-secondary hover:bg-surface-2"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="text-sm font-medium">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credit cost preview */}
            <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
              <span className="text-sm text-text-secondary">Credit cost per use:</span>
              <Badge variant="outline" className="text-sm">
                <CreditCard className="size-3 mr-1" />
                {previewCreditCost} credit{previewCreditCost !== 1 ? "s" : ""}
              </Badge>
            </div>

            {/* Profession / Specialty (optional) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Profession (optional)</Label>
                <Input
                  value={formProfession}
                  onChange={(e) => setFormProfession(e.target.value)}
                  placeholder="e.g., Nursing"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Specialty (optional)</Label>
                <Input
                  value={formSpecialty}
                  onChange={(e) => setFormSpecialty(e.target.value)}
                  placeholder="e.g., ICU"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formName.trim() || !formTemplateId}
            >
              {isSubmitting ? "Saving..." : editingBundle ? "Update Bundle" : "Create Bundle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Bundle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
              This frees up a bundle slot. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              Delete Bundle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

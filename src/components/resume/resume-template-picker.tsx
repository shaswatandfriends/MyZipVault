"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Check, Sparkles } from "@/lib/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ResumeTemplateOption {
  id: number;
  name: string;
  description: string | null;
  layout_config: {
    font_family?: string;
    heading_color?: string;
    section_order?: string[];
  } | null;
  is_active: boolean;
}

interface ResumeTemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (templateId: number | null) => void;
}

/**
 * Phase 5.3 — Resume Template Picker
 *
 * Shows available resume templates as a card grid. User picks one (or "blank")
 * and the parent component receives the template ID to attach to the new resume.
 *
 * Fetches from /api/superadmin/resume-templates which is already implemented.
 */
export function ResumeTemplatePicker({
  open,
  onOpenChange,
  onPick,
}: ResumeTemplatePickerProps) {
  const [templates, setTemplates] = useState<ResumeTemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/superadmin/resume-templates", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load templates");
        const data = await res.json();
        if (cancelled) return;
        // API returns { templates: [...] } — only active templates
        const active = (data.templates ?? data ?? []).filter(
          (t: ResumeTemplateOption) => t.is_active,
        );
        setTemplates(active);
        // Default to first template
        setSelectedId(active[0]?.id ?? null);
      } catch (err) {
        console.error("[RESUME_TEMPLATE_PICKER]", err);
        toast.error("Could not load templates — using blank");
        setTemplates([]);
        setSelectedId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleConfirm = () => {
    onPick(selectedId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Sparkles className="size-4 text-primary" />
            Choose a resume template
          </DialogTitle>
          <DialogDescription>
            Pick a starting layout. You can switch later.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-text-secondary">
              Loading templates...
            </span>
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <FileText className="size-8 mx-auto text-text-muted mb-2" />
            <p className="text-sm font-medium text-foreground">
              No templates available yet
            </p>
            <p className="text-xs text-text-secondary mt-1">
              An admin needs to create templates first. We&apos;ll use a blank
              layout for now.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                onPick(null);
                onOpenChange(false);
              }}
            >
              Continue with blank
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {/* Blank option */}
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className={cn(
                "text-left rounded-xl border p-4 transition-all hover:shadow-sm",
                selectedId === null
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="size-8 rounded-lg bg-surface-2 flex items-center justify-center">
                  <FileText className="size-4 text-text-muted" />
                </div>
                {selectedId === null && (
                  <Check className="size-4 text-primary" />
                )}
              </div>
              <p className="text-sm font-semibold text-foreground">
                Blank layout
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Start from scratch with the default formatting.
              </p>
            </button>

            {/* Templates */}
            {templates.map((tpl) => {
              const fontFamily = tpl.layout_config?.font_family;
              const headingColor = tpl.layout_config?.heading_color;
              const sectionCount =
                tpl.layout_config?.section_order?.length ?? 0;
              const isSelected = selectedId === tpl.id;

              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedId(tpl.id)}
                  className={cn(
                    "text-left rounded-xl border p-4 transition-all hover:shadow-sm",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="size-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: headingColor
                          ? `${headingColor}15`
                          : "var(--primary-50)",
                      }}
                    >
                      <FileText
                        className="size-4"
                        style={{ color: headingColor ?? "var(--primary)" }}
                      />
                    </div>
                    {isSelected && <Check className="size-4 text-primary" />}
                  </div>
                  <p
                    className="text-sm font-semibold text-foreground"
                    style={fontFamily ? { fontFamily } : undefined}
                  >
                    {tpl.name}
                  </p>
                  {tpl.description && (
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                      {tpl.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2">
                    {sectionCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {sectionCount} sections
                      </Badge>
                    )}
                    {fontFamily && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {fontFamily.split(",")[0]}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!loading && templates.length > 0 && (
          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="gap-1.5">
              <Check className="size-4" />
              Use this template
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

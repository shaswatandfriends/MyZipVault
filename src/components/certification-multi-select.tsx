"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, Check, Plus } from "@/lib/icons";
import { CERTIFICATION_CATEGORIES } from "@/lib/certification-types";
import { cn } from "@/lib/utils";

interface CertificationMultiSelectProps {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function CertificationMultiSelect({
  id, value, onChange, disabled,
}: CertificationMultiSelectProps) {
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CERTIFICATION_CATEGORIES;
    return CERTIFICATION_CATEGORIES.map((cat) => ({
      ...cat,
      certifications: cat.certifications.filter(
        (c) => c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.certifications.length > 0);
  }, [search]);

  const toggleCert = (label: string) => {
    if (disabled) return;
    if (value.includes(label)) {
      onChange(value.filter((v) => v !== label));
    } else {
      onChange([...value, label]);
    }
  };

  const removeCert = (label: string) => {
    if (disabled) return;
    onChange(value.filter((v) => v !== label));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>Specific Credentials (Auto-Matched)</Label>
        {value.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {value.length} selected
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Pick specific certifications to request. The candidate&apos;s vault
        will be auto-searched for matches — they just review and approve.
      </p>

      {/* ─── Two-column layout: selection list (left) + selected (right) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* ═══ LEFT COLUMN: Selection list ═══ */}
        <div className="rounded-lg border bg-background flex flex-col" style={{ maxHeight: "420px" }}>
          {/* Search bar (sticky at top) */}
          <div className="p-2 border-b sticky top-0 bg-background z-10 shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search certifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
                disabled={disabled}
                id={id}
              />
            </div>
          </div>

          {/* Scrollable certification list */}
          <div className="overflow-y-auto flex-1 overscroll-contain" style={{ minHeight: "200px" }}>
            {filteredCategories.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No certifications found.
              </div>
            )}
            {filteredCategories.map((cat) => (
              <div key={cat.category}>
                {/* Category header — sticky within the scroll area */}
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider bg-muted text-foreground border-b sticky top-0 z-[1]">
                  {cat.category}
                </div>
                {cat.certifications.map((cert) => {
                  const isSelected = value.includes(cert.label);
                  return (
                    <button
                      key={`${cat.category}-${cert.code}`}
                      type="button"
                      disabled={disabled}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2",
                        "hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-primary/10 text-primary font-medium",
                        disabled && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => toggleCert(cert.label)}
                    >
                      {/* Checkbox / check icon */}
                      <span className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input"
                      )}>
                        {isSelected && <Check className="size-3" />}
                      </span>
                      <span className="flex-1 truncate">{cert.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: Selected credentials ═══ */}
        <div className="rounded-lg border bg-muted/30 flex flex-col" style={{ maxHeight: "420px" }}>
          {/* Header with count + clear all */}
          <div className="flex items-center justify-between p-2 border-b sticky top-0 bg-background z-10 shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Selected ({value.length})
            </span>
            {value.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={disabled}
                className="h-6 text-xs px-2 text-muted-foreground hover:text-destructive"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Scrollable selected list */}
          <div className="overflow-y-auto flex-1 p-2 space-y-1.5" style={{ minHeight: "200px" }}>
            {value.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Plus className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No credentials selected yet
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Click certifications on the left to add them here
                </p>
              </div>
            ) : (
              value.map((label) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm shadow-sm"
                >
                  <Check className="size-3.5 shrink-0 text-primary" />
                  <span className="flex-1 truncate">{label}</span>
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={disabled}
                    className="rounded-full hover:bg-destructive/10 p-0.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    onClick={() => removeCert(label)}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

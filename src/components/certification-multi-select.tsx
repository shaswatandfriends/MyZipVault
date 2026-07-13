"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search, X, Plus } from "@/lib/icons";
import {
  CERTIFICATION_CATEGORIES,
} from "@/lib/certification-types";
import { cn } from "@/lib/utils";

interface CertificationMultiSelectProps {
  /** Field id */
  id: string;
  /** Currently selected certification labels */
  value: string[];
  /** Called whenever the selection changes */
  onChange: (value: string[]) => void;
  /** Whether the field is disabled */
  disabled?: boolean;
}

/**
 * Multi-select combobox for picking multiple healthcare certifications.
 *
 * Shows selected items as removable tags/badges. Used on the recruiter
 * send-request page to pick specific credentials to request from the
 * candidate (enables auto-matching on the candidate side).
 */
export function CertificationMultiSelect({
  id,
  value,
  onChange,
  disabled,
}: CertificationMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CERTIFICATION_CATEGORIES;

    return CERTIFICATION_CATEGORIES.map((cat) => ({
      ...cat,
      certifications: cat.certifications.filter(
        (c) =>
          c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.certifications.length > 0);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const toggleCert = (label: string) => {
    if (value.includes(label)) {
      onChange(value.filter((v) => v !== label));
    } else {
      onChange([...value, label]);
    }
  };

  const removeCert = (label: string) => {
    onChange(value.filter((v) => v !== label));
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label htmlFor={id}>Specific Credentials (Auto-Matched)</Label>
      <p className="text-xs text-muted-foreground">
        Pick specific certifications to request. The candidate&apos;s vault
        will be auto-searched for matches — they just review and approve.
      </p>

      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-md border bg-muted/30">
          {value.map((label) => (
            <Badge
              key={label}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
            >
              <span className="truncate max-w-[200px]">{label}</span>
              <button
                type="button"
                tabIndex={-1}
                className="rounded-full hover:bg-destructive/20 p-0.5"
                onClick={() => removeCert(label)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Trigger button */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors",
            "hover:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="text-muted-foreground flex items-center gap-2">
            <Plus className="size-4" />
            {value.length === 0
              ? "Add specific credentials..."
              : `${value.length} selected — add more...`}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 opacity-50 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md flex flex-col">
            {/* Search */}
            <div className="p-2 border-b sticky top-0 bg-popover z-10">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search certifications..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[300px]">
              {filteredCategories.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No certifications found.
                </div>
              )}

              {filteredCategories.map((cat) => (
                <div key={cat.category}>
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-muted/50 text-muted-foreground">
                    {cat.category}
                  </div>
                  {cat.certifications.map((cert) => {
                    const isSelected = value.includes(cert.label);
                    return (
                      <button
                        key={`${cat.category}-${cert.code}`}
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between gap-2",
                          isSelected && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => toggleCert(cert.label)}
                      >
                        <span>{cert.label}</span>
                        {isSelected && (
                          <X className="size-4 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

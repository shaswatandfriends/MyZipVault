"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Search, X } from "@/lib/icons";
import {
  CERTIFICATION_CATEGORIES,
  OTHER_CERTIFICATION_VALUE,
  type CertificationOption,
} from "@/lib/certification-types";
import { cn } from "@/lib/utils";

interface CertificationSelectProps {
  /** Field id — used for label htmlFor */
  id: string;
  /** Currently selected value (label string or OTHER_CERTIFICATION_VALUE) */
  value: string;
  /** Called whenever the selection changes */
  onChange: (value: string) => void;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
}

/**
 * Searchable combobox for picking a healthcare certification.
 *
 * Features:
 *   - Search-as-you-type filtering on both label AND code
 *   - Grouped by category headings (non-sticky, simple scroll)
 *   - "Other" option at the bottom — reveals a free-text input
 *   - Click-outside to close
 *
 * Layout note: the dropdown is taller (max-h-[320px] on the list itself)
 * and the category headers are NOT sticky — sticky headers inside a
 * scrolling container inside a modal (which has its own overflow:hidden)
 * cause rendering glitches on some browsers. Simple scroll is more
 * reliable.
 *
 * Display note: certification labels already include the code (e.g.
 * "BLS (Basic Life Support)"), so we do NOT render a separate code
 * badge in the list — that caused "BLS BLS (Basic Life Support)".
 */
export function CertificationSelect({
  id,
  value,
  onChange,
  disabled,
  required,
}: CertificationSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Filter categories by search term ──
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

  // ── Click-outside to close ──
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

  const displayValue =
    value === OTHER_CERTIFICATION_VALUE ? "Other (specify below)" : value;

  const isOtherSelected = value === OTHER_CERTIFICATION_VALUE;

  // Helper: extract the human-readable name from a label that includes
  // the code in parentheses, e.g. "BLS (Basic Life Support)" → "Basic Life Support"
  const formatLabel = (label: string): string => {
    const match = label.match(/^[A-Z0-9-]+\s*\((.+)\)$/i);
    return match ? match[1] : label;
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label htmlFor={id}>
        Document Name {required && <span className="text-destructive">*</span>}
      </Label>

      {/* ── Combobox trigger ── */}
      <div className="relative">
        <div
          className={cn(
            "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer transition-colors",
            "hover:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            disabled && "opacity-50 cursor-not-allowed",
            !value && "text-muted-foreground"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <span className={cn("flex-1 truncate", !value && "text-muted-foreground")}>
            {displayValue || "Search for a certification (e.g., BLS, CCRN, RN License)"}
          </span>
          {value && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              className="ml-2 rounded-sm opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearch("");
              }}
            >
              <X className="size-4" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "ml-2 size-4 shrink-0 opacity-50 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>

        {/* ── Dropdown ── */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md flex flex-col">
            {/* Search input (sticky at top) */}
            <div className="p-2 border-b bg-popover sticky top-0 z-10">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search certifications..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                  autoFocus
                />
              </div>
            </div>

            {/* List (scrollable) */}
            <div className="overflow-y-auto max-h-[320px]">
              {filteredCategories.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No certifications found. Try &quot;Other&quot; to specify your own.
                </div>
              )}

              {filteredCategories.map((cat) => (
                <div key={cat.category}>
                  {/* Category heading — larger + bolder for readability */}
                  <div className="px-3 py-2 text-sm font-bold uppercase tracking-wider bg-muted/60 text-foreground border-b">
                    {cat.category}
                  </div>
                  {/* Certifications in this category */}
                  {cat.certifications.map((cert: CertificationOption) => (
                    <button
                      key={`${cat.category}-${cert.code}`}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                        value === cert.label && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => {
                        onChange(cert.label);
                        setIsOpen(false);
                        setSearch("");
                      }}
                    >
                      {cert.label}
                    </button>
                  ))}
                </div>
              ))}

              {/* Other option — always visible at bottom */}
              <div className="border-t sticky bottom-0 bg-popover">
                <button
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2 italic",
                    isOtherSelected && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => {
                    onChange(OTHER_CERTIFICATION_VALUE);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="text-muted-foreground">+</span>
                  <span>Other — specify document name manually</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Free-text input shown only when "Other" is selected ── */}
      {isOtherSelected && (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-other`} className="text-xs text-muted-foreground">
            Specify document name
          </Label>
          <Input
            id={`${id}-other`}
            type="text"
            placeholder="e.g., Hospital-specific credential, state license, etc."
            value={value === OTHER_CERTIFICATION_VALUE ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={required}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

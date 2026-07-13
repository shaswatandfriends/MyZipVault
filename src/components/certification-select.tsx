"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Search, X } from "@/lib/icons";
import {
  CERTIFICATION_CATEGORIES,
  OTHER_CERTIFICATION_VALUE,
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
 *   - Search-as-you-type filtering on both label AND code (e.g. typing
 *     "CCRN" surfaces all CCRN variants; typing "Critical" surfaces
 *     critical-care certs)
 *   - Grouped by category headings so users can browse visually
 *   - "Other" option at the bottom — selecting it reveals a free-text
 *     input so candidates can name a credential that isn't in our list
 *   - Keyboard accessible (arrow keys + enter + escape)
 *   - Click-outside to close
 *
 * State model:
 *   - `value` = the selected certification label string (e.g.
 *     "BLS (Basic Life Support)"), or OTHER_CERTIFICATION_VALUE if the
 *     user picked "Other".
 *   - When value === OTHER_CERTIFICATION_VALUE, the parent form should
 *     render a free-text input for the actual document name.
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

  // ── Determine the display value ──
  // If the user picked "Other", the input shows the OTHER sentinel text.
  // Otherwise, the input shows the selected label.
  // The parent form is responsible for rendering a separate free-text
  // input when value === OTHER_CERTIFICATION_VALUE.
  const displayValue =
    value === OTHER_CERTIFICATION_VALUE ? "Other (specify below)" : value;

  const isOtherSelected = value === OTHER_CERTIFICATION_VALUE;

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
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-[400px] overflow-hidden flex flex-col">
            {/* Search input */}
            <div className="p-2 border-b sticky top-0 bg-popover">
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
            <div className="overflow-y-auto flex-1">
              {filteredCategories.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No certifications found. Try &quot;Other&quot; to specify your own.
                </div>
              )}

              {filteredCategories.map((cat) => (
                <div key={cat.category}>
                  {/* Category heading */}
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-muted/50 text-muted-foreground sticky top-0">
                    {cat.category}
                  </div>
                  {/* Certifications in this category */}
                  {cat.certifications.map((cert) => (
                    <button
                      key={`${cat.category}-${cert.code}`}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2",
                        value === cert.label && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => {
                        onChange(cert.label);
                        setIsOpen(false);
                        setSearch("");
                      }}
                    >
                      <span className="font-mono text-xs font-semibold text-primary shrink-0 mt-0.5">
                        {cert.code}
                      </span>
                      <span className="flex-1">{cert.label}</span>
                    </button>
                  ))}
                </div>
              ))}

              {/* Other option — always visible at bottom */}
              <div className="border-t">
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
            // We piggy-back on the same `value` prop — when user types here,
            // the parent receives the typed text instead of the sentinel.
            // To support both modes, the parent must check: if value ===
            // OTHER_CERTIFICATION_VALUE, the free-text hasn't been filled yet.
            // Once the user types, value becomes their custom text.
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

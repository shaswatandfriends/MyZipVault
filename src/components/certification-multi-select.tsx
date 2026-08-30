"use client";

import { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search, X, Plus } from "@/lib/icons";
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
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropUp, setDropUp] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({
    position: "fixed",
    maxHeight: "400px",
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // ─── Position the dropdown using `position: fixed` ──────────────────
  // Using `fixed` instead of `absolute` so the dropdown escapes any parent
  // containers with `overflow: hidden` or `overflow: auto` (which would
  // otherwise clip the dropdown). We calculate the position from the
  // trigger button's getBoundingClientRect() (viewport-relative).
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const measure = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      // Flip up if there's not enough space below AND more space above
      const shouldFlipUp = spaceBelow < 300 && spaceAbove > spaceBelow;
      setDropUp(shouldFlipUp);

      // Calculate max height — minimum 320px so the list is always usable
      const maxH = shouldFlipUp
        ? Math.min(spaceAbove - 16, 500)
        : Math.min(spaceBelow - 16, 500);
      const finalHeight = Math.max(320, Math.min(maxH, 500));

      // Position relative to viewport (fixed positioning)
      setDropdownStyle({
        position: "fixed",
        top: shouldFlipUp ? undefined : triggerRect.bottom + 4,
        bottom: shouldFlipUp ? viewportHeight - triggerRect.top + 4 : undefined,
        left: triggerRect.left,
        width: triggerRect.width,
        maxHeight: `${finalHeight}px`,
        zIndex: 9999,
      });
    };

    measure();
    // Reposition on scroll/resize. Use capture phase to catch scrolls in
    // nested containers.
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
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
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-md border bg-muted/30">
          {value.map((label) => (
            <Badge key={label} variant="secondary" className="gap-1 pr-1 text-xs">
              <span className="truncate max-w-[200px]">{label}</span>
              <button type="button" tabIndex={-1} className="rounded-full hover:bg-destructive/20 p-0.5"
                onClick={() => removeCert(label)}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <button ref={triggerRef} type="button" disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors",
            "hover:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2",
            disabled && "opacity-50 cursor-not-allowed"
          )}>
          <span className="text-muted-foreground flex items-center gap-2">
            <Plus className="size-4" />
            {value.length === 0 ? "Add specific credentials..." : `${value.length} selected — add more...`}
          </span>
          <ChevronDown className={cn("size-4 shrink-0 opacity-50 transition-transform", isOpen && !dropUp && "rotate-180")} />
        </button>
        {isOpen && (
          <div
            className={cn(
              "rounded-md border bg-background shadow-lg flex flex-col",
              dropUp ? "origin-bottom" : "origin-top"
            )}
            style={dropdownStyle}
          >
            <div className="p-2 border-b sticky top-0 bg-background z-10 shrink-0">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input type="text" placeholder="Search certifications..."
                  value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" autoFocus />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {filteredCategories.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">No certifications found.</div>
              )}
              {filteredCategories.map((cat) => (
                <div key={cat.category}>
                  <div className="px-3 py-2 text-sm font-bold uppercase tracking-wider bg-muted text-foreground border-b sticky top-9">
                    {cat.category}
                  </div>
                  {cat.certifications.map((cert) => {
                    const isSelected = value.includes(cert.label);
                    return (
                      <button key={`${cat.category}-${cert.code}`} type="button"
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between gap-2",
                          isSelected && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => toggleCert(cert.label)}>
                        <span>{cert.label}</span>
                        {isSelected && <X className="size-4 shrink-0 text-muted-foreground" />}
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

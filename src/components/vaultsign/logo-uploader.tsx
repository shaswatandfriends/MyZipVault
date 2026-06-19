"use client";

/**
 * LogoUploader — flexible image upload for company logos.
 *
 * Features:
 * - Drag-and-drop + click-to-upload
 * - Handles ANY aspect ratio (circle / square / rectangle) via object-contain
 * - Preview box auto-adjusts height to logo's natural aspect ratio (capped)
 * - Remove button to clear the logo
 * - No URL input — purely upload-based
 *
 * Usage:
 *   <LogoUploader
 *     value={org.company_logo_url}
 *     onChange={(url) => setOrg({ ...org, company_logo_url: url })}
 *     onUpload={(file) => Promise<string>}  // returns uploaded URL
 *   />
 */

import React, { useRef, useState } from "react";
import { Upload, Loader2, Trash2, Building2, ImageIcon } from "@/lib/icons";

interface LogoUploaderProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<string>; // returns uploaded URL
  label?: string;
  /** Max preview box height in px (default 96) */
  maxPreviewHeight?: number;
  /** Max preview box width in px (default 160) */
  maxPreviewWidth?: number;
}

export function LogoUploader({
  value,
  onChange,
  onUpload,
  label = "Company Logo",
  maxPreviewHeight = 96,
  maxPreviewWidth = 160,
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    // Validate it's an image
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, SVG, WebP, etc.)");
      return;
    }
    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Logo must be under 5MB. Please compress it first.");
      return;
    }
    try {
      setUploading(true);
      const url = await onUpload(file);
      onChange(url);
    } catch (err: any) {
      alert(err?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <label className="text-sm font-medium flex items-center gap-1">
        <Building2 className="h-3.5 w-3.5" /> {label}
      </label>

      <div className="mt-2 flex items-start gap-4">
        {/* Preview / Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className="relative cursor-pointer rounded-xl border-2 border-dashed transition-colors flex items-center justify-center overflow-hidden bg-background shrink-0"
          style={{
            width: maxPreviewWidth,
            minHeight: maxPreviewHeight,
            borderColor: dragOver ? "var(--primary)" : "var(--border)",
            background: dragOver ? "var(--primary-light)" : undefined,
          }}
        >
          {value ? (
            <>
              {/* Use natural aspect ratio — object-contain respects any shape */}
              <img
                src={value}
                alt="Logo preview"
                className="max-w-full max-h-full object-contain p-2"
                style={{ maxHeight: maxPreviewHeight }}
              />
              {uploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </>
          ) : uploading ? (
            <div className="flex flex-col items-center gap-1 text-text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-[10px]">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-text-muted p-3 text-center">
              {dragOver ? (
                <Upload className="h-6 w-6" />
              ) : (
                <ImageIcon className="h-6 w-6" />
              )}
              <span className="text-[10px]">
                {dragOver ? "Drop logo here" : "Click or drag to upload"}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-surface-2 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {value ? "Replace" : "Upload"}
            </button>
            {value && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-text-secondary hover:bg-surface-2 hover:text-foreground transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            )}
          </div>
          <p className="text-[10px] text-text-muted leading-snug">
            PNG, JPG, SVG, or WebP. Max 5MB. Any aspect ratio (square, circle, rectangle) — we'll fit it automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

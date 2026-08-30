"use client";

/**
 * LogoUploader — image upload for company logos with size enforcement.
 *
 * Features:
 * - Drag-and-drop + click-to-upload
 * - Enforces standard logo size: 200×60px (3.33:1 aspect ratio)
 * - Auto-resizes uploaded images to 200×60px using canvas
 * - Preview box shows exact size (200×60)
 * - Remove button to clear the logo
 *
 * Standard size: 200×60px — matches the document header layout.
 * This ensures logos always look consistent in VaultSign documents.
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

// ─── Standard logo dimensions ───────────────────────────────────────
// All company logos are resized to this size for consistency in
// VaultSign document headers.
export const LOGO_WIDTH = 200;
export const LOGO_HEIGHT = 60;

interface LogoUploaderProps {
  value: string | null | undefined;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>; // returns uploaded URL
  label?: string;
}

export function LogoUploader({
  value,
  onChange,
  onUpload,
  label = "Company Logo",
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  /**
   * Resize an image file to exactly LOGO_WIDTH × LOGO_HEIGHT using canvas.
   * Returns a Blob (PNG) at the exact target size.
   *
   * We use object-fit: contain semantics — the image is scaled to fit
   * within 200×60 while preserving aspect ratio, centered on a white
   * background. This means:
   *   - A square logo becomes 60×60 centered in 200×60
   *   - A wide logo becomes 200×(scaled height) centered
   *   - Any aspect ratio works, but output is always 200×60
   */
  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = LOGO_WIDTH;
          canvas.height = LOGO_HEIGHT;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          // Fill white background (for transparent PNGs)
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, LOGO_WIDTH, LOGO_HEIGHT);

          // Scale image to fit within 200×60 (contain, preserve aspect ratio)
          const scale = Math.min(LOGO_WIDTH / img.width, LOGO_HEIGHT / img.height);
          const drawWidth = img.width * scale;
          const drawHeight = img.height * scale;
          const x = (LOGO_WIDTH - drawWidth) / 2;
          const y = (LOGO_HEIGHT - drawHeight) / 2;

          ctx.drawImage(img, x, y, drawWidth, drawHeight);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Failed to create blob"));
            },
            "image/png",
            0.92
          );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setStatusMsg(null);

    // Validate it's an image
    if (!file.type.startsWith("image/")) {
      setStatusMsg("❌ Please upload an image file (PNG, JPG, SVG, WebP)");
      return;
    }
    // Validate size (max 5MB before resize)
    if (file.size > 5 * 1024 * 1024) {
      setStatusMsg("❌ Logo must be under 5MB. Please compress it first.");
      return;
    }

    try {
      setUploading(true);
      setStatusMsg("Resizing to 200×60px...");

      // Resize the image to standard 200×60px
      const resizedBlob = await resizeImage(file);

      // Convert blob to File for upload
      const resizedFile = new File([resizedBlob], file.name.replace(/\.[^.]+$/, ".png"), {
        type: "image/png",
      });

      setStatusMsg("Uploading...");

      const url = await onUpload(resizedFile);
      onChange(url);
      setStatusMsg("✅ Logo uploaded (200×60px)");
    } catch (err: any) {
      setStatusMsg(`❌ ${err?.message || "Upload failed. Please try again."}`);
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
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
    setStatusMsg(null);
  };

  return (
    <div>
      <label className="text-sm font-medium flex items-center gap-1">
        <Building2 className="h-3.5 w-3.5" /> {label}
      </label>

      <div className="mt-2 flex items-start gap-4">
        {/* Preview / Drop zone — fixed 200×60 to match standard size */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className="relative cursor-pointer rounded-xl border-2 border-dashed transition-colors flex items-center justify-center overflow-hidden bg-white shrink-0"
          style={{
            width: LOGO_WIDTH,
            height: LOGO_HEIGHT,
            borderColor: dragOver ? "var(--primary)" : "var(--border)",
            background: dragOver ? "var(--primary-light)" : undefined,
          }}
        >
          {value ? (
            <>
              <img
                src={value}
                alt="Logo preview"
                className="max-w-full max-h-full object-contain"
              />
              {uploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </>
          ) : uploading ? (
            <div className="flex flex-col items-center gap-1 text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-[10px]">Processing...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-text-muted text-center">
              {dragOver ? (
                <Upload className="h-5 w-5" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
              <span className="text-[10px]">
                {dragOver ? "Drop here" : "Click or drag"}
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
            PNG, JPG, SVG, or WebP. Max 5MB. Any aspect ratio — auto-resized to <strong>200×60px</strong> for document consistency.
          </p>
          {statusMsg && (
            <p className={`text-[10px] leading-snug ${statusMsg.startsWith("✅") ? "text-emerald-600" : statusMsg.startsWith("❌") ? "text-rose-600" : "text-text-muted"}`}>
              {statusMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Upload,
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
} from "@/lib/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// ─── Types ─────────────────────────────────────────────────────────────
interface ChunkSummary {
  inserted: number;
  duplicates: number;
  errors: number;
  errorDetails: { row: number; message: string; raw: string }[];
}

interface ImportSummary {
  totalInserted: number;
  totalDuplicates: number;
  totalErrors: number;
  chunkSummaries: ChunkSummary[];
  unknownHeaders: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────
const CHUNK_SIZE = 1000; // rows per chunk (Vercel 60s timeout protection)

export default function CandidateImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [parsePreview, setParsePreview] = useState<{ headers: string[]; rows: string[][]; totalRows: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Handle file selection ──────────────────────────────────────────
  const handleFileChange = useCallback(async (selectedFile: File | null) => {
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith(".csv") && selectedFile.type !== "text/csv") {
      toast.error("Please upload a CSV file");
      return;
    }

    // Validate file size (max 50MB per chunk)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error("File too large. Split into smaller chunks (max 50MB each).");
      return;
    }

    setFile(selectedFile);
    setSummary(null);
    setProgress(0);
    setProgressLabel("");

    // Preview: read first 5 rows
    try {
      const text = await selectedFile.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length === 0) {
        toast.error("CSV file is empty");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const previewRows = lines.slice(1, 6).map((line) => line.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
      setParsePreview({ headers, rows: previewRows, totalRows: lines.length - 1 });
    } catch (err) {
      console.error("[CSV_IMPORT] Preview failed:", err);
    }
  }, []);

  // ─── Drag-drop handlers ─────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    handleFileChange(droppedFile);
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // ─── Download template ──────────────────────────────────────────────
  const handleDownloadTemplate = useCallback(() => {
    window.location.href = "/api/superadmin/candidates/import-template";
  }, []);

  // ─── Main import handler ────────────────────────────────────────────
  const handleImport = useCallback(async () => {
    if (!file) {
      toast.error("Please select a CSV file first");
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setProgressLabel("Reading file...");
    setSummary(null);

    try {
      // Read entire file as text
      const text = await file.text();

      // Split into chunks of CHUNK_SIZE rows
      const allLines = text.split(/\r?\n/);
      const headerLine = allLines[0];
      const dataLines = allLines.slice(1).filter((line) => line.trim());

      const totalRows = dataLines.length;
      const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);

      if (totalRows === 0) {
        toast.error("CSV has no data rows");
        setIsImporting(false);
        return;
      }

      const chunkSummaries: ChunkSummary[] = [];
      let totalInserted = 0;
      let totalDuplicates = 0;
      let totalErrors = 0;
      const allUnknownHeaders: string[] = [];

      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        const startIdx = chunkIdx * CHUNK_SIZE;
        const endIdx = Math.min(startIdx + CHUNK_SIZE, totalRows);
        const chunkLines = dataLines.slice(startIdx, endIdx);
        const chunkText = [headerLine, ...chunkLines].join("\n");

        setProgressLabel(`Processing chunk ${chunkIdx + 1} of ${totalChunks} (rows ${startIdx + 1}-${endIdx})...`);
        setProgress(Math.round(((chunkIdx + 1) / totalChunks) * 100));

        // Create a File object from the chunk text
        const chunkBlob = new Blob([chunkText], { type: "text/csv" });
        const chunkFile = new File([chunkBlob], file.name, { type: "text/csv" });

        // Build multipart form
        const formData = new FormData();
        formData.append("file", chunkFile);
        formData.append("chunkIndex", String(chunkIdx));
        formData.append("totalChunks", String(totalChunks));
        formData.append("totalRows", String(totalRows));

        // Send to API
        const res = await fetch("/api/superadmin/candidates/import-csv", {
          method: "POST",
          body: formData,
        });

        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error || `Chunk ${chunkIdx + 1} failed`);
        }

        const chunkSummary = body.summary as ChunkSummary;
        chunkSummaries.push(chunkSummary);
        totalInserted += chunkSummary.inserted;
        totalDuplicates += chunkSummary.duplicates;
        totalErrors += chunkSummary.errors;

        if (body.unknownHeaders && Array.isArray(body.unknownHeaders)) {
          for (const h of body.unknownHeaders) {
            if (!allUnknownHeaders.includes(h)) allUnknownHeaders.push(h);
          }
        }
      }

      setSummary({
        totalInserted,
        totalDuplicates,
        totalErrors,
        chunkSummaries,
        unknownHeaders: allUnknownHeaders,
      });

      toast.success(
        `Import complete: ${totalInserted} added, ${totalDuplicates} duplicates, ${totalErrors} errors`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast.error("Import failed", { description: msg });
    } finally {
      setIsImporting(false);
      setProgressLabel("");
    }
  }, [file]);

  // ─── Reset handler ──────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setFile(null);
    setSummary(null);
    setProgress(0);
    setParsePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Candidates"
        description="Bulk import healthcare candidate records from a CSV file. The file is split into chunks automatically to handle large imports."
        actions={
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="size-4" />
            Download Template
          </Button>
        }
      />

      {/* ─── Stats cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="size-5 text-emerald-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total in Pool</p>
                <p className="text-lg font-bold">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <div>
                <p className="text-xs text-muted-foreground">Imported</p>
                <p className="text-lg font-bold">{summary?.totalInserted ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="size-5 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">Duplicates</p>
                <p className="text-lg font-bold">{summary?.totalDuplicates ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">Errors</p>
                <p className="text-lg font-bold">{summary?.totalErrors ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Upload zone ─────────────────────────────────────────────── */}
      {!summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                file ? "border-emerald-400 bg-emerald-50/50" : "border-gray-300 hover:border-emerald-400 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                disabled={isImporting}
              />
              {file ? (
                <div className="space-y-2">
                  <FileText className="size-12 text-emerald-600 mx-auto" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toLocaleString()} KB · {parsePreview?.totalRows ?? "—"} rows
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                    Choose different file
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="size-12 text-muted-foreground mx-auto" />
                  <p className="font-medium">Drop CSV file here, or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Supports .csv files. Large files are auto-split into chunks of {CHUNK_SIZE} rows.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                    Select File
                  </Button>
                </div>
              )}
            </div>

            {/* Preview */}
            {parsePreview && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Preview (first 5 rows):</p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {parsePreview.headers.map((h, i) => (
                          <th key={i} className="p-2 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsePreview.rows.map((row, i) => (
                        <tr key={i} className="border-t">
                          {row.map((cell, j) => (
                            <td key={j} className="p-2">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total rows in file: <strong>{parsePreview.totalRows.toLocaleString()}</strong>
                </p>
              </div>
            )}

            {/* Action buttons */}
            {file && (
              <div className="flex items-center gap-2">
                <Button onClick={handleImport} disabled={isImporting || !file}>
                  {isImporting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4 mr-2" />
                      Import {parsePreview?.totalRows.toLocaleString() ?? ""} rows
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={isImporting}>
                  Reset
                </Button>
              </div>
            )}

            {/* Progress bar */}
            {isImporting && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">{progressLabel}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Results ──────────────────────────────────────────────────── */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{summary.totalInserted.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Imported</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{summary.totalDuplicates.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Duplicates skipped</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{summary.totalErrors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {summary.unknownHeaders.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800 mb-1">Unknown columns (skipped):</p>
                <div className="flex flex-wrap gap-1">
                  {summary.unknownHeaders.map((h, i) => (
                    <Badge key={i} variant="outline" className="text-amber-700 border-amber-300">
                      {h}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Error details (first 10) */}
            {summary.chunkSummaries.some((c) => c.errorDetails.length > 0) && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Error details (first 10):</p>
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Row</th>
                        <th className="p-2 text-left">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.chunkSummaries
                        .flatMap((c) => c.errorDetails)
                        .slice(0, 10)
                        .map((e, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 font-mono">{e.row}</td>
                            <td className="p-2">{e.message}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={handleReset}>
                <RefreshCw className="size-4 mr-2" />
                Import another file
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Help ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV Format</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Required columns: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Name</code>,{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Number</code> (or Email — at least one is required),{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">City</code>,{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">State</code>,{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Job Title</code>,{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Specialty</code>.
          </p>
          <p>
            Column matching is flexible — common variations are accepted (e.g.,{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Phone</code> instead of{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Number</code>, typos like{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">jobtittle</code> and{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">specility</code> are handled).
          </p>
          <p>
            Phone numbers are normalized to <code className="bg-muted px-1.5 py-0.5 rounded text-xs">+1 (XXX) XXX-XXXX</code> format.
            Emails are lowercased and trimmed (Gmail dots/aliases stripped).
          </p>
          <p>
            <strong>Dedup logic:</strong> if a row's email OR phone matches an existing candidate in the pool, the row is skipped as a duplicate.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

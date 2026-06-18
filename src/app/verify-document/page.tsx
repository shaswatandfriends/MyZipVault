"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Search, CheckCircle2, XCircle, FileText, User, Calendar, FileCheck } from "@/lib/icons";

interface VerificationResult {
  valid: boolean;
  documentId?: string;
  documentType?: string;
  documentName?: string;
  candidateName?: string;
  signedAt?: string | null;
  status?: string;
  verifiedCount?: number;
  message?: string;
  reason?: string;
}

export default function VerifyDocumentPage() {
  const [documentId, setDocumentId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId.trim() || !verificationCode.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(
        `/api/verify-document?documentId=${encodeURIComponent(documentId.trim())}&verificationCode=${encodeURIComponent(verificationCode.trim())}`
      );
      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "Verification failed. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDocumentType = (type: string) => {
    const map: Record<string, string> = {
      checklist: "Skills Checklist",
      baa: "Business Associate Agreement",
      invoice: "Invoice",
      reference: "Reference Letter",
      vaultsign: "Signed Document",
    };
    return map[type] || type;
  };

  const formatDate = (isoStr: string | null | undefined) => {
    if (!isoStr) return "N/A";
    return new Date(isoStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
              ZV
            </div>
            <div>
              <span className="font-semibold text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                MyZipVault
              </span>
              <span className="text-text-muted text-xs block leading-tight">Document Verification</span>
            </div>
          </div>
          <a
            href="/"
            className="text-sm text-primary hover:text-primary-hover font-medium transition-colors"
          >
            Back to Home
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="size-16 rounded-2xl bg-primary-light mx-auto flex items-center justify-center mb-4">
              <ShieldCheck className="size-8 text-primary" />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-foreground"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              Verify a Document
            </h1>
            <p className="mt-2 text-text-secondary text-sm max-w-md mx-auto">
              Enter the Document ID and Verification Code from any MyZipVault document to confirm its authenticity.
            </p>
          </motion.div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white border border-border rounded-2xl p-6 shadow-sm"
          >
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-text-secondary mb-1.5">
                  Document ID
                </label>
                <input
                  type="text"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="e.g. MZV-MQFNP5GX"
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-text-secondary mb-1.5">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 2BA1C730"
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal font-mono uppercase tracking-wider"
                  required
                  maxLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !documentId.trim() || !verificationCode.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="size-4" />
                    Verify Document
                  </>
                )}
              </button>
            </form>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6"
                >
                  {result.valid ? (
                    /* ── Valid Document ── */
                    <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 bg-emerald-100/60 flex items-center gap-3">
                        <div className="size-10 rounded-full bg-emerald-200 flex items-center justify-center">
                          <CheckCircle2 className="size-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-800 text-sm">Document Verified</p>
                          <p className="text-emerald-600 text-xs">This document is authentic and valid.</p>
                        </div>
                      </div>
                      <div className="px-5 py-4 space-y-3">
                        {result.documentName && (
                          <div className="flex items-start gap-3">
                            <FileText className="size-4 text-text-muted mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-text-muted">Document Name</p>
                              <p className="text-sm font-medium text-foreground">{result.documentName}</p>
                            </div>
                          </div>
                        )}
                        {result.documentType && (
                          <div className="flex items-start gap-3">
                            <FileCheck className="size-4 text-text-muted mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-text-muted">Document Type</p>
                              <p className="text-sm font-medium text-foreground">{formatDocumentType(result.documentType)}</p>
                            </div>
                          </div>
                        )}
                        {result.candidateName && (
                          <div className="flex items-start gap-3">
                            <User className="size-4 text-text-muted mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-text-muted">Signed By</p>
                              <p className="text-sm font-medium text-foreground">{result.candidateName}</p>
                            </div>
                          </div>
                        )}
                        {result.signedAt && (
                          <div className="flex items-start gap-3">
                            <Calendar className="size-4 text-text-muted mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-text-muted">Signed On</p>
                              <p className="text-sm font-medium text-foreground">{formatDate(result.signedAt)}</p>
                            </div>
                          </div>
                        )}
                        <div className="pt-2 border-t border-emerald-200">
                          <p className="text-xs text-text-muted">
                            This document has been verified <strong>{result.verifiedCount}</strong> time{result.verifiedCount !== 1 ? "s" : ""}.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Invalid Document ── */
                    <div className="border border-red-200 bg-red-50/50 rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 bg-red-100/60 flex items-center gap-3">
                        <div className="size-10 rounded-full bg-red-200 flex items-center justify-center">
                          <XCircle className="size-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-red-800 text-sm">Verification Failed</p>
                          <p className="text-red-600 text-xs">{result.reason || "This document could not be verified."}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Bottom note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-xs text-text-muted"
          >
            MyZipVault document verification confirms the document was generated through our secure platform.
            <br />
            All documents are digitally signed and tamper-evident.
          </motion.p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-4">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-text-muted">
          &copy; 2025 MyZipVault. All rights reserved. &middot; HIPAA-Aligned Security
        </div>
      </footer>
    </div>
  );
}

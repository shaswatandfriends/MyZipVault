"use client";

import React from "react";

interface SigningErrorBoundaryProps {
  children: React.ReactNode;
}

interface SigningErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SigningErrorBoundary extends React.Component<
  SigningErrorBoundaryProps,
  SigningErrorBoundaryState
> {
  constructor(props: SigningErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SigningErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[SigningErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{ backgroundColor: "#F8F7F4" }}
          className="min-h-screen flex items-center justify-center p-4"
        >
          <div
            className="bg-white rounded-2xl border border-[#E5E7EB] p-8 max-w-md w-full text-center"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            {/* VaultSign Logo */}
            <div className="mb-6">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                style={{ backgroundColor: "#FEF3C7" }}
              >
                <span style={{ fontSize: "32px" }}>&#x1F4C4;</span>
              </div>
              <h1
                className="text-2xl font-extrabold mb-1"
                style={{ color: "#166534", letterSpacing: "-0.5px" }}
              >
                &#x1F510; VaultSign
              </h1>
              <p
                className="text-xs uppercase tracking-widest"
                style={{ color: "#6B7280" }}
              >
                by MyZipVault
              </p>
            </div>

            {/* Friendlier heading for signers */}
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: "#111827" }}
            >
              We had trouble loading your document
            </h2>
            <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
              Something went wrong while preparing your document for signing.
              This is usually temporary. Please try again or contact the person
              who sent you this document.
            </p>

            {/* Error details */}
            {this.state.error && (
              <div
                className="mb-6 rounded-lg p-3 text-left"
                style={{
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FECACA",
                }}
              >
                <p
                  className="text-xs font-mono break-all"
                  style={{ color: "#DC2626" }}
                >
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Actions — NO dashboard link, signers may not have accounts */}
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-lg font-semibold text-white text-sm"
                style={{
                  backgroundColor: "#166534",
                  border: "2px solid #166534",
                  cursor: "pointer",
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor =
                    "#14532D";
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor =
                    "#166534";
                }}
              >
                Try Again
              </button>

              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.history.back();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm"
                style={{
                  color: "#374151",
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor =
                    "#F8F7F4";
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor =
                    "#FFFFFF";
                }}
              >
                Go Back
              </button>

              <a
                href="mailto:support@myzipvault.com"
                className="block text-xs"
                style={{
                  color: "#0D9488",
                  textDecoration: "underline",
                }}
              >
                Contact the Sender
              </a>
            </div>

            {/* Footer branding */}
            <div
              className="mt-8 pt-4"
              style={{ borderTop: "1px solid #E5E7EB" }}
            >
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                VaultSign by MyZipVault — Secure Electronic Signatures
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

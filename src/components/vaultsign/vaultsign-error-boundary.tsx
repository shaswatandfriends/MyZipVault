"use client";

import React from "react";

interface VaultSignErrorBoundaryProps {
  children: React.ReactNode;
}

interface VaultSignErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class VaultSignErrorBoundary extends React.Component<
  VaultSignErrorBoundaryProps,
  VaultSignErrorBoundaryState
> {
  constructor(props: VaultSignErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): VaultSignErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[VaultSignErrorBoundary] Caught error:", error, errorInfo);
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
                style={{ backgroundColor: "#FEF2F2" }}
              >
                <span style={{ fontSize: "32px" }}>&#x26A0;&#xFE0F;</span>
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

            {/* Error Heading */}
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: "#111827" }}
            >
              Something went wrong
            </h2>
            <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
              We encountered an unexpected error while loading this page. This
              has been logged and our team will investigate.
            </p>

            {/* Error details (collapsed) */}
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

            {/* Actions */}
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

              <a
                href="/recruiter/vaultsign"
                className="block w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-center"
                style={{
                  color: "#166534",
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#FFFFFF",
                  textDecoration: "none",
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLAnchorElement).style.backgroundColor =
                    "#F0FDF4";
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLAnchorElement).style.backgroundColor =
                    "#FFFFFF";
                }}
              >
                Go to Dashboard
              </a>

              <a
                href="mailto:support@myzipvault.com"
                className="block text-xs"
                style={{
                  color: "#0D9488",
                  textDecoration: "underline",
                }}
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

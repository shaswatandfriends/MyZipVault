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
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="bg-card rounded-2xl border border-border p-8 max-w-md w-full text-center shadow-sm">
            {/* VaultSign Logo */}
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-status-red-bg">
                <span style={{ fontSize: "32px" }}>&#x26A0;&#xFE0F;</span>
              </div>
              <h1 className="text-2xl font-extrabold mb-1 text-primary" style={{ letterSpacing: "-0.5px" }}>
                &#x1F510; VaultSign
              </h1>
              <p className="text-xs uppercase tracking-widest text-text-secondary">
                by MyZipVault
              </p>
            </div>

            {/* Error Heading */}
            <h2 className="text-xl font-bold mb-2 text-foreground">
              Something went wrong
            </h2>
            <p className="text-sm mb-6 text-text-secondary">
              We encountered an unexpected error while loading this page. This
              has been logged and our team will investigate.
            </p>

            {/* Error details (collapsed) */}
            {this.state.error && (
              <div className="mb-6 rounded-lg p-3 text-left bg-status-red-bg border border-status-red-border">
                <p className="text-xs font-mono break-all text-status-red">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-lg font-semibold text-white text-sm bg-primary hover:bg-status-green-dark cursor-pointer border-2 border-primary"
              >
                Try Again
              </button>

              <a
                href="/recruiter/vaultsign"
                className="block w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-center text-primary border border-border bg-card hover:bg-primary-light no-underline"
              >
                Go to Dashboard
              </a>

              <a
                href="mailto:support@myzipvault.com"
                className="block text-xs text-accent-teal underline"
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

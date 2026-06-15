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
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="bg-card rounded-2xl border border-border p-8 max-w-md w-full text-center shadow-sm">
            {/* VaultSign Logo */}
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-status-amber-bg">
                <span style={{ fontSize: "32px" }}>&#x1F4C4;</span>
              </div>
              <h1 className="text-2xl font-extrabold mb-1 text-primary" style={{ letterSpacing: "-0.5px" }}>
                &#x1F510; VaultSign
              </h1>
              <p className="text-xs uppercase tracking-widest text-text-secondary">
                by MyZipVault
              </p>
            </div>

            {/* Friendlier heading for signers */}
            <h2 className="text-xl font-bold mb-2 text-foreground">
              We had trouble loading your document
            </h2>
            <p className="text-sm mb-6 text-text-secondary">
              Something went wrong while preparing your document for signing.
              This is usually temporary. Please try again or contact the person
              who sent you this document.
            </p>

            {/* Error details */}
            {this.state.error && (
              <div className="mb-6 rounded-lg p-3 text-left bg-status-red-bg border border-status-red-border">
                <p className="text-xs font-mono break-all text-status-red">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Actions — NO dashboard link, signers may not have accounts */}
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-lg font-semibold text-white text-sm bg-primary hover:bg-status-green-dark cursor-pointer border-2 border-primary"
              >
                Try Again
              </button>

              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.history.back();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-text-secondary border border-border bg-card hover:bg-background cursor-pointer"
              >
                Go Back
              </button>

              <a
                href="mailto:support@myzipvault.com"
                className="block text-xs text-accent-teal underline"
              >
                Contact the Sender
              </a>
            </div>

            {/* Footer branding */}
            <div className="mt-8 pt-4 border-t border-border">
              <p className="text-xs text-text-muted">
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

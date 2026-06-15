import React from "react";

export const metadata = {
  title: "VaultSign — Sign Document",
  description: "Sign your document securely with VaultSign by MyZipVault",
  robots: "noindex, nofollow",
};

export default function SignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Public signing pages: no app chrome (sidebar, navbar, etc.)
  // Clean branded layout for signers who may not have accounts
  return (
    <div className="min-h-screen bg-background">
      {children}
      {/* Footer branding */}
      <footer className="border-t border-border bg-white py-3 px-4 text-center">
        <p className="text-xs text-text-muted">
          Powered by <span className="font-medium text-text-secondary">VaultSign</span> — MyZipVault Secure Electronic Signatures
        </p>
        <p className="text-[10px] text-disabled-border mt-0.5">
          Your electronic signature is legally binding under the ESIGN Act and UETA
        </p>
      </footer>
    </div>
  );
}

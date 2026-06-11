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
    <div className="min-h-screen bg-[#F8F7F4]">
      {children}
      {/* Footer branding */}
      <footer className="border-t border-[#E5E7EB] bg-white py-3 px-4 text-center">
        <p className="text-xs text-[#9CA3AF]">
          Powered by <span className="font-medium text-[#6B7280]">VaultSign</span> — MyZipVault Secure Electronic Signatures
        </p>
        <p className="text-[10px] text-[#D1D5DB] mt-0.5">
          Your electronic signature is legally binding under the ESIGN Act and UETA
        </p>
      </footer>
    </div>
  );
}

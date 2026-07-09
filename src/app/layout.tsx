import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ProxyModeBanner } from "@/components/proxy-mode-banner";
import { ThemeProvider } from "next-themes";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const satoshi = localFont({
  src: [
    {
      path: "../../public/fonts/satoshi-var.woff2",
      style: "normal",
    },
    {
      path: "../../public/fonts/satoshi-var-italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

// Editorial Premium serif — used for headlines in the new design direction.
// Existing Satoshi headlines are NOT replaced; this is additive.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyZipVault — Healthcare Credential Verification",
  description:
    "Streamline healthcare credential verification with MyZipVault. Secure, compliant, and efficient credential management for candidates, recruiters, and administrators.",
  keywords: [
    "MyZipVault",
    "healthcare",
    "credential verification",
    "compliance",
    "SaaS",
  ],
  authors: [{ name: "MyZipVault Team" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* VaultSign signature fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Pacifico&family=Sacramento&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Fira+Sans:ital,wght@0,400;0,700;1,400&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=PT+Serif+Caption:ital,wght@0,400;1,400&family=Arimo:ital,wght@0,400;0,700;1,400&family=Tinos:ital,wght@0,400;0,700;1,400&family=Cousine:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${satoshi.variable} ${playfair.variable} antialiased bg-background text-foreground font-sans`}
      >
        {/* ─── Privacy-friendly analytics (Plausible) ───────────────────────
            Loads ONLY when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set.
            - No cookies, no PII collected → aligns with HIPAA positioning
            - GDPR-compliant out of the box
            - Script is deferred so it never blocks page render
            - To enable: create a site at plausible.io (or self-host),
              set NEXT_PUBLIC_PLAUSIBLE_DOMAIN=myzipvault.com and
              NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL=https://plausible.io/js/script.js
              in Vercel env vars.
        ──────────────────────────────────────────────────────────────────── */}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            src={process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL || "https://plausible.io/js/script.js"}
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            strategy="afterInteractive"
          />
        )}

        <ProxyModeBanner />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
        >
          <SessionProvider>
            <AuthProvider>{children}</AuthProvider>
          </SessionProvider>
        </ThemeProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

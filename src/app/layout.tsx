import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ProxyModeBanner } from "@/components/proxy-mode-banner";
import { CookieConsent } from "@/components/shared/CookieConsent";
import { HelpFloater } from "@/components/shared/HelpFloater";
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

// Clash Display — bold geometric sans for hero headlines on the new landing page.
// Available in /public/fonts but was previously unregistered.
const clashDisplay = localFont({
  src: "../../public/fonts/clash-display-700.woff2",
  variable: "--font-clash",
  display: "swap",
});

const BASE_URL = "https://my-zip-vault.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "MyZipVault — Healthcare Recruiting Marketplace",
    template: "%s | MyZipVault",
  },
  description:
    "MyZipVault connects healthcare professionals with top recruiters and employers. Find travel nurse jobs, RN positions, and allied health roles. Verify credentials, sign documents, and land your next placement — all in one platform.",
  keywords: [
    "healthcare jobs",
    "travel nurse jobs",
    "RN jobs",
    "allied health jobs",
    "nurse recruiter",
    "healthcare recruiter",
    "healthcare staffing",
    "nursing jobs",
    "credential verification",
    "MyZipVault",
  ],
  authors: [{ name: "MyZipVault Team" }],
  creator: "MyZipVault",
  publisher: "MyZipVault",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "MyZipVault",
    title: "MyZipVault — Healthcare Recruiting Marketplace",
    description:
      "Connect with top healthcare recruiters and employers. Find travel nurse jobs, RN positions, and allied health roles. Verify credentials, sign documents, and land your next placement.",
    images: [
      {
        url: "/logo.svg",
        width: 1200,
        height: 630,
        alt: "MyZipVault — Healthcare Recruiting Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyZipVault — Healthcare Recruiting Marketplace",
    description:
      "Connect with top healthcare recruiters and employers. Find travel nurse jobs, RN positions, and allied health roles.",
    images: ["/logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "Jobs",
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
        className={`${inter.variable} ${satoshi.variable} ${playfair.variable} ${clashDisplay.variable} antialiased bg-background text-foreground font-sans`}
      >
        {/* JSON-LD Organization schema — for Google rich results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "MyZipVault",
              url: BASE_URL,
              logo: `${BASE_URL}/logo.svg`,
              description:
                "Healthcare recruiting marketplace connecting nurses, allied health professionals, recruiters, and employers.",
              sameAs: [
                "https://www.linkedin.com/company/myzipvault",
                "https://twitter.com/myzipvault",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: "support@myzipvault.com",
                availableLanguage: ["English"],
              },
            }),
          }}
        />
        {/* JSON-LD WebSite schema — enables sitelinks search box in Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "MyZipVault",
              url: BASE_URL,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${BASE_URL}/browse-jobs?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
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
        <CookieConsent />
        <HelpFloater />
        <Analytics />
      </body>
    </html>
  );
}

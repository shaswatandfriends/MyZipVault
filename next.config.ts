import type { NextConfig } from "next";

const securityHeaders = [
  {
    source: "/(.*)",
    headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        key: "Content-Security-Policy",
        value:
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://api.fontshare.com https://cdn.fontshare.com https://fonts.googleapis.com; img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com; font-src 'self' data: https://api.fontshare.com https://cdn.fontshare.com https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://api.brevo.com https://api-affinda.p.rapidapi.com https://api.affinda.com https://*.affinda.com https://internal-api.z.ai",
      },
    ],
  },
  // ─── CORS: restrict API access to our own domain only ─────────────
  // Prevents other websites from making cross-origin API requests.
  // Auth-protected endpoints are also secured by session cookies.
  {
    source: "/api/(.*)",
    headers: [
      {
        key: "Access-Control-Allow-Origin",
        value: "https://my-zip-vault.vercel.app",
      },
      {
        key: "Access-Control-Allow-Methods",
        value: "GET, POST, PUT, DELETE, OPTIONS",
      },
      {
        key: "Access-Control-Allow-Headers",
        value: "Content-Type, Authorization, X-Cron-Secret, x-cron-secret",
      },
      {
        key: "Access-Control-Allow-Credentials",
        value: "true",
      },
      {
        key: "Access-Control-Max-Age",
        value: "86400",
      },
    ],
  },
];

const nextConfig: NextConfig = {
  // Removed "standalone" output — Vercel has its own build system.
  // "standalone" mode strips the Prisma engine binary and breaks DB queries on Vercel.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  headers: () => securityHeaders,

  // Fix: lucide-react uses a double-barrel ESM structure that causes
  // "Cannot access 'ey' before initialization" (TDZ error) with Turbopack + React 19.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  transpilePackages: ["lucide-react", "signature_pad"],

  // pdfmake uses dynamic requires that break with Vercel's bundler.
  // pdfjs-dist uses workers internally — marking as external ensures
  // the serverless function loads it correctly.
  // mammoth uses dynamic requires for DOCX parsing.
  serverExternalPackages: ["pdfmake", "pdfkit", "pdfjs-dist", "mammoth", "pdf-parse"],

  // Include pdfkit's font data files, pdfmake's full package, and
  // pdfjs-dist's legacy build in the serverless function bundle.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/pdfkit/js/data/**/*",
      "./node_modules/pdfmake/build/**/*",
      "./node_modules/pdfmake/js/**/*",
      "./node_modules/pdfmake/src/**/*",
      "./node_modules/pdfmake/fonts/**/*",
      "./node_modules/pdfjs-dist/legacy/build/**/*",
      "./node_modules/mammoth/**/*",
      "./node_modules/pdf-parse/**/*",
    ],
  },
};

export default nextConfig;

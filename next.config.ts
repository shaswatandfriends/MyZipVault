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
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://api.fontshare.com https://cdn.fontshare.com https://fonts.googleapis.com; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' data: https://api.fontshare.com https://cdn.fontshare.com https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://api.brevo.com https://api-affinda.p.rapidapi.com https://api.affinda.com https://*.affinda.com https://internal-api.z.ai",
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
  reactStrictMode: false,
  headers: () => securityHeaders,

  // Fix: lucide-react uses a double-barrel ESM structure that causes
  // "Cannot access 'ey' before initialization" (TDZ error) with Turbopack + React 19.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  transpilePackages: ["lucide-react", "signature_pad"],

  // pdfmake uses dynamic requires that break with Vercel's bundler.
  // Marking as external ensures the serverless function loads it correctly.
  serverExternalPackages: ["pdfmake", "pdfkit"],

  // Include pdfkit's font data files and pdfmake's full package in the
  // serverless function bundle. Vercel's bundler doesn't detect dynamic
  // file reads (__dirname + '/data/...') or subpath imports.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/pdfkit/js/data/**/*",
      "./node_modules/pdfmake/build/**/*",
      "./node_modules/pdfmake/js/**/*",
      "./node_modules/pdfmake/src/**/*",
      "./node_modules/pdfmake/fonts/**/*",
    ],
  },
};

export default nextConfig;

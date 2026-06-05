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
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.brevo.com https://api-affinda.p.rapidapi.com",
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
};

export default nextConfig;

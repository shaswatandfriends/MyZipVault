import { NextResponse } from "next/server";

// Health check endpoint — used by Vercel/monitoring to verify the API is up.
// Returns basic service status without exposing internal details.
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "myzipvault-api",
    timestamp: new Date().toISOString(),
  });
}

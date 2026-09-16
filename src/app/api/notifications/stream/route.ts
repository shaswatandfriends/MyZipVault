import { NextResponse } from "next/server";

/**
 * GET /api/notifications/stream
 *
 * SSE endpoint — DISABLED on Vercel serverless.
 *
 * SSE (Server-Sent Events) requires long-running connections, which don't
 * work on Vercel serverless functions (max 10s on Hobby plan). Each
 * connection timeout caused a reconnect → infinite loop → 200K+ function
 * invocations per day for a single user.
 *
 * The notification bell now uses polling (every 60s) instead of SSE.
 * This route returns 200 immediately so EventSource doesn't error.
 *
 * To re-enable SSE in the future: deploy on a long-running server
 * (Railway, Fly.io, VPS) or use Vercel Pro with Edge Functions.
 */
export async function GET() {
  return new NextResponse("SSE disabled — use polling endpoint /api/notifications\n", {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

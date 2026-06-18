import { NextResponse } from "next/server";
import { captureError } from "@/lib/error-monitor";

/**
 * API Route Error Handler
 *
 * Wraps an API route handler with error monitoring. Any unhandled error
 * is captured to the database + emailed to Super Admin (if critical).
 *
 * Usage:
 *   import { withErrorMonitoring } from "@/lib/api-error-handler";
 *
 *   export const GET = withErrorMonitoring("dashboard", async (request) => {
 *     // ... your route logic
 *   });
 *
 * Or for routes with params:
 *   export const GET = withErrorMonitoring("candidate-detail", async (request, { params }) => {
 *     const { id } = await params;
 *     // ... your route logic
 *   });
 */

type RouteHandler = (request: Request, context?: any) => Promise<NextResponse>;

export function withErrorMonitoring(
  service: string,
  handler: RouteHandler
): RouteHandler {
  return async (request: Request, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Capture the error
      await captureError({
        severity: "critical",
        service,
        message: `Unhandled error in ${service}`,
        error,
      });

      // Return a generic error response (don't leak error details to client)
      const isProduction = process.env.NODE_ENV === "production";
      return NextResponse.json(
        {
          error: isProduction
            ? "An unexpected error occurred. Our team has been notified."
            : `Error in ${service}: ${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 500 }
      );
    }
  };
}

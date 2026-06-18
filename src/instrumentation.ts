/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the Next.js server starts. Used to register global
 * error handlers that catch unhandled promise rejections and uncaught
 * exceptions.
 *
 * Per error monitoring checklist item #9: alerts so you can be
 * immediately notified if something breaks.
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Catch unhandled promise rejections
    process.on("unhandledRejection", (reason) => {
      console.error("[UNHANDLED_REJECTION]", reason);

      // Store in system_error_logs (fire and forget — don't block)
      storeError("critical", "unhandled_rejection", String(reason)).catch(
        () => {}
      );
    });

    // Catch uncaught exceptions (prevents process crash)
    process.on("uncaughtException", (error) => {
      console.error("[UNCAUGHT_EXCEPTION]", error);

      // Store in system_error_logs
      storeError(
        "critical",
        "uncaught_exception",
        `${error.message}\n\nStack:\n${error.stack}`
      ).catch(() => {});
    });

    console.log("[INSTRUMENTATION] Global error handlers registered");
  }
}

/**
 * Store error in system_error_logs table.
 * Uses dynamic import to avoid circular dependencies.
 */
async function storeError(
  severity: string,
  service: string,
  message: string
): Promise<void> {
  try {
    const { db } = await import("@/lib/db");
    await db.systemErrorLog.create({
      data: {
        severity,
        service,
        error_message: message,
      },
    });
  } catch (dbError) {
    // If DB is also broken, just console.error
    console.error("[INSTRUMENTATION] Failed to store error in DB:", dbError);
  }
}

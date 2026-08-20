/**
 * Sanitized error logger for auth/password-related routes.
 *
 * Problem: `console.error("label:", error)` logs the raw error object,
 * which on Vercel can include stack traces with file paths, environment
 * details, and — in rare cases — fragments of the request body if the
 * error originated from a JSON parse or DB constraint violation.
 *
 * Vercel function logs are retained for 30 days and visible to anyone
 * with project access. For HIPAA-aligned operation, we should avoid
 * logging raw error objects in routes that handle credentials.
 *
 * This helper logs:
 *   - The label (static string, safe)
 *   - error.name (e.g. "PrismaClientKnownRequestError" — safe)
 *   - error.message (the human-readable message — generally safe, but
 *     we truncate to 200 chars as a defensive measure)
 *
 * It does NOT log:
 *   - Stack traces
 *   - error.stack
 *   - The raw error object (which may include metadata)
 */

interface SafeLogOptions {
  /** Additional context to include (e.g. userId, email). Must be sanitized by caller. */
  context?: Record<string, string | number | boolean | null | undefined>;
}

export function logAuthError(label: string, error: unknown, options?: SafeLogOptions): void {
  const err = error as { name?: string; message?: string } | undefined;
  const name = err?.name ?? "UnknownError";
  const message = (err?.message ?? String(error)).slice(0, 200);

  if (options?.context && Object.keys(options.context).length > 0) {
    console.error(`${label} — ${name}: ${message}`, options.context);
  } else {
    console.error(`${label} — ${name}: ${message}`);
  }
}

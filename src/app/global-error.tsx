"use client";

import { ErrorBoundary } from "@/components/error-boundary";

/**
 * Global Error Boundary
 *
 * This file catches errors that occur in the root layout itself.
 * It's the last line of defense — if even the layout crashes, this
 * page is shown instead of a white screen.
 *
 * Note: This component replaces the entire <html> document, so it must
 * include its own <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary
          error={error}
          reset={reset}
          title="Application Error"
          description="The application encountered an unexpected error. Our team has been notified. Please try again."
          homeHref="/"
        />
      </body>
    </html>
  );
}

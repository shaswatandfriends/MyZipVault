"use client";

import { ErrorBoundary } from "@/components/error-boundary";

export default function CandidateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Page Error"
      description="Something went wrong on this page. Your data is safe — please try again."
      homeHref="/dashboard"
    />
  );
}

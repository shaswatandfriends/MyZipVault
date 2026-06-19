"use client";

import { ErrorBoundary } from "@/components/error-boundary";

export default function SuperAdminError({
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
      title="Super Admin Page Error"
      description="Something went wrong on this super admin page. Please try again."
      homeHref="/superadmin/dashboard"
    />
  );
}

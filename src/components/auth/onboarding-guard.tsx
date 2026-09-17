"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "@/lib/icons";

/**
 * OnboardingGuard
 *
 * Wraps all candidate pages. On mount, checks if the candidate has completed
 * the mandatory onboarding form. If not, redirects to /onboarding/details.
 *
 * LOOP PREVENTION:
 * 1. Uses a ref (hasChecked) to ensure the check only runs ONCE per mount.
 *    Even if the component re-renders, the fetch won't fire again.
 * 2. Uses window.location.href (full page reload) for the redirect — not
 *    router.replace. This completely resets React state.
 * 3. The onboarding page itself does NOT auto-redirect back to dashboard.
 *    It always shows the form. This breaks the loop direction:
 *    onboarding → dashboard. The only way to leave onboarding is to
 *    submit the form (which sets onboarding_completed_at) or navigate
 *    manually via sidebar.
 * 4. Excludes /onboarding/* paths from the guard.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    // Don't guard the onboarding page itself
    if (pathname.startsWith("/onboarding")) {
      setChecked(true);
      return;
    }

    // Only run the check ONCE per mount
    if (hasChecked.current) return;
    hasChecked.current = true;

    let cancelled = false;

    fetch("/api/candidate/onboarding-details", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data && data.onboarding_completed === false) {
          // FULL PAGE RELOAD to onboarding
          window.location.href = "/onboarding/details";
        } else {
          setChecked(true);
        }
      })
      .catch(() => {
        // If the check fails, let the page load
        if (!cancelled) setChecked(true);
      });

    return () => { cancelled = true; };
  }, [pathname]);

  // While checking, show a loader (only on non-onboarding pages)
  if (!checked && !pathname.startsWith("/onboarding")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-[#174A43]">
          <Loader2 className="size-6 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

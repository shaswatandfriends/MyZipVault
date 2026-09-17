"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "@/lib/icons";

/**
 * OnboardingGuard
 *
 * Wraps all candidate pages. On mount, checks if the candidate has completed
 * the mandatory first-login onboarding form. If not, redirects to
 * /onboarding/details via FULL PAGE RELOAD (window.location.href).
 *
 * CRITICAL: We use window.location.href — NOT router.replace — because
 * client-side navigation keeps the layout mounted with stale state, causing
 * redirect loops between dashboard and onboarding page. Full page reloads
 * completely reset React state on every redirect.
 *
 * Onboarding is MANDATORY for all candidates (new and existing). The API
 * checks that ALL required fields are filled. If any field is missing,
 * the candidate is redirected to the onboarding form.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Don't guard the onboarding page itself (would cause a loop)
    if (pathname.startsWith("/onboarding")) {
      setChecked(true);
      return;
    }

    let cancelled = false;

    fetch("/api/candidate/onboarding-details")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data && data.onboarding_completed === false) {
          // FULL PAGE RELOAD — not router.replace.
          // This is the key to preventing the redirect loop.
          window.location.href = "/onboarding/details";
        } else {
          setChecked(true);
        }
      })
      .catch(() => {
        // If the check fails, let the page load (don't block the user)
        if (!cancelled) setChecked(true);
      });

    return () => { cancelled = true; };
  }, [pathname]);

  // While checking onboarding status on a non-onboarding page, show a loader.
  // This prevents the page content from flashing before the redirect fires.
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

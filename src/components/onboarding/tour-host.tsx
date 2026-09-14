"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Tour, TourStep } from "@/components/onboarding/tour";
import { CANDIDATE_DASHBOARD_TOUR } from "@/components/onboarding/tours/candidate-dashboard";
import { RECRUITER_DASHBOARD_TOUR } from "@/components/onboarding/tours/recruiter-dashboard";

/**
 * TourHost — mounts on dashboard pages to render the onboarding tour.
 *
 * Triggers:
 *   1. AUTO-START: if User.onboarding_tour_completed_at is null AND
 *      current path is a dashboard → fetch user, show tour.
 *   2. MANUAL: sidebar "Take a tour" button dispatches
 *      window event 'mzv:tour:start' → show tour regardless of flag.
 *   3. URL PARAM: ?tour=1 in URL → show tour (e.g., after redirect
 *      from sidebar button when user is on a non-dashboard page).
 *
 * NOTE: We read URL params via window.location.search (NOT useSearchParams)
 * to avoid the Next.js 14+ Suspense boundary requirement — which would
 * otherwise fail the build with "useSearchParams() should be wrapped in
 * a suspense boundary at page".
 *
 * On complete/skip:
 *   - POST /api/auth/tour-complete to set the flag
 *   - Hide the tour
 *   - Clear ?tour=1 from URL if present
 */
export function TourHost() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);

  const role = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;

  // Determine which tour steps to show
  const tourSteps: TourStep[] | null =
    role === "candidate" ? CANDIDATE_DASHBOARD_TOUR :
    role === "client_recruiter" || role === "client_admin" ? RECRUITER_DASHBOARD_TOUR :
    null;

  // Determine if current path is a dashboard
  const isDashboardPath =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/recruiter/dashboard") ||
    pathname?.startsWith("/employer/dashboard") ||
    pathname?.startsWith("/admin/dashboard") ||
    pathname?.startsWith("/superadmin/dashboard");

  // ─── Trigger 1: URL param ?tour=1 (read via window.location) ─────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") === "1" && tourSteps) {
      setShow(true);
      // Clean URL — remove ?tour=1 so a refresh doesn't re-trigger
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      window.history.replaceState({}, "", url.toString());
    }
  }, [tourSteps]);

  // ─── Trigger 2: Manual via window event (from sidebar button) ───────
  useEffect(() => {
    const onStart = () => {
      if (tourSteps) setShow(true);
    };
    window.addEventListener("mzv:tour:start", onStart);
    return () => window.removeEventListener("mzv:tour:start", onStart);
  }, [tourSteps]);

  // ─── Trigger 3: Auto-start on first dashboard load ───────────────────
  useEffect(() => {
    if (checked || !role || !tourSteps || !isDashboardPath) return;

    // Only auto-start for candidate + recruiter roles (skip superadmin/platform_admin)
    if (role !== "candidate" && role !== "client_recruiter" && role !== "client_admin") {
      setChecked(true);
      return;
    }

    // Use localStorage as a client-side cache to avoid a DB hit on every load.
    // The server-side User.onboarding_tour_completed_at flag is the source of
    // truth (set via POST /api/auth/tour-complete), but reading it on every
    // dashboard mount would be wasteful.
    try {
      const cached = localStorage.getItem("mzv:tour:completed");
      if (!cached) {
        setShow(true);
      }
    } catch {
      // localStorage may be unavailable (private mode / SSR) — skip auto-start
    }
    setChecked(true);
  }, [role, tourSteps, isDashboardPath, checked]);

  // ─── On tour complete/skip: persist + hide ───────────────────────────
  const handleComplete = () => {
    setShow(false);
    try {
      localStorage.setItem("mzv:tour:completed", new Date().toISOString());
    } catch {}
    fetch("/api/auth/tour-complete", { method: "POST" }).catch(() => {});
  };

  if (!show || !tourSteps) return null;

  return (
    <Tour
      steps={tourSteps}
      onComplete={handleComplete}
      onSkip={handleComplete}
    />
  );
}

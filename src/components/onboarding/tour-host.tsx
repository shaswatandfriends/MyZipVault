"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
 * On complete/skip:
 *   - POST /api/auth/tour-complete to set the flag
 *   - Hide the tour
 *   - Clear ?tour=1 from URL if present
 */
export function TourHost() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  // ─── Trigger 1: URL param ?tour=1 ───────────────────────────────────
  useEffect(() => {
    if (searchParams?.get("tour") === "1" && tourSteps) {
      setShow(true);
      // Clean URL — remove ?tour=1 so a refresh doesn't re-trigger
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, tourSteps]);

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

    // Fetch user to check onboarding_tour_completed_at
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(() => {
        // session endpoint already includes user; but for the tour flag we'd need
        // a dedicated endpoint. For now, use a localStorage cache as fallback.
        const cached = localStorage.getItem("mzv:tour:completed");
        if (!cached) {
          setShow(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [role, tourSteps, isDashboardPath, checked]);

  // ─── On tour complete/skip: persist + hide ───────────────────────────
  const handleComplete = () => {
    setShow(false);
    localStorage.setItem("mzv:tour:completed", new Date().toISOString());
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

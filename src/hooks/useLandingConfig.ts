"use client";

import { useState, useEffect } from "react";
import { DEFAULT_LANDING_PAGE_CONFIG, type LandingPageConfig } from "@/lib/landing-page-config";

/**
 * useLandingConfig — fetches the landing page config from DB via the
 * public /api/landing-content endpoint. Falls back to hardcoded defaults
 * on error or while loading.
 *
 * Used by landing page components (HeroSection, StatsBar, LandingFooter,
 * LandingHeader) so that superadmin editor changes reflect on the live page.
 */
export function useLandingConfig() {
  const [config, setConfig] = useState<LandingPageConfig>(DEFAULT_LANDING_PAGE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/landing-content")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data) {
          setConfig(data as LandingPageConfig);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading, error };
}

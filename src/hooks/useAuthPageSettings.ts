"use client";

import { useState, useEffect } from "react";
import type { AuthPageConfig } from "@/lib/auth-page-config";
import { DEFAULT_AUTH_PAGE_CONFIG } from "@/lib/auth-page-config";

// Module-level cache so all auth pages on the same load share one fetch
let cachedConfig: AuthPageConfig | null = null;
let fetchPromise: Promise<AuthPageConfig> | null = null;

async function fetchConfig(): Promise<AuthPageConfig> {
  if (cachedConfig) return cachedConfig;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/auth-pages")
    .then((res) => res.json())
    .then((data: AuthPageConfig) => {
      cachedConfig = data;
      return data;
    })
    .catch(() => {
      // Never break auth pages — return defaults on failure
      return DEFAULT_AUTH_PAGE_CONFIG;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function useAuthPageSettings() {
  const [config, setConfig] = useState<AuthPageConfig>(DEFAULT_AUTH_PAGE_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchConfig().then((data) => {
      setConfig(data);
      setLoaded(true);
    });
  }, []);

  return { config, loaded };
}

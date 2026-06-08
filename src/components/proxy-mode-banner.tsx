"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, LogOut } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ProxyModeInfo {
  userId: number;
  name: string;
  role: string;
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    candidate: "Candidate",
    client_recruiter: "Recruiter",
    client_admin: "Client Admin",
    platform_admin: "Platform Admin",
    super_admin: "Super Admin",
  };
  return labels[role] || role;
}

/**
 * Fixed banner displayed at the top of every page when a superadmin
 * is viewing the platform through a proxy session.
 *
 * Reads the non-httpOnly `proxy_mode` cookie to determine visibility.
 * Provides an "Exit Proxy Mode" button that calls the exit API,
 * restores the original superadmin session, and redirects back to
 * the superadmin users page.
 */
export function ProxyModeBanner() {
  const [proxyInfo, setProxyInfo] = useState<ProxyModeInfo | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    try {
      const match = document.cookie
        .split(";")
        .find((c) => c.trim().startsWith("proxy_mode="));
      if (match) {
        const raw = decodeURIComponent(
          match.split("=").slice(1).join("=")
        );
        const info = JSON.parse(raw) as ProxyModeInfo;
        setProxyInfo(info);
      }
    } catch {
      // Not in proxy mode or invalid cookie — stay hidden
    }
  }, []);

  const handleExit = useCallback(async () => {
    try {
      setIsExiting(true);
      const res = await fetch("/api/superadmin/proxy-login/exit", {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to exit proxy mode");
      }

      setProxyInfo(null);

      // Hard-navigate back to the superadmin users page.
      // A full page reload is required because the session cookie
      // has changed — NextAuth client state must be re-hydrated.
      window.location.href = "/superadmin/users";
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to exit proxy mode";
      toast.error("Exit failed", { description: message });
      // Force a hard reload as a fallback
      window.location.href = "/superadmin/users";
    } finally {
      setIsExiting(false);
    }
  }, []);

  if (!proxyInfo) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Shield className="size-4 shrink-0" />
        <span className="truncate">
          Proxy Mode: Viewing as{" "}
          <strong>{proxyInfo.name || `User #${proxyInfo.userId}`}</strong>{" "}
          ({getRoleLabel(proxyInfo.role)})
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExit}
        disabled={isExiting}
        className="bg-amber-600 hover:bg-amber-700 text-white border-amber-700 hover:text-white h-7 text-xs shrink-0 ml-4"
      >
        <LogOut className="size-3 mr-1" />
        {isExiting ? "Exiting…" : "Exit Proxy Mode"}
      </Button>
    </div>
  );
}

"use client";

import { CheckCircle2 } from "@/lib/icons";
import type { ReactNode } from "react";

interface DashboardHeroProps {
  greeting?: string;
  name: string;
  subtitle: string;
  pct?: number;
  steps?: { label: string; done: boolean }[];
  rightContent?: ReactNode;
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardHero({ greeting, name, subtitle, pct, steps, rightContent }: DashboardHeroProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div
        className="flex-1 rounded-[24px] p-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(23,74,67,0.95) 0%, rgba(15,54,49,0.95) 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 16px 48px rgba(23,74,67,0.22)",
          minHeight: "200px",
        }}
      >
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 320, height: 320, top: -120, right: -80,
            background: "radial-gradient(circle, rgba(143,169,156,0.25) 0%, rgba(143,169,156,0) 70%)",
            filter: "blur(40px)",
          }}
        />
        <div className="absolute right-0 bottom-0 top-0 w-[40%] hidden lg:flex items-center justify-end pointer-events-none">
          <img src="/logo.png" alt="" className="h-[200px] w-auto opacity-[0.15]" style={{ marginRight: 32 }} />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#D98F78" }}>Dashboard</p>
          <h1 className="text-2xl font-bold text-white mt-1 font-heading">{greeting || getTimeGreeting()}, {name}</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(247,243,232,0.85)" }}>{subtitle}</p>
          {pct !== undefined && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold" style={{ color: "rgba(247,243,232,0.80)" }}>Profile Completion</span>
                <span className="text-sm font-bold text-white">{pct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #8FA99C, #F7F3E8)" }} />
              </div>
              {steps && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      {step.done ? <CheckCircle2 className="size-5" style={{ color: "#8FA99C" }} /> : <div className="size-5 rounded-full border-2 border-white/60 flex items-center justify-center"><div className="size-1.5 rounded-full bg-white/40" /></div>}
                      <span className="text-xs" style={{ color: "rgba(247,243,232,0.80)" }}>{step.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {rightContent && <div className="lg:w-[340px] shrink-0">{rightContent}</div>}
    </div>
  );
}

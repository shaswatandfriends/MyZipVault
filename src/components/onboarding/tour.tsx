"use client";

import { useState, useEffect, useCallback } from "react";

export interface TourStep {
  target: string; // CSS selector for element to highlight
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface TourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Custom in-house onboarding tour component.
 * Pure React + Tailwind — no external library.
 *
 * Features:
 *   - Overlay with highlighted target element (CSS outline)
 *   - Tooltip card with title, description, Next/Prev/Skip buttons
 *   - Progress dots (1 of N)
 *   - Auto-scroll target into view
 *   - ESC key to skip
 *
 * Usage:
 *   {showTour && <Tour steps={TOUR_STEPS} onComplete={handleComplete} onSkip={handleSkip} />}
 *
 * Phase 6.1 of EXECUTION-PLAN.
 */
export function Tour({ steps, onComplete, onSkip }: TourProps) {
  const [current, setCurrent] = useState(0);
  const step = steps[current];
  const isLast = current === steps.length - 1;

  const next = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setCurrent((c) => c + 1);
    }
  }, [isLast, onComplete]);

  const prev = useCallback(() => {
    setCurrent((c) => Math.max(0, c - 1));
  }, []);

  const skip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  // ESC to skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, skip]);

  // Scroll target into view when step changes
  useEffect(() => {
    if (step?.target) {
      const el = document.querySelector(step.target);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [current, step?.target]);

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop with hole for target */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={skip}
        aria-label="Skip tour"
      />

      {/* Highlight target with outline */}
      <style>{`
        ${step.target} {
          outline: 3px solid #2563eb !important;
          outline-offset: 4px !important;
          position: relative !important;
          z-index: 101 !important;
        }
      `}</style>

      {/* Tooltip card — bottom-right by default */}
      <div className="absolute bottom-6 right-6 z-[102] w-full max-w-md rounded-lg bg-white p-5 shadow-2xl ring-1 ring-black/10 dark:bg-zinc-900 dark:ring-white/10">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Tour · Step {current + 1} of {steps.length}
          </span>
          <button
            onClick={skip}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Skip tour"
          >
            Skip ✕
          </button>
        </div>
        <h3 className="mb-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {step.title}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="mb-4 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-6 bg-blue-600" : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={prev}
            disabled={current === 0}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={next}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

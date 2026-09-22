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
 * Highlights the target element and positions the tooltip near it.
 */
export function Tour({ steps, onComplete, onSkip }: TourProps) {
  const [current, setCurrent] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
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

  // Find target element and get its position
  useEffect(() => {
    if (!step?.target) return;

    const findTarget = () => {
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    };

    // Delay to allow scroll to settle
    const timer = setTimeout(findTarget, 100);
    return () => clearTimeout(timer);
  }, [current, step?.target]);

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

  // Recalculate position on scroll/resize
  useEffect(() => {
    const updatePos = () => {
      if (!step?.target) return;
      const el = document.querySelector(step.target);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };
    window.addEventListener("scroll", updatePos, { passive: true });
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos);
      window.removeEventListener("resize", updatePos);
    };
  }, [current, step?.target]);

  if (!step) return null;

  // Calculate tooltip position based on target
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      // No target found — center of screen
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10002,
      };
    }

    const tooltipWidth = 360;
    const tooltipHeight = 200;
    const margin = 16;

    let top = targetRect.bottom + margin;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

    // If tooltip would go off bottom, place above
    if (top + tooltipHeight > window.innerHeight) {
      top = targetRect.top - tooltipHeight - margin;
    }

    // If tooltip would go off top, place below
    if (top < 0) {
      top = targetRect.bottom + margin;
    }

    // Clamp horizontally
    if (left < margin) left = margin;
    if (left + tooltipWidth > window.innerWidth - margin) {
      left = window.innerWidth - tooltipWidth - margin;
    }

    return {
      position: "fixed",
      top: Math.max(margin, top),
      left,
      width: tooltipWidth,
      zIndex: 10002,
    };
  };

  return (
    <div className="fixed inset-0" style={{ zIndex: 10001 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={skip}
        aria-label="Skip tour"
      />

      {/* Highlight target with outline */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
            border: "2px solid #8FA99C",
            zIndex: 10001,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Also add CSS outline as backup */}
      <style>{`
        ${step.target} {
          outline: 2px solid #8FA99C !important;
          outline-offset: 2px !important;
          position: relative !important;
          z-index: 10001 !important;
        }
      `}</style>

      {/* Tooltip card — positioned near the target */}
      <div
        style={getTooltipStyle()}
        className="rounded-lg bg-white p-5 shadow-2xl ring-1 ring-black/10"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: "#0D3B2E" }}>
            Tour · Step {current + 1} of {steps.length}
          </span>
          <button
            onClick={skip}
            className="text-xs text-gray-500 hover:text-gray-900"
            aria-label="Skip tour"
          >
            Skip ✕
          </button>
        </div>
        <h3 className="mb-1.5 text-base font-semibold text-gray-900" style={{ fontFamily: "'Lora', Georgia, serif" }}>
          {step.title}
        </h3>
        <p className="mb-4 text-sm text-gray-600 leading-relaxed">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="mb-4 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-6 bg-[#0D3B2E]" : "w-1.5 bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={prev}
            disabled={current === 0}
            className="rounded-md px-3 py-1.5 text-sm text-gray-500 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={next}
            className="rounded-md bg-[#0D3B2E] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#082820]"
          >
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

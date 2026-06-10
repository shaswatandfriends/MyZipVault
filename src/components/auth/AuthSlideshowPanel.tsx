"use client";

import { useState, useEffect, useCallback } from "react";
import { Check } from "@/lib/icons";

// Fallback gradient when images fail to load
const FALLBACK_GRADIENT = "linear-gradient(135deg, #166534, #0D9488)";

// ─── Types ────────────────────────────────────────────────────────────
interface StatItem {
  value: string;
  label: string;
}

interface AuthSlideshowPanelProps {
  tagline: string;
  trustPoints: string[];
  quoteCard?: {
    text: string;
    attribution: string;
  };
  statsCard?: StatItem[];
  // Dynamic branding & images (from DB)
  platformName?: string;
  logoText?: string;
  logoUrl?: string;
  slideshowImages?: string[];
}

// ─── Component ───────────────────────────────────────────────────────
export default function AuthSlideshowPanel({
  tagline,
  trustPoints,
  quoteCard,
  statsCard,
  platformName = "MyZipVault",
  logoText = "ZV",
  logoUrl = "",
  slideshowImages = [],
}: AuthSlideshowPanelProps) {
  const images =
    slideshowImages.length > 0
      ? slideshowImages
      : [
          "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80",
          "https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=800&q=80",
          "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
          "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&q=80",
          "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&q=80",
        ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  // Preload all slideshow images immediately
  useEffect(() => {
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);

  // Auto-rotate slideshow every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  // Handle image load failure — fall back to gradient
  const handleImageError = useCallback((index: number) => {
    setFailedImages((prev) => new Set(prev).add(index));
  }, []);

  return (
    <div
      className="hidden lg:flex lg:w-1/2 min-h-screen relative overflow-hidden"
      style={{ background: FALLBACK_GRADIENT }}
    >
      {/* ── Slideshow Images ── */}
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${i}-${src}`}
          src={failedImages.has(i) ? "" : src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{
            opacity: i === currentSlide && !failedImages.has(i) ? 1 : 0,
            transition: "opacity 1.2s ease-in-out",
          }}
          loading="eager"
          fetchPriority={i === 0 ? "high" : "auto"}
          onError={() => handleImageError(i)}
        />
      ))}

      {/* ── Gradient Overlay ── */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(135deg, rgba(10, 60, 30, 0.82) 0%, rgba(13, 148, 136, 0.75) 100%)",
        }}
      />

      {/* ── Content (z-index 2) ── */}
      <div className="relative z-[2] flex flex-col items-center justify-center p-12 text-center w-full">
        <div className="max-w-sm">
          {/* Logo mark — glass effect */}
          <div
            className="inline-flex items-center justify-center mb-5"
            style={{
              width: 64,
              height: 64,
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 16,
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={platformName}
                className="w-10 h-10 object-contain"
              />
            ) : (
              <span
                style={{ fontFamily: "'Clash Display', sans-serif" }}
                className="text-white text-[28px] font-bold"
              >
                {logoText}
              </span>
            )}
          </div>

          {/* Brand name */}
          <h2
            style={{ fontFamily: "'Clash Display', sans-serif" }}
            className="text-[32px] font-bold text-white mb-2"
          >
            {platformName}
          </h2>

          {/* Tagline */}
          <p
            className="text-white/75 text-base mb-12"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {tagline}
          </p>

          {/* Trust points */}
          <div className="space-y-3.5">
            {trustPoints.map((point) => (
              <div
                key={point}
                className="flex items-center justify-center gap-2.5"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 20,
                    height: 20,
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 999,
                  }}
                >
                  <Check className="size-3 text-white" />
                </div>
                <span className="text-white text-sm font-medium">{point}</span>
              </div>
            ))}
          </div>

          {/* ── Quote Card ── */}
          {quoteCard && (
            <div
              className="mt-12 text-left"
              style={{
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: "20px 24px",
              }}
            >
              <div className="text-[#FCD34D] text-sm mb-2 tracking-wider">
                ★★★★★
              </div>
              <p
                className="text-white/90 text-sm italic leading-relaxed mb-3"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                &ldquo;{quoteCard.text}&rdquo;
              </p>
              <p
                className="text-white/70 text-[13px] font-semibold"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                — {quoteCard.attribution}
              </p>
            </div>
          )}

          {/* ── Stats Card ── */}
          {statsCard && (
            <div
              className="mt-12"
              style={{
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: "20px 24px",
              }}
            >
              <div className="flex items-center">
                {statsCard.map((stat, i) => (
                  <div key={i} className="flex-1 text-center relative">
                    <p
                      className="text-white text-2xl font-bold"
                      style={{ fontFamily: "'Clash Display', sans-serif" }}
                    >
                      {stat.value}
                    </p>
                    <p
                      className="text-white/65 text-xs mt-1"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {stat.label}
                    </p>
                    {i < statsCard.length - 1 && (
                      <div
                        className="absolute top-1 bottom-1"
                        style={{
                          right: 0,
                          width: 1,
                          background: "rgba(255,255,255,0.15)",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Indicator Dots ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-[2]">
        {images.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === currentSlide ? 24 : 6,
              height: 6,
              background:
                i === currentSlide
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.4)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

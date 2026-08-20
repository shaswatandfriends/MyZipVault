"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, ShieldCheck, Lock, BadgeCheck } from "@/lib/icons";

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
// Spatial UI Slideshow Panel — Dark material with depth-4 shadows,
// terracotta accent line, vibrant forest-green + terracotta orbs.
// Auth pages use this as their left half.
export default function AuthSlideshowPanel({
  tagline,
  trustPoints,
  quoteCard,
  statsCard,
  platformName = "MyZipVault",
  logoText = "M",
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

  useEffect(() => {
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [images.length]);

  const handleImageError = useCallback((index: number) => {
    setFailedImages((prev) => new Set(prev).add(index));
  }, []);

  return (
    <div
      className="hidden lg:flex lg:w-1/2 min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #004182 0%, #0A66C2 50%, #004182 100%)" }}
    >
      {/* Slideshow Images — full-bleed, with subtle crossfade */}
      {images.map((src, i) =>
        i === currentSlide && !failedImages.has(i) ? (
          <img
            key={`slide-${i}`}
            src={src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000"
            style={{
              opacity: i === currentSlide ? 1 : 0,
              filter: "grayscale(15%) contrast(1.05) saturate(0.9)",
            }}
            loading="eager"
            fetchPriority={i === 0 ? "high" : "auto"}
            onError={() => handleImageError(i)}
          />
        ) : null
      )}

      {/* Forest-green gradient overlay — keeps text readable while preserving image */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(30,58,38,0.92) 0%, rgba(45,90,61,0.78) 50%, rgba(20,40,28,0.88) 100%)",
        }}
      />

      {/* Spatial orbs — vibrant bleed */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 380,
          height: 380,
          top: -100,
          right: -80,
          background: "radial-gradient(circle, rgba(74,124,89,0.5) 0%, rgba(74,124,89,0) 70%)",
          filter: "blur(60px)",
          opacity: 0.7,
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 320,
          height: 320,
          bottom: -100,
          left: -60,
          background: "radial-gradient(circle, rgba(201,123,84,0.45) 0%, rgba(201,123,84,0) 70%)",
          filter: "blur(60px)",
          opacity: 0.6,
        }}
      />

      {/* Content — z-10 with relative positioning */}
      <div className="relative z-10 flex flex-col justify-between p-12 lg:p-16 w-full">
        {/* Top: Logo + brand */}
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={platformName}
              className="w-10 h-10 object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          ) : (
            <div
              className="flex items-center justify-center size-10 rounded-[10px] text-white text-xl font-bold"
              style={{
                background: "linear-gradient(180deg, #70B5F9 0%, #0A66C2 60%, #004182 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(201,123,84,0.32)",
                fontFamily: "'Lora', serif",
              }}
            >
              {logoText}
            </div>
          )}
          <span
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "'Lora', serif", letterSpacing: "-0.02em" }}
          >
            {platformName}
          </span>
        </div>

        {/* Middle: Tagline + trust points */}
        <div className="max-w-md">
          {/* Eyebrow — spatial pill */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="h-0.5 w-8 rounded-full"
              style={{ background: "linear-gradient(90deg, #E8A882, transparent)" }}
            />
            <span
              className="text-xs font-bold uppercase"
              style={{ color: "#E8A882", letterSpacing: "0.2em" }}
            >
              Welcome
            </span>
          </div>

          {/* Tagline — large serif */}
          <h2
            className="text-white mb-8"
            style={{
              fontFamily: "'Lora', serif",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {tagline}
          </h2>

          {/* Trust points — with terra checkmark pills */}
          <div className="flex flex-col gap-4">
            {trustPoints.map((point) => (
              <div key={point} className="flex items-center gap-3.5">
                <div
                  className="flex items-center justify-center size-5 shrink-0 rounded-full"
                  style={{
                    background: "rgba(232,168,130,0.18)",
                    border: "0.5px solid rgba(232,168,130,0.4)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}
                >
                  <Check className="size-3" style={{ color: "#E8A882" }} />
                </div>
                <span
                  className="text-white/85"
                  style={{ fontSize: "0.9375rem", lineHeight: 1.5 }}
                >
                  {point}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Quote + Stats + security badges */}
        <div className="space-y-6">
          {/* Quote card — terra accent bar */}
          {quoteCard && (
            <div
              className="relative pl-6 py-1.5"
              style={{
                borderLeft: "2px solid #0A66C2",
              }}
            >
              <div
                className="mb-3"
                style={{ color: "#E8A882", fontSize: "0.75rem", letterSpacing: "0.2em" }}
              >
                ★★★★★
              </div>
              <p
                className="text-white mb-3"
                style={{
                  fontFamily: "'Lora', serif",
                  fontStyle: "italic",
                  fontSize: "1.0625rem",
                  lineHeight: 1.6,
                }}
              >
                &ldquo;{quoteCard.text}&rdquo;
              </p>
              <p
                className="text-white/60"
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                — {quoteCard.attribution}
              </p>
            </div>
          )}

          {/* Stats card — divider-based */}
          {statsCard && (
            <div
              className="flex pt-6"
              style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
            >
              {statsCard.map((stat, i) => (
                <div
                  key={i}
                  className="flex-1 text-left"
                  style={{
                    borderRight:
                      i < statsCard.length - 1 ? "1px solid rgba(255,255,255,0.15)" : "none",
                    paddingRight: "1rem",
                    paddingLeft: i === 0 ? "0" : "1rem",
                  }}
                >
                  <p
                    className="mb-1.5"
                    style={{
                      fontFamily: "'Lora', serif",
                      fontSize: "1.875rem",
                      fontWeight: 700,
                      color: "#E8A882",
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-white/60"
                    style={{
                      fontSize: "0.6875rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Security badges */}
          <div
            className="flex items-center gap-6 pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
          >
            {[
              { icon: ShieldCheck, label: "HIPAA Aligned" },
              { icon: Lock, label: "256-bit Encryption" },
              { icon: BadgeCheck, label: "SOC 2 Type II" },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Icon className="size-3.5" style={{ color: "#E8A882" }} />
                <span
                  className="text-white/70"
                  style={{ fontSize: "0.6875rem", letterSpacing: "0.05em" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Slide indicators — spatial pill dots at bottom */}
        <div
          className="absolute flex gap-1.5"
          style={{ bottom: "1.5rem", right: "1.5rem" }}
        >
          {images.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                width: i === currentSlide ? "24px" : "6px",
                height: "2px",
                background:
                  i === currentSlide
                    ? "#E8A882"
                    : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

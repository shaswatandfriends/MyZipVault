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

  // Preload all slideshow images immediately
  useEffect(() => {
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);

  // Auto-rotate slideshow every 6 seconds (slower for editorial feel)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [images.length]);

  // Handle image load failure — fall back to solid navy
  const handleImageError = useCallback((index: number) => {
    setFailedImages((prev) => new Set(prev).add(index));
  }, []);

  return (
    <div
      className="hidden lg:flex lg:w-1/2 min-h-screen relative overflow-hidden"
      style={{ background: "var(--editorial-navy)" }}
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
              filter: "grayscale(20%) contrast(1.05)",
            }}
            loading="eager"
            fetchPriority={i === 0 ? "high" : "auto"}
            onError={() => handleImageError(i)}
          />
        ) : null
      )}

      {/* Navy gradient overlay — keeps text readable while preserving image */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(11, 31, 58, 0.92) 0%, rgba(11, 31, 58, 0.78) 50%, rgba(6, 18, 36, 0.85) 100%)",
        }}
      />

      {/* Subtle paper-grain texture overlay (very low opacity) */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(245, 240, 230, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(201, 169, 97, 0.3) 0%, transparent 50%)
          `,
        }}
      />

      {/* Content */}
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
              style={{
                width: 40,
                height: 40,
                background: "var(--editorial-gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--editorial-navy)",
                fontFamily: "var(--editorial-font-serif)",
                fontWeight: 700,
                fontSize: "1.5rem",
                borderRadius: "2px",
              }}
            >
              {logoText}
            </div>
          )}
          <span
            style={{
              fontFamily: "var(--editorial-font-serif)",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--editorial-cream)",
              letterSpacing: "-0.02em",
            }}
          >
            {platformName}
          </span>
        </div>

        {/* Middle: Tagline + trust points */}
        <div className="max-w-md">
          {/* Eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ width: "32px", height: "2px", background: "var(--editorial-gold)" }} />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--editorial-gold)",
              }}
            >
              Welcome
            </span>
          </div>

          {/* Tagline — large serif */}
          <h2
            style={{
              fontFamily: "var(--editorial-font-serif)",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--editorial-cream)",
              marginBottom: "2rem",
            }}
          >
            {tagline}
          </h2>

          {/* Trust points — minimal, with gold checkmarks */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {trustPoints.map((point, idx) => (
              <div
                key={point}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Check
                    className="size-4"
                    style={{ color: "var(--editorial-gold)" }}
                  />
                </div>
                <span
                  style={{
                    color: "var(--editorial-cream)",
                    fontSize: "0.9375rem",
                    lineHeight: 1.5,
                    opacity: 0.9,
                  }}
                >
                  {point}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Quote + Stats + security badges */}
        <div className="space-y-6">
          {/* Quote card — editorial style, no glass */}
          {quoteCard && (
            <div
              style={{
                borderLeft: "2px solid var(--editorial-gold)",
                paddingLeft: "1.5rem",
                paddingTop: "0.5rem",
                paddingBottom: "0.5rem",
              }}
            >
              <div
                style={{
                  color: "var(--editorial-gold)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.2em",
                  marginBottom: "0.75rem",
                }}
              >
                ★★★★★
              </div>
              <p
                style={{
                  fontFamily: "var(--editorial-font-serif)",
                  fontStyle: "italic",
                  fontSize: "1.0625rem",
                  lineHeight: 1.6,
                  color: "var(--editorial-cream)",
                  marginBottom: "0.75rem",
                }}
              >
                &ldquo;{quoteCard.text}&rdquo;
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--editorial-cream)",
                  opacity: 0.6,
                }}
              >
                — {quoteCard.attribution}
              </p>
            </div>
          )}

          {/* Stats card — editorial, divider-based */}
          {statsCard && (
            <div
              style={{
                display: "flex",
                borderTop: "1px solid rgba(245, 240, 230, 0.15)",
                paddingTop: "1.5rem",
              }}
            >
              {statsCard.map((stat, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    textAlign: "left",
                    borderRight:
                      i < statsCard.length - 1
                        ? "1px solid rgba(245, 240, 230, 0.15)"
                        : "none",
                    paddingRight: "1rem",
                    paddingLeft: i === 0 ? "0" : "1rem",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--editorial-font-serif)",
                      fontSize: "1.875rem",
                      fontWeight: 700,
                      color: "var(--editorial-gold)",
                      lineHeight: 1,
                      marginBottom: "0.375rem",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {stat.value}
                  </p>
                  <p
                    style={{
                      fontSize: "0.6875rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--editorial-cream)",
                      opacity: 0.6,
                    }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Security badges — minimal row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid rgba(245, 240, 230, 0.1)",
            }}
          >
            {[
              { icon: ShieldCheck, label: "HIPAA Aligned" },
              { icon: Lock, label: "256-bit Encryption" },
              { icon: BadgeCheck, label: "SOC 2 Type II" },
            ].map(({ icon: Icon, label }, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <Icon
                  className="size-3.5"
                  style={{ color: "var(--editorial-gold)" }}
                />
                <span
                  style={{
                    fontSize: "0.6875rem",
                    letterSpacing: "0.05em",
                    color: "var(--editorial-cream)",
                    opacity: 0.7,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Slide indicators — minimal dots at bottom */}
        <div
          style={{
            position: "absolute",
            bottom: "1.5rem",
            right: "1.5rem",
            display: "flex",
            gap: "0.5rem",
          }}
        >
          {images.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentSlide ? "24px" : "6px",
                height: "2px",
                background:
                  i === currentSlide
                    ? "var(--editorial-gold)"
                    : "rgba(245, 240, 230, 0.3)",
                transition: "width 400ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

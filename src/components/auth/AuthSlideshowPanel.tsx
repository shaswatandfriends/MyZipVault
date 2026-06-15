"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShieldCheck, Zap, Clock } from "@/lib/icons";

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

const FALLBACK_GRADIENT = "linear-gradient(135deg, var(--primary) 0%, var(--accent-teal) 50%, var(--accent-cyan) 100%)";

// ─── Animated Mesh Background ───────────────────────────────────────
function MeshBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{ background: FALLBACK_GRADIENT }}
      />
      {/* Animated orbs */}
      <motion.div
        className="absolute top-[10%] left-[10%] size-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)" }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -25, 15, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[15%] right-[5%] size-[400px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)" }}
        animate={{
          x: [0, -25, 20, 0],
          y: [0, 20, -30, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[50%] left-[40%] size-[300px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(52,211,153,0.2) 0%, transparent 70%)" }}
        animate={{
          x: [0, 40, -15, 0],
          y: [0, -20, 25, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
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
    <div className="hidden lg:flex lg:w-1/2 min-h-screen relative overflow-hidden">
      {/* Animated mesh background */}
      <MeshBackground />

      {/* Slideshow Images */}
      <AnimatePresence mode="wait">
        {images.map((src, i) =>
          i === currentSlide && !failedImages.has(i) ? (
            <motion.img
              key={`slide-${i}`}
              src={failedImages.has(i) ? "" : src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center z-[1]"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              loading="eager"
              fetchPriority={i === 0 ? "high" : "auto"}
              onError={() => handleImageError(i)}
            />
          ) : null
        )}
      </AnimatePresence>

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background:
            "linear-gradient(135deg, rgba(5, 150, 105, 0.88) 0%, rgba(13, 148, 136, 0.82) 50%, rgba(6, 182, 212, 0.78) 100%)",
        }}
      />

      {/* Content (z-index 3) */}
      <motion.div
        className="relative z-[3] flex flex-col items-center justify-center p-12 text-center w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="max-w-sm">
          {/* Logo mark — glass effect */}
          <motion.div
            className="inline-flex items-center justify-center mb-6"
            style={{
              width: 72,
              height: 72,
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 20,
              boxShadow: "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={platformName}
                className="w-10 h-10 object-contain"
              />
            ) : (
              <span className="text-white text-[28px] font-bold font-heading tracking-tight">
                {logoText}
              </span>
            )}
          </motion.div>

          {/* Brand name */}
          <motion.h2
            className="text-[34px] font-bold text-white mb-2 font-heading tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {platformName}
          </motion.h2>

          {/* Tagline */}
          <motion.p
            className="text-white/80 text-base mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {tagline}
          </motion.p>

          {/* Trust points */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {trustPoints.map((point, idx) => (
              <motion.div
                key={point}
                className="flex items-center justify-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.6 + idx * 0.1 }}
              >
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 24,
                    height: 24,
                    background: "rgba(255,255,255,0.2)",
                    borderRadius: 999,
                    boxShadow: "0 0 12px rgba(255,255,255,0.1)",
                  }}
                >
                  <Check className="size-3.5 text-white" />
                </div>
                <span className="text-white text-sm font-medium">{point}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Quote Card — Glass */}
          {quoteCard && (
            <motion.div
              className="mt-12 text-left"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 16,
                padding: "24px 28px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="text-[var(--gold-light)] text-sm mb-2 tracking-wider">
                ★★★★★
              </div>
              <p className="text-white/90 text-sm italic leading-relaxed mb-3">
                &ldquo;{quoteCard.text}&rdquo;
              </p>
              <p className="text-white/70 text-[13px] font-semibold">
                — {quoteCard.attribution}
              </p>
            </motion.div>
          )}

          {/* Stats Card — Glass */}
          {statsCard && (
            <motion.div
              className="mt-12"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 16,
                padding: "24px 28px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <div className="flex items-center">
                {statsCard.map((stat, i) => (
                  <div key={i} className="flex-1 text-center relative">
                    <p className="text-white text-2xl font-bold font-heading tracking-tight">
                      {stat.value}
                    </p>
                    <p className="text-white/65 text-xs mt-1">
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
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Indicator Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-[3]">
        {images.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              width: i === currentSlide ? 24 : 6,
              height: 6,
              background:
                i === currentSlide
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.4)",
            }}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        ))}
      </div>

      {/* Bottom security badges */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6 z-[3] opacity-50">
        <div className="flex items-center gap-1.5 text-white/70 text-[10px]">
          <ShieldCheck className="size-3" /> HIPAA
        </div>
        <div className="flex items-center gap-1.5 text-white/70 text-[10px]">
          <Zap className="size-3" /> SOC 2
        </div>
        <div className="flex items-center gap-1.5 text-white/70 text-[10px]">
          <Clock className="size-3" /> 256-bit
        </div>
      </div>
    </div>
  );
}

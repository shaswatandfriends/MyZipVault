"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "@/lib/icons";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface BannerData {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  isPinned: boolean;
  carouselDuration: number;
  expiresAt: string | null;
}

interface BannerCarouselProps {
  /** The role of the current user — used to fetch role-targeted banners */
  className?: string;
}

export function BannerCarousel({ className }: BannerCarouselProps) {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  // Load dismissed banner IDs from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("dismissedBanners");
      if (stored) {
        setDismissedIds(new Set(JSON.parse(stored)));
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch banners
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch("/api/banners");
        if (res.ok) {
          const data = await res.json();
          setBanners(data.banners || []);
        }
      } catch {
        // silently fail
      }
    };
    fetchBanners();
  }, []);

  // Filter out dismissed banners
  const visibleBanners = banners.filter((b) => !dismissedIds.has(b.id));

  // Auto-advance carousel
  const currentBanner = visibleBanners[currentIndex];

  const goToNext = useCallback(() => {
    if (visibleBanners.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
      setIsTransitioning(false);
    }, 300);
  }, [visibleBanners.length]);

  const goToPrev = useCallback(() => {
    if (visibleBanners.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + visibleBanners.length) % visibleBanners.length);
      setIsTransitioning(false);
    }, 300);
  }, [visibleBanners.length]);

  // Auto-advance timer
  useEffect(() => {
    if (isPaused || visibleBanners.length <= 1) return;

    const duration = currentBanner?.carouselDuration || 5;
    const timer = setInterval(goToNext, duration * 1000);

    return () => clearInterval(timer);
  }, [isPaused, visibleBanners.length, currentBanner?.carouselDuration, goToNext]);

  // Reset index when banners change
  useEffect(() => {
    if (currentIndex >= visibleBanners.length) {
      setCurrentIndex(0);
    }
  }, [visibleBanners.length, currentIndex]);

  const dismissBanner = (id: number) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    try {
      sessionStorage.setItem("dismissedBanners", JSON.stringify([...newDismissed]));
    } catch {
      // ignore
    }
  };

  // Don't render if no visible banners
  if (visibleBanners.length === 0) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm",
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Banner Content */}
      <div
        className={cn(
          "transition-opacity duration-300",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Image Section */}
          {currentBanner?.imageUrl && (
            <div className="relative w-full sm:w-2/5 h-40 sm:h-auto sm:min-h-[160px] overflow-hidden">
              <Image
                src={currentBanner.imageUrl}
                alt={currentBanner.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 40vw"
              />
            </div>
          )}

          {/* Text Section */}
          <div
            className={cn(
              "flex flex-1 flex-col justify-center p-4 sm:p-6",
              currentBanner?.imageUrl ? "sm:w-3/5" : "w-full"
            )}
          >
            {/* Pinned badge */}
            {currentBanner?.isPinned && (
              <span className="mb-2 inline-flex w-fit items-center rounded-full bg-[#166534]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#166534]">
                Pinned
              </span>
            )}

            <h3
              className="text-base font-semibold text-[#111827] sm:text-lg"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              {currentBanner?.title}
            </h3>

            {currentBanner?.description && (
              <p className="mt-1 text-sm text-[#6B7280] line-clamp-2">
                {currentBanner.description}
              </p>
            )}

            {/* CTA Button */}
            {currentBanner?.ctaText && currentBanner?.ctaLink && (
              <a
                href={currentBanner.ctaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#166534] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14532D]"
              >
                {currentBanner.ctaText}
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      {visibleBanners.length > 1 && (
        <>
          {/* Prev/Next Arrows */}
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-white/80 text-[#6B7280] shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-[#111827]"
            aria-label="Previous banner"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-white/80 text-[#6B7280] shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-[#111827]"
            aria-label="Next banner"
          >
            <ChevronRight className="size-4" />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {visibleBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsTransitioning(true);
                  setTimeout(() => {
                    setCurrentIndex(idx);
                    setIsTransitioning(false);
                  }, 150);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  idx === currentIndex
                    ? "w-4 bg-[#166534]"
                    : "w-1.5 bg-[#9CA3AF] hover:bg-[#6B7280]"
                )}
                aria-label={`Go to banner ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Dismiss Button (only for non-pinned) */}
      {currentBanner && !currentBanner.isPinned && (
        <button
          onClick={() => dismissBanner(currentBanner.id)}
          className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-white/80 text-[#9CA3AF] backdrop-blur-sm transition-colors hover:bg-white hover:text-[#6B7280]"
          aria-label="Dismiss banner"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

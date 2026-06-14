"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "@/lib/icons";
import { cn } from "@/lib/utils";

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
  /** Optional className for the container */
  className?: string;
}

export function BannerCarousel({ className }: BannerCarouselProps) {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

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

  // Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
    setIsPaused(false);
  };

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

  const handleImageError = (bannerId: number) => {
    setImageErrors((prev) => new Set(prev).add(bannerId));
  };

  // Don't render if no visible banners
  if (visibleBanners.length === 0) return null;

  const hasValidImage = currentBanner?.imageUrl && !imageErrors.has(currentBanner.id);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm",
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Banner Content */}
      <div
        className={cn(
          "transition-opacity duration-300",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}
      >
        {hasValidImage ? (
          /* Layout WITH image: side-by-side on desktop, stacked on mobile */
          <div className="flex flex-col sm:flex-row">
            {/* Image Section */}
            <div className="relative w-full sm:w-2/5 h-44 sm:h-auto sm:min-h-[180px] overflow-hidden bg-[#F3F4F6]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentBanner.imageUrl!}
                alt={currentBanner.title}
                className="h-full w-full object-cover"
                onError={() => handleImageError(currentBanner.id)}
              />
            </div>

            {/* Text Section */}
            <div className="flex flex-1 flex-col justify-center p-5 sm:p-6 sm:w-3/5">
              {/* Pinned badge */}
              {currentBanner?.isPinned && (
                <span className="mb-2 inline-flex w-fit items-center rounded-full bg-[#166534]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#166534]">
                  Pinned
                </span>
              )}

              <h3
                className="text-base font-semibold text-[#111827] sm:text-lg line-clamp-2"
                style={{ fontFamily: "'Clash Display', sans-serif" }}
              >
                {currentBanner?.title}
              </h3>

              {currentBanner?.description && (
                <p className="mt-1.5 text-sm text-[#6B7280] line-clamp-2">
                  {currentBanner.description}
                </p>
              )}

              {/* CTA Button */}
              {currentBanner?.ctaText && currentBanner?.ctaLink && (
                <a
                  href={currentBanner.ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#166534] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14532D]"
                >
                  {currentBanner.ctaText}
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </div>
        ) : (
          /* Layout WITHOUT image: text-only banner with accent bar */
          <div className="flex">
            {/* Accent bar */}
            <div className="w-1.5 shrink-0 bg-[#166534] rounded-l-xl" />

            <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
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
                <p className="mt-1.5 text-sm text-[#6B7280] line-clamp-2">
                  {currentBanner.description}
                </p>
              )}

              {/* CTA Button */}
              {currentBanner?.ctaText && currentBanner?.ctaLink && (
                <a
                  href={currentBanner.ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#166534] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#14532D]"
                >
                  {currentBanner.ctaText}
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      {visibleBanners.length > 1 && (
        <>
          {/* Prev/Next Arrows */}
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-white/90 text-[#6B7280] shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-[#111827] border border-[#E5E7EB]"
            aria-label="Previous banner"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-white/90 text-[#6B7280] shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-[#111827] border border-[#E5E7EB]"
            aria-label="Next banner"
          >
            <ChevronRight className="size-4" />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
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
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-[#9CA3AF] backdrop-blur-sm transition-colors hover:bg-white hover:text-[#6B7280] border border-[#E5E7EB]"
          aria-label="Dismiss banner"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

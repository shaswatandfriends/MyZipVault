"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Pin } from "@/lib/icons";
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
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

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

  const visibleBanners = banners;

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

  const handleImageError = (bannerId: number) => {
    setImageErrors((prev) => new Set(prev).add(bannerId));
  };

  // Don't render if no visible banners
  if (visibleBanners.length === 0) return null;

  const hasValidImage = currentBanner?.imageUrl && !imageErrors.has(currentBanner.id);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl shadow-sm",
        hasValidImage ? "border-0" : "border border-[#E5E7EB] bg-white",
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
          /* ── Layout WITH image: full-bleed image + gradient overlay ── */
          <div className="relative w-full h-72 sm:h-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentBanner.imageUrl!}
              alt={currentBanner.title}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => handleImageError(currentBanner.id)}
            />

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/10" />

            {/* Text content overlaid - shifted up with justify-center instead of justify-end */}
            <div className="absolute inset-0 flex flex-col justify-center p-5 sm:p-7">
              <div className="max-w-xl">
                {/* Pinned badge */}
                {currentBanner?.isPinned && (
                  <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                    <Pin className="size-3" /> Pinned
                  </span>
                )}

                <h3
                  className="text-lg font-semibold text-white sm:text-xl line-clamp-2 drop-shadow-sm"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  {currentBanner?.title}
                </h3>

                {currentBanner?.description && (
                  <p className="mt-1 text-sm text-white/80 line-clamp-2 drop-shadow-sm">
                    {currentBanner.description}
                  </p>
                )}

                {/* CTA Button */}
                {currentBanner?.ctaText && currentBanner?.ctaLink && (
                  <a
                    href={currentBanner.ctaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-sm font-medium text-[#166534] shadow-sm transition-colors hover:bg-gray-100"
                  >
                    {currentBanner.ctaText}
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Layout WITHOUT image: clean card with accent bar ── */
          <div className="flex">
            {/* Accent bar */}
            <div className="w-1.5 shrink-0 bg-[#166534] rounded-l-xl" />

            <div className="flex flex-1 flex-col justify-center p-5 sm:p-7">
              {/* Pinned badge */}
              {currentBanner?.isPinned && (
                <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-[#166534]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#166534]">
                  <Pin className="size-3" /> Pinned
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
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors border",
              hasValidImage
                ? "bg-white/20 text-white/80 border-white/20 hover:bg-white/30 hover:text-white"
                : "bg-white/90 text-[#6B7280] border-[#E5E7EB] hover:bg-white hover:text-[#111827]"
            )}
            aria-label="Previous banner"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={goToNext}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors border",
              hasValidImage
                ? "bg-white/20 text-white/80 border-white/20 hover:bg-white/30 hover:text-white"
                : "bg-white/90 text-[#6B7280] border-[#E5E7EB] hover:bg-white hover:text-[#111827]"
            )}
            aria-label="Next banner"
          >
            <ChevronRight className="size-4" />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
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
                    ? "w-4 bg-white"
                    : hasValidImage
                      ? "w-1.5 bg-white/50 hover:bg-white/70"
                      : "w-1.5 bg-[#9CA3AF] hover:bg-[#6B7280]"
                )}
                aria-label={`Go to banner ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}


    </div>
  );
}

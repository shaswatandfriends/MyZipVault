"use client";

/**
 * AnimatedDoodles — hand-drawn style SVG doodles scattered across the landing page.
 *
 * Doodles are healthcare staffing / recruitment themed:
 *   - Stethoscope, heart, caduceus, first aid kit, test tube
 *   - Dollar sign, profit chart, offer badge, briefcase, handshake
 *   - Clock/hourglass, star, checkmark, location pin
 *
 * Each doodle has:
 *   - A unique SVG drawn in sketch style (stroke-based, no fill)
 *   - An animation class (float, wiggle, pulse, bounce, sway, etc.)
 *   - Absolute positioning within its parent section
 *   - Low opacity so they're subtle background elements
 */

interface DoodleProps {
  className?: string;
  style?: React.CSSProperties;
}

// ─── Individual Doodle SVGs ──────────────────────────────────────────

function StethoscopeDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 20 L30 45 C30 55 35 60 40 60 C45 60 50 55 50 45 L50 20" />
        <path d="M25 20 L25 15 L35 15 L35 20" />
        <path d="M50 45 C50 65 60 75 70 75 C80 75 85 65 85 55" />
        <circle cx="85" cy="50" r="8" />
      </svg>
    </div>
  );
}

function HeartDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 85 C50 85 15 60 15 38 C15 25 25 18 35 18 C42 18 47 22 50 28 C53 22 58 18 65 18 C75 18 85 25 85 38 C85 60 50 85 50 85 Z" />
      </svg>
    </div>
  );
}

function DollarDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 15 L50 85" />
        <path d="M65 30 C65 22 58 18 50 18 C42 18 35 22 35 30 C35 38 42 42 50 44 C58 46 65 50 65 58 C65 66 58 70 50 70 C42 70 35 66 35 58" />
      </svg>
    </div>
  );
}

function BriefcaseDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="20" y="35" width="60" height="40" rx="4" />
        <path d="M38 35 L38 28 L62 28 L62 35" />
        <line x1="20" y1="50" x2="80" y2="50" />
        <circle cx="50" cy="50" r="3" />
      </svg>
    </div>
  );
}

function HandshakeDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 45 L30 45 L40 35 L55 35 L65 45 L85 45" />
        <path d="M30 45 L35 55 L45 55 L50 50 L55 55 L65 55 L65 45" />
        <path d="M15 45 L15 60 L30 60" />
        <path d="M85 45 L85 60 L70 60" />
      </svg>
    </div>
  );
}

function StarDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 15 L58 38 L82 38 L63 53 L70 77 L50 62 L30 77 L37 53 L18 38 L42 38 Z" />
      </svg>
    </div>
  );
}

function CheckmarkDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="50" cy="50" r="38" />
        <path d="M32 50 L45 63 L68 38" />
      </svg>
    </div>
  );
}

function ClockDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="50" cy="50" r="38" />
        <path d="M50 25 L50 50 L68 58" />
      </svg>
    </div>
  );
}

function CaduceusDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="50" y1="20" x2="50" y2="85" />
        <path d="M35 35 C35 30 42 25 50 30 C58 25 65 30 65 35" />
        <path d="M30 50 C30 45 40 42 50 48 C60 42 70 45 70 50" />
        <path d="M30 65 C30 60 40 57 50 63 C60 57 70 60 70 65" />
        <path d="M50 20 L45 15 M50 20 L55 15" />
      </svg>
    </div>
  );
}

function FirstAidDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="22" y="35" width="56" height="40" rx="4" />
        <path d="M40 35 L40 30 L60 30 L60 35" />
        <path d="M50 45 L50 60 M42 52 L58 52" />
      </svg>
    </div>
  );
}

function ProfitChartDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="20" y1="80" x2="85" y2="80" />
        <line x1="20" y1="80" x2="20" y2="20" />
        <path d="M25 70 L40 55 L55 60 L80 25" />
        <path d="M70 25 L80 25 L80 35" />
        <text x="35" y="45" fontSize="14" fill="currentColor" stroke="none" fontWeight="bold">$</text>
      </svg>
    </div>
  );
}

function OfferBadgeDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 15 L60 30 L78 25 L73 43 L88 53 L73 63 L78 81 L60 76 L50 91 L40 76 L22 81 L27 63 L12 53 L27 43 L22 25 L40 30 Z" />
        <text x="38" y="58" fontSize="16" fill="currentColor" stroke="none" fontWeight="bold">OFFER</text>
      </svg>
    </div>
  );
}

function LocationPinDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 15 C35 15 25 25 25 40 C25 55 50 85 50 85 C50 85 75 55 75 40 C75 25 65 15 50 15 Z" />
        <circle cx="50" cy="40" r="8" />
      </svg>
    </div>
  );
}

function PlusCrossDoodle({ className, style }: DoodleProps) {
  return (
    <div className={`doodle ${className || ""}`} style={style}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M50 20 L50 80 M20 50 L80 50" />
      </svg>
    </div>
  );
}

// ─── Color presets for dark background ───────────────────────────────
const COLORS = {
  white: "rgba(255,255,255,0.15)",
  blue: "rgba(96,165,250,0.2)",
  green: "rgba(74,222,128,0.2)",
  amber: "rgba(251,191,36,0.2)",
  rose: "rgba(251,113,133,0.2)",
  violet: "rgba(167,139,250,0.2)",
};

// ─── Main Component ──────────────────────────────────────────────────

export function AnimatedDoodles() {
  return (
    <>
      {/* ─── Hero section doodles ─── */}
      <StethoscopeDoodle className="doodle-float" style={{ top: "12%", left: "5%", width: "60px", height: "60px", color: COLORS.white }} />
      <HeartDoodle className="doodle-pulse" style={{ top: "65%", left: "8%", width: "50px", height: "50px", color: COLORS.rose }} />
      <DollarDoodle className="doodle-bounce" style={{ top: "20%", right: "8%", width: "45px", height: "45px", color: COLORS.green }} />
      <StarDoodle className="doodle-float-reverse" style={{ top: "70%", right: "6%", width: "40px", height: "40px", color: COLORS.amber }} />
      <CaduceusDoodle className="doodle-sway" style={{ top: "40%", right: "3%", width: "55px", height: "55px", color: COLORS.blue }} />
      <PlusCrossDoodle className="doodle-pulse" style={{ top: "15%", left: "45%", width: "30px", height: "30px", color: COLORS.violet }} />

      {/* ─── Stats section doodles ─── */}
      <BriefcaseDoodle className="doodle-float" style={{ top: "20%", left: "10%", width: "50px", height: "50px", color: COLORS.white }} />
      <CheckmarkDoodle className="doodle-blink" style={{ top: "60%", right: "12%", width: "45px", height: "45px", color: COLORS.green }} />

      {/* ─── Marketplace flow section doodles ─── */}
      <HandshakeDoodle className="doodle-float-reverse" style={{ top: "15%", right: "8%", width: "55px", height: "55px", color: COLORS.amber }} />
      <LocationPinDoodle className="doodle-bounce" style={{ top: "70%", left: "5%", width: "40px", height: "40px", color: COLORS.rose }} />

      {/* ─── Pricing/CTA section doodles ─── */}
      <ProfitChartDoodle className="doodle-float" style={{ top: "25%", left: "6%", width: "55px", height: "55px", color: COLORS.green }} />
      <OfferBadgeDoodle className="doodle-sway" style={{ top: "60%", right: "7%", width: "50px", height: "50px", color: COLORS.amber }} />
      <ClockDoodle className="doodle-pulse" style={{ top: "15%", right: "15%", width: "40px", height: "40px", color: COLORS.blue }} />

      {/* ─── Footer area doodles ─── */}
      <FirstAidDoodle className="doodle-float" style={{ top: "30%", left: "12%", width: "45px", height: "45px", color: COLORS.white }} />
      <StarDoodle className="doodle-blink" style={{ top: "70%", right: "20%", width: "35px", height: "35px", color: COLORS.amber }} />
    </>
  );
}

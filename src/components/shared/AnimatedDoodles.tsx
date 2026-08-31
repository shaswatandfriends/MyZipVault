"use client";

export function AnimatedDoodles() {
  return (
    <>
      <div style={{ position: "absolute", top: "12%", left: "5%", width: 60, height: 60, color: "rgba(255,255,255,0.15)", animation: "doodleFloat 6s ease-in-out infinite", pointerEvents: "none" }}>
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M30 20 L30 45 C30 55 35 60 40 60 C45 60 50 55 50 45 L50 20" />
          <path d="M25 20 L25 15 L35 15 L35 20" />
          <path d="M50 45 C50 65 60 75 70 75 C80 75 85 65 85 55" />
          <circle cx="85" cy="50" r="8" />
        </svg>
      </div>
      <div style={{ position: "absolute", top: "65%", left: "8%", width: 50, height: 50, color: "rgba(251,113,133,0.2)", animation: "doodlePulse 4s ease-in-out infinite", pointerEvents: "none" }}>
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M50 85 C50 85 15 60 15 38 C15 25 25 18 35 18 C42 18 47 22 50 28 C53 22 58 18 65 18 C75 18 85 25 85 38 C85 60 50 85 50 85 Z" />
        </svg>
      </div>
      <div style={{ position: "absolute", top: "20%", right: "8%", width: 45, height: 45, color: "rgba(74,222,128,0.2)", animation: "doodleBounce 2.5s ease-in-out infinite", pointerEvents: "none" }}>
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M50 15 L50 85" />
          <path d="M65 30 C65 22 58 18 50 18 C42 18 35 22 35 30 C35 38 42 42 50 44 C58 46 65 50 65 58 C65 66 58 70 50 70 C42 70 35 66 35 58" />
        </svg>
      </div>
      <div style={{ position: "absolute", top: "70%", right: "6%", width: 40, height: 40, color: "rgba(251,191,36,0.2)", animation: "doodleFloatReverse 7s ease-in-out infinite", pointerEvents: "none" }}>
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M50 15 L58 38 L82 38 L63 53 L70 77 L50 62 L30 77 L37 53 L18 38 L42 38 Z" />
        </svg>
      </div>
      <div style={{ position: "absolute", top: "40%", right: "3%", width: 55, height: 55, color: "rgba(96,165,250,0.2)", animation: "doodleSway 4s ease-in-out infinite", pointerEvents: "none" }}>
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="50" y1="20" x2="50" y2="85" />
          <path d="M35 35 C35 30 42 25 50 30 C58 25 65 30 65 35" />
          <path d="M30 50 C30 45 40 42 50 48 C60 42 70 45 70 50" />
          <path d="M30 65 C30 60 40 57 50 63 C60 57 70 60 70 65" />
          <path d="M50 20 L45 15 M50 20 L55 15" />
        </svg>
      </div>
      <div style={{ position: "absolute", top: "15%", left: "45%", width: 30, height: 30, color: "rgba(167,139,250,0.2)", animation: "doodlePulse 4s ease-in-out infinite", pointerEvents: "none" }}>
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M50 20 L50 80 M20 50 L80 50" />
        </svg>
      </div>
    </>
  );
}

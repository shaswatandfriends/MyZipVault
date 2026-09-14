// Shared design tokens for landing page components
// Aligned with brand palette: Deep Teal + Sage + Ivory + Terracotta + Charcoal
// Hero sections use a deep teal gradient (instead of dark navy) for brand consistency.

export const C = {
  bg: "#0F3631",                       // Deep teal-dark (was #0A0F1A navy) — hero background
  bgCard: "rgba(255,255,255,0.04)",
  bgCardHover: "rgba(255,255,255,0.07)",
  border: "rgba(247,243,232,0.10)",    // Ivory-tinted border
  borderHover: "rgba(143,169,156,0.45)", // Sage hover border
  text: "#F7F3E8",                     // Warm Ivory text (was #F1F5F9 cool white)
  textMuted: "rgba(247,243,232,0.55)",
  textDim: "rgba(247,243,232,0.38)",
  primary: "#8FA99C",                  // Sage primary (pops on dark teal bg)
  primaryGlow: "rgba(143,169,156,0.4)",
  accent: "#D98F78",                   // Terracotta accent — small highlights
  accentGlow: "rgba(217,143,120,0.3)",
  emerald: "#8FA99C",                  // Repurposed to sage
  amber: "#D98F78",                    // Repurposed to terracotta
  violet: "#8FA99C",                   // Repurposed to sage (no more purple)
  white: "#FFFFFF",
};

export const landingAnimations = `
  @keyframes float-orb { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-30px) scale(1.1); } 66% { transform: translate(-30px,20px) scale(0.95); } }
  @keyframes float-card { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes slide-in-right { from { opacity:0; transform: translateX(30px); } to { opacity:1; transform: translateX(0); } }
  @keyframes fade-up { from { opacity:0; transform: translateY(30px); } to { opacity:1; transform: translateY(0); } }
  @keyframes mzv-doodle-float { 0%,100%{transform:translateY(0) rotate(0);opacity:.5} 50%{transform:translateY(-18px) rotate(4deg);opacity:.8} }
  @keyframes mzv-doodle-pulse { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.12);opacity:.7} }
  @keyframes mzv-doodle-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes mzv-doodle-sway { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(4deg)} }
  .scroll-reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.7s ease, transform 0.7s ease; }
  .sr-visible { opacity: 1 !important; transform: translateY(0) !important; }
  .tab-transition { animation: slide-in-right 0.4s ease forwards; }
  .hero-text { animation: fade-up 0.8s ease forwards; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${C.bg}; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
`;

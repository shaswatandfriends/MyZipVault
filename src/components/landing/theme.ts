// Shared design tokens for landing page components
// Aligned with brand palette: Deep Teal + Sage + Ivory + Terracotta + Charcoal
// Page background is pure white; teal/sage used for text + accents.

export const C = {
  bg: "#FFFFFF",                       // Pure white page background
  bgCard: "rgba(247,243,232,0.5)",     // Ivory-tinted glass card on white
  bgCardHover: "rgba(247,243,232,0.75)",
  border: "rgba(38,54,51,0.10)",       // Charcoal-tinted border
  borderHover: "rgba(23,74,67,0.30)",  // Teal hover border
  text: "#263633",                     // Deep Charcoal text
  textMuted: "rgba(38,54,51,0.60)",
  textDim: "rgba(38,54,51,0.40)",
  primary: "#174A43",                  // Deep Teal primary (pops on white)
  primaryGlow: "rgba(23,74,67,0.25)",
  accent: "#D98F78",                   // Terracotta accent
  accentGlow: "rgba(217,143,120,0.25)",
  emerald: "#174A43",                  // Brand teal for success indicators
  amber: "#D97706",                    // Amber for warnings
  violet: "#8FA99C",                   // Sage (no purple)
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

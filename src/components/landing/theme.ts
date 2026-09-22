// Shared design tokens for landing page components
// Per rebrand spec: ivory + white canvas, deep teal brand anchor,
// sage secondary, terracotta accent only. Editorial, premium, human.

export const C = {
  // ─── Backgrounds ───
  bg: "#F7F3E8",                       // Warm Ivory — main page background (per spec, not pure white)
  bgCard: "#FFFFFF",                   // Pure White — cards/surfaces
  bgCardHover: "#FBF8EE",              // Slightly tinted ivory for hover
  bgDeep: "#0D3B2E",                   // Deep Teal — for deep sections (CTA bands, verification)
  bgSecondary: "#E7EEE9",              // Sage-tinted surface — for nested/secondary surfaces

  // ─── Borders ───
  border: "rgba(38,54,51,0.10)",       // Charcoal-tinted border (subtle)
  borderHover: "rgba(13,59,46,0.30)",  // Teal hover border

  // ─── Text ───
  text: "#263633",                     // Deep Charcoal — body + headings
  textMuted: "rgba(38,54,51,0.65)",    // Secondary text
  textDim: "rgba(38,54,51,0.45)",      // Tertiary/meta text
  textOnDeep: "#F7F3E8",               // Ivory text on deep teal sections
  textOnDeepMuted: "rgba(247,243,232,0.70)",

  // ─── Brand Colors ───
  primary: "#0D3B2E",                  // Deep Forest Teal — primary brand anchor
  primaryHover: "#082820",             // Darker forest — hover/active
  primaryGlow: "rgba(13,59,46,0.18)",  // Soft forest teal shadow
  sage: "#8FA99C",                     // Sage Green — secondary
  sageLight: "#E7EEE9",                // Light sage surface
  accent: "#C9A961",                   // Gold — accent only (premium healthcare feel)
  accentGlow: "rgba(201,169,97,0.20)",

  // ─── Status colors (preserved) ───
  emerald: "#0D3B2E",                  // Success → brand forest teal
  amber: "#D97706",                    // Warning
  violet: "#8FA99C",                   // Repurposed to sage
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
  ::-webkit-scrollbar-thumb { background: rgba(38,54,51,0.15); border-radius: 3px; }
`;

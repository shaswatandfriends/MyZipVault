// Shared design tokens for landing page components

export const C = {
  bg: "#0A0F1A",
  bgCard: "rgba(255,255,255,0.03)",
  bgCardHover: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(59,130,246,0.4)",
  text: "#F1F5F9",
  textMuted: "rgba(241,245,249,0.5)",
  textDim: "rgba(241,245,249,0.35)",
  primary: "#3B82F6",
  primaryGlow: "rgba(59,130,246,0.4)",
  accent: "#06B6D4",
  accentGlow: "rgba(6,182,212,0.3)",
  emerald: "#10B981",
  amber: "#F59E0B",
  violet: "#8B5CF6",
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

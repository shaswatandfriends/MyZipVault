"use client";
import { useState, useEffect, useRef } from "react";
import { statsBar } from "@/lib/landing-content";
import { C } from "./theme";

function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && !started.current) { started.current = true; const start = Date.now(); const animate = () => { const elapsed = Date.now() - start; const progress = Math.min(elapsed / duration, 1); const eased = 1 - Math.pow(1 - progress, 3); setCount(Math.floor(eased * target)); if (progress < 1) requestAnimationFrame(animate); else setCount(target); }; requestAnimationFrame(animate); } }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return { count, ref };
}

export function StatsBar() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);
  return (
    <section className="scroll-reveal" style={{ padding: "48px 0", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 32 }}>
          {statsBar.map((stat, i) => {
            const numMatch = stat.value.match(/\d+/); const num = numMatch ? parseInt(numMatch[0]) : 0; const suffix = stat.value.replace(/\d+/, ""); const { count, ref } = useCounter(num);
            return <div key={i} ref={ref} className="text-center"><p className="text-3xl md:text-4xl font-bold" style={{ color: C.text, fontFamily: "'Clash Display', sans-serif" }}>{count}{suffix}</p><p className="text-xs mt-1" style={{ color: C.textMuted }}>{stat.label}</p></div>;
          })}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "@/lib/icons";
import { InfoPageShell } from "@/components/layout/info-page-shell";
import { faqSections } from "@/lib/landing-content";

export default function FaqPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <InfoPageShell
      eyebrow="FAQ"
      title="Questions, answered."
      subtitle="Everything you wanted to know about MyZipVault — how the marketplace works, how credits work, how the candidate vault works, and how we keep data secure."
    >
      {faqSections.map((section, si) => (
        <section key={si}>
          <h2
            className="text-[20px] font-bold text-primary mb-4 pb-3 border-b border-border"
            style={{ fontFamily: "'Satoshi', sans-serif" }}
          >
            {section.category}
          </h2>
          <div className="space-y-2.5">
            {section.items.map((item, ii) => {
              const key = `${si}-${ii}`;
              const isOpen = openFaq === key;
              return (
                <div
                  key={key}
                  className="rounded-xl border border-border bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : key)}
                    aria-expanded={isOpen}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-surface transition-colors"
                  >
                    <span className="font-semibold text-foreground">{item.q}</span>
                    <ChevronDown
                      size={18}
                      className="text-text-muted flex-shrink-0 transition-transform"
                      style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-[15px] text-text-secondary leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </InfoPageShell>
  );
}

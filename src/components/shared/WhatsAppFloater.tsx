"use client";

import { useState, useEffect } from "react";
import { MessageCircle } from "@/lib/icons";

export default function WhatsAppFloater() {
  const [hovered, setHovered] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform/public-settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.whatsapp_number) {
          setWhatsappNumber(data.whatsapp_number);
        }
      })
      .catch(() => {});
  }, []);

  // Don't render if no WhatsApp number configured
  if (!whatsappNumber) return null;

  const href = `https://wa.me/${whatsappNumber.replace(/[^0-9+]/g, "").replace("+", "")}`;

  return (
    <div className="fixed bottom-8 right-8 z-[999] flex items-center">
      {/* Tooltip */}
      <div
        className={`mr-3 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium text-white transition-all duration-200 ${
          hovered
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-2 pointer-events-none"
        }`}
        style={{ background: "var(--foreground)" }}
      >
        Chat with us on WhatsApp
      </div>
      {/* Button */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex size-14 items-center justify-center rounded-full transition-all duration-200 ease-in-out hover:scale-110"
        style={{
          background: "#25D366",
          boxShadow: hovered
            ? "0 6px 20px rgba(37, 211, 102, 0.5)"
            : "0 4px 12px rgba(37, 211, 102, 0.4)",
        }}
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="size-7 text-white" />
      </a>
    </div>
  );
}

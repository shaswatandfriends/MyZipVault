"use client";
import { useState, useEffect } from "react";
import { C } from "./theme";
import { Heart, MessageCircle, Share2, Users, CheckCircle2 } from "@/lib/icons";

export function SocialFeed() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth > 768); window.addEventListener("resize", onResize); onResize(); return () => window.removeEventListener("resize", onResize); }, []);

  const feedPosts = [
    {
      name: "Dr. Jennifer Walsh",
      specialty: "Cardiologist · Chicago",
      verified: true,
      time: "2h",
      content: "Discussing the latest approaches to TAVR procedures in elderly patients. Our team just completed our 50th case this year with zero complications. Sharing what worked for us — would love to hear from others doing high-volume programs.",
      likes: 48,
      comments: 12,
      shares: 8,
      topic: "Interventional Cardiology",
    },
    {
      name: "Dr. Michael Chen",
      specialty: "Emergency Medicine · Denver",
      verified: true,
      time: "5h",
      content: "Emergency medicine staffing shortages are real — but so are the solutions. Sharing a thread on how our ED restructured shift patterns to reduce burnout by 40% over 6 months. Thread 🧵",
      likes: 82,
      comments: 24,
      shares: 15,
      topic: "Emergency Medicine",
    },
  ];

  const communities = [
    { name: "Cardiology", members: "1,842 members" },
    { name: "Vascular Surgery", members: "938 members" },
    { name: "Emergency Medicine", members: "2,104 members" },
    { name: "Nursing", members: "3,217 members" },
  ];

  return (
    <section className="scroll-reveal" style={{ padding: "96px 0", background: C.bg, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>Healthcare network</p>
          <h2 style={{ fontSize: isDesktop ? 40 : 28, fontWeight: 800, color: C.text, marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.15, fontFamily: "'Lora', Georgia, serif" }}>
            Meet the people<br />behind healthcare.
          </h2>
          <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 580, margin: "0 auto", lineHeight: 1.6 }}>
            Real discussions. Real professionals. Real connections — within and across specialties.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1.4fr 1fr" : "1fr", gap: 28, alignItems: "start" }}>
          {/* Feed posts */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {feedPosts.map((post, i) => (
              <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: `0 4px 16px rgba(38,54,51,0.04)` }}>
                {/* Author row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${C.sage} 0%, ${C.primary} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>
                    {post.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{post.name}</span>
                      {post.verified && <CheckCircle2 size={13} style={{ color: C.primary }} />}
                    </div>
                    <p style={{ fontSize: 12, color: C.textDim }}>{post.specialty} · {post.time}</p>
                  </div>
                  <span style={{ padding: "3px 8px", background: C.sageLight, color: C.primary, borderRadius: 6, fontSize: 10, fontWeight: 600 }}>{post.topic}</span>
                </div>

                {/* Content */}
                <p style={{ fontSize: 14, color: C.text, lineHeight: 1.65, marginBottom: 18 }}>{post.content}</p>

                {/* Engagement */}
                <div style={{ display: "flex", gap: 24, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.textMuted, cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.color = C.accent} onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}>
                    <Heart size={14} /> {post.likes}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.textMuted, cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.color = C.primary} onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}>
                    <MessageCircle size={14} /> {post.comments}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.textMuted, cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.color = C.primary} onMouseLeave={(e) => e.currentTarget.style.color = C.textMuted}>
                    <Share2 size={14} /> {post.shares}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Communities sidebar */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, position: "sticky", top: 100 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.sageLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={16} style={{ color: C.primary }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Communities</h3>
            </div>
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 16, lineHeight: 1.5 }}>Join specialty communities and connect with peers who understand your work.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {communities.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: C.bgSecondary, borderRadius: 10, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = C.sageLight; }} onMouseLeave={(e) => { e.currentTarget.style.background = C.bgSecondary; }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: C.textDim }}>{c.members}</p>
                  </div>
                  <button style={{ padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "#FFFFFF", background: C.primary, border: "none", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = C.primaryHover; }} onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}>Join</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

/**
 * CompactStateMap — tile-grid map of US states showing NLC (Nurse Licensure
 * Compact) members vs. non-compact states.
 *
 * Uses a standard tile-grid layout (each state = one square tile, arranged
 * geographically). Compact states are filled with brand teal; non-compact
 * states are muted gray. Each tile shows the state abbreviation.
 *
 * Used as the cover image for the "Nursing License Requirements by State"
 * blog post (slug: nursing-license-requirements-by-state).
 */

// ─── NLC compact states (as of 2026, per blog content) ────────────────
const COMPACT_STATES = new Set([
  "AL", "AZ", "AR", "CO", "DE", "FL", "GA", "ID", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MS", "MO", "MT", "NE", "NV",
  "NH", "NJ", "NM", "NC", "ND", "OH", "OK", "PA", "SC", "SD",
  "TN", "TX", "UT", "VT", "VA", "WV", "WI", "WY",
]);

// ─── Tile grid positions (row, col) — geographically arranged ────────
// 8 rows × 13 columns. Each state gets an explicit grid position.
type Pos = { r: number; c: number };

const POSITIONS: Record<string, Pos> = {
  // Row 1 — far north
  ME: { r: 1, c: 12 },

  // Row 2 — northern tier
  WA: { r: 2, c: 2 },  ID: { r: 2, c: 3 },  MT: { r: 2, c: 4 },
  ND: { r: 2, c: 5 },  MN: { r: 2, c: 6 },  WI: { r: 2, c: 7 },
  MI: { r: 2, c: 8 },  NY: { r: 2, c: 9 },  VT: { r: 2, c: 11 }, NH: { r: 2, c: 12 },

  // Row 3 — upper midwest + northeast
  OR: { r: 3, c: 2 },  NV: { r: 3, c: 3 },  WY: { r: 3, c: 4 },
  SD: { r: 3, c: 5 },  IA: { r: 3, c: 6 },  IL: { r: 3, c: 7 },
  IN: { r: 3, c: 8 },  OH: { r: 3, c: 9 },  PA: { r: 3, c: 10 },
  NJ: { r: 3, c: 11 }, MA: { r: 3, c: 12 },

  // Row 4 — central
  CA: { r: 4, c: 2 },  UT: { r: 4, c: 3 },  CO: { r: 4, c: 4 },
  NE: { r: 4, c: 5 },  MO: { r: 4, c: 6 },  KY: { r: 4, c: 7 },
  WV: { r: 4, c: 8 },  VA: { r: 4, c: 9 },  MD: { r: 4, c: 10 },
  DE: { r: 4, c: 11 }, CT: { r: 4, c: 12 }, RI: { r: 4, c: 13 },

  // Row 5 — southwest + south
  AZ: { r: 5, c: 3 },  NM: { r: 5, c: 4 },  KS: { r: 5, c: 5 },
  OK: { r: 5, c: 6 },  AR: { r: 5, c: 7 },  TN: { r: 5, c: 8 },
  NC: { r: 5, c: 9 },  SC: { r: 5, c: 10 }, DC: { r: 5, c: 11 },

  // Row 6 — deep south
  TX: { r: 6, c: 5 },  LA: { r: 6, c: 6 },  MS: { r: 6, c: 7 },
  AL: { r: 6, c: 8 },  GA: { r: 6, c: 9 },  FL: { r: 6, c: 10 },

  // Row 8 — non-contiguous
  AK: { r: 8, c: 2 },  HI: { r: 8, c: 3 },
};

const ALL_STATES = Object.keys(POSITIONS);

export function CompactStateMap() {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #1F6F5C 0%, #155440 100%)",
        borderRadius: "16px",
        padding: "32px 28px 24px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.22), 0 8px 32px rgba(0,0,0,0.10)",
      }}
    >
      {/* Decorative radial glow at top-left */}
      <div
        style={{
          position: "absolute",
          top: "-60px",
          left: "-40px",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(143,169,156,0.20) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Title */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", marginBottom: "20px" }}>
        <p style={{ fontSize: "11px", fontWeight: 800, color: "#C9A961", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "6px" }}>
          Nurse Licensure Compact · 2026
        </p>
        <p style={{ fontSize: "18px", fontWeight: 700, color: "#F7F3E8", fontFamily: "'Lora', Georgia, serif" }}>
          38 NLC Member States
        </p>
      </div>

      {/* Tile grid map */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(13, 1fr)",
          gridTemplateRows: "repeat(8, 1fr)",
          gap: "3px",
          maxWidth: "100%",
          position: "relative",
          zIndex: 1,
        }}
      >
        {ALL_STATES.map((code) => {
          const pos = POSITIONS[code];
          const isCompact = COMPACT_STATES.has(code);
          return (
            <div
              key={code}
              style={{
                gridColumn: pos.c,
                gridRow: pos.r,
                background: isCompact
                  ? "linear-gradient(180deg, #2A8A72 0%, #1F6F5C 100%)"
                  : "rgba(247, 243, 232, 0.10)",
                border: isCompact
                  ? "1px solid rgba(201, 169, 97, 0.40)"
                  : "1px solid rgba(247, 243, 232, 0.08)",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "9px",
                fontWeight: 800,
                color: isCompact ? "#FFFFFF" : "rgba(247, 243, 232, 0.45)",
                textShadow: isCompact ? "0 1px 2px rgba(0,0,0,0.30)" : "none",
                boxShadow: isCompact
                  ? "inset 0 1px 0 rgba(255,255,255,0.20), 0 1px 3px rgba(0,0,0,0.15)"
                  : "none",
                aspectRatio: "1.1 / 1",
                letterSpacing: "-0.02em",
              }}
              title={isCompact ? `${code} — Compact state` : `${code} — Non-compact (separate license required)`}
            >
              {code}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "24px",
          marginTop: "20px",
          position: "relative",
          zIndex: 1,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "3px",
              background: "linear-gradient(180deg, #2A8A72 0%, #1F6F5C 100%)",
              border: "1px solid rgba(201, 169, 97, 0.40)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.20)",
            }}
          />
          <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(247, 243, 232, 0.88)" }}>
            Compact — one license, 38 states
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "3px",
              background: "rgba(247, 243, 232, 0.10)",
              border: "1px solid rgba(247, 243, 232, 0.08)",
            }}
          />
          <span style={{ fontSize: "11px", fontWeight: 600, color: "rgba(247, 243, 232, 0.88)" }}>
            Non-compact — separate license
          </span>
        </div>
      </div>
    </div>
  );
}

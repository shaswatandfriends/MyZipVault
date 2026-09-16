import { C } from "./theme";

/**
 * ZDivider — per spec #29
 * A subtle Z-shaped brand motif used as a section divider.
 * The Z is built from 3 lines (top, diagonal, bottom) — echoing the
 * Z+snake logo mark without being a literal logo reproduction.
 *
 * Usage: <ZDivider /> between sections
 */
export function ZDivider({ color }: { color?: string }) {
  const stroke = color || C.sage;
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "32px 0", opacity: 0.4 }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Top bar of Z */}
        <line x1="8" y1="10" x2="40" y2="10" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        {/* Diagonal of Z — subtle curve to echo the snake */}
        <path d="M 40 10 Q 28 24 8 38" stroke={stroke} strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Bottom bar of Z */}
        <line x1="8" y1="38" x2="40" y2="38" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

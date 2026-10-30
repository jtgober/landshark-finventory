import type { AchievementDef, GlyphKey } from "@/lib/achievements";
import type { BadgeTier, YearlyBadgeType } from "@/lib/yearlyBadges";

type Metal = "bronze" | "silver" | "gold" | "platinum" | "locked";

interface MetalStyle {
  rim: string;
  face: string;
  highlight: string;
  ink: string;
}

const METALS: Record<Metal, MetalStyle> = {
  bronze: { rim: "#8a4b14", face: "#d98e4a", highlight: "#f2c08f", ink: "#5c300a" },
  silver: { rim: "#5b6472", face: "#c3c9d2", highlight: "#eceff3", ink: "#323a46" },
  gold: { rim: "#a16207", face: "#f6c744", highlight: "#fde9a3", ink: "#6b4204" },
  platinum: { rim: "#1d4ed8", face: "#8ec5fb", highlight: "#dcedff", ink: "#12307a" },
  locked: { rim: "#d1d5db", face: "#f3f4f6", highlight: "#ffffff", ink: "#9ca3af" },
};

const LEVEL_METALS: Metal[] = ["bronze", "silver", "gold", "platinum"];
export const metalForLevel = (level: number): Metal => LEVEL_METALS[Math.max(1, Math.min(level, 4)) - 1];
export const metalForTier = (tier: BadgeTier): Metal =>
  tier === "GOLD" ? "gold" : tier === "SILVER" ? "silver" : "bronze";

/** Icons drawn in a 40 x 44 box; stroke/fill color is passed in. */
function Glyph({ name, color }: { name: GlyphKey; color: string }) {
  const stroke = {
    fill: "none",
    stroke: color,
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  switch (name) {
    case "run":
      return (
        <g {...stroke}>
          <circle cx="25" cy="8" r="4" fill={color} />
          <path d="M24 14 L19 27" />
          <path d="M23 17 L32 21 M22 18 L13 15" />
          <path d="M19 27 L28 33 L26 42 M19 27 L11 31 L7 40" />
        </g>
      );
    case "ride":
      return (
        <g {...stroke}>
          <circle cx="9" cy="31" r="8" />
          <circle cx="31" cy="31" r="8" />
          <path d="M9 31 L18 16 H27 L31 31 M18 16 L22 31 H9 M27 16 L29 10 H33" />
        </g>
      );
    case "swim":
      return (
        <g {...stroke}>
          <circle cx="13" cy="14" r="4" fill={color} />
          <path d="M16 19 L27 22 L34 17" />
          <path d="M2 31 q4.5 -5 9 0 t9 0 t9 0 t9 0" />
          <path d="M2 40 q4.5 -5 9 0 t9 0 t9 0 t9 0" />
        </g>
      );
    case "stopwatch":
      return (
        <g {...stroke}>
          <circle cx="20" cy="26" r="13" />
          <path d="M15 6 H25 M20 6 V13" />
          <path d="M20 26 V18 M20 26 L26 30" />
        </g>
      );
    case "pin":
      return (
        <g {...stroke}>
          <path d="M20 3 C12 3 7 9 7 16 C7 26 20 41 20 41 C20 41 33 26 33 16 C33 9 28 3 20 3 Z" />
          <circle cx="20" cy="16" r="4.5" fill={color} />
        </g>
      );
    case "flame":
      return (
        <g {...stroke}>
          <path
            d="M20 2 C24 10 32 15 32 27 C32 35 27 41 20 41 C13 41 8 35 8 27 C8 21 11 17 14 14 C14 18 16 20 18 20 C18 14 17 8 20 2 Z"
            fill={color}
          />
        </g>
      );
    case "calendar":
      return (
        <g {...stroke}>
          <rect x="5" y="8" width="30" height="30" rx="4" />
          <path d="M5 17 H35 M13 3 V11 M27 3 V11" />
          <path d="M13 25 H13.5 M20 25 H20.5 M27 25 H27.5 M13 32 H13.5 M20 32 H20.5" />
        </g>
      );
    case "mountain":
      return (
        <g {...stroke}>
          <path d="M2 40 L15 14 L22 26 L27 19 L38 40 Z" />
          <path d="M11 22 L15 18 L19 22" />
        </g>
      );
    case "hourglass":
      return (
        <g {...stroke}>
          <path d="M9 4 H31 M9 40 H31" />
          <path d="M11 4 C11 16 20 18 20 22 C20 26 11 28 11 40 M29 4 C29 16 20 18 20 22 C20 26 29 28 29 40" />
          <path d="M15 36 H25" />
        </g>
      );
    case "sunrise":
      return (
        <g {...stroke}>
          <path d="M8 32 A12 12 0 0 1 32 32" />
          <path d="M2 36 H38 M8 42 H32" />
          <path d="M20 8 V14 M6 16 L10 20 M34 16 L30 20" />
        </g>
      );
    case "moon":
      return (
        <g {...stroke}>
          <path d="M28 5 A17 17 0 1 0 36 31 A14 14 0 0 1 28 5 Z" fill={color} />
          <circle cx="32" cy="12" r="1.5" fill={color} />
        </g>
      );
    case "bricks":
      return (
        <g {...stroke} strokeWidth={2.5}>
          <rect x="3" y="10" width="16" height="10" />
          <rect x="21" y="10" width="16" height="10" />
          <rect x="12" y="22" width="16" height="10" />
          <path d="M3 22 H10 V32 H3 M30 22 H37 V32 H30" />
        </g>
      );
    case "bricks3":
      return (
        <g {...stroke} strokeWidth={2.5}>
          <rect x="3" y="4" width="16" height="9" />
          <rect x="21" y="4" width="16" height="9" />
          <rect x="12" y="15" width="16" height="9" />
          <path d="M3 15 H10 V24 H3 M30 15 H37 V24 H30" />
          <rect x="3" y="26" width="16" height="9" />
          <rect x="21" y="26" width="16" height="9" />
          <circle cx="20" cy="40" r="1.8" fill={color} />
        </g>
      );
    case "weekend":
      return (
        <g {...stroke}>
          <rect x="5" y="8" width="30" height="30" rx="4" />
          <path d="M5 17 H35 M13 3 V11 M27 3 V11" />
          <rect x="17" y="24" width="7" height="7" fill={color} />
          <rect x="26" y="24" width="7" height="7" fill={color} />
        </g>
      );
    case "seasons":
      return (
        <g {...stroke}>
          <circle cx="20" cy="22" r="15" />
          <path d="M20 7 V37 M5 22 H35" />
          <circle cx="12.5" cy="14.5" r="2.5" fill={color} />
          <circle cx="27.5" cy="29.5" r="2.5" fill={color} />
        </g>
      );
    case "refresh":
      return (
        <g {...stroke}>
          <path d="M33 22 A13 13 0 1 1 28 11" />
          <path d="M30 4 L28 12 L36 14" />
        </g>
      );
    case "flag":
      return (
        <g {...stroke}>
          <path d="M9 4 V42" />
          <path d="M9 6 H34 L28 14 L34 22 H9" fill={color} />
        </g>
      );
    case "fin":
      return (
        <g {...stroke}>
          <path d="M6 36 C14 36 18 24 22 4 C25 18 31 30 37 36 Z" fill={color} />
          <path d="M2 41 q4.5 -4 9 0 t9 0 t9 0 t9 0" />
        </g>
      );
    case "gift":
      return (
        <g {...stroke}>
          <rect x="6" y="19" width="28" height="20" />
          <rect x="3" y="13" width="34" height="6" />
          <path d="M20 13 V39" />
          <path d="M20 13 C14 3 8 9 14 13 M20 13 C26 3 32 9 26 13" />
        </g>
      );
    case "target":
      return (
        <g {...stroke}>
          <circle cx="20" cy="23" r="16" />
          <circle cx="20" cy="23" r="9" />
          <circle cx="20" cy="23" r="3" fill={color} />
        </g>
      );
    case "grid":
      return (
        <g {...stroke}>
          <circle cx="11" cy="13" r="6" />
          <rect x="24" y="7" width="12" height="12" />
          <path d="M11 26 L17.5 38 H4.5 Z" />
          <path d="M30 26 L36 32 L30 38 L24 32 Z" />
        </g>
      );
    case "sparkle":
      return (
        <g {...stroke}>
          <path d="M18 4 C19 15 24 20 35 22 C24 24 19 29 18 40 C17 29 12 24 1 22 C12 20 17 15 18 4 Z" fill={color} />
          <path d="M33 3 V11 M29 7 H37" strokeWidth={2.5} />
        </g>
      );
    case "heart":
      return (
        <g {...stroke}>
          <path
            d="M20 39 C6 29 3 21 3 15 C3 9 8 5 13 5 C16 5 19 7 20 10 C21 7 24 5 27 5 C32 5 37 9 37 15 C37 21 34 29 20 39 Z"
            fill={color}
          />
        </g>
      );
    case "clover":
      return (
        <g {...stroke}>
          <circle cx="13" cy="14" r="7" fill={color} />
          <circle cx="27" cy="14" r="7" fill={color} />
          <circle cx="20" cy="25" r="7" fill={color} />
          <path d="M20 27 Q20 37 13 41" />
        </g>
      );
    case "egg":
      return (
        <g {...stroke}>
          <path d="M20 3 C30 3 35 20 35 28 C35 36 28 41 20 41 C12 41 5 36 5 28 C5 20 10 3 20 3 Z" />
          <path d="M7 25 L12 21 L17 25 L23 21 L28 25 L33 21" />
          <circle cx="14" cy="33" r="1.8" fill={color} />
          <circle cx="26" cy="33" r="1.8" fill={color} />
        </g>
      );
    case "horseshoe":
      return (
        <g {...stroke} strokeWidth={5}>
          <path d="M8 5 V24 C8 38 32 38 32 24 V5" />
          <path d="M8 13 H12 M32 13 H28" strokeWidth={3} />
        </g>
      );
    case "star":
      return (
        <g {...stroke}>
          <path d="M20 3 L25 15 L38 16 L28 25 L31 38 L20 31 L9 38 L12 25 L2 16 L15 15 Z" fill={color} />
        </g>
      );
    case "firework":
      return (
        <g {...stroke}>
          <path d="M20 3 V12 M20 28 V37 M3 20 H12 M28 20 H37 M8 8 L14 14 M26 26 L32 32 M32 8 L26 14 M14 26 L8 32" />
          <circle cx="20" cy="20" r="2.5" fill={color} />
          <path d="M33 38 H33.5 M7 38 H7.5 M20 42 H20.5" strokeWidth={4} />
        </g>
      );
    case "hammer":
      return (
        <g {...stroke}>
          <rect x="5" y="5" width="30" height="11" rx="2" fill={color} />
          <path d="M20 16 V41" strokeWidth={5} />
        </g>
      );
    case "pumpkin":
      return (
        <g {...stroke}>
          <ellipse cx="20" cy="27" rx="16" ry="13" />
          <path d="M20 14 V6 H25" />
          <path d="M10 22 L16 22 L13 28 Z M24 22 L30 22 L27 28 Z" fill={color} strokeWidth={1.5} />
          <path d="M11 33 L15 31 L18 34 L22 31 L25 34 L29 31" strokeWidth={2.5} />
        </g>
      );
    case "turkey":
      return (
        <g {...stroke}>
          <path d="M20 26 L4 16 M20 26 L10 6 M20 26 L20 3 M20 26 L30 6 M20 26 L36 16" strokeWidth={4} />
          <circle cx="20" cy="31" r="9" fill={color} />
          <path d="M16 41 V43 M24 41 V43" strokeWidth={2.5} />
        </g>
      );
    case "tree":
      return (
        <g {...stroke}>
          <path d="M20 2 L10 16 H15 L6 28 H14 L3 40 H37 L26 28 H34 L25 16 H30 Z" fill={color} />
          <path d="M20 40 V43" strokeWidth={4} />
        </g>
      );
    case "clock":
      return (
        <g {...stroke}>
          <circle cx="20" cy="23" r="16" />
          <path d="M20 23 V9 M20 23 H28" />
          <path d="M20 7 V9 M20 37 V39 M4 23 H6 M34 23 H36" strokeWidth={2.5} />
        </g>
      );
    case "trio":
      return (
        <g {...stroke}>
          <circle cx="13" cy="16" r="9" />
          <circle cx="27" cy="16" r="9" />
          <circle cx="20" cy="29" r="9" />
        </g>
      );
  }
}

/** Hexagon badge for a lifetime achievement. Unearned badges render as a gray outline. */
export function AchievementBadge({ def, earned, size = 72 }: { def: AchievementDef; earned: boolean; size?: number }) {
  const m = earned ? (def.palette ?? METALS[metalForLevel(def.level)]) : METALS.locked;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${def.name}${earned ? "" : " (not yet earned)"}`}
      className="shrink-0"
    >
      <polygon points="50,3 93,27 93,73 50,97 7,73 7,27" fill={m.rim} />
      <polygon points="50,9 88,30 88,70 50,91 12,70 12,30" fill={m.face} />
      <polygon points="50,9 88,30 88,50 12,50 12,30" fill={m.highlight} opacity="0.5" />
      <g transform="translate(33,13) scale(0.85)">
        <Glyph name={def.glyph} color={m.ink} />
      </g>
      <text x="50" y="73" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={m.ink}>
        {def.label}
      </text>
    </svg>
  );
}

const SPORT_GLYPH: Record<YearlyBadgeType, GlyphKey> = { RIDE: "ride", RUN: "run", SWIM: "swim", COMPLETE: "trio" };

/** Round medal on a ribbon for a yearly bronze/silver/gold badge. `tier` null renders it locked. */
export function YearlyMedal({
  type,
  tier,
  size = 88,
}: {
  type: YearlyBadgeType;
  tier: BadgeTier | null;
  size?: number;
}) {
  const m = METALS[tier ? metalForTier(tier) : "locked"];
  const ribbon = tier ? "#dc2626" : "#d1d5db";
  const ribbonDark = tier ? "#991b1b" : "#b6bcc5";
  return (
    <svg viewBox="0 0 100 112" width={size} height={(size * 112) / 100} aria-hidden="true" className="shrink-0">
      <polygon points="30,62 16,108 32,99 43,110 53,66" fill={ribbon} />
      <polygon points="70,62 84,108 68,99 57,110 47,66" fill={ribbonDark} />
      <circle cx="50" cy="42" r="38" fill={m.rim} />
      <circle cx="50" cy="42" r="31" fill={m.face} />
      <path d="M19 42 A31 31 0 0 1 81 42 Z" fill={m.highlight} opacity="0.5" />
      <g transform="translate(30,20)">
        <Glyph name={SPORT_GLYPH[type]} color={m.ink} />
      </g>
    </svg>
  );
}

/** Trophy cup for a club-wide Team Landshark trophy. `tier` null renders it locked. */
export function TeamTrophyCup({ tier, year, size = 96 }: { tier: BadgeTier | null; year?: number; size?: number }) {
  const m = METALS[tier ? metalForTier(tier) : "locked"];
  return (
    <svg viewBox="0 0 120 150" width={size} height={(size * 150) / 120} aria-hidden="true" className="shrink-0">
      <path d="M30 34 C6 34 6 74 38 78" fill="none" stroke={m.rim} strokeWidth="7" strokeLinecap="round" />
      <path d="M90 34 C114 34 114 74 82 78" fill="none" stroke={m.rim} strokeWidth="7" strokeLinecap="round" />
      <rect x="54" y="92" width="12" height="22" fill={m.rim} />
      <rect x="34" y="124" width="52" height="14" rx="3" fill={m.rim} />
      <rect x="44" y="112" width="32" height="14" rx="2" fill={m.face} />
      <path d="M26 24 H94 V54 C94 80 76 94 60 94 C44 94 26 80 26 54 Z" fill={m.rim} />
      <path d="M31 28 H89 V54 C89 77 74 89 60 89 C46 89 31 77 31 54 Z" fill={m.face} />
      <path d="M31 28 H50 V80 C38 74 31 66 31 54 Z" fill={m.highlight} opacity="0.55" />
      <path d="M60 38 C70 46 74 54 72 66 C68 62 64 60 60 60 C56 60 52 62 48 66 C46 54 50 46 60 38 Z" fill={m.ink} />
      <path d="M44 72 Q52 66 60 72 T76 72" fill="none" stroke={m.ink} strokeWidth="3" strokeLinecap="round" />
      {year !== undefined && (
        <text x="60" y="134" textAnchor="middle" fontSize="9" fontWeight="700" fill={m.face} fontFamily="sans-serif">
          {year}
        </text>
      )}
    </svg>
  );
}

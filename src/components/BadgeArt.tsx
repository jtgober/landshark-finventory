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
  const m = METALS[earned ? metalForLevel(def.level) : "locked"];
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

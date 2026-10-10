import type { BadgePalette, GlyphKey } from "./achievements";

export interface HolidayDef {
  id: string;
  name: string;
  /** Short text printed on the badge. */
  label: string;
  description: string;
  glyph: GlyphKey;
  palette: BadgePalette;
  /** Whether a Strava local start date (read with UTC getters) falls on this holiday. */
  matches: (date: Date) => boolean;
}

/** Month (0-based) and day of Easter Sunday for a year, by the Anonymous Gregorian algorithm. */
export function easterDate(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

const on = (month: number, day: number) => (d: Date) => d.getUTCMonth() === month && d.getUTCDate() === day;

export const HOLIDAYS: HolidayDef[] = [
  {
    id: "new-years-day",
    name: "New Year's Day",
    label: "Jan 1",
    description: "Logged an activity on New Year's Day.",
    glyph: "sparkle",
    palette: { rim: "#1e3a8a", face: "#fcd34d", highlight: "#fef3c7", ink: "#1e3a8a" },
    matches: on(0, 1),
  },
  {
    id: "valentines-day",
    name: "Valentine's Day",
    label: "Feb 14",
    description: "Logged an activity on Valentine's Day.",
    glyph: "heart",
    palette: { rim: "#9f1239", face: "#fda4af", highlight: "#ffe4e6", ink: "#881337" },
    matches: on(1, 14),
  },
  {
    id: "st-patricks-day",
    name: "St. Patrick's Day",
    label: "Mar 17",
    description: "Logged an activity on St. Patrick's Day.",
    glyph: "clover",
    palette: { rim: "#166534", face: "#86efac", highlight: "#dcfce7", ink: "#14532d" },
    matches: on(2, 17),
  },
  {
    id: "easter",
    name: "Easter",
    label: "Easter",
    description: "Logged an activity on Easter Sunday.",
    glyph: "egg",
    palette: { rim: "#7e22ce", face: "#e9d5ff", highlight: "#fdf4ff", ink: "#581c87" },
    matches: (d) => {
      const easter = easterDate(d.getUTCFullYear());
      return d.getUTCMonth() === easter.month && d.getUTCDate() === easter.day;
    },
  },
  {
    id: "derby-day",
    name: "Derby Day",
    label: "Derby",
    description: "Logged an activity on Kentucky Derby Day, the first Saturday in May.",
    glyph: "horseshoe",
    palette: { rim: "#92400e", face: "#fde68a", highlight: "#fffbeb", ink: "#78350f" },
    matches: (d) => d.getUTCMonth() === 4 && d.getUTCDay() === 6 && d.getUTCDate() <= 7,
  },
  {
    id: "memorial-day",
    name: "Memorial Day",
    label: "Memorial",
    description: "Logged an activity on Memorial Day, the last Monday in May.",
    glyph: "star",
    palette: { rim: "#1e3a8a", face: "#bfdbfe", highlight: "#eff6ff", ink: "#1e3a8a" },
    matches: (d) => d.getUTCMonth() === 4 && d.getUTCDay() === 1 && d.getUTCDate() >= 25,
  },
  {
    id: "independence-day",
    name: "Independence Day",
    label: "Jul 4",
    description: "Logged an activity on the Fourth of July.",
    glyph: "firework",
    palette: { rim: "#991b1b", face: "#fca5a5", highlight: "#fee2e2", ink: "#7f1d1d" },
    matches: on(6, 4),
  },
  {
    id: "labor-day",
    name: "Labor Day",
    label: "Labor",
    description: "Logged an activity on Labor Day, the first Monday in September.",
    glyph: "hammer",
    palette: { rim: "#0f766e", face: "#99f6e4", highlight: "#ccfbf1", ink: "#134e4a" },
    matches: (d) => d.getUTCMonth() === 8 && d.getUTCDay() === 1 && d.getUTCDate() <= 7,
  },
  {
    id: "halloween",
    name: "Halloween",
    label: "Oct 31",
    description: "Logged an activity on Halloween.",
    glyph: "pumpkin",
    palette: { rim: "#111827", face: "#fb923c", highlight: "#fed7aa", ink: "#111827" },
    matches: on(9, 31),
  },
  {
    id: "thanksgiving",
    name: "Thanksgiving",
    label: "Thanks",
    description: "Logged an activity on Thanksgiving, the fourth Thursday in November.",
    glyph: "turkey",
    palette: { rim: "#713f12", face: "#e0b27a", highlight: "#f5dfc0", ink: "#5c3310" },
    matches: (d) => d.getUTCMonth() === 10 && d.getUTCDay() === 4 && d.getUTCDate() >= 22 && d.getUTCDate() <= 28,
  },
  {
    id: "christmas",
    name: "Christmas",
    label: "Dec 25",
    description: "Logged an activity on Christmas Day.",
    glyph: "tree",
    palette: { rim: "#14532d", face: "#dc2626", highlight: "#f87171", ink: "#ffffff" },
    matches: on(11, 25),
  },
  {
    id: "new-years-eve",
    name: "New Year's Eve",
    label: "Dec 31",
    description: "Logged an activity on New Year's Eve.",
    glyph: "clock",
    palette: { rim: "#1e1b4b", face: "#818cf8", highlight: "#c7d2fe", ink: "#1e1b4b" },
    matches: on(11, 31),
  },
];

/** Ids of every tracked holiday a local calendar date falls on (usually none, never more than a couple). */
export function holidaysOn(date: Date): string[] {
  return HOLIDAYS.filter((h) => h.matches(date)).map((h) => h.id);
}

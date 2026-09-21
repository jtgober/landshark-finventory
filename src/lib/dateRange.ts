export const PRIMARY_RANGES = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
] as const;

const EARLIEST_YEAR = 2000;
const MAX_WEEKS_BACK = 520; // ~10 years
const MAX_MONTHS_BACK = 240; // 20 years

/** True for "week" and "month" — the two ranges that support prev/next paging. */
export function supportsOffset(range: string): boolean {
  return range === "week" || range === "month";
}

/** A primary range key, or a 4-digit year string (e.g. "2025") for browsing a past year. */
export function isValidRange(range: string, currentYear: number): boolean {
  if (PRIMARY_RANGES.some((r) => r.key === range)) return true;
  const year = Number(range);
  return Number.isInteger(year) && year >= EARLIEST_YEAR && year <= currentYear;
}

/** Clamps an offset to a sane range and never lets it go positive (into the future). */
export function parseOffset(raw: string | undefined, range: string): number {
  const n = raw ? Math.trunc(Number(raw)) : 0;
  if (!Number.isFinite(n) || n > 0) return 0;
  const min = range === "week" ? -MAX_WEEKS_BACK : -MAX_MONTHS_BACK;
  return Math.max(n, min);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday
  const mondayDiff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayDiff);
  return d;
}

export function rangeWindow(range: string, offset = 0): { since?: Date; until?: Date } {
  const now = new Date();
  switch (range) {
    case "week": {
      const since = startOfWeek(now);
      since.setDate(since.getDate() + offset * 7);
      const until = new Date(since);
      until.setDate(until.getDate() + 7);
      return { since, until };
    }
    case "month": {
      const since = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const until = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
      return { since, until };
    }
    case "year":
      return { since: new Date(now.getFullYear(), 0, 1) };
    case "all":
      return {};
    default: {
      // A specific past calendar year, e.g. "2025" -> Jan 1 2025 through Jan 1 2026.
      const year = Number(range);
      return { since: new Date(year, 0, 1), until: new Date(year + 1, 0, 1) };
    }
  }
}

/** Human label for the current window — "Sep 15 – Sep 21, 2026" or "September 2026" when
 *  paging, falling back to the static range label ("This Week", "2025", ...) otherwise. */
export function periodLabel(range: string, offset: number, since?: Date, until?: Date): string {
  if (range === "week" && since && until) {
    const lastDay = new Date(until.getTime() - 24 * 60 * 60 * 1000);
    const start = since.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const end = lastDay.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return offset === 0 ? "This Week" : `${start} – ${end}`;
  }
  if (range === "month" && since) {
    const label = since.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    return offset === 0 ? "This Month" : label;
  }
  const primary = PRIMARY_RANGES.find((r) => r.key === range);
  return primary ? primary.label : range;
}

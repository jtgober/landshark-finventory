export const PRIMARY_RANGES = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
] as const;

const EARLIEST_YEAR = 2000;

/** A primary range key, or a 4-digit year string (e.g. "2025") for browsing a past year. */
export function isValidRange(range: string, currentYear: number): boolean {
  if (PRIMARY_RANGES.some((r) => r.key === range)) return true;
  const year = Number(range);
  return Number.isInteger(year) && year >= EARLIEST_YEAR && year <= currentYear;
}

export function rangeLabel(range: string): string {
  const primary = PRIMARY_RANGES.find((r) => r.key === range);
  return primary ? primary.label : range;
}

export function rangeWindow(range: string): { since?: Date; until?: Date } {
  const now = new Date();
  switch (range) {
    case "week":
      return { since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    case "month":
      return { since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
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

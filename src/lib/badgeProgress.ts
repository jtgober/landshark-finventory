const WHOLE = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const ONE_DECIMAL = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "195 / 250" for whole targets, "9.4 / 13.1" when the target itself has a decimal (half marathon, 2.4 mile swim). */
export function formatProgress(current: number, threshold: number): string {
  const fmt = Number.isInteger(threshold) ? WHOLE : ONE_DECIMAL;
  return `${fmt.format(current)} / ${fmt.format(threshold)}`;
}

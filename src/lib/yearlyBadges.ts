import { categorizeSport } from "./sport";
import { milesToMeters } from "./units";

/** First calendar year yearly badges are awarded for. */
export const YEARLY_BADGES_START_YEAR = 2027;

export type BadgeTier = "BRONZE" | "SILVER" | "GOLD";
export type SportBadgeType = "RIDE" | "RUN" | "SWIM";
export type YearlyBadgeType = SportBadgeType | "COMPLETE";

export const TIERS: BadgeTier[] = ["BRONZE", "SILVER", "GOLD"];
export const tierRank = (t: BadgeTier | null): number => (t ? TIERS.indexOf(t) + 1 : 0);

/** Miles in a calendar year needed for bronze / silver / gold. */
export const YEARLY_THRESHOLD_MILES: Record<SportBadgeType, [number, number, number]> = {
  RIDE: [2500, 5000, 7500],
  RUN: [1000, 1500, 2000],
  SWIM: [150, 300, 500],
};

export const YEARLY_BADGE_LABELS: Record<YearlyBadgeType, string> = {
  RIDE: "Century Rider",
  RUN: "Road Warrior",
  SWIM: "Open Water Legend",
  COMPLETE: "Complete Athlete",
};

export function tierForMeters(meters: number, type: SportBadgeType): BadgeTier | null {
  const [bronze, silver, gold] = YEARLY_THRESHOLD_MILES[type].map(milesToMeters);
  if (meters >= gold) return "GOLD";
  if (meters >= silver) return "SILVER";
  if (meters >= bronze) return "BRONZE";
  return null;
}

export interface YearlyActivity {
  startDateLocal: Date;
  sportType: string;
  distanceMeters: number;
}

export type YearlyTiers = Record<YearlyBadgeType, BadgeTier | null>;

export function yearlyMeters(activities: YearlyActivity[], year: number): Record<SportBadgeType, number> {
  const totals: Record<SportBadgeType, number> = { RIDE: 0, RUN: 0, SWIM: 0 };
  for (const a of activities) {
    if (a.startDateLocal.getUTCFullYear() !== year) continue;
    const category = categorizeSport(a.sportType);
    if (category === "ride") totals.RIDE += a.distanceMeters;
    else if (category === "run") totals.RUN += a.distanceMeters;
    else if (category === "swim") totals.SWIM += a.distanceMeters;
  }
  return totals;
}

/** Tier per badge for one calendar year. Complete Athlete is the lowest of the three sport tiers. */
export function computeYearlyTiers(activities: YearlyActivity[], year: number): YearlyTiers {
  const meters = yearlyMeters(activities, year);
  const ride = tierForMeters(meters.RIDE, "RIDE");
  const run = tierForMeters(meters.RUN, "RUN");
  const swim = tierForMeters(meters.SWIM, "SWIM");
  const lowest = Math.min(tierRank(ride), tierRank(run), tierRank(swim));
  return { RIDE: ride, RUN: run, SWIM: swim, COMPLETE: lowest > 0 ? TIERS[lowest - 1] : null };
}

export interface StoredYearlyBadge {
  tier: BadgeTier;
  bronzeAt: Date;
  silverAt: Date | null;
  goldAt: Date | null;
}

/**
 * Merges a freshly computed tier into what is already stored. Badges only ever
 * move up: a lower computed tier (e.g. after a Strava delete) changes nothing.
 * Returns null when there is nothing to write.
 */
export function mergeYearlyTier(
  existing: StoredYearlyBadge | null,
  computed: BadgeTier | null,
  now: Date,
): StoredYearlyBadge | null {
  if (!computed) return null;
  if (existing && tierRank(computed) <= tierRank(existing.tier)) return null;
  const rank = tierRank(computed);
  return {
    tier: computed,
    bronzeAt: existing?.bronzeAt ?? now,
    silverAt: existing?.silverAt ?? (rank >= 2 ? now : null),
    goldAt: existing?.goldAt ?? (rank >= 3 ? now : null),
  };
}

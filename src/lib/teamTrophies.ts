import { categorizeSport } from "./sport";
import { weekNumber } from "./streaks";
import { metersToMiles } from "./units";
import { TIERS, tierRank, type BadgeTier } from "./yearlyBadges";

/** First calendar year team trophies are awarded for. Earlier years show progress as a preview only. */
export const TEAM_TROPHIES_START_YEAR = 2027;

/** In a "Full Roster" month, this share of the members on the roster must have logged an activity. */
export const FULL_ROSTER_SHARE = 0.8;
/** A roster smaller than this can't qualify a month (so a brand-new club doesn't win it by default). */
export const FULL_ROSTER_MIN_MEMBERS = 5;
export const EARTH_CIRCUMFERENCE_MILES = 24_901;
export const EVEREST_FEET = 29_032;

const FEET_PER_METER = 3.28084;

export interface TeamActivity {
  userId: string;
  sportType: string;
  /** Strava's athlete-local start time (wall-clock digits labelled UTC), read with UTC getters. */
  startDateLocal: Date;
  distanceMeters: number;
  movingTimeSeconds: number;
  totalElevationGain: number;
}

export interface TeamYearStats {
  year: number;
  /** Members with at least one activity in the year: everyone who receives the trophies. */
  recipients: number;
  distanceMiles: number;
  movingHours: number;
  elevationFeet: number;
  swimMiles: number;
  kudosGiven: number;
  /** Months in which at least FULL_ROSTER_SHARE of the roster was active. */
  fullRosterMonths: number;
  /** Different members who had a week with a swim, a ride and a run. */
  tripleThreatMembers: number;
  /** Growth in distance over the previous year in percent, or null if last year isn't a fair comparison. */
  growthPercent: number | null;
}

export interface TeamTrophyDef {
  key: string;
  name: string;
  /** One line on what the team has to do. */
  blurb: string;
  /** Bronze, silver and gold targets, in the units of `value`. */
  thresholds: [number, number, number];
  /** The team's current number, or null when it can't be measured yet. */
  value: (stats: TeamYearStats) => number | null;
  /** How a value or target reads, e.g. "24,901 mi". */
  format: (n: number) => string;
  /** Shown instead of progress when `value` is null. */
  unavailable?: string;
}

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export const TEAM_TROPHIES: TeamTrophyDef[] = [
  {
    key: "around-the-world",
    name: "Around the World",
    blurb: "The team logs enough miles to circle the Earth (24,901 miles), then does it again.",
    thresholds: [EARTH_CIRCUMFERENCE_MILES, EARTH_CIRCUMFERENCE_MILES * 2, EARTH_CIRCUMFERENCE_MILES * 3],
    value: (s) => s.distanceMiles,
    format: (n) => `${whole.format(n)} mi`,
  },
  {
    key: "ten-thousand-hours",
    name: "10,000 Hour Club",
    blurb: "The team spends 10,000 hours moving in one year.",
    thresholds: [5_000, 7_500, 10_000],
    value: (s) => s.movingHours,
    format: (n) => `${whole.format(n)} hrs`,
  },
  {
    key: "everest",
    name: "Everest Expedition",
    blurb: "The team climbs the height of Mount Everest (29,032 ft) again and again.",
    thresholds: [25, 50, 75],
    value: (s) => s.elevationFeet / EVEREST_FEET,
    format: (n) => `${one.format(n)} Everests`,
  },
  {
    key: "full-roster",
    name: "Full Roster",
    blurb: "In a month, at least 80% of the club's members log an activity. Count the months.",
    thresholds: [6, 9, 12],
    value: (s) => s.fullRosterMonths,
    format: (n) => `${whole.format(n)} months`,
  },
  {
    key: "triple-threat-team",
    name: "Triple Threat Team",
    blurb: "Different members each complete a week with a swim, a ride and a run.",
    thresholds: [10, 20, 25],
    value: (s) => s.tripleThreatMembers,
    format: (n) => `${whole.format(n)} members`,
  },
  {
    key: "cheer-squad",
    name: "Cheer Squad",
    blurb: "Members give each other kudos on the club site.",
    thresholds: [250, 500, 1_000],
    value: (s) => s.kudosGiven,
    format: (n) => `${whole.format(n)} kudos`,
  },
  {
    key: "pool-party",
    name: "Pool Party",
    blurb: "The team swims a lot of miles together.",
    thresholds: [250, 500, 1_000],
    value: (s) => s.swimMiles,
    format: (n) => `${whole.format(n)} mi swum`,
  },
  {
    key: "bigger-than-last-year",
    name: "Bigger Than Last Year",
    blurb: "The team logs more miles than it did the year before.",
    thresholds: [0.1, 10, 25],
    value: (s) => s.growthPercent,
    format: (n) => `+${one.format(n)}%`,
    unavailable:
      "Needs a full year of activity last year to compare against, so this starts the year after the first full year.",
  },
];

export const TEAM_TROPHIES_BY_KEY = new Map(TEAM_TROPHIES.map((t) => [t.key, t]));

/** The highest tier a value reaches, or null. */
export function tierForValue(value: number | null, thresholds: [number, number, number]): BadgeTier | null {
  if (value === null) return null;
  let tier: BadgeTier | null = null;
  thresholds.forEach((target, i) => {
    if (value >= target) tier = TIERS[i];
  });
  return tier;
}

export interface TeamTrophyProgress {
  def: TeamTrophyDef;
  value: number | null;
  /** The tier reached right now. */
  tier: BadgeTier | null;
  /** The next target and how far along the team is (0 to 1), or null once gold is reached. */
  next: { tier: BadgeTier; target: number; progress: number } | null;
}

export function trophyProgress(def: TeamTrophyDef, stats: TeamYearStats): TeamTrophyProgress {
  const value = def.value(stats);
  const tier = tierForValue(value, def.thresholds);
  let next: TeamTrophyProgress["next"] = null;
  if (value !== null && tierRank(tier) < 3) {
    const target = def.thresholds[tierRank(tier)];
    next = { tier: TIERS[tierRank(tier)], target, progress: Math.max(0, Math.min(1, value / target)) };
  }
  return { def, value, tier, next };
}

export function evaluateTeamTrophies(stats: TeamYearStats): TeamTrophyProgress[] {
  return TEAM_TROPHIES.map((def) => trophyProgress(def, stats));
}

/** Years before this are shown as a preview and never awarded. */
export const isAwardYear = (year: number) => year >= TEAM_TROPHIES_START_YEAR;

/** Distinct calendar months (0 to 11) with any activity. */
function monthsWithActivity(activities: { startDateLocal: Date }[]): Set<number> {
  return new Set(activities.map((a) => a.startDateLocal.getUTCMonth()));
}

export interface TeamStatsInput {
  year: number;
  /** Activities whose local start date is in `year`. */
  activities: TeamActivity[];
  /** When each member's first-ever synced activity happened; a member is on the roster from that month on. */
  firstActivityByUser: Map<string, Date>;
  kudosGiven: number;
  /** The previous calendar year's activities, for the growth comparison. */
  previousYearActivities: { startDateLocal: Date; distanceMeters: number }[];
  /** Used to leave future months out of "Full Roster". */
  now?: Date;
}

export function computeTeamYearStats(input: TeamStatsInput): TeamYearStats {
  const { year, kudosGiven, previousYearActivities, firstActivityByUser } = input;
  const now = input.now ?? new Date();
  const activities = input.activities.filter((a) => a.startDateLocal.getUTCFullYear() === year);

  let meters = 0;
  let seconds = 0;
  let elevationMeters = 0;
  let swimMeters = 0;
  const recipients = new Set<string>();
  const activeByMonth: Set<string>[] = Array.from({ length: 12 }, () => new Set<string>());
  const sportsByUserWeek = new Map<string, Set<string>>();

  for (const a of activities) {
    meters += a.distanceMeters;
    seconds += a.movingTimeSeconds;
    elevationMeters += a.totalElevationGain;
    recipients.add(a.userId);
    activeByMonth[a.startDateLocal.getUTCMonth()].add(a.userId);

    const category = categorizeSport(a.sportType);
    if (category === "swim") swimMeters += a.distanceMeters;
    if (category !== "other") {
      const key = `${a.userId}:${weekNumber(a.startDateLocal)}`;
      const set = sportsByUserWeek.get(key) ?? new Set<string>();
      set.add(category);
      sportsByUserWeek.set(key, set);
    }
  }

  const tripleUsers = new Set<string>();
  for (const [key, set] of sportsByUserWeek) if (set.size === 3) tripleUsers.add(key.slice(0, key.lastIndexOf(":")));

  // Full Roster: count months where enough of the roster (everyone who had started by then) was active.
  let fullRosterMonths = 0;
  for (let month = 0; month < 12; month++) {
    const monthStart = Date.UTC(year, month, 1);
    if (monthStart > now.getTime()) continue; // a month that hasn't begun can't count
    const monthEnd = Date.UTC(year, month + 1, 1);
    let roster = 0;
    for (const first of firstActivityByUser.values()) if (first.getTime() < monthEnd) roster += 1;
    if (roster >= FULL_ROSTER_MIN_MEMBERS && activeByMonth[month].size / roster >= FULL_ROSTER_SHARE)
      fullRosterMonths += 1;
  }

  // Growth is only a fair comparison against a year that had activity in every month.
  let growthPercent: number | null = null;
  const previousYear = previousYearActivities.filter((a) => a.startDateLocal.getUTCFullYear() === year - 1);
  if (monthsWithActivity(previousYear).size === 12) {
    const previousMiles = metersToMiles(previousYear.reduce((sum, a) => sum + a.distanceMeters, 0));
    if (previousMiles > 0) growthPercent = (metersToMiles(meters) / previousMiles - 1) * 100;
  }

  return {
    year,
    recipients: recipients.size,
    distanceMiles: metersToMiles(meters),
    movingHours: seconds / 3600,
    elevationFeet: elevationMeters * FEET_PER_METER,
    swimMiles: metersToMiles(swimMeters),
    kudosGiven,
    fullRosterMonths,
    tripleThreatMembers: tripleUsers.size,
    growthPercent,
  };
}

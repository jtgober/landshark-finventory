import type { AthleteStats } from "./athleteStats";
import { HOLIDAYS } from "./holidays";

export type AchievementMetric = keyof AthleteStats;
export type AchievementCategory = "volume" | "consistency" | "skill" | "habit" | "club";

export type GlyphKey =
  | "pin"
  | "run"
  | "ride"
  | "swim"
  | "stopwatch"
  | "flame"
  | "calendar"
  | "trio"
  | "mountain"
  | "hourglass"
  | "sunrise"
  | "moon"
  | "bricks"
  | "bricks3"
  | "weekend"
  | "seasons"
  | "refresh"
  | "flag"
  | "fin"
  | "gift"
  | "target"
  | "grid"
  | "sparkle"
  | "heart"
  | "clover"
  | "egg"
  | "horseshoe"
  | "star"
  | "firework"
  | "hammer"
  | "pumpkin"
  | "turkey"
  | "tree"
  | "clock";

/** Custom badge colors, used instead of the level's metal (for example for holidays). */
export interface BadgePalette {
  rim: string;
  face: string;
  highlight: string;
  ink: string;
}

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  category: AchievementCategory;
  metric: AchievementMetric;
  threshold: number;
  /** Badge family (ladder) this belongs to, e.g. "run-miles". */
  family: string;
  /** 1-based rung within its family; drives the badge's metal. */
  level: number;
  glyph: GlyphKey;
  /** Short text printed on the badge, e.g. "100 mi". */
  label: string;
  /** Overrides the metal color for this badge when earned. */
  palette?: BadgePalette;
  /** A stand-alone badge (not a rung to climb), so it never appears under "next up". */
  oneOff?: boolean;
}

export interface AchievementFamily {
  key: string;
  title: string;
  glyph: GlyphKey;
  /** Section heading on the badges page. */
  group: string;
  /** A set of separate badges to collect, rather than a ladder, so no progress bar is shown. */
  collection?: boolean;
}

/** Display order for the badges page; families sharing a `group` are listed under one heading. */
export const ACHIEVEMENT_FAMILIES: AchievementFamily[] = [
  { key: "total-miles", title: "Total distance", glyph: "pin", group: "Distance and time" },
  { key: "run-miles", title: "Running", glyph: "run", group: "Distance and time" },
  { key: "ride-miles", title: "Cycling", glyph: "ride", group: "Distance and time" },
  { key: "swim-miles", title: "Swimming", glyph: "swim", group: "Distance and time" },
  { key: "activities", title: "Activities logged", glyph: "stopwatch", group: "Distance and time" },
  { key: "time-on-feet", title: "Time on feet", glyph: "hourglass", group: "Distance and time" },
  { key: "climber", title: "Climber", glyph: "mountain", group: "Distance and time" },
  { key: "big-ride", title: "Big day: ride", glyph: "ride", group: "Big days" },
  { key: "big-run", title: "Big day: run", glyph: "run", group: "Big days" },
  { key: "big-swim", title: "Big day: swim", glyph: "swim", group: "Big days" },
  { key: "day-streak", title: "Daily streak", glyph: "flame", group: "Consistency" },
  { key: "week-streak", title: "Weekly streak", glyph: "calendar", group: "Consistency" },
  { key: "weekend-warrior", title: "Weekend warrior", glyph: "weekend", group: "Consistency" },
  { key: "comeback", title: "Comeback", glyph: "refresh", group: "Consistency" },
  { key: "monthly-miles", title: "Monthly challenge: miles", glyph: "target", group: "Consistency" },
  { key: "monthly-activities", title: "Monthly challenge: activities", glyph: "target", group: "Consistency" },
  { key: "every-discipline", title: "All three sports", glyph: "trio", group: "Triathlon" },
  { key: "brick", title: "Brick", glyph: "bricks", group: "Triathlon" },
  { key: "triple-brick", title: "Triple brick", glyph: "bricks3", group: "Triathlon" },
  { key: "early-bird", title: "Early bird", glyph: "sunrise", group: "Habits" },
  { key: "night-owl", title: "Night owl", glyph: "moon", group: "Habits" },
  { key: "four-seasons", title: "Four seasons", glyph: "seasons", group: "Habits" },
  { key: "holiday-days", title: "Holiday activities", glyph: "gift", group: "Holidays", collection: true },
  { key: "holiday-collector", title: "Holiday collector", glyph: "gift", group: "Holidays" },
  { key: "variety", title: "Variety", glyph: "grid", group: "Habits" },
  { key: "race-ready", title: "Race ready", glyph: "flag", group: "Club" },
  { key: "club-regular", title: "Club regular", glyph: "fin", group: "Club" },
];

const fmt = (n: number) => n.toLocaleString("en-US");

function volume(
  metric: AchievementMetric,
  slug: string,
  label: string,
  thresholds: number[],
  unit: string,
  glyph: GlyphKey,
  badgeUnit: string,
): AchievementDef[] {
  return thresholds.map((t, i) => ({
    key: `${slug}-${t}`,
    name: `${fmt(t)} ${unit}${label ? ` ${label}` : ""}`.trim(),
    description: `${fmt(t)} total ${unit}${label ? ` ${label}` : ""} logged.`,
    category: "volume",
    metric,
    threshold: t,
    family: slug,
    level: i + 1,
    glyph,
    label: `${fmt(t)} ${badgeUnit}`,
  }));
}

function streak(
  metric: AchievementMetric,
  slug: string,
  unit: string,
  thresholds: number[],
  glyph: GlyphKey,
  badgeUnit: string,
): AchievementDef[] {
  return thresholds.map((t, i) => ({
    key: `${slug}-${t}`,
    name: `${t} ${unit} in a row`,
    description: `Active ${t} ${unit} in a row.`,
    category: "consistency",
    metric,
    threshold: t,
    family: slug,
    level: i + 1,
    glyph,
    label: `${t} ${badgeUnit}`,
  }));
}

type Row = [threshold: number, name: string, description: string, label: string];

/** A ladder with hand-written names, for achievements that don't fit the volume/streak patterns. */
function ladder(
  slug: string,
  metric: AchievementMetric,
  category: AchievementCategory,
  glyph: GlyphKey,
  rows: Row[],
): AchievementDef[] {
  return rows.map(([threshold, name, description, label], i) => ({
    key: `${slug}-${threshold}`,
    name,
    description,
    category,
    metric,
    threshold,
    family: slug,
    level: i + 1,
    glyph,
    label,
  }));
}

export const ACHIEVEMENTS: AchievementDef[] = [
  ...volume("totalMiles", "total-miles", "total", [100, 500, 1000, 2500], "mi", "pin", "mi"),
  ...volume("runMiles", "run-miles", "run", [100, 500, 1000], "mi", "run", "mi"),
  ...volume("rideMiles", "ride-miles", "ridden", [250, 1000, 2500], "mi", "ride", "mi"),
  ...volume("swimMiles", "swim-miles", "swum", [10, 50, 100], "mi", "swim", "mi"),
  ...volume("activityCount", "activities", "", [10, 50, 100, 250], "activities", "stopwatch", "acts"),
  ...streak("dayStreak", "day-streak", "days", [3, 7, 14, 30], "flame", "days"),
  ...streak("weekStreak", "week-streak", "weeks", [4, 8, 12, 26], "calendar", "wks"),
  ...ladder("time-on-feet", "movingHours", "volume", "hourglass", [
    [50, "50 hours moving", "50 hours of moving time logged.", "50 hrs"],
    [100, "100 hours moving", "100 hours of moving time logged.", "100 hrs"],
    [250, "250 hours moving", "250 hours of moving time logged.", "250 hrs"],
    [500, "500 hours moving", "500 hours of moving time logged.", "500 hrs"],
  ]),
  ...ladder("climber", "elevationFeet", "volume", "mountain", [
    [5000, "5,000 ft climbed", "5,000 feet of elevation gained.", "5K ft"],
    [15000, "15,000 ft climbed", "15,000 feet of elevation gained.", "15K ft"],
    [29032, "Everest climbed", "29,032 feet gained, the height of Everest.", "29K ft"],
    [100000, "100,000 ft climbed", "100,000 feet of elevation gained.", "100K ft"],
  ]),
  ...ladder("big-ride", "longestRideMiles", "skill", "ride", [
    [50, "50 mile ride", "A single ride of 50 miles or more.", "50 mi"],
    [75, "75 mile ride", "A single ride of 75 miles or more.", "75 mi"],
    [100, "Century ride", "A single ride of 100 miles or more.", "100 mi"],
  ]),
  ...ladder("big-run", "longestRunMiles", "skill", "run", [
    [10, "10 mile run", "A single run of 10 miles or more.", "10 mi"],
    [13.1, "Half marathon run", "A single run of 13.1 miles or more.", "13.1 mi"],
    [26.2, "Marathon run", "A single run of 26.2 miles or more.", "26.2 mi"],
  ]),
  ...ladder("big-swim", "longestSwimMiles", "skill", "swim", [
    [1, "1 mile swim", "A single swim of 1 mile or more.", "1 mi"],
    [2.4, "Ironman swim", "A single swim of 2.4 miles or more.", "2.4 mi"],
    [4, "4 mile swim", "A single swim of 4 miles or more.", "4 mi"],
  ]),
  ...ladder("weekend-warrior", "weekendStreak", "consistency", "weekend", [
    [2, "2 weekends in a row", "Active on both Saturday and Sunday, 2 weekends running.", "2 wknds"],
    [4, "4 weekends in a row", "Active on both Saturday and Sunday, 4 weekends running.", "4 wknds"],
    [8, "8 weekends in a row", "Active on both Saturday and Sunday, 8 weekends running.", "8 wknds"],
    [12, "12 weekends in a row", "Active on both Saturday and Sunday, 12 weekends running.", "12 wknds"],
  ]),
  ...ladder("comeback", "comebacks", "consistency", "refresh", [
    [1, "Comeback", "Back at it after 30 or more days off.", "1x"],
    [3, "Comeback kid", "Came back after 30 or more days off, 3 times.", "3x"],
  ]),
  ...ladder("monthly-miles", "bestMonthMiles", "consistency", "target", [
    [100, "100 miles in a month", "100 miles or more in one calendar month.", "100 mi"],
    [200, "200 miles in a month", "200 miles or more in one calendar month.", "200 mi"],
    [300, "300 miles in a month", "300 miles or more in one calendar month.", "300 mi"],
    [500, "500 miles in a month", "500 miles or more in one calendar month.", "500 mi"],
  ]),
  ...ladder("monthly-activities", "bestMonthActivities", "consistency", "target", [
    [20, "20 activities in a month", "20 or more activities in one calendar month.", "20 acts"],
    [30, "30 activities in a month", "30 or more activities in one calendar month.", "30 acts"],
  ]),
  ...ladder("brick", "brickDays", "skill", "bricks", [
    [1, "First brick", "A ride and a run on the same day.", "1 brick"],
    [5, "5 brick days", "A ride and a run on the same day, 5 times.", "5 bricks"],
    [15, "15 brick days", "A ride and a run on the same day, 15 times.", "15 bricks"],
  ]),
  ...ladder("triple-brick", "tripleBrickDays", "skill", "bricks3", [
    [1, "Triple brick", "A swim, a ride and a run on the same day.", "1x"],
    [3, "3 triple bricks", "A swim, a ride and a run on the same day, 3 times.", "3x"],
    [10, "10 triple bricks", "A swim, a ride and a run on the same day, 10 times.", "10x"],
  ]),
  ...ladder("early-bird", "earlyCount", "habit", "sunrise", [
    [10, "Early bird", "10 activities started before 6 am.", "10 early"],
    [25, "Early bird: 25", "25 activities started before 6 am.", "25 early"],
    [50, "Early bird: 50", "50 activities started before 6 am.", "50 early"],
  ]),
  ...ladder("night-owl", "nightCount", "habit", "moon", [
    [10, "Night owl", "10 activities started at or after 8 pm.", "10 late"],
    [25, "Night owl: 25", "25 activities started at or after 8 pm.", "25 late"],
    [50, "Night owl: 50", "50 activities started at or after 8 pm.", "50 late"],
  ]),
  {
    key: "four-seasons-3",
    name: "Three seasons",
    description: "Active in three different seasons within one calendar year.",
    category: "habit",
    metric: "seasonsInYear",
    threshold: 3,
    family: "four-seasons",
    level: 1,
    glyph: "seasons",
    label: "3 of 4",
  },
  {
    key: "four-seasons-4",
    name: "Four seasons",
    description: "Active in winter, spring, summer and fall of one calendar year.",
    category: "habit",
    metric: "seasonsInYear",
    threshold: 4,
    family: "four-seasons",
    level: 2,
    glyph: "seasons",
    label: "4 of 4",
  },
  {
    key: "four-seasons-12",
    name: "Every month",
    description: "Active in all twelve months of one calendar year.",
    category: "habit",
    metric: "monthsInYear",
    threshold: 12,
    family: "four-seasons",
    level: 3,
    glyph: "seasons",
    label: "12 mo",
  },
  ...HOLIDAYS.map(
    (h): AchievementDef => ({
      key: `holiday-${h.id}`,
      name: h.name,
      description: h.description,
      category: "habit",
      metric: `holiday:${h.id}`,
      threshold: 1,
      family: "holiday-days",
      level: 1,
      glyph: h.glyph,
      label: h.label,
      palette: h.palette,
      oneOff: true,
    }),
  ),
  ...ladder("holiday-collector", "holidayTypes", "habit", "gift", [
    [3, "Holiday regular", "Logged activities on 3 different holidays.", "3 of 12"],
    [6, "Holiday fan", "Logged activities on 6 different holidays.", "6 of 12"],
    [12, "Every holiday", "Logged activities on all 12 holidays.", "All 12"],
  ]),
  ...ladder("variety", "sportTypes", "habit", "grid", [
    [3, "3 kinds of activity", "Logged 3 different Strava activity types.", "3 types"],
    [5, "5 kinds of activity", "Logged 5 different Strava activity types.", "5 types"],
    [8, "8 kinds of activity", "Logged 8 different Strava activity types.", "8 types"],
  ]),
  ...ladder("race-ready", "raceSignups", "club", "flag", [
    [1, "Race ready", "Signed up for a race on the club calendar.", "1 race"],
    [3, "3 races", "Signed up for 3 races on the club calendar.", "3 races"],
    [10, "10 races", "Signed up for 10 races on the club calendar.", "10 races"],
  ]),
  ...ladder("club-regular", "memberDays", "club", "fin", [
    [90, "3 months in the club", "A club member for 3 months.", "3 mo"],
    [180, "6 months in the club", "A club member for 6 months.", "6 mo"],
    [365, "1 year in the club", "A club member for a year.", "1 yr"],
    [730, "2 years in the club", "A club member for 2 years.", "2 yr"],
  ]),
  {
    key: "every-discipline-week",
    name: "Every discipline",
    description: "Run, ride and swim all in the same week.",
    category: "consistency",
    metric: "completeWeek",
    threshold: 1,
    family: "every-discipline",
    level: 4,
    glyph: "trio",
    label: "3 sports",
  },
];

export const ACHIEVEMENTS_BY_KEY = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

/** Keys of every achievement the stats currently qualify for. */
export function evaluateAchievements(stats: AthleteStats): string[] {
  return ACHIEVEMENTS.filter((a) => stats[a.metric] >= a.threshold).map((a) => a.key);
}

export interface NextUp {
  def: AchievementDef;
  current: number;
  /** 0..1 progress toward the threshold. */
  progress: number;
}

/** For each metric, the lowest achievement not yet earned (the natural next goal). */
export function nextUpAchievements(stats: AthleteStats, earnedKeys: Set<string>): NextUp[] {
  const byMetric = new Map<AchievementMetric, AchievementDef>();
  for (const def of ACHIEVEMENTS) {
    if (def.oneOff || earnedKeys.has(def.key) || stats[def.metric] >= def.threshold) continue;
    const existing = byMetric.get(def.metric);
    if (!existing || def.threshold < existing.threshold) byMetric.set(def.metric, def);
  }
  return [...byMetric.values()].map((def) => {
    const current = stats[def.metric];
    return { def, current, progress: Math.max(0, Math.min(1, current / def.threshold)) };
  });
}

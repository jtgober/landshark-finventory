import type { AthleteStats } from "./athleteStats";

export type AchievementMetric = keyof AthleteStats;
export type AchievementCategory = "volume" | "consistency";

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  category: AchievementCategory;
  metric: AchievementMetric;
  threshold: number;
}

const fmt = (n: number) => n.toLocaleString("en-US");

function volume(metric: AchievementMetric, slug: string, label: string, thresholds: number[], unit: string): AchievementDef[] {
  return thresholds.map((t) => ({
    key: `${slug}-${t}`,
    name: `${fmt(t)} ${unit}${label ? ` ${label}` : ""}`.trim(),
    description: `${fmt(t)} total ${unit}${label ? ` ${label}` : ""} logged.`,
    category: "volume",
    metric,
    threshold: t,
  }));
}

function streak(metric: AchievementMetric, slug: string, unit: string, thresholds: number[]): AchievementDef[] {
  return thresholds.map((t) => ({
    key: `${slug}-${t}`,
    name: `${t} ${unit} in a row`,
    description: `Active ${t} ${unit} in a row.`,
    category: "consistency",
    metric,
    threshold: t,
  }));
}

export const ACHIEVEMENTS: AchievementDef[] = [
  ...volume("totalMiles", "total-miles", "total", [100, 500, 1000, 2500], "mi"),
  ...volume("runMiles", "run-miles", "run", [100, 500, 1000], "mi"),
  ...volume("rideMiles", "ride-miles", "ridden", [250, 1000, 2500], "mi"),
  ...volume("swimMiles", "swim-miles", "swum", [10, 50, 100], "mi"),
  ...volume("activityCount", "activities", "", [10, 50, 100, 250], "activities"),
  ...streak("dayStreak", "day-streak", "days", [3, 7, 14, 30]),
  ...streak("weekStreak", "week-streak", "weeks", [4, 8, 12, 26]),
  {
    key: "every-discipline-week",
    name: "Every discipline",
    description: "Run, ride and swim all in the same week.",
    category: "consistency",
    metric: "completeWeek",
    threshold: 1,
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
    if (earnedKeys.has(def.key) || stats[def.metric] >= def.threshold) continue;
    const existing = byMetric.get(def.metric);
    if (!existing || def.threshold < existing.threshold) byMetric.set(def.metric, def);
  }
  return [...byMetric.values()].map((def) => {
    const current = stats[def.metric];
    return { def, current, progress: Math.max(0, Math.min(1, current / def.threshold)) };
  });
}

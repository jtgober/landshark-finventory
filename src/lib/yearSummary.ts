import { categorizeSport } from "./sport";
import { longestDayStreak, longestWeekStreak } from "./streaks";

export interface YearActivity {
  startDateLocal: Date;
  sportType: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  totalElevationGain: number;
}

/** The part of a year summary derived purely from activities. */
export interface YearActivityStats {
  runMeters: number;
  rideMeters: number;
  swimMeters: number;
  totalMeters: number;
  activityCount: number;
  movingSeconds: number;
  elevationMeters: number;
  longestActivityMeters: number;
  bestDayStreak: number;
  bestWeekStreak: number;
  /** Distance per calendar month, index 0 = January. */
  monthlyMeters: number[];
}

export interface YearSummary extends YearActivityStats {
  kudosReceived: number;
  kudosGiven: number;
  racesEntered: number;
  achievementsEarned: number;
}

export function summarizeYearActivities(activities: YearActivity[], year: number): YearActivityStats {
  const inYear = activities.filter((a) => a.startDateLocal.getUTCFullYear() === year);
  const stats: YearActivityStats = {
    runMeters: 0,
    rideMeters: 0,
    swimMeters: 0,
    totalMeters: 0,
    activityCount: inYear.length,
    movingSeconds: 0,
    elevationMeters: 0,
    longestActivityMeters: 0,
    bestDayStreak: longestDayStreak(inYear.map((a) => a.startDateLocal)),
    bestWeekStreak: longestWeekStreak(inYear.map((a) => a.startDateLocal)),
    monthlyMeters: new Array(12).fill(0),
  };

  for (const a of inYear) {
    const category = categorizeSport(a.sportType);
    if (category === "run") stats.runMeters += a.distanceMeters;
    else if (category === "ride") stats.rideMeters += a.distanceMeters;
    else if (category === "swim") stats.swimMeters += a.distanceMeters;
    stats.totalMeters += a.distanceMeters;
    stats.movingSeconds += a.movingTimeSeconds;
    stats.elevationMeters += a.totalElevationGain;
    stats.longestActivityMeters = Math.max(stats.longestActivityMeters, a.distanceMeters);
    stats.monthlyMeters[a.startDateLocal.getUTCMonth()] += a.distanceMeters;
  }
  return stats;
}

/** 1-based rank among `totals` (ties share a rank) and how many members were active. */
export function rankInClub(totals: number[], mine: number): { rank: number; of: number; topPercent: number } {
  const of = totals.length;
  const rank = 1 + totals.filter((t) => t > mine).length;
  return { rank, of, topPercent: of === 0 ? 100 : Math.max(1, Math.ceil((rank / of) * 100)) };
}

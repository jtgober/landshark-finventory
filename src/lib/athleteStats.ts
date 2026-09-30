import { categorizeSport } from "./sport";
import { longestDayStreak, longestWeekStreak, weekNumber } from "./streaks";
import { metersToMiles } from "./units";

export interface StatActivity {
  startDateLocal: Date;
  sportType: string;
  distanceMeters: number;
}

export interface AthleteStats {
  totalMiles: number;
  runMiles: number;
  rideMiles: number;
  swimMiles: number;
  activityCount: number;
  dayStreak: number;
  weekStreak: number;
  /** 1 if any Mon-Sun week contains a run, a ride and a swim, else 0. */
  completeWeek: number;
}

export function computeAthleteStats(activities: StatActivity[]): AthleteStats {
  let total = 0;
  let run = 0;
  let ride = 0;
  let swim = 0;
  const sportsByWeek = new Map<number, Set<string>>();

  for (const a of activities) {
    total += a.distanceMeters;
    const category = categorizeSport(a.sportType);
    if (category === "run") run += a.distanceMeters;
    else if (category === "ride") ride += a.distanceMeters;
    else if (category === "swim") swim += a.distanceMeters;

    if (category !== "other") {
      const week = weekNumber(a.startDateLocal);
      const set = sportsByWeek.get(week) ?? new Set<string>();
      set.add(category);
      sportsByWeek.set(week, set);
    }
  }

  const dates = activities.map((a) => a.startDateLocal);
  return {
    totalMiles: metersToMiles(total),
    runMiles: metersToMiles(run),
    rideMiles: metersToMiles(ride),
    swimMiles: metersToMiles(swim),
    activityCount: activities.length,
    dayStreak: longestDayStreak(dates),
    weekStreak: longestWeekStreak(dates),
    completeWeek: [...sportsByWeek.values()].some((s) => s.size === 3) ? 1 : 0,
  };
}

import { categorizeSport } from "./sport";
import { HOLIDAYS, holidaysOn } from "./holidays";
import { dayNumber, longestConsecutiveRun, longestDayStreak, longestWeekStreak, weekNumber } from "./streaks";
import { metersToMiles } from "./units";

export interface StatActivity {
  startDateLocal: Date;
  sportType: string;
  distanceMeters: number;
  movingTimeSeconds?: number;
  totalElevationGain?: number;
}

/** Facts about a member that don't come from their activities. */
export interface StatExtras {
  raceSignups?: number;
  /** When the member joined the site. */
  memberSince?: Date | null;
  /** Injectable clock for tests. */
  now?: Date;
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
  elevationFeet: number;
  movingHours: number;
  longestRideMiles: number;
  longestRunMiles: number;
  longestSwimMiles: number;
  /** Activities started before 6 am local time. */
  earlyCount: number;
  /** Activities started at or after 8 pm local time. */
  nightCount: number;
  /** Days with both a ride and a run. */
  brickDays: number;
  /** Days with a swim, a ride and a run. */
  tripleBrickDays: number;
  /** Most Mon-Sun weeks in a row with activity on both the Saturday and the Sunday. */
  weekendStreak: number;
  /** Most distinct seasons (winter, spring, summer, fall) covered in one calendar year. */
  seasonsInYear: number;
  /** Most distinct months covered in one calendar year. */
  monthsInYear: number;
  /** Times activity resumed after 30 or more days with nothing logged. */
  comebacks: number;
  /** Distinct tracked holidays (across all years) with an activity. */
  holidayTypes: number;
  bestMonthMiles: number;
  bestMonthActivities: number;
  /** Distinct Strava sport types logged. */
  sportTypes: number;
  raceSignups: number;
  memberDays: number;
  /** 1 if the member has ever logged an activity on that holiday, else 0 (one per entry in HOLIDAYS). */
  [holiday: `holiday:${string}`]: number;
}

const METERS_TO_FEET = 3.28084;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** A comeback needs more than this many days between two active days. */
const COMEBACK_GAP_DAYS = 30;

/** Season index for a 0-based month: winter (Dec-Feb), spring, summer, fall. */
function seasonOfMonth(month: number): number {
  if (month === 11 || month <= 1) return 0;
  return Math.floor((month - 2) / 3) + 1;
}

function maxSetSize(byYear: Map<number, Set<number>>): number {
  let best = 0;
  for (const set of byYear.values()) best = Math.max(best, set.size);
  return best;
}

export function computeAthleteStats(activities: StatActivity[], extras: StatExtras = {}): AthleteStats {
  let total = 0;
  let run = 0;
  let ride = 0;
  let swim = 0;
  let movingSeconds = 0;
  let elevationMeters = 0;
  let longestRide = 0;
  let longestRun = 0;
  let longestSwim = 0;
  let early = 0;
  let night = 0;
  const sportsByWeek = new Map<number, Set<string>>();
  const sportsByDay = new Map<number, Set<string>>();
  const seasonsByYear = new Map<number, Set<number>>();
  const monthsByYear = new Map<number, Set<number>>();
  const daysByWeek = new Map<number, Set<number>>();
  const holidaysSeen = new Set<string>();
  const milesByMonth = new Map<number, number>();
  const countByMonth = new Map<number, number>();
  const sportTypes = new Set<string>();

  for (const a of activities) {
    total += a.distanceMeters;
    movingSeconds += a.movingTimeSeconds ?? 0;
    elevationMeters += a.totalElevationGain ?? 0;
    sportTypes.add(a.sportType);

    const category = categorizeSport(a.sportType);
    if (category === "run") {
      run += a.distanceMeters;
      longestRun = Math.max(longestRun, a.distanceMeters);
    } else if (category === "ride") {
      ride += a.distanceMeters;
      longestRide = Math.max(longestRide, a.distanceMeters);
    } else if (category === "swim") {
      swim += a.distanceMeters;
      longestSwim = Math.max(longestSwim, a.distanceMeters);
    }

    const week = weekNumber(a.startDateLocal);
    const day = dayNumber(a.startDateLocal);
    if (category !== "other") {
      const weekSet = sportsByWeek.get(week) ?? new Set<string>();
      weekSet.add(category);
      sportsByWeek.set(week, weekSet);
      const daySet = sportsByDay.get(day) ?? new Set<string>();
      daySet.add(category);
      sportsByDay.set(day, daySet);
    }

    const hour = a.startDateLocal.getUTCHours();
    if (hour < 6) early += 1;
    if (hour >= 20) night += 1;

    const year = a.startDateLocal.getUTCFullYear();
    const month = a.startDateLocal.getUTCMonth();
    const seasons = seasonsByYear.get(year) ?? new Set<number>();
    seasons.add(seasonOfMonth(month));
    seasonsByYear.set(year, seasons);
    const months = monthsByYear.get(year) ?? new Set<number>();
    months.add(month);
    monthsByYear.set(year, months);

    const weekDays = daysByWeek.get(week) ?? new Set<number>();
    weekDays.add(a.startDateLocal.getUTCDay());
    daysByWeek.set(week, weekDays);

    for (const id of holidaysOn(a.startDateLocal)) holidaysSeen.add(id);

    const monthKey = year * 12 + month;
    milesByMonth.set(monthKey, (milesByMonth.get(monthKey) ?? 0) + a.distanceMeters);
    countByMonth.set(monthKey, (countByMonth.get(monthKey) ?? 0) + 1);
  }

  const dates = activities.map((a) => a.startDateLocal);

  const activeDays = [...new Set(dates.map(dayNumber))].sort((x, y) => x - y);
  let comebacks = 0;
  for (let i = 1; i < activeDays.length; i++) {
    if (activeDays[i] - activeDays[i - 1] > COMEBACK_GAP_DAYS) comebacks += 1;
  }

  const sportDays = [...sportsByDay.values()];
  const hasAll = (s: Set<string>, ...needed: string[]) => needed.every((n) => s.has(n));

  const weekendWeeks = [...daysByWeek.entries()].filter(([, days]) => days.has(6) && days.has(0)).map(([w]) => w);

  const now = extras.now ?? new Date();
  const memberDays = extras.memberSince
    ? Math.max(0, Math.floor((now.getTime() - extras.memberSince.getTime()) / MS_PER_DAY))
    : 0;

  const stats: AthleteStats = {
    totalMiles: metersToMiles(total),
    runMiles: metersToMiles(run),
    rideMiles: metersToMiles(ride),
    swimMiles: metersToMiles(swim),
    activityCount: activities.length,
    dayStreak: longestDayStreak(dates),
    weekStreak: longestWeekStreak(dates),
    completeWeek: [...sportsByWeek.values()].some((s) => s.size === 3) ? 1 : 0,
    elevationFeet: elevationMeters * METERS_TO_FEET,
    movingHours: movingSeconds / 3600,
    longestRideMiles: metersToMiles(longestRide),
    longestRunMiles: metersToMiles(longestRun),
    longestSwimMiles: metersToMiles(longestSwim),
    earlyCount: early,
    nightCount: night,
    brickDays: sportDays.filter((s) => hasAll(s, "ride", "run")).length,
    tripleBrickDays: sportDays.filter((s) => hasAll(s, "swim", "ride", "run")).length,
    weekendStreak: longestConsecutiveRun(weekendWeeks),
    seasonsInYear: maxSetSize(seasonsByYear),
    monthsInYear: maxSetSize(monthsByYear),
    comebacks,
    holidayTypes: holidaysSeen.size,
    bestMonthMiles: metersToMiles(Math.max(0, ...milesByMonth.values())),
    bestMonthActivities: Math.max(0, ...countByMonth.values()),
    sportTypes: sportTypes.size,
    raceSignups: extras.raceSignups ?? 0,
    memberDays,
  };
  for (const h of HOLIDAYS) stats[`holiday:${h.id}`] = holidaysSeen.has(h.id) ? 1 : 0;
  return stats;
}

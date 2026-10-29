import { categorizeSport } from "./sport";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface MonthlyActivity {
  userId: string;
  memberName: string;
  sportType: string;
  /** Strava's athlete-local start time (wall-clock digits labelled UTC), so read it with UTC getters. */
  startDateLocal: Date;
  distanceMeters: number;
  movingTimeSeconds: number;
  totalElevationGain: number;
}

export interface MonthRow {
  /** 0 = January. */
  month: number;
  activities: number;
  activeMembers: number;
  distanceMeters: number;
  runMeters: number;
  rideMeters: number;
  swimMeters: number;
  movingSeconds: number;
  elevationMeters: number;
  runElevationMeters: number;
  rideElevationMeters: number;
}

export interface MemberMonthly {
  userId: string;
  name: string;
  /** Distance per month, index 0 = January. */
  meters: number[];
  totalMeters: number;
}

export interface MonthlyReport {
  year: number;
  /** Always twelve rows, January to December, including months with no activity. */
  months: MonthRow[];
  /** Different members active at any point in the year (not the sum of the monthly counts). */
  yearActiveMembers: number;
  /** Members with activity in the year, biggest total first. */
  members: MemberMonthly[];
}

/** Totals for each month of a calendar year, for the club and for each member. */
export function buildMonthlyReport(activities: MonthlyActivity[], year: number): MonthlyReport {
  const months: MonthRow[] = Array.from({ length: 12 }, (_, month) => ({
    month,
    activities: 0,
    activeMembers: 0,
    distanceMeters: 0,
    runMeters: 0,
    rideMeters: 0,
    swimMeters: 0,
    movingSeconds: 0,
    elevationMeters: 0,
    runElevationMeters: 0,
    rideElevationMeters: 0,
  }));
  const usersByMonth: Set<string>[] = Array.from({ length: 12 }, () => new Set<string>());
  const yearUsers = new Set<string>();
  const members = new Map<string, MemberMonthly>();

  for (const a of activities) {
    if (a.startDateLocal.getUTCFullYear() !== year) continue;
    const month = a.startDateLocal.getUTCMonth();
    const row = months[month];
    row.activities += 1;
    row.distanceMeters += a.distanceMeters;
    row.movingSeconds += a.movingTimeSeconds;
    row.elevationMeters += a.totalElevationGain;
    const category = categorizeSport(a.sportType);
    if (category === "run") {
      row.runMeters += a.distanceMeters;
      row.runElevationMeters += a.totalElevationGain;
    } else if (category === "ride") {
      row.rideMeters += a.distanceMeters;
      row.rideElevationMeters += a.totalElevationGain;
    } else if (category === "swim") {
      row.swimMeters += a.distanceMeters;
    }

    usersByMonth[month].add(a.userId);
    yearUsers.add(a.userId);
    const member = members.get(a.userId) ?? {
      userId: a.userId,
      name: a.memberName,
      meters: new Array<number>(12).fill(0),
      totalMeters: 0,
    };
    member.meters[month] += a.distanceMeters;
    member.totalMeters += a.distanceMeters;
    members.set(a.userId, member);
  }
  months.forEach((row, i) => (row.activeMembers = usersByMonth[i].size));

  return {
    year,
    months,
    yearActiveMembers: yearUsers.size,
    members: [...members.values()].sort((a, b) => b.totalMeters - a.totalMeters || a.name.localeCompare(b.name)),
  };
}

import { categorizeSport } from "./sport";

export interface MetricActivity {
  userId: string;
  startDateLocal: Date;
  sportType: string;
  distanceMeters: number;
}

export interface ClubYearMetrics {
  totalMeters: number;
  activityCount: number;
  activeMembers: number;
  monthlyMeters: number[];
  /** Distinct members with at least one activity, per month (index 0 = January). */
  activeMembersByMonth: number[];
  sportMeters: { run: number; ride: number; swim: number };
  /** Per-member totals, each sorted by distance descending. */
  leaderboards: Record<"total" | "run" | "ride" | "swim", { userId: string; meters: number }[]>;
}

export function aggregateClubYear(activities: MetricActivity[], year: number): ClubYearMetrics {
  const inYear = activities.filter((a) => a.startDateLocal.getUTCFullYear() === year);
  const monthlyMeters = new Array<number>(12).fill(0);
  const monthUsers: Set<string>[] = Array.from({ length: 12 }, () => new Set<string>());
  const sportMeters = { run: 0, ride: 0, swim: 0 };
  const perUser = {
    total: new Map<string, number>(),
    run: new Map<string, number>(),
    ride: new Map<string, number>(),
    swim: new Map<string, number>(),
  };
  const add = (m: Map<string, number>, id: string, n: number) => m.set(id, (m.get(id) ?? 0) + n);
  let totalMeters = 0;

  for (const a of inYear) {
    const month = a.startDateLocal.getUTCMonth();
    totalMeters += a.distanceMeters;
    monthlyMeters[month] += a.distanceMeters;
    monthUsers[month].add(a.userId);
    add(perUser.total, a.userId, a.distanceMeters);
    const category = categorizeSport(a.sportType);
    if (category === "run" || category === "ride" || category === "swim") {
      sportMeters[category] += a.distanceMeters;
      add(perUser[category], a.userId, a.distanceMeters);
    }
  }

  const sortUsers = (m: Map<string, number>) =>
    [...m.entries()].map(([userId, meters]) => ({ userId, meters })).sort((a, b) => b.meters - a.meters);

  return {
    totalMeters,
    activityCount: inYear.length,
    activeMembers: perUser.total.size,
    monthlyMeters,
    activeMembersByMonth: monthUsers.map((s) => s.size),
    sportMeters,
    leaderboards: {
      total: sortUsers(perUser.total),
      run: sortUsers(perUser.run),
      ride: sortUsers(perUser.ride),
      swim: sortUsers(perUser.swim),
    },
  };
}

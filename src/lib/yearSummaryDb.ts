import { prisma } from "./prisma";
import { summarizeYearActivities, type YearSummary } from "./yearSummary";

const yearBounds = (year: number) => ({
  gte: new Date(Date.UTC(year, 0, 1)),
  lt: new Date(Date.UTC(year + 1, 0, 1)),
});

export async function computeLiveSummary(userId: string, year: number): Promise<YearSummary> {
  const bounds = yearBounds(year);
  const [activities, kudosReceived, kudosGiven, racesEntered, achievementsEarned] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, startDateLocal: bounds },
      select: { startDateLocal: true, sportType: true, distanceMeters: true, movingTimeSeconds: true, totalElevationGain: true },
    }),
    prisma.kudos.count({ where: { activity: { userId, startDateLocal: bounds } } }),
    prisma.kudos.count({ where: { giverId: userId, createdAt: bounds } }),
    prisma.raceSignup.count({ where: { userId, race: { date: bounds } } }),
    prisma.userAchievement.count({ where: { userId, awardedAt: bounds } }),
  ]);
  return { ...summarizeYearActivities(activities, year), kudosReceived, kudosGiven, racesEntered, achievementsEarned };
}

export interface MemberYearSummary {
  year: number;
  summary: YearSummary;
  /** True when read from the frozen snapshot rather than computed live. */
  finalized: boolean;
}

export async function getMemberYearSummary(userId: string, year: number): Promise<MemberYearSummary> {
  const snapshot = await prisma.athleteYearSummary.findUnique({ where: { userId_year: { userId, year } } });
  if (snapshot) {
    const { id: _id, userId: _u, year: _y, finalizedAt: _f, monthlyMeters, ...rest } = snapshot;
    return { year, finalized: true, summary: { ...rest, monthlyMeters: monthlyMeters as number[] } };
  }
  return { year, finalized: false, summary: await computeLiveSummary(userId, year) };
}

/** Every year a member has any data (activity or snapshot), oldest first. */
export async function getMemberYears(userId: string): Promise<number[]> {
  const [activities, snapshots] = await Promise.all([
    prisma.activity.findMany({ where: { userId }, select: { startDateLocal: true } }),
    prisma.athleteYearSummary.findMany({ where: { userId }, select: { year: true } }),
  ]);
  const years = new Set<number>(snapshots.map((s) => s.year));
  for (const a of activities) years.add(a.startDateLocal.getUTCFullYear());
  return [...years].sort((a, b) => a - b);
}

export async function getMemberYearSummaries(userId: string): Promise<MemberYearSummary[]> {
  const years = await getMemberYears(userId);
  return Promise.all(years.map((y) => getMemberYearSummary(userId, y)));
}

/** Total meters per active member for a year: from snapshots once finalized, else live. */
export async function clubYearTotals(year: number): Promise<number[]> {
  const snapshots = await prisma.athleteYearSummary.findMany({ where: { year }, select: { totalMeters: true } });
  if (snapshots.length > 0) return snapshots.map((s) => s.totalMeters).filter((t) => t > 0);

  const rows = await prisma.activity.findMany({
    where: { startDateLocal: yearBounds(year) },
    select: { userId: true, distanceMeters: true },
  });
  const byUser = new Map<string, number>();
  for (const r of rows) byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + r.distanceMeters);
  return [...byUser.values()].filter((t) => t > 0);
}

/** Freezes (or re-freezes) every member's summary for a year. Returns how many were written. */
export async function finalizeYear(year: number): Promise<number> {
  const users = await prisma.user.findMany({ select: { id: true } });
  const now = new Date();
  for (const { id } of users) {
    const summary = await computeLiveSummary(id, year);
    await prisma.athleteYearSummary.upsert({
      where: { userId_year: { userId: id, year } },
      create: { userId: id, year, ...summary, finalizedAt: now },
      update: { ...summary, finalizedAt: now },
    });
  }
  return users.length;
}

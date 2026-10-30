import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { mergeYearlyTier, type BadgeTier } from "./yearlyBadges";
import {
  TEAM_TROPHIES_BY_KEY,
  TEAM_TROPHIES_START_YEAR,
  computeTeamYearStats,
  evaluateTeamTrophies,
  isAwardYear,
  type TeamTrophyProgress,
  type TeamYearStats,
} from "./teamTrophies";

/** True when the TeamTrophyAward table hasn't been created yet (deployed before `prisma db push`). */
export const isMissingTable = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022");

const yearBounds = (year: number) => ({ gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) });

const ACTIVITY_SELECT = {
  userId: true,
  sportType: true,
  startDateLocal: true,
  distanceMeters: true,
  movingTimeSeconds: true,
  totalElevationGain: true,
} as const;

/** The club's numbers for one calendar year, computed from stored activity. */
export async function loadTeamYearStats(year: number, now = new Date()): Promise<TeamYearStats> {
  const [activities, previousYearActivities, firsts, kudosGiven] = await Promise.all([
    prisma.activity.findMany({ where: { startDateLocal: yearBounds(year) }, select: ACTIVITY_SELECT }),
    prisma.activity.findMany({
      where: { startDateLocal: yearBounds(year - 1) },
      select: { startDateLocal: true, distanceMeters: true },
    }),
    prisma.activity.groupBy({ by: ["userId"], _min: { startDateLocal: true } }),
    prisma.kudos.count({ where: { createdAt: yearBounds(year) } }),
  ]);

  const firstActivityByUser = new Map<string, Date>();
  for (const f of firsts) if (f._min.startDateLocal) firstActivityByUser.set(f.userId, f._min.startDateLocal);

  return computeTeamYearStats({
    year,
    activities,
    firstActivityByUser,
    kudosGiven,
    previousYearActivities,
    now,
  });
}

export interface StoredTeamTrophy {
  year: number;
  key: string;
  tier: BadgeTier;
  bronzeAt: Date;
  silverAt: Date | null;
  goldAt: Date | null;
}

/** Every team trophy awarded so far for a year. Empty if the table doesn't exist yet. */
export async function getTeamAwards(years: number[]): Promise<StoredTeamTrophy[]> {
  if (!years.length) return [];
  try {
    return await prisma.teamTrophyAward.findMany({ where: { year: { in: years } } });
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

/**
 * Checks the club's numbers for a year and stores any newly reached trophy level. Everyone who logged an
 * activity that year receives the trophies (recipients are derived when read, not stored per member).
 * Years before 2027 and years that haven't started are never awarded. Tiers only go up.
 */
export async function awardTeamTrophies(
  year: number,
  now = new Date(),
): Promise<{ year: number; written: number; progress: TeamTrophyProgress[] }> {
  if (!isAwardYear(year) || year > now.getUTCFullYear()) return { year, written: 0, progress: [] };

  const stats = await loadTeamYearStats(year, now);
  const progress = evaluateTeamTrophies(stats);
  const existing = await prisma.teamTrophyAward.findMany({ where: { year } });

  let written = 0;
  for (const p of progress) {
    const current = existing.find((e) => e.key === p.def.key) ?? null;
    const next = mergeYearlyTier(current, p.tier, now);
    if (!next) continue;
    await prisma.teamTrophyAward.upsert({
      where: { year_key: { year, key: p.def.key } },
      create: { year, key: p.def.key, ...next },
      update: next,
    });
    written += 1;
  }
  return { year, written, progress };
}

const THROTTLE_MS = 60_000;
let lastRun = 0;

/**
 * Best-effort check of the current year, for after a webhook or a kudos. Never throws, and runs at most once a
 * minute per server instance so a burst of activity doesn't re-read the whole year every time.
 */
export async function awardCurrentYearQuietly(now = new Date()): Promise<void> {
  if (!isAwardYear(now.getUTCFullYear())) return;
  if (now.getTime() - lastRun < THROTTLE_MS) return;
  lastRun = now.getTime();
  try {
    await awardTeamTrophies(now.getUTCFullYear(), now);
  } catch (err) {
    if (!isMissingTable(err)) console.error("Failed to award team trophies", err);
  }
}

/** Years (2027 on) a member can hold team trophies for: the ones in which they logged an activity. */
export async function getMemberTrophyYears(userId: string): Promise<number[]> {
  const rows = await prisma.activity.findMany({
    where: { userId, startDateLocal: { gte: new Date(Date.UTC(TEAM_TROPHIES_START_YEAR, 0, 1)) } },
    select: { startDateLocal: true },
  });
  return [...new Set(rows.map((r) => r.startDateLocal.getUTCFullYear()))].sort((a, b) => b - a);
}

export interface MemberTeamTrophyYear {
  year: number;
  awards: (StoredTeamTrophy & { name: string })[];
}

/** The team trophies a member holds, newest year first, one entry per year they logged an activity. */
export async function getMemberTeamTrophies(userId: string): Promise<MemberTeamTrophyYear[]> {
  const years = await getMemberTrophyYears(userId);
  const awards = await getTeamAwards(years);
  return years.map((year) => ({
    year,
    awards: awards
      .filter((a) => a.year === year && TEAM_TROPHIES_BY_KEY.has(a.key))
      .map((a) => ({ ...a, name: TEAM_TROPHIES_BY_KEY.get(a.key)!.name })),
  }));
}

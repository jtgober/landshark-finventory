import { prisma } from "./prisma";
import { computeAthleteStats } from "./athleteStats";
import { evaluateAchievements } from "./achievements";
import {
  computeYearlyTiers,
  mergeYearlyTier,
  YEARLY_BADGES_START_YEAR,
  type YearlyBadgeType,
} from "./yearlyBadges";

const BADGE_TYPES: YearlyBadgeType[] = ["RIDE", "RUN", "SWIM", "COMPLETE"];

/**
 * Recomputes one member's lifetime achievements and yearly badges from their
 * stored activities and writes anything newly earned. Safe to call repeatedly;
 * awards are only ever added or upgraded, never removed.
 */
export async function awardForUser(userId: string, now = new Date()) {
  const activities = await prisma.activity.findMany({
    where: { userId },
    select: { startDateLocal: true, sportType: true, distanceMeters: true },
  });

  const earnedKeys = evaluateAchievements(computeAthleteStats(activities));
  const created = earnedKeys.length
    ? (await prisma.userAchievement.createMany({
        data: earnedKeys.map((key) => ({ userId, key, awardedAt: now })),
        skipDuplicates: true,
      })).count
    : 0;

  const years = new Set(activities.map((a) => a.startDateLocal.getUTCFullYear()));
  const eligibleYears = [...years].filter((y) => y >= YEARLY_BADGES_START_YEAR);
  let badgeWrites = 0;

  if (eligibleYears.length) {
    const existing = await prisma.userYearlyBadge.findMany({ where: { userId, year: { in: eligibleYears } } });
    for (const year of eligibleYears) {
      const tiers = computeYearlyTiers(activities, year);
      for (const badge of BADGE_TYPES) {
        const current = existing.find((e) => e.year === year && e.badge === badge) ?? null;
        const next = mergeYearlyTier(current, tiers[badge], now);
        if (!next) continue;
        await prisma.userYearlyBadge.upsert({
          where: { userId_year_badge: { userId, year, badge } },
          create: { userId, year, badge, ...next },
          update: next,
        });
        badgeWrites += 1;
      }
    }
  }

  return { achievementsCreated: created, yearlyBadgeWrites: badgeWrites };
}

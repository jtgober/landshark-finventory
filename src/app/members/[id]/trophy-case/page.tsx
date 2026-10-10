import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NavBar from "@/components/NavBar";
import { AchievementBadge, YearlyMedal } from "@/components/BadgeArt";
import { ACHIEVEMENTS, ACHIEVEMENT_FAMILIES } from "@/lib/achievements";
import { computeAthleteStats } from "@/lib/athleteStats";
import { metersToMiles } from "@/lib/units";
import { formatProgress } from "@/lib/badgeProgress";
import {
  TIERS,
  YEARLY_BADGE_LABELS,
  YEARLY_BADGES_START_YEAR,
  YEARLY_THRESHOLD_MILES,
  yearlyMeters,
  type BadgeTier,
  type SportBadgeType,
  type YearlyBadgeType,
} from "@/lib/yearlyBadges";

const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtNum = (n: number) => Math.round(n).toLocaleString("en-US");
const TIER_LABEL: Record<BadgeTier, string> = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold" };
const GROUPS = [...new Set(ACHIEVEMENT_FAMILIES.map((f) => f.group))];
const YEARLY_TYPES: YearlyBadgeType[] = ["RIDE", "RUN", "SWIM", "COMPLETE"];

export default async function MemberBadgesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const { id } = await params;
  const member = await prisma.user.findUnique({
    where: { id },
    select: { firstName: true, lastName: true, createdAt: true },
  });
  if (!member) notFound();

  const [activities, earned, yearly, raceSignups] = await Promise.all([
    prisma.activity.findMany({
      where: { userId: id },
      select: {
        startDateLocal: true,
        sportType: true,
        distanceMeters: true,
        movingTimeSeconds: true,
        totalElevationGain: true,
      },
    }),
    prisma.userAchievement.findMany({ where: { userId: id }, select: { key: true, awardedAt: true } }),
    prisma.userYearlyBadge.findMany({ where: { userId: id } }),
    prisma.raceSignup.count({ where: { userId: id } }),
  ]);

  const stats = computeAthleteStats(activities, { raceSignups, memberSince: member.createdAt });
  const earnedAt = new Map(earned.map((e) => [e.key, e.awardedAt]));
  const earnedCount = ACHIEVEMENTS.filter((a) => earnedAt.has(a.key)).length;

  const name = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || "Club Member";
  const isSelf = id === session.user.id;

  const currentYear = new Date().getFullYear();
  const yearlyActive = currentYear >= YEARLY_BADGES_START_YEAR;
  const yearMeters = yearlyMeters(activities, currentYear);
  const years = [...new Set([...yearly.map((b) => b.year), ...(yearlyActive ? [currentYear] : [])])].sort(
    (a, b) => b - a,
  );
  const yearlyByKey = new Map(yearly.map((b) => [`${b.year}-${b.badge}`, b]));

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <Link href={`/members/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
          &larr; Back to {isSelf ? "my profile" : name}
        </Link>
        <h1 className="text-2xl font-bold">{isSelf ? "My trophy case" : `${name}'s trophy case`}</h1>
        <p className="mb-6 text-sm text-gray-500">
          {earnedCount} of {ACHIEVEMENTS.length} trophies earned. Counts activity synced since this member connected to
          the site.
        </p>

        {GROUPS.map((group) => (
          <div key={group} className="mt-6 first:mt-0">
            <h2 className="mb-2 text-lg font-bold">{group}</h2>
            <div className="space-y-4">
              {ACHIEVEMENT_FAMILIES.filter((f) => f.group === group).map((family) => {
                const defs = ACHIEVEMENTS.filter((a) => a.family === family.key).sort((a, b) => a.level - b.level);
                const next = defs.find((d) => !earnedAt.has(d.key) && stats[d.metric] < d.threshold);
                const familyEarned = defs.filter((d) => earnedAt.has(d.key)).length;
                return (
                  <section key={family.key} className="rounded-lg border bg-white p-4">
                    <div className="mb-3 flex items-baseline justify-between gap-2">
                      <h2 className="font-semibold">{family.title}</h2>
                      <span className="text-xs text-gray-500">
                        {familyEarned} / {defs.length}
                      </span>
                    </div>
                    <ul className="flex flex-wrap gap-x-4 gap-y-3">
                      {defs.map((def) => {
                        const at = earnedAt.get(def.key);
                        return (
                          <li key={def.key} className="flex w-[84px] flex-col items-center text-center">
                            <AchievementBadge def={def} earned={!!at} size={76} />
                            <p className={`mt-1 text-xs font-medium ${at ? "text-gray-900" : "text-gray-400"}`}>
                              {def.name}
                            </p>
                            <p className="text-[11px] text-gray-500">{at ? fmtDate(at) : "Locked"}</p>
                          </li>
                        );
                      })}
                    </ul>
                    {next && !family.collection && family.key !== "every-discipline" && (
                      <div className="mt-3 border-t pt-3">
                        <div className="mb-1 flex justify-between gap-2 text-xs text-gray-600">
                          <span>Next: {next.name}</span>
                          <span className="shrink-0">{formatProgress(stats[next.metric], next.threshold)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-orange-500"
                            style={{ width: `${Math.round(Math.min(1, stats[next.metric] / next.threshold) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {next && family.key === "every-discipline" && (
                      <p className="mt-3 border-t pt-3 text-xs text-gray-600">
                        Run, ride and swim all in the same Monday to Sunday week.
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        ))}

        <h2 className="mb-1 mt-8 text-xl font-bold">Yearly trophies</h2>
        <p className="mb-4 text-sm text-gray-500">
          {yearlyActive
            ? "Rare calendar-year medals in bronze, silver and gold. They upgrade as your miles grow and are never taken away."
            : `Rare calendar-year medals in bronze, silver and gold. They start in ${YEARLY_BADGES_START_YEAR}.`}
        </p>

        <div className="space-y-4">
          {years.map((year) => (
            <section key={year} className="rounded-lg border bg-white p-4">
              <h3 className="mb-3 font-semibold">{year}</h3>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {YEARLY_TYPES.map((type) => {
                  const badge = yearlyByKey.get(`${year}-${type}`);
                  const tier = badge?.tier ?? null;
                  const sportMiles = type === "COMPLETE" ? null : metersToMiles(yearMeters[type as SportBadgeType]);
                  const nextTarget =
                    year === currentYear && type !== "COMPLETE" && sportMiles !== null
                      ? YEARLY_THRESHOLD_MILES[type as SportBadgeType].find((t) => sportMiles < t)
                      : undefined;
                  return (
                    <li key={type} className="flex flex-col items-center text-center">
                      <YearlyMedal type={type} tier={tier} size={92} />
                      <p className={`mt-1 text-sm font-medium ${tier ? "text-gray-900" : "text-gray-400"}`}>
                        {YEARLY_BADGE_LABELS[type]}
                      </p>
                      <p className="text-xs text-gray-500">{tier ? TIER_LABEL[tier] : "Locked"}</p>
                      {nextTarget !== undefined && sportMiles !== null && (
                        <p className="text-[11px] text-gray-500">
                          {fmtNum(sportMiles)} / {fmtNum(nextTarget)} mi
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {!yearlyActive && (
            <section className="rounded-lg border bg-white p-4">
              <h3 className="mb-3 font-semibold">How to earn them</h3>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {YEARLY_TYPES.map((type) => (
                  <li key={type} className="flex flex-col items-center text-center">
                    <YearlyMedal type={type} tier={null} size={92} />
                    <p className="mt-1 text-sm font-medium text-gray-500">{YEARLY_BADGE_LABELS[type]}</p>
                    <p className="text-[11px] text-gray-500">
                      {type === "COMPLETE"
                        ? "Same level in all three"
                        : `${YEARLY_THRESHOLD_MILES[type as SportBadgeType].map(fmtNum).join(" / ")} mi`}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                {TIERS.map((t) => TIER_LABEL[t]).join(" / ")} miles within the calendar year.
              </p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

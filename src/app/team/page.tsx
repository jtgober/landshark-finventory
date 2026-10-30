import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NavBar from "@/components/NavBar";
import { TeamTrophyCup } from "@/components/BadgeArt";
import { evaluateTeamTrophies, isAwardYear, TEAM_TROPHIES_START_YEAR } from "@/lib/teamTrophies";
import { awardCurrentYearQuietly, getTeamAwards, loadTeamYearStats } from "@/lib/teamTrophiesDb";
import { tierRank, type BadgeTier } from "@/lib/yearlyBadges";

const TIER_LABEL: Record<BadgeTier, string> = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold" };
const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const FIRST_PREVIEW_YEAR = 2026;

const tierDate = (a: { tier: BadgeTier; bronzeAt: Date; silverAt: Date | null; goldAt: Date | null }) =>
  (a.tier === "GOLD" ? a.goldAt : a.tier === "SILVER" ? a.silverAt : a.bronzeAt) ?? a.bronzeAt;

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const currentYear = new Date().getFullYear();
  const lastYear = Math.max(currentYear, TEAM_TROPHIES_START_YEAR);
  const years: number[] = [];
  for (let y = lastYear; y >= FIRST_PREVIEW_YEAR; y--) years.push(y);

  const requested = Number((await searchParams).year);
  const year = years.includes(requested) ? requested : currentYear;
  const awardYear = isAwardYear(year);
  // Viewing the page is also a chance to record anything the team has newly earned.
  after(() => awardCurrentYearQuietly());

  const [stats, awards, myActivities] = await Promise.all([
    loadTeamYearStats(year),
    awardYear ? getTeamAwards([year]) : Promise.resolve([]),
    prisma.activity.count({
      where: {
        userId: session.user.id,
        startDateLocal: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
      },
    }),
  ]);
  const storedByKey = new Map(awards.map((a) => [a.key, a]));
  const trophies = evaluateTeamTrophies(stats);
  const earnedCount = trophies.filter((p) => tierRank(p.tier) > 0 || storedByKey.has(p.def.key)).length;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <h1 className="text-2xl font-bold">Team Landshark trophies</h1>
        <p className="mb-4 mt-1 text-sm text-gray-500">
          Club-wide goals we chase together. Everyone who logs an activity in the calendar year gets every trophy the
          team earns, in bronze, silver or gold. They upgrade as the year goes and are never taken away.
        </p>

        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {years.map((y) => (
            <Link
              key={y}
              href={`/team?year=${y}`}
              className={`rounded-full border px-3 py-1 ${
                y === year ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 text-gray-600"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>

        {!awardYear ? (
          <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            Preview only. Team trophies are awarded for {TEAM_TROPHIES_START_YEAR} and later; this shows how
            {` ${year} `}would have scored so far.
          </p>
        ) : (
          <p className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
            {myActivities > 0
              ? `You're on the ${year} team: you've logged ${myActivities} ${myActivities === 1 ? "activity" : "activities"}, so you get every trophy the team earns.`
              : `Log an activity in ${year} to be on the team and receive its trophies.`}{" "}
            {stats.recipients} {stats.recipients === 1 ? "member has" : "members have"} qualified so far.
          </p>
        )}

        <p className="mb-3 text-sm text-gray-500">
          {earnedCount} of {trophies.length} trophies {awardYear ? "earned" : "reached"} in {year}.
        </p>

        <ul className="space-y-3">
          {trophies.map((p) => {
            const stored = storedByKey.get(p.def.key);
            const tier = tierRank(stored?.tier ?? null) > tierRank(p.tier) ? stored!.tier : p.tier;
            const nextTarget = tier ? (tier === "GOLD" ? null : p.def.thresholds[tierRank(tier)]) : p.def.thresholds[0];
            return (
              <li key={p.def.key} className="flex gap-4 rounded-lg border bg-white p-4">
                <TeamTrophyCup tier={tier} year={year} size={84} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <h2 className={`font-semibold ${tier ? "text-gray-900" : "text-gray-500"}`}>{p.def.name}</h2>
                    <span className="text-xs text-gray-500">{tier ? TIER_LABEL[tier] : "Locked"}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600">{p.def.blurb}</p>
                  {p.value === null ? (
                    <p className="mt-2 text-xs text-gray-500">{p.def.unavailable}</p>
                  ) : (
                    <>
                      <div className="mt-2 flex justify-between gap-2 text-xs text-gray-600">
                        <span>{p.def.format(p.value)} so far</span>
                        <span className="shrink-0">
                          {nextTarget !== null && nextTarget !== undefined
                            ? `Next: ${p.def.format(nextTarget)}`
                            : "Gold reached"}
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-orange-500"
                          style={{
                            width: `${Math.round((nextTarget ? Math.min(1, p.value / nextTarget) : 1) * 100)}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                  {awardYear && stored && stored.tier === tier && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      {TIER_LABEL[stored.tier]} earned {fmtDate(tierDate(stored))}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}

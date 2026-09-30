import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatDuration, formatElevation } from "@/lib/format";
import { ACHIEVEMENTS_BY_KEY } from "@/lib/achievements";
import { metersToMiles } from "@/lib/units";
import { rankInClub } from "@/lib/yearSummary";
import { clubYearTotals, getMemberYears, getMemberYearSummaries, getMemberYearSummary } from "@/lib/yearSummaryDb";
import { YEARLY_BADGE_LABELS } from "@/lib/yearlyBadges";
import NavBar from "@/components/NavBar";
import MonthlyBars from "@/components/MonthlyBars";
import YearOverYearTable from "@/components/YearOverYearTable";

const miles = (m: number) => Math.round(metersToMiles(m)).toLocaleString("en-US");
const TIER_LABEL = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold" } as const;

export default async function YearInReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ member?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/");

  const { year: yearParam } = await params;
  const { member } = await searchParams;
  const year = Number(yearParam);
  const currentYear = new Date().getUTCFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > currentYear) notFound();

  const targetId = member && me.isAdmin ? member : me.id;
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, firstName: true, lastName: true } });
  if (!target) notFound();
  const targetName = `${target.firstName ?? ""} ${target.lastName ?? ""}`.trim() || "Club Member";
  const viewingOther = target.id !== me.id;
  const memberQuery = viewingOther ? `?member=${target.id}` : "";

  const bounds = { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
  const [{ summary: s, finalized }, allSummaries, years, totals, yearlyBadges, achievements] = await Promise.all([
    getMemberYearSummary(target.id, year),
    getMemberYearSummaries(target.id),
    getMemberYears(target.id),
    clubYearTotals(year),
    prisma.userYearlyBadge.findMany({ where: { userId: target.id, year } }),
    prisma.userAchievement.findMany({ where: { userId: target.id, awardedAt: bounds }, orderBy: { awardedAt: "asc" } }),
  ]);

  const standing = s.totalMeters > 0 ? rankInClub(totals, s.totalMeters) : null;
  const switcherYears = [...new Set([...years, currentYear])].sort((a, b) => b - a);
  const sports = [
    { label: "Bike", meters: s.rideMeters },
    { label: "Run", meters: s.runMeters },
    { label: "Swim", meters: s.swimMeters },
  ];
  const maxSport = Math.max(...sports.map((x) => x.meters), 1);
  const empty = s.activityCount === 0;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
          &larr; Back to dashboard
        </Link>

        {viewingOther && (
          <p className="mb-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
            Admin view: {targetName}&apos;s {year}.
          </p>
        )}

        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {switcherYears.map((y) => (
            <Link
              key={y}
              href={`/year-in-review/${y}${memberQuery}`}
              className={`rounded-full border px-3 py-1 ${y === year ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 text-gray-600"}`}
            >
              {y}
            </Link>
          ))}
        </div>

        <section className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4 sm:p-6">
          <p className="text-sm font-medium text-orange-800">
            {targetName} &middot; {year} in review
          </p>
          <p className="mt-1 text-4xl font-bold text-orange-900">{miles(s.totalMeters)} mi</p>
          <p className="mt-1 text-sm text-orange-800">
            {s.activityCount} activities &middot; {formatDuration(s.movingSeconds)} moving &middot; {formatElevation(s.elevationMeters)} climbed
          </p>
          {!finalized && (
            <p className="mt-2 text-xs text-orange-700">
              {year === currentYear ? "Year in progress: these numbers are still growing." : "Live numbers: not finalized yet."}
            </p>
          )}
        </section>

        {empty ? (
          <p className="rounded-lg border bg-white p-4 text-sm text-gray-500">No activity recorded for {year}.</p>
        ) : (
          <>
            <section className="mb-6">
              <h2 className="mb-3 text-lg font-semibold">By sport</h2>
              <div className="space-y-2 rounded-lg border bg-white p-4">
                {sports.map((sp) => (
                  <div key={sp.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{sp.label}</span>
                      <span className="text-gray-500">{miles(sp.meters)} mi</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-orange-500" style={{ width: `${(sp.meters / maxSport) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-6">
              <h2 className="mb-3 text-lg font-semibold">Miles per month</h2>
              <div className="rounded-lg border bg-white p-4">
                <MonthlyBars values={s.monthlyMeters} format={(m) => `${miles(m)} mi`} label="Miles" />
              </div>
            </section>

            <section className="mb-6 grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs text-gray-500">Longest effort</p>
                <p className="text-xl font-bold">{miles(s.longestActivityMeters)} mi</p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs text-gray-500">Best streak</p>
                <p className="text-xl font-bold">{s.bestDayStreak} days</p>
                <p className="text-xs text-gray-500">{s.bestWeekStreak} weeks in a row</p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs text-gray-500">Kudos received</p>
                <p className="text-xl font-bold">{s.kudosReceived}</p>
                <p className="text-xs text-gray-500">{s.kudosGiven} given</p>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <p className="text-xs text-gray-500">Races entered</p>
                <p className="text-xl font-bold">{s.racesEntered}</p>
              </div>
            </section>

            {standing && standing.of > 1 && (
              <section className="mb-6 rounded-lg border bg-white p-4">
                <p className="text-xs text-gray-500">Club standing by distance</p>
                <p className="text-xl font-bold">
                  #{standing.rank} of {standing.of}
                </p>
                <p className="text-sm text-gray-500">Top {standing.topPercent}% of active members</p>
              </section>
            )}
          </>
        )}

        {(yearlyBadges.length > 0 || achievements.length > 0) && (
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">Earned in {year}</h2>
            <div className="rounded-lg border bg-white p-4">
              {yearlyBadges.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-2">
                  {yearlyBadges.map((b) => (
                    <li key={b.badge} className="rounded-lg border-2 border-yellow-500 bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-900">
                      {TIER_LABEL[b.tier]} {YEARLY_BADGE_LABELS[b.badge]}
                    </li>
                  ))}
                </ul>
              )}
              <ul className="flex flex-wrap gap-2">
                {achievements.map((a) => (
                  <li key={a.key} className="rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-sm text-orange-900">
                    {ACHIEVEMENTS_BY_KEY.get(a.key)?.name ?? a.key}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {allSummaries.length > 1 && (
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">Year over year</h2>
            <YearOverYearTable summaries={allSummaries} />
          </section>
        )}
      </main>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { aggregateClubYear } from "@/lib/adminMetrics";
import { rankRaces } from "@/lib/raceStats";
import { metersToMiles } from "@/lib/units";
import { formatRaceDate } from "@/lib/format";
import NavBar from "@/components/NavBar";
import MonthlyBars from "@/components/MonthlyBars";

const mi = (meters: number) => Math.round(metersToMiles(meters)).toLocaleString("en-US");
const name = (u?: { firstName: string | null; lastName: string | null }) =>
  `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || "Club Member";
const TIERS = ["BRONZE", "SILVER", "GOLD"] as const;
const BADGES = [["RIDE", "Century Rider"], ["RUN", "Road Warrior"], ["SWIM", "Open Water Legend"], ["COMPLETE", "Complete Athlete"]] as const;

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default async function AdminMetricsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requireAdminPage();

  const currentYear = new Date().getUTCFullYear();
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : currentYear;
  if (!Number.isInteger(year) || year < 2000 || year > currentYear + 1) notFound();

  const bounds = { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [users, activities, yearlyTotals, kudosGiven, races, badgeGroups, inactive] = await Promise.all([
    prisma.user.findMany({ select: { id: true, firstName: true, lastName: true, createdAt: true } }),
    prisma.activity.findMany({ where: { startDateLocal: bounds }, select: { userId: true, startDateLocal: true, sportType: true, distanceMeters: true } }),
    prisma.$queryRaw<{ year: number; activities: number; meters: number; members: number }[]>`
      SELECT EXTRACT(YEAR FROM "startDateLocal")::int AS year, COUNT(*)::int AS activities,
             COALESCE(SUM("distanceMeters"), 0)::float8 AS meters, COUNT(DISTINCT "userId")::int AS members
      FROM "Activity" GROUP BY 1 ORDER BY 1`,
    prisma.kudos.count({ where: { createdAt: bounds } }),
    prisma.race.findMany({
      where: { date: bounds },
      select: { id: true, name: true, date: true, location: true, signups: { select: { userId: true } } },
    }),
    prisma.userYearlyBadge.groupBy({ by: ["badge", "tier"], where: { year }, _count: { _all: true } }),
    prisma.user.findMany({
      where: { activities: { none: { startDate: { gte: since30 } } } },
      select: { id: true, firstName: true, lastName: true, activities: { select: { startDate: true }, orderBy: { startDate: "desc" }, take: 1 } },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const byId = new Map(users.map((u) => [u.id, u]));
  const m = aggregateClubYear(activities, year);
  const newMembers = new Array<number>(12).fill(0);
  for (const u of users) if (bounds.gte <= u.createdAt && u.createdAt < bounds.lt) newMembers[u.createdAt.getUTCMonth()] += 1;
  const newMemberTotal = newMembers.reduce((a, b) => a + b, 0);
  const prev = yearlyTotals.find((y) => y.year === year - 1);
  const change = prev && prev.meters > 0 ? Math.round(((m.totalMeters - prev.meters) / prev.meters) * 100) : null;

  const ranked = rankRaces(races.map((r) => ({ ...r, signupCount: r.signups.length })));
  const signupTotal = ranked.reduce((a, r) => a + r.signupCount, 0);
  const racers = new Set(races.flatMap((r) => r.signups.map((s) => s.userId))).size;
  const years = [...new Set([...yearlyTotals.map((y) => y.year), currentYear])].sort((a, b) => b - a);
  const badgeCount = (badge: string, tier: string) => badgeGroups.find((g) => g.badge === badge && g.tier === tier)?._count._all ?? 0;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
          &larr; Back to admin
        </Link>
        <h1 className="mb-4 text-2xl font-bold">Club metrics</h1>
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          {years.map((y) => (
            <Link key={y} href={`/admin/metrics?year=${y}`} className={`rounded-full border px-3 py-1 ${y === year ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 text-gray-600"}`}>
              {y}
            </Link>
          ))}
        </div>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total distance" value={`${mi(m.totalMeters)} mi`} sub={change === null ? undefined : `${change >= 0 ? "+" : ""}${change}% vs ${year - 1}`} />
          <Stat label="Activities" value={m.activityCount.toLocaleString("en-US")} />
          <Stat label="Active members" value={m.activeMembers} sub={`of ${users.length} connected`} />
          <Stat label="Kudos given" value={kudosGiven} />
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Club miles per month</h2>
          <div className="rounded-lg border bg-white p-4">
            <MonthlyBars values={m.monthlyMeters} format={(v) => `${mi(v)} mi`} label="Club miles" />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Active members per month</h2>
          <div className="rounded-lg border bg-white p-4">
            <MonthlyBars values={m.activeMembersByMonth} format={(v) => `${v} members`} label="Active members" />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">New members per month ({newMemberTotal})</h2>
          <div className="rounded-lg border bg-white p-4">
            <MonthlyBars values={newMembers} format={(v) => `${v} joined`} label="New members" />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Distance by sport</h2>
          <div className="space-y-2 rounded-lg border bg-white p-4">
            {([["Bike", m.sportMeters.ride], ["Run", m.sportMeters.run], ["Swim", m.sportMeters.swim]] as const).map(([label, meters]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="text-gray-500">{mi(meters)} mi</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-orange-500" style={{ width: `${(meters / Math.max(m.sportMeters.ride, m.sportMeters.run, m.sportMeters.swim, 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Top members</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {([["Overall", "total"], ["Bike", "ride"], ["Run", "run"], ["Swim", "swim"]] as const).map(([label, key]) => (
              <div key={key} className="rounded-lg border bg-white p-4">
                <p className="mb-2 text-sm font-semibold">{label}</p>
                {m.leaderboards[key].length === 0 ? (
                  <p className="text-sm text-gray-500">No activity.</p>
                ) : (
                  <ol className="space-y-1 text-sm">
                    {m.leaderboards[key].slice(0, 10).map((row, i) => (
                      <li key={row.userId} className="flex justify-between gap-2">
                        <span className="min-w-0 truncate">
                          <span className="mr-2 text-gray-400">{i + 1}</span>
                          <Link href={`/members/${row.userId}`} className="hover:underline">{name(byId.get(row.userId))}</Link>
                        </span>
                        <span className="shrink-0 text-gray-600">{mi(row.meters)} mi</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Race popularity ({year})</h2>
          <p className="mb-2 text-sm text-gray-500">
            {ranked.length} races &middot; {signupTotal} signups &middot; {racers} members signed up for at least one. Counts intent, and the same
            event added twice splits its count.
          </p>
          {ranked.length === 0 ? (
            <p className="rounded-lg border bg-white p-4 text-sm text-gray-500">No races in {year}.</p>
          ) : (
            <ol className="divide-y overflow-hidden rounded-lg border bg-white">
              {ranked.map((r) => (
                <li key={r.id} className="flex items-center gap-3 p-3">
                  <span className="w-6 shrink-0 text-center font-semibold text-gray-400">{r.rank}</span>
                  <Link href={`/races/${r.id}`} className="min-w-0 flex-1 hover:underline">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="truncate text-xs text-gray-500">{formatRaceDate(r.date)}{r.location ? ` · ${r.location}` : ""}</p>
                  </Link>
                  <span className="shrink-0 text-sm font-semibold">{r.signupCount}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Yearly badges ({year})</h2>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full min-w-max text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="p-3 font-medium" />
                  {TIERS.map((t) => <th key={t} className="p-3 text-right font-medium">{t[0] + t.slice(1).toLowerCase()}</th>)}
                </tr>
              </thead>
              <tbody>
                {BADGES.map(([badge, label]) => (
                  <tr key={badge} className="border-b last:border-0">
                    <th className="p-3 font-medium text-gray-700">{label}</th>
                    {TIERS.map((t) => <td key={t} className="p-3 text-right">{badgeCount(badge, t)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Year over year (club)</h2>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full min-w-max text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="p-3 font-medium">Year</th>
                  <th className="p-3 text-right font-medium">Distance</th>
                  <th className="p-3 text-right font-medium">Activities</th>
                  <th className="p-3 text-right font-medium">Active members</th>
                </tr>
              </thead>
              <tbody>
                {[...yearlyTotals].reverse().map((y) => (
                  <tr key={y.year} className="border-b last:border-0">
                    <th className="p-3 font-medium text-gray-700">{y.year}</th>
                    <td className="p-3 text-right">{mi(y.meters)} mi</td>
                    <td className="p-3 text-right">{y.activities.toLocaleString("en-US")}</td>
                    <td className="p-3 text-right">{y.members}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">No activity in 30 days ({inactive.length})</h2>
          {inactive.length === 0 ? (
            <p className="rounded-lg border bg-white p-4 text-sm text-gray-500">Everyone has logged something recently.</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-lg border bg-white text-sm">
              {inactive.slice(0, 40).map((u) => (
                <li key={u.id} className="flex justify-between gap-2 p-3">
                  <Link href={`/members/${u.id}`} className="min-w-0 truncate hover:underline">{name(u)}</Link>
                  <span className="shrink-0 text-gray-500">
                    {u.activities[0] ? `last: ${u.activities[0].startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}` : "never synced"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Export ({year})</h2>
          <p className="mb-3 text-sm text-gray-500">CSV files that open directly in Excel or Google Sheets. Contains member names, so handle accordingly.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {([["members", "Members: yearly summary"], ["activities", "Activities: every activity"], ["races", "Races: ranked by popularity"], ["race-signups", "Race signups: one row per member"]] as const).map(([type, label]) => (
              <a key={type} href={`/api/admin/export?type=${type}&year=${year}`} className="flex min-h-11 items-center rounded-lg border bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-gray-50">
                {label}
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDistance, formatDuration, formatElevation } from "@/lib/format";
import { categorizeSport, SPORT_TABS } from "@/lib/sport";
import { isValidRange, parseOffset, periodLabel, PRIMARY_RANGES, rangeWindow, supportsOffset } from "@/lib/dateRange";
import KudosButton from "@/components/KudosButton";
import NavBar from "@/components/NavBar";

const RECENT_PAGE_SIZE = 10;

interface LeaderboardEntry {
  userId: string;
  name: string;
  image: string | null;
  distanceMeters: number;
  movingTimeSeconds: number;
  elevationMeters: number;
  count: number;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; sport?: string; offset?: string; by?: string; page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const resolvedSearchParams = await searchParams;
  const currentYear = new Date().getFullYear();
  const range =
    resolvedSearchParams.range && isValidRange(resolvedSearchParams.range, currentYear)
      ? resolvedSearchParams.range
      : "week";
  const sport = SPORT_TABS.some((t) => t.key === resolvedSearchParams.sport) ? resolvedSearchParams.sport! : "total";
  // "Climbing" ranking only makes sense for the two sports that gain elevation.
  const canRankByElevation = sport === "run" || sport === "ride";
  const rankByElevation = canRankByElevation && resolvedSearchParams.by === "elevation";
  const byParam = rankByElevation ? "&by=elevation" : "";
  const offset = supportsOffset(range) ? parseOffset(resolvedSearchParams.offset, range) : 0;

  const { since, until } = rangeWindow(range, offset);
  const label = periodLabel(range, offset, since, until);
  const startDateFilter: { gte?: Date; lt?: Date } = {};
  if (since) startDateFilter.gte = since;
  if (until) startDateFilter.lt = until;

  const where = Object.keys(startDateFilter).length ? { startDate: startDateFilter } : {};

  // Totals come from the database grouped by member and sport, so the page never loads every activity
  // in the period; the feed below only loads the ten rows on screen.
  const [groups, totalActivities] = await Promise.all([
    prisma.activity.groupBy({
      by: ["userId", "sportType"],
      where,
      _sum: { distanceMeters: true, movingTimeSeconds: true, totalElevationGain: true },
      _count: { _all: true },
    }),
    prisma.activity.count({ where }),
  ]);

  const lastPage = Math.max(1, Math.ceil(totalActivities / RECENT_PAGE_SIZE));
  const requestedPage = Math.trunc(Number(resolvedSearchParams.page)) || 1;
  const page = Math.min(Math.max(requestedPage, 1), lastPage);

  const [users, recentActivities, yearRows] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: [...new Set(groups.map((g) => g.userId))] } },
      select: { id: true, firstName: true, lastName: true, profileImageUrl: true },
    }),
    prisma.activity.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true } }, kudos: true },
      orderBy: [{ startDate: "desc" }, { id: "desc" }],
      skip: (page - 1) * RECENT_PAGE_SIZE,
      take: RECENT_PAGE_SIZE,
    }),
    // Years with any club activity, for browsing past-year totals.
    prisma.$queryRaw<{ year: number }[]>`SELECT DISTINCT EXTRACT(YEAR FROM "startDate")::int AS year FROM "Activity"`,
  ]);
  const pastYears = yearRows
    .map((r) => r.year)
    .filter((y) => y < currentYear)
    .sort((a, b) => b - a);
  const usersById = new Map(users.map((u) => [u.id, u]));

  const leaderboardByUser = new Map<string, LeaderboardEntry>();
  // Elevation tiles always cover the whole range, whichever sport tab is selected.
  let teamBikeElevationMeters = 0;
  let teamRunElevationMeters = 0;
  for (const group of groups) {
    const category = categorizeSport(group.sportType);
    const elevation = group._sum.totalElevationGain ?? 0;
    if (category === "ride") teamBikeElevationMeters += elevation;
    else if (category === "run") teamRunElevationMeters += elevation;

    if (sport !== "total" && category !== sport) continue;
    const user = usersById.get(group.userId);
    const entry = leaderboardByUser.get(group.userId) ?? {
      userId: group.userId,
      name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Club Member",
      image: user?.profileImageUrl ?? null,
      distanceMeters: 0,
      movingTimeSeconds: 0,
      elevationMeters: 0,
      count: 0,
    };
    entry.distanceMeters += group._sum.distanceMeters ?? 0;
    entry.movingTimeSeconds += group._sum.movingTimeSeconds ?? 0;
    entry.elevationMeters += elevation;
    entry.count += group._count._all;
    leaderboardByUser.set(group.userId, entry);
  }
  const leaderboard = [...leaderboardByUser.values()].sort((a, b) =>
    rankByElevation
      ? b.elevationMeters - a.elevationMeters || b.distanceMeters - a.distanceMeters
      : b.distanceMeters - a.distanceMeters,
  );

  const teamDistanceMeters = leaderboard.reduce((sum, entry) => sum + entry.distanceMeters, 0);
  const teamActivityCount = leaderboard.reduce((sum, entry) => sum + entry.count, 0);
  const teamParticipantCount = leaderboard.length;

  const recentHref = (p: number) =>
    `/dashboard?range=${range}&sport=${sport}${byParam}&offset=${offset}&page=${p}#recent`;
  const showEntryElevation = sport === "ride" || sport === "run";

  const currentUserId = session.user.id;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold">Club Dashboard</h1>
            <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:w-auto">
              {PRIMARY_RANGES.map((r) => (
                <Link
                  key={r.key}
                  href={`/dashboard?range=${r.key}&sport=${sport}${byParam}`}
                  className={`rounded-full border px-3 py-2 text-center sm:py-1 ${
                    range === r.key ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 text-gray-600"
                  }`}
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
          {supportsOffset(range) && (
            <div className="flex flex-col items-center gap-2 text-sm sm:flex-row sm:gap-3">
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href={`/dashboard?range=${range}&sport=${sport}${byParam}&offset=${offset - 1}`}
                  className="whitespace-nowrap rounded-full border border-gray-300 px-3 py-1 text-gray-600"
                >
                  &larr; Prev
                </Link>
                {offset < 0 ? (
                  <Link
                    href={`/dashboard?range=${range}&sport=${sport}${byParam}&offset=${offset + 1}`}
                    className="whitespace-nowrap rounded-full border border-gray-300 px-3 py-1 text-gray-600"
                  >
                    Next &rarr;
                  </Link>
                ) : (
                  <span className="whitespace-nowrap rounded-full border border-gray-200 px-3 py-1 text-gray-300">
                    Next &rarr;
                  </span>
                )}
              </div>
              <span className="text-center font-medium sm:text-left">{label}</span>
            </div>
          )}
          {pastYears.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-500">Browse a previous year:</span>
              {pastYears.map((y) => (
                <Link
                  key={y}
                  href={`/dashboard?range=${y}&sport=${sport}${byParam}`}
                  className={`rounded-full border px-3 py-1 ${
                    range === String(y) ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 text-gray-600"
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>
          )}
        </div>

        {new Date().getMonth() === 11 && (
          <Link
            href={`/year-in-review/${currentYear}`}
            className="mb-4 block rounded-lg border border-orange-600 bg-orange-600 p-4 text-center font-medium text-white"
          >
            Your {currentYear} year in review is ready &rarr;
          </Link>
        )}

        <section className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-3 sm:mb-8 sm:p-6">
          <p className="mb-3 text-sm font-medium text-orange-800">Team Landshark — {label}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            <div className="col-span-2 sm:col-span-1">
              <p className="text-2xl font-bold text-orange-900">{formatDistance(teamDistanceMeters)}</p>
              <p className="text-xs text-orange-700">total distance</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-900">{teamActivityCount}</p>
              <p className="text-xs text-orange-700">activities</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-900">{teamParticipantCount}</p>
              <p className="text-xs text-orange-700">members active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-900">{formatElevation(teamBikeElevationMeters)}</p>
              <p className="text-xs text-orange-700">bike elevation</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-900">{formatElevation(teamRunElevationMeters)}</p>
              <p className="text-xs text-orange-700">run elevation</p>
            </div>
          </div>
        </section>

        <section className="mb-8 sm:mb-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Leaderboard</h2>
            <div className="flex gap-2 text-sm">
              {SPORT_TABS.map((t) => (
                <Link
                  key={t.key}
                  href={`/dashboard?range=${range}&sport=${t.key}${t.key === "run" || t.key === "ride" ? byParam : ""}&offset=${offset}`}
                  className={`rounded-full border px-3 py-1 ${
                    sport === t.key ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 text-gray-600"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
          {canRankByElevation && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-500">Rank by:</span>
              {[
                {
                  key: "distance",
                  label: "Distance",
                  href: `/dashboard?range=${range}&sport=${sport}&offset=${offset}`,
                },
                {
                  key: "elevation",
                  label: "Climbing",
                  href: `/dashboard?range=${range}&sport=${sport}&by=elevation&offset=${offset}`,
                },
              ].map((o) => (
                <Link
                  key={o.key}
                  href={o.href}
                  className={`rounded-full border px-3 py-1 ${
                    (o.key === "elevation") === rankByElevation
                      ? "border-orange-600 bg-orange-600 text-white"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {o.label}
                </Link>
              ))}
            </div>
          )}
          <ol className="divide-y divide-gray-200 overflow-hidden rounded-lg border bg-white">
            {leaderboard.length === 0 && <li className="p-4 text-sm text-gray-500">No activity yet for {label}.</li>}
            {leaderboard.map((entry, i) => (
              <li key={entry.userId} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                <span className="w-5 shrink-0 text-center font-semibold text-gray-400 sm:w-6">{i + 1}</span>
                {entry.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/members/${entry.userId}`} className="block truncate font-medium hover:underline">
                    {entry.name}
                  </Link>
                  {showEntryElevation && (
                    <p className="truncate text-xs text-gray-500">
                      {rankByElevation
                        ? formatDistance(entry.distanceMeters)
                        : `${formatElevation(entry.elevationMeters)} climbed`}
                    </p>
                  )}
                </div>
                <span className="hidden shrink-0 text-sm text-gray-500 sm:inline">{entry.count} activities</span>
                <span className="w-24 shrink-0 whitespace-nowrap text-right text-sm font-semibold sm:text-base">
                  {rankByElevation ? formatElevation(entry.elevationMeters) : formatDistance(entry.distanceMeters)}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section id="recent" className="scroll-mt-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 className="text-lg font-semibold">Recent Activity — {label}</h2>
            {totalActivities > 0 && (
              <span className="text-sm text-gray-500">
                {(page - 1) * RECENT_PAGE_SIZE + 1}–{(page - 1) * RECENT_PAGE_SIZE + recentActivities.length} of{" "}
                {totalActivities}
              </span>
            )}
          </div>
          <ul className="space-y-3">
            {recentActivities.length === 0 && (
              <li className="rounded-lg border bg-white p-4 text-sm text-gray-500">
                Nothing here yet — activities show up as soon as members log them on Strava after connecting.
              </li>
            )}
            {recentActivities.map((activity) => (
              <li
                key={activity.id}
                className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3 sm:items-center sm:p-4"
              >
                <Link href={`/activities/${activity.id}`} className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium hover:underline">
                    {activity.user.firstName} {activity.user.lastName} — {activity.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {activity.sportType} · {formatDistance(activity.distanceMeters)} ·{" "}
                    {formatDuration(activity.movingTimeSeconds)}
                  </p>
                </Link>
                <div className="shrink-0">
                  <KudosButton
                    activityId={activity.id}
                    initialCount={activity.kudos.length}
                    initialGiven={activity.kudos.some((k) => k.giverId === currentUserId)}
                  />
                </div>
              </li>
            ))}
          </ul>
          {lastPage > 1 && (
            <nav aria-label="Recent activity pages" className="mt-4 flex items-center justify-between gap-2 text-sm">
              {page > 1 ? (
                <Link
                  href={recentHref(page - 1)}
                  className="whitespace-nowrap rounded-full border border-gray-300 px-4 py-2 text-gray-600"
                >
                  &larr; Newer
                </Link>
              ) : (
                <span className="whitespace-nowrap rounded-full border border-gray-200 px-4 py-2 text-gray-300">
                  &larr; Newer
                </span>
              )}
              <span className="text-gray-500">
                Page {page} of {lastPage}
              </span>
              {page < lastPage ? (
                <Link
                  href={recentHref(page + 1)}
                  className="whitespace-nowrap rounded-full border border-gray-300 px-4 py-2 text-gray-600"
                >
                  Older &rarr;
                </Link>
              ) : (
                <span className="whitespace-nowrap rounded-full border border-gray-200 px-4 py-2 text-gray-300">
                  Older &rarr;
                </span>
              )}
            </nav>
          )}
        </section>
      </main>
    </>
  );
}

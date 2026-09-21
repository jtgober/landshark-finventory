import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDistance, formatDuration } from "@/lib/format";
import { categorizeSport, SPORT_TABS } from "@/lib/sport";
import { isValidRange, parseOffset, periodLabel, PRIMARY_RANGES, rangeWindow, supportsOffset } from "@/lib/dateRange";
import KudosButton from "@/components/KudosButton";
import NavBar from "@/components/NavBar";

interface LeaderboardEntry {
  userId: string;
  name: string;
  image: string | null;
  distanceMeters: number;
  movingTimeSeconds: number;
  count: number;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; sport?: string; offset?: string }>;
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
  const offset = supportsOffset(range) ? parseOffset(resolvedSearchParams.offset, range) : 0;

  const { since, until } = rangeWindow(range, offset);
  const label = periodLabel(range, offset, since, until);
  const startDateFilter: { gte?: Date; lt?: Date } = {};
  if (since) startDateFilter.gte = since;
  if (until) startDateFilter.lt = until;

  const activities = await prisma.activity.findMany({
    where: Object.keys(startDateFilter).length ? { startDate: startDateFilter } : undefined,
    include: { user: true, kudos: true },
    orderBy: { startDate: "desc" },
  });

  // Years with any club activity before this one, for browsing past-year totals.
  const activityYears = await prisma.activity.findMany({ select: { startDate: true } });
  const pastYears = Array.from(new Set(activityYears.map((a) => a.startDate.getFullYear())))
    .filter((y) => y < currentYear)
    .sort((a, b) => b - a);

  const leaderboardActivities =
    sport === "total" ? activities : activities.filter((a) => categorizeSport(a.sportType) === sport);

  const leaderboardByUser = new Map<string, LeaderboardEntry>();
  for (const activity of leaderboardActivities) {
    const entry = leaderboardByUser.get(activity.userId) ?? {
      userId: activity.userId,
      name: `${activity.user.firstName ?? ""} ${activity.user.lastName ?? ""}`.trim() || "Club Member",
      image: activity.user.profileImageUrl,
      distanceMeters: 0,
      movingTimeSeconds: 0,
      count: 0,
    };
    entry.distanceMeters += activity.distanceMeters;
    entry.movingTimeSeconds += activity.movingTimeSeconds;
    entry.count += 1;
    leaderboardByUser.set(activity.userId, entry);
  }
  const leaderboard = [...leaderboardByUser.values()].sort((a, b) => b.distanceMeters - a.distanceMeters);

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
                  href={`/dashboard?range=${r.key}&sport=${sport}`}
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
                  href={`/dashboard?range=${range}&sport=${sport}&offset=${offset - 1}`}
                  className="whitespace-nowrap rounded-full border border-gray-300 px-3 py-1 text-gray-600"
                >
                  &larr; Prev
                </Link>
                {offset < 0 ? (
                  <Link
                    href={`/dashboard?range=${range}&sport=${sport}&offset=${offset + 1}`}
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
                  href={`/dashboard?range=${y}&sport=${sport}`}
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

        <section className="mb-8 sm:mb-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Leaderboard</h2>
            <div className="flex gap-2 text-sm">
              {SPORT_TABS.map((t) => (
                <Link
                  key={t.key}
                  href={`/dashboard?range=${range}&sport=${t.key}&offset=${offset}`}
                  className={`rounded-full border px-3 py-1 ${
                    sport === t.key ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 text-gray-600"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
          <ol className="divide-y divide-gray-200 overflow-hidden rounded-lg border bg-white">
            {leaderboard.length === 0 && (
              <li className="p-4 text-sm text-gray-500">No activity yet for {label}.</li>
            )}
            {leaderboard.map((entry, i) => (
              <li key={entry.userId} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                <span className="w-5 shrink-0 text-center font-semibold text-gray-400 sm:w-6">{i + 1}</span>
                {entry.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                )}
                <Link href={`/members/${entry.userId}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                  {entry.name}
                </Link>
                <span className="hidden shrink-0 text-sm text-gray-500 sm:inline">{entry.count} activities</span>
                <span className="w-20 shrink-0 whitespace-nowrap text-right text-sm font-semibold sm:w-24 sm:text-base">
                  {formatDistance(entry.distanceMeters)}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Recent Activity — {label}</h2>
          <ul className="space-y-3">
            {activities.length === 0 && (
              <li className="rounded-lg border bg-white p-4 text-sm text-gray-500">
                Nothing here yet — activities show up as soon as members log them on Strava after connecting.
              </li>
            )}
            {activities.map((activity) => (
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
        </section>
      </main>
    </>
  );
}

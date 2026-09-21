import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDistance, formatDuration } from "@/lib/format";
import KudosButton from "@/components/KudosButton";

const RANGE_DAYS: Record<string, number | null> = {
  week: 7,
  month: 30,
  all: null,
};

const RANGE_LABELS: Record<string, string> = {
  week: "This Week",
  month: "This Month",
  all: "All Time",
};

interface LeaderboardEntry {
  name: string;
  image: string | null;
  distanceMeters: number;
  movingTimeSeconds: number;
  count: number;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const resolvedSearchParams = await searchParams;
  const range =
    resolvedSearchParams.range && RANGE_DAYS[resolvedSearchParams.range] !== undefined
      ? resolvedSearchParams.range
      : "week";
  const days = RANGE_DAYS[range];
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;

  const activities = await prisma.activity.findMany({
    where: since ? { startDate: { gte: since } } : undefined,
    include: { user: true, kudos: true },
    orderBy: { startDate: "desc" },
  });

  const leaderboardByUser = new Map<string, LeaderboardEntry>();
  for (const activity of activities) {
    const entry = leaderboardByUser.get(activity.userId) ?? {
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
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Club Dashboard</h1>
        <div className="flex gap-2 text-sm">
          {Object.keys(RANGE_DAYS).map((r) => (
            <a
              key={r}
              href={`/dashboard?range=${r}`}
              className={`rounded-full border px-3 py-1 ${
                range === r ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 text-gray-600"
              }`}
            >
              {RANGE_LABELS[r]}
            </a>
          ))}
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Leaderboard</h2>
        <ol className="divide-y divide-gray-200 overflow-hidden rounded-lg border bg-white">
          {leaderboard.length === 0 && <li className="p-4 text-sm text-gray-500">No activity yet in this range.</li>}
          {leaderboard.map((entry, i) => (
            <li key={entry.name + i} className="flex items-center gap-4 p-4">
              <span className="w-6 text-center font-semibold text-gray-400">{i + 1}</span>
              {entry.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.image} alt="" className="h-8 w-8 rounded-full object-cover" />
              )}
              <span className="flex-1 font-medium">{entry.name}</span>
              <span className="text-sm text-gray-500">{entry.count} activities</span>
              <span className="w-24 text-right font-semibold">{formatDistance(entry.distanceMeters)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
        <ul className="space-y-3">
          {activities.length === 0 && (
            <li className="rounded-lg border bg-white p-4 text-sm text-gray-500">
              Nothing here yet — activities show up as soon as members log them on Strava after connecting.
            </li>
          )}
          {activities.map((activity) => (
            <li key={activity.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
              <div>
                <p className="font-medium">
                  {activity.user.firstName} {activity.user.lastName} — {activity.name}
                </p>
                <p className="text-sm text-gray-500">
                  {activity.sportType} · {formatDistance(activity.distanceMeters)} ·{" "}
                  {formatDuration(activity.movingTimeSeconds)}
                </p>
              </div>
              <KudosButton
                activityId={activity.id}
                initialCount={activity.kudos.length}
                initialGiven={activity.kudos.some((k) => k.giverId === currentUserId)}
              />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

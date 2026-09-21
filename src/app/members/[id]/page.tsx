import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDistance, formatDuration } from "@/lib/format";
import { categorizeSport, type SportCategory } from "@/lib/sport";
import KudosButton from "@/components/KudosButton";
import NavBar from "@/components/NavBar";

const SPORT_BAR_LABELS: Record<SportCategory, string> = {
  run: "Run",
  ride: "Bike",
  swim: "Swim",
  other: "Other",
};

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const { id } = await params;

  const member = await prisma.user.findUnique({ where: { id } });
  if (!member) notFound();

  const activities = await prisma.activity.findMany({
    where: { userId: id },
    include: { kudos: true },
    orderBy: { startDate: "desc" },
  });

  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const sumDistance = (list: typeof activities) => list.reduce((sum, a) => sum + a.distanceMeters, 0);

  const weekDistance = sumDistance(activities.filter((a) => a.startDate >= weekAgo));
  const monthActivities = activities.filter((a) => a.startDate >= monthAgo);
  const monthDistance = sumDistance(monthActivities);
  const allTimeDistance = sumDistance(activities);
  const kudosReceived = activities.reduce((sum, a) => sum + a.kudos.length, 0);

  const sportDistances: Record<SportCategory, number> = { run: 0, ride: 0, swim: 0, other: 0 };
  for (const activity of monthActivities) {
    sportDistances[categorizeSport(activity.sportType)] += activity.distanceMeters;
  }
  const maxSportDistance = Math.max(sportDistances.run, sportDistances.ride, sportDistances.swim, 1);

  const currentUserId = session.user.id;
  const memberName = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || "Club Member";

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
          &larr; Back to dashboard
        </Link>

        <div className="mb-6 flex items-center gap-4 rounded-lg border bg-white p-4 sm:p-6">
          {member.profileImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.profileImageUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover sm:h-20 sm:w-20"
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold sm:text-2xl">{memberName}</h1>
            {member.city && <p className="text-sm text-gray-500">{member.city}</p>}
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
              Connected via Strava
            </span>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">This Week</p>
            <p className="text-xl font-bold sm:text-2xl">{formatDistance(weekDistance)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">This Month</p>
            <p className="text-xl font-bold sm:text-2xl">{formatDistance(monthDistance)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">All Time</p>
            <p className="text-xl font-bold sm:text-2xl">{formatDistance(allTimeDistance)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">Kudos Received</p>
            <p className="text-xl font-bold sm:text-2xl">{kudosReceived}</p>
          </div>
        </div>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">By Sport (This Month)</h2>
          <div className="space-y-2 rounded-lg border bg-white p-4">
            {(["run", "ride", "swim"] as const).map((cat) => (
              <div key={cat}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{SPORT_BAR_LABELS[cat]}</span>
                  <span className="text-gray-500">{formatDistance(sportDistances[cat])}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-orange-500"
                    style={{ width: `${(sportDistances[cat] / maxSportDistance) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
          <ul className="space-y-3">
            {activities.length === 0 && (
              <li className="rounded-lg border bg-white p-4 text-sm text-gray-500">No activity yet.</li>
            )}
            {activities.slice(0, 10).map((activity) => (
              <li
                key={activity.id}
                className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3 sm:items-center sm:p-4"
              >
                <Link href={`/activities/${activity.id}`} className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium hover:underline">{activity.name}</p>
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

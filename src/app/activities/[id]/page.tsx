import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPacePer100m,
  formatPacePerMile,
  formatSpeedMph,
} from "@/lib/format";
import { categorizeSport } from "@/lib/sport";
import KudosButton from "@/components/KudosButton";
import NavBar from "@/components/NavBar";

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const { id } = await params;

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: { user: true, kudos: { include: { giver: true } } },
  });
  if (!activity) notFound();

  const category = categorizeSport(activity.sportType);
  const paceLabel = category === "ride" ? "Avg Speed" : "Pace";
  const paceValue =
    category === "ride"
      ? formatSpeedMph(activity.averageSpeed)
      : category === "swim"
        ? formatPacePer100m(activity.movingTimeSeconds, activity.distanceMeters)
        : formatPacePerMile(activity.movingTimeSeconds, activity.distanceMeters);

  const currentUserId = session.user.id;
  const memberName = `${activity.user.firstName ?? ""} ${activity.user.lastName ?? ""}`.trim() || "Club Member";

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
          &larr; Back to dashboard
        </Link>

        <div className="mb-4 flex items-center gap-3">
          {activity.user.profileImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activity.user.profileImageUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          )}
          <div className="min-w-0">
            <Link href={`/members/${activity.userId}`} className="truncate font-medium hover:underline">
              {memberName}
            </Link>
            <p className="text-sm text-gray-500">
              {/* Strava's start_date_local is the athlete's wall-clock time
                  labeled as UTC (a documented API quirk) — pin the display
                  timezone to UTC so we read those digits back verbatim
                  instead of applying a second, incorrect conversion. */}
              {activity.startDateLocal.toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "UTC",
              })}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-lg border bg-white p-4 sm:p-6">
          <h1 className="mb-1 text-xl font-bold sm:text-2xl">{activity.name}</h1>
          <p className="mb-4 text-sm text-gray-500">{activity.sportType}</p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Distance</p>
              <p className="text-lg font-bold">{formatDistance(activity.distanceMeters)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Moving Time</p>
              <p className="text-lg font-bold">{formatDuration(activity.movingTimeSeconds)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{paceLabel}</p>
              <p className="text-lg font-bold">{paceValue}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Elevation</p>
              <p className="text-lg font-bold">{formatElevation(activity.totalElevationGain)}</p>
            </div>
          </div>
        </div>

        <section className="mb-6 rounded-lg border bg-white p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Kudos</h2>
            <KudosButton
              activityId={activity.id}
              initialCount={activity.kudos.length}
              initialGiven={activity.kudos.some((k) => k.giverId === currentUserId)}
            />
          </div>
          {activity.kudos.length === 0 ? (
            <p className="text-sm text-gray-500">No kudos yet — be the first.</p>
          ) : (
            <ul className="flex flex-wrap gap-3">
              {activity.kudos.map((k) => {
                const giverName = `${k.giver.firstName ?? ""} ${k.giver.lastName ?? ""}`.trim() || "Club Member";
                return (
                  <li key={k.id} className="flex items-center gap-2">
                    {k.giver.profileImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={k.giver.profileImageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                    )}
                    <span className="text-sm">{giverName}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <a
          href={`https://www.strava.com/activities/${activity.stravaActivityId.toString()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-orange-700"
        >
          View on Strava &rarr;
        </a>
      </main>
    </>
  );
}

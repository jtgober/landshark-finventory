import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRaceDate } from "@/lib/format";
import NavBar from "@/components/NavBar";
import RaceSignupButton from "@/components/RaceSignupButton";

export default async function RacesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const currentUserId = session.user.id;

  const races = await prisma.race.findMany({
    include: { signups: true },
    orderBy: { date: "asc" },
  });

  const now = new Date();
  const upcoming = races.filter((r) => r.date >= now);
  const past = races
    .filter((r) => r.date < now)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between sm:mb-8">
          <h1 className="text-2xl font-bold">Race Calendar</h1>
          <Link
            href="/races/new"
            className="rounded-full border border-orange-600 bg-orange-600 px-4 py-2 text-sm font-medium text-white"
          >
            + Add a Race
          </Link>
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="rounded-lg border bg-white p-4 text-sm text-gray-500">
              No races on the calendar yet — be the first to add one.
            </p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((race) => (
                <li key={race.id} className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3 sm:items-center sm:p-4">
                  <Link href={`/races/${race.id}`} className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium hover:underline">{race.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatRaceDate(race.date)}
                      {race.location ? ` · ${race.location}` : ""} ·{" "}
                      {race.signups.length} {race.signups.length === 1 ? "person" : "people"} racing
                    </p>
                  </Link>
                  <div className="shrink-0">
                    <RaceSignupButton
                      raceId={race.id}
                      initialCount={race.signups.length}
                      initialGiven={race.signups.some((s) => s.userId === currentUserId)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Past</h2>
            <ul className="space-y-3">
              {past.map((race) => (
                <li key={race.id} className="rounded-lg border bg-white p-3 sm:p-4">
                  <Link href={`/races/${race.id}`}>
                    <p className="line-clamp-2 font-medium hover:underline">{race.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatRaceDate(race.date)}
                      {race.location ? ` · ${race.location}` : ""} ·{" "}
                      {race.signups.length} {race.signups.length === 1 ? "person" : "people"} raced
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

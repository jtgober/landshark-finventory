import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRaceDate } from "@/lib/format";
import NavBar from "@/components/NavBar";
import RaceSignupButton from "@/components/RaceSignupButton";

export default async function RaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const { id } = await params;

  const race = await prisma.race.findUnique({
    where: { id },
    include: { signups: { include: { user: true } } },
  });
  if (!race) notFound();

  const currentUserId = session.user.id;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <Link href="/races" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
          &larr; Back to race calendar
        </Link>

        <div className="mb-6 rounded-lg border bg-white p-4 sm:p-6">
          <h1 className="mb-1 text-xl font-bold sm:text-2xl">{race.name}</h1>
          <p className="mb-4 text-sm text-gray-500">
            {formatRaceDate(race.date)}
            {race.location ? ` · ${race.location}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <RaceSignupButton
              raceId={race.id}
              initialCount={race.signups.length}
              initialGiven={race.signups.some((s) => s.userId === currentUserId)}
            />
            {race.raceUrl && (
              <a
                href={race.raceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-orange-700"
              >
                Official race page &rarr;
              </a>
            )}
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Who's Racing ({race.signups.length})</h2>
          {race.signups.length === 0 ? (
            <p className="rounded-lg border bg-white p-4 text-sm text-gray-500">
              No one's signed up yet — be the first.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border bg-white">
              {race.signups.map((signup) => {
                const name = `${signup.user.firstName ?? ""} ${signup.user.lastName ?? ""}`.trim() || "Club Member";
                return (
                  <li key={signup.id}>
                    <Link href={`/members/${signup.userId}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 sm:p-4">
                      {signup.user.profileImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={signup.user.profileImageUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

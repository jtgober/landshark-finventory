import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import NavBar from "@/components/NavBar";

const CLUB_TIME_ZONE = "America/Kentucky/Louisville";
const LOG_LIMIT = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

function formatJoined(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLUB_TIME_ZONE,
  });
}

function formatAgo(date: Date, now: number): string {
  const minutes = Math.floor((now - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function AdminActivityLogPage() {
  await requireAdminPage();

  const now = Date.now();
  const [recent, total, last7, last30] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImageUrl: true,
        city: true,
        createdAt: true,
        _count: { select: { activities: true } },
      },
      orderBy: { createdAt: "desc" },
      take: LOG_LIMIT,
    }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: new Date(now - 7 * DAY_MS) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(now - 30 * DAY_MS) } } }),
  ]);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
          &larr; Back to admin
        </Link>
        <h1 className="mb-1 text-2xl font-bold">Activity log</h1>
        <p className="mb-4 text-sm text-gray-500">
          Members in the order they connected Strava and joined. Times are Louisville time.
        </p>

        <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg border bg-white p-3 sm:p-4">
            <p className="text-xs text-gray-500">Joined last 7 days</p>
            <p className="text-xl font-bold sm:text-2xl">{last7}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 sm:p-4">
            <p className="text-xs text-gray-500">Joined last 30 days</p>
            <p className="text-xl font-bold sm:text-2xl">{last30}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 sm:p-4">
            <p className="text-xs text-gray-500">Total members</p>
            <p className="text-xl font-bold sm:text-2xl">{total}</p>
          </div>
        </div>

        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border bg-white">
          {recent.length === 0 && <li className="p-4 text-sm text-gray-500">No members have joined yet.</li>}
          {recent.map((u) => {
            const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Club Member";
            return (
              <li key={u.id} className="flex items-center gap-3 p-3 sm:p-4">
                {u.profileImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.profileImageUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    <Link href={`/members/${u.id}`} className="font-medium hover:underline">
                      {name}
                    </Link>{" "}
                    <span className="text-gray-500">joined</span>
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {formatJoined(u.createdAt)}
                    {u.city ? ` · ${u.city}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <p className="text-gray-700">{formatAgo(u.createdAt, now)}</p>
                  <p className="text-xs text-gray-400">
                    {u._count.activities === 0 ? "no activities yet" : `${u._count.activities} activities`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        {total > LOG_LIMIT && (
          <p className="mt-3 text-sm text-gray-500">Showing the {LOG_LIMIT} most recent of {total} members.</p>
        )}
      </main>
    </>
  );
}

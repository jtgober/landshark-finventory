import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { toCsv, type CsvCell } from "@/lib/csv";
import { rankRaces } from "@/lib/raceStats";
import { categorizeSport } from "@/lib/sport";
import { metersToMiles } from "@/lib/units";
import { getMemberYearSummary } from "@/lib/yearSummaryDb";
import { YEARLY_BADGES_START_YEAR } from "@/lib/yearlyBadges";

const TYPES = ["members", "activities", "races", "race-signups"] as const;
type ExportType = (typeof TYPES)[number];

const round = (n: number, places = 1) => Math.round(n * 10 ** places) / 10 ** places;
const miles = (meters: number) => round(metersToMiles(meters));
const fullName = (u: { firstName: string | null; lastName: string | null }) =>
  `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Club Member";

// No OAuth tokens or Strava athlete IDs are ever selected into an export.
async function buildRows(type: ExportType, year: number): Promise<CsvCell[][]> {
  const bounds = { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };

  if (type === "activities") {
    const activities = await prisma.activity.findMany({
      where: { startDateLocal: bounds },
      orderBy: { startDateLocal: "asc" },
      select: {
        name: true, sportType: true, startDateLocal: true, distanceMeters: true, movingTimeSeconds: true,
        totalElevationGain: true, user: { select: { firstName: true, lastName: true } }, _count: { select: { kudos: true } },
      },
    });
    return [
      ["Member", "Date", "Name", "Sport type", "Discipline", "Distance (mi)", "Moving time (min)", "Elevation (ft)", "Kudos"],
      ...activities.map((a) => [
        fullName(a.user), a.startDateLocal.toISOString().slice(0, 16).replace("T", " "), a.name, a.sportType,
        categorizeSport(a.sportType), miles(a.distanceMeters), round(a.movingTimeSeconds / 60), Math.round(a.totalElevationGain * 3.28084), a._count.kudos,
      ]),
    ];
  }

  if (type === "races" || type === "race-signups") {
    const races = await prisma.race.findMany({
      where: { date: bounds },
      select: {
        id: true, name: true, date: true, location: true, raceUrl: true,
        createdBy: { select: { firstName: true, lastName: true } },
        signups: { orderBy: { createdAt: "asc" }, select: { createdAt: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (type === "races") {
      const ranked = rankRaces(races.map((r) => ({ ...r, signupCount: r.signups.length })));
      return [
        ["Rank", "Race", "Date", "Location", "Website", "Signups", "Added by", "Members"],
        ...ranked.map((r) => [
          r.rank, r.name, r.date.toISOString().slice(0, 10), r.location, r.raceUrl, r.signupCount,
          r.createdBy ? fullName(r.createdBy) : "", r.signups.map((s) => fullName(s.user)).join("; "),
        ]),
      ];
    }
    return [
      ["Race", "Date", "Member", "Signed up"],
      ...races
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .flatMap((r) => r.signups.map((s) => [r.name, r.date.toISOString().slice(0, 10), fullName(s.user), s.createdAt])),
    ];
  }

  const [users, badges] = await Promise.all([
    prisma.user.findMany({ select: { id: true, firstName: true, lastName: true, city: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.userYearlyBadge.findMany({ where: { year }, select: { userId: true, badge: true, tier: true } }),
  ]);
  const tierOf = (userId: string, badge: string) => badges.find((b) => b.userId === userId && b.badge === badge)?.tier ?? "";

  const rows: CsvCell[][] = [[
    "Member", "City", "Year", "Status", "Total (mi)", "Bike (mi)", "Run (mi)", "Swim (mi)", "Activities", "Moving time (h)",
    "Elevation (ft)", "Longest effort (mi)", "Best day streak", "Best week streak", "Kudos received", "Kudos given",
    "Races entered", "Achievements earned", "Bike badge", "Run badge", "Swim badge", "Complete Athlete badge",
  ]];
  for (let i = 0; i < users.length; i += 10) {
    const batch = await Promise.all(users.slice(i, i + 10).map((u) => getMemberYearSummary(u.id, year)));
    batch.forEach(({ summary: s, finalized }, j) => {
      const u = users[i + j];
      rows.push([
        fullName(u), u.city, year, finalized ? "finalized" : "live", miles(s.totalMeters), miles(s.rideMeters), miles(s.runMeters),
        miles(s.swimMeters), s.activityCount, round(s.movingSeconds / 3600), Math.round(s.elevationMeters * 3.28084),
        miles(s.longestActivityMeters), s.bestDayStreak, s.bestWeekStreak, s.kudosReceived, s.kudosGiven, s.racesEntered,
        s.achievementsEarned, year >= YEARLY_BADGES_START_YEAR ? tierOf(u.id, "RIDE") : "", year >= YEARLY_BADGES_START_YEAR ? tierOf(u.id, "RUN") : "",
        year >= YEARLY_BADGES_START_YEAR ? tierOf(u.id, "SWIM") : "", year >= YEARLY_BADGES_START_YEAR ? tierOf(u.id, "COMPLETE") : "",
      ]);
    });
  }
  return rows;
}

export async function GET(req: Request) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as ExportType | null;
  const year = Number(searchParams.get("year"));
  const currentYear = new Date().getUTCFullYear() + 1; // races can be added for next year
  if (!type || !TYPES.includes(type) || !Number.isInteger(year) || year < 2000 || year > currentYear) {
    return NextResponse.json({ error: `type must be one of ${TYPES.join(", ")} and year a valid year` }, { status: 400 });
  }

  const csv = toCsv(await buildRows(type, year));
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="landshark-${type}-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

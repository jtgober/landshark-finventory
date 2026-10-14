import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidRange, parseOffset, periodLabel, rangeWindow, supportsOffset } from "@/lib/dateRange";
import { fetchAvatarDataUrl } from "@/lib/avatarFetch";
import { buildLeaderboard, shortName, type GroupRow } from "@/lib/leaderboard";
import { canShareByElevation, cardTitle, entryValueText, isShareSport, periodTitle } from "@/lib/shareTop5";
import { CARD_FONT, CARD_HEIGHT, CARD_WIDTH, initialsOf, Top5Card, type CardRow } from "@/lib/shareCard";

const ASSET_TIMEOUT_MS = 4000;

async function loadAsset(path: string, origin: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(ASSET_TIMEOUT_MS) });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const sport = params.get("sport") ?? undefined;
  if (!isShareSport(sport)) return NextResponse.json({ error: "sport must be run, ride or swim" }, { status: 400 });

  const currentYear = new Date().getFullYear();
  const requestedRange = params.get("range") ?? "week";
  const range = isValidRange(requestedRange, currentYear) ? requestedRange : "week";
  const offset = supportsOffset(range) ? parseOffset(params.get("offset") ?? undefined, range) : 0;
  const byElevation = canShareByElevation(sport) && params.get("by") === "elevation";

  const { since, until } = rangeWindow(range, offset);
  const label = periodLabel(range, offset, since, until);
  const startDate: { gte?: Date; lt?: Date } = {};
  if (since) startDate.gte = since;
  if (until) startDate.lt = until;
  const where = Object.keys(startDate).length ? { startDate } : {};

  const groups = await prisma.activity.groupBy({
    by: ["userId", "sportType"],
    where,
    _sum: { distanceMeters: true, movingTimeSeconds: true, totalElevationGain: true },
    _count: { _all: true },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(groups.map((g) => g.userId))] } },
    select: { id: true, firstName: true, lastName: true, profileImageUrl: true },
  });
  const members = new Map(users.map((u) => [u.id, u]));
  const rows: GroupRow[] = groups.map((g) => ({
    userId: g.userId,
    sportType: g.sportType,
    distanceMeters: g._sum.distanceMeters ?? 0,
    movingTimeSeconds: g._sum.movingTimeSeconds ?? 0,
    elevationMeters: g._sum.totalElevationGain ?? 0,
    count: g._count._all,
  }));
  const top = buildLeaderboard(rows, members, sport, byElevation).slice(0, 5);
  if (top.length === 0) return NextResponse.json({ error: "no activity in this period" }, { status: 404 });

  const origin = req.nextUrl.origin;
  const [avatars, font, logoBytes] = await Promise.all([
    Promise.all(top.map((e) => fetchAvatarDataUrl(e.image))),
    loadAsset("/fonts/LiberationSans-Bold.ttf", origin),
    loadAsset("/icons/icon-512.png", origin),
  ]);
  const logo = logoBytes ? `data:image/png;base64,${Buffer.from(logoBytes).toString("base64")}` : null;

  const cardRows: CardRow[] = top.map((entry, i) => {
    const name = shortName(members.get(entry.userId));
    return {
      rank: i + 1,
      name,
      value: entryValueText(entry, byElevation),
      avatar: avatars[i],
      initials: initialsOf(name),
    };
  });

  return new ImageResponse(
    <Top5Card
      title={cardTitle(sport, byElevation)}
      subtitle={periodTitle(range, label)}
      rows={cardRows}
      logo={logo}
      siteHost={origin.replace(/^https?:\/\//, "")}
    />,
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fonts: font ? [{ name: CARD_FONT, data: font, weight: 700, style: "normal" }] : undefined,
      headers: { "Cache-Control": "private, max-age=60" },
    },
  );
}

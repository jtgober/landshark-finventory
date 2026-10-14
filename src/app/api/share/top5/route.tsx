import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidRange, parseOffset, periodLabel, rangeWindow, supportsOffset } from "@/lib/dateRange";
import { fetchAvatarDataUrl } from "@/lib/avatarFetch";
import { buildLeaderboard, shortName, type GroupRow } from "@/lib/leaderboard";
import { canShareByElevation, cardTitle, entryValueText, isShareSport, periodTitle } from "@/lib/shareTop5";
import { cardSafeName, initialsOf, type CardRow } from "@/lib/shareCard";
import { renderShareCard } from "@/lib/renderShareCard";

const ASSET_TIMEOUT_MS = 4000;

/** A file from /public, fetched from our own site, falling back to disk; null (with a log line) if both fail. */
async function loadAsset(path: string, origin: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(ASSET_TIMEOUT_MS) });
    if (res.ok) return await res.arrayBuffer();
    console.warn(`Share card: ${path} returned ${res.status} from ${origin}`);
  } catch (error) {
    console.warn(`Share card: couldn't fetch ${path} from ${origin}`, error);
  }
  try {
    const bytes = await readFile(join(process.cwd(), "public", path));
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  } catch (error) {
    console.warn(`Share card: couldn't read ${path} from disk`, error);
    return null;
  }
}

async function handle(req: NextRequest) {
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
    const name = cardSafeName(shortName(members.get(entry.userId)));
    return {
      rank: i + 1,
      name,
      value: entryValueText(entry, byElevation),
      avatar: avatars[i],
      initials: initialsOf(name),
    };
  });

  try {
    const { png, degraded } = await renderShareCard({
      title: cardTitle(sport, byElevation),
      subtitle: periodTitle(range, label),
      rows: cardRows,
      logo,
      font,
      siteHost: origin.replace(/^https?:\/\//, ""),
    });
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": degraded ? "no-store" : "private, max-age=60",
        ...(degraded ? { "X-Share-Card-Degraded": degraded } : {}),
      },
    });
  } catch (error) {
    // Shown (briefly) in the share dialog so a failure can be diagnosed from a screenshot.
    const detail = (error instanceof Error ? error.message : String(error)).slice(0, 160);
    return NextResponse.json({ error: "Couldn't draw the card", detail }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    return await handle(req);
  } catch (error) {
    console.error("Share card route failed", error);
    const detail = (error instanceof Error ? error.message : String(error)).slice(0, 160);
    return NextResponse.json({ error: "Couldn't draw the card", detail }, { status: 500 });
  }
}

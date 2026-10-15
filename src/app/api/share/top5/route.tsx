import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidRange, parseOffset, periodLabel, rangeWindow, supportsOffset } from "@/lib/dateRange";
import { fetchAvatarDataUrl } from "@/lib/avatarFetch";
import { buildLeaderboard, shortName, type GroupRow, type MemberInfo } from "@/lib/leaderboard";
import {
  ALL_DISCIPLINES_TITLE,
  canShareByElevation,
  cardTitle,
  entryValueText,
  isShareSport,
  periodTitle,
  SECTION_HEADINGS,
  SHARE_SPORTS,
} from "@/lib/shareTop5";
import { cardSafeName, initialsOf, type CardRow, type CombinedSection } from "@/lib/shareCard";
import { renderCombinedCard, renderShareCard } from "@/lib/renderShareCard";

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

/** The single image with the top 5 for Run, Bike and Swim. */
async function combinedCard({
  rows,
  members,
  origin,
  range,
  label,
}: {
  rows: GroupRow[];
  members: Map<string, MemberInfo>;
  origin: string;
  range: string;
  label: string;
}) {
  const sections: CombinedSection[] = SHARE_SPORTS.map((sport) => ({
    label: SECTION_HEADINGS[sport].toUpperCase(),
    rows: buildLeaderboard(rows, members, sport, false)
      .slice(0, 5)
      .map((entry, i) => {
        const name = cardSafeName(shortName(members.get(entry.userId)));
        return { rank: i + 1, name, value: entryValueText(entry, false), initials: initialsOf(name) };
      }),
  }));
  if (sections.every((s) => s.rows.length === 0)) {
    return NextResponse.json({ error: "no activity in this period" }, { status: 404 });
  }

  const [font, logoBytes] = await Promise.all([
    loadAsset("/fonts/LiberationSans-Bold.ttf", origin),
    loadAsset("/icons/icon-512.png", origin),
  ]);
  const logo = logoBytes ? `data:image/png;base64,${Buffer.from(logoBytes).toString("base64")}` : null;

  const { png, degraded } = await renderCombinedCard({
    title: ALL_DISCIPLINES_TITLE,
    subtitle: periodTitle(range, label),
    sections,
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
}

async function handle(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const sportParam = params.get("sport") ?? undefined;
  const isAll = sportParam === "all";
  if (!isAll && !isShareSport(sportParam)) {
    return NextResponse.json({ error: "sport must be run, ride, swim or all" }, { status: 400 });
  }
  const sport = isShareSport(sportParam) ? sportParam : null;

  const currentYear = new Date().getFullYear();
  const requestedRange = params.get("range") ?? "week";
  const range = isValidRange(requestedRange, currentYear) ? requestedRange : "week";
  const offset = supportsOffset(range) ? parseOffset(params.get("offset") ?? undefined, range) : 0;
  const byElevation = sport !== null && canShareByElevation(sport) && params.get("by") === "elevation";

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
  const origin = req.nextUrl.origin;

  if (!sport) return combinedCard({ rows, members, origin, range, label });

  const top = buildLeaderboard(rows, members, sport, byElevation).slice(0, 5);
  if (top.length === 0) return NextResponse.json({ error: "no activity in this period" }, { status: 404 });

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

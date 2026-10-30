import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { awardForUser } from "@/lib/awardAchievements";
import { prisma } from "@/lib/prisma";
import { awardTeamTrophies, isMissingTable } from "@/lib/teamTrophiesDb";
import { TEAM_TROPHIES_START_YEAR } from "@/lib/teamTrophies";

export async function POST() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const users = await prisma.user.findMany({ select: { id: true } });
  let achievementsCreated = 0;
  let yearlyBadgeWrites = 0;
  for (const user of users) {
    const result = await awardForUser(user.id);
    achievementsCreated += result.achievementsCreated;
    yearlyBadgeWrites += result.yearlyBadgeWrites;
  }

  // Club-wide trophies for every year from the first award year through this one.
  let teamTrophyWrites = 0;
  let teamTrophiesNeedTable = false;
  const now = new Date();
  try {
    for (let year = TEAM_TROPHIES_START_YEAR; year <= now.getUTCFullYear(); year++) {
      teamTrophyWrites += (await awardTeamTrophies(year, now)).written;
    }
  } catch (err) {
    if (!isMissingTable(err)) throw err;
    teamTrophiesNeedTable = true;
  }
  return NextResponse.json({
    members: users.length,
    achievementsCreated,
    yearlyBadgeWrites,
    teamTrophyWrites,
    ...(teamTrophiesNeedTable && { teamTrophiesNote: "Run `npx prisma db push` to create the team trophy table." }),
  });
}

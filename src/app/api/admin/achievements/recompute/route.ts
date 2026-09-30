import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { awardForUser } from "@/lib/awardAchievements";
import { prisma } from "@/lib/prisma";

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
  return NextResponse.json({ members: users.length, achievementsCreated, yearlyBadgeWrites });
}

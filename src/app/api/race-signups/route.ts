import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { raceId } = (await req.json()) as { raceId?: string };
  if (!raceId) {
    return NextResponse.json({ error: "raceId is required" }, { status: 400 });
  }

  await prisma.raceSignup.upsert({
    where: { raceId_userId: { raceId, userId } },
    update: {},
    create: { raceId, userId },
  });

  const count = await prisma.raceSignup.count({ where: { raceId } });
  return NextResponse.json({ count, given: true });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { raceId } = (await req.json()) as { raceId?: string };
  if (!raceId) {
    return NextResponse.json({ error: "raceId is required" }, { status: 400 });
  }

  await prisma.raceSignup.deleteMany({ where: { raceId, userId } });

  const count = await prisma.raceSignup.count({ where: { raceId } });
  return NextResponse.json({ count, given: false });
}

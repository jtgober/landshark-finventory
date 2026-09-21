import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function POST(req: Request) {
  const giverId = await requireUserId();
  if (!giverId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { activityId } = (await req.json()) as { activityId?: string };
  if (!activityId) {
    return NextResponse.json({ error: "activityId is required" }, { status: 400 });
  }

  await prisma.kudos.upsert({
    where: { activityId_giverId: { activityId, giverId } },
    update: {},
    create: { activityId, giverId },
  });

  const count = await prisma.kudos.count({ where: { activityId } });
  return NextResponse.json({ count, given: true });
}

export async function DELETE(req: Request) {
  const giverId = await requireUserId();
  if (!giverId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { activityId } = (await req.json()) as { activityId?: string };
  if (!activityId) {
    return NextResponse.json({ error: "activityId is required" }, { status: 400 });
  }

  await prisma.kudos.deleteMany({ where: { activityId, giverId } });

  const count = await prisma.kudos.count({ where: { activityId } });
  return NextResponse.json({ count, given: false });
}

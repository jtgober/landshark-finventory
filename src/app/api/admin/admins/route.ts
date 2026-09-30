import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

async function readUserId(req: Request) {
  const { userId } = (await req.json()) as { userId?: string };
  return typeof userId === "string" && userId ? userId : null;
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const userId = await readUserId(req);
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const result = await prisma.user.updateMany({ where: { id: userId }, data: { isAdmin: true } });
  if (result.count === 0) return NextResponse.json({ error: "member not found" }, { status: 404 });
  return NextResponse.json({ isAdmin: true });
}

export async function DELETE(req: Request) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const userId = await readUserId(req);
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const adminCount = await prisma.user.count({ where: { isAdmin: true } });
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (!target) return NextResponse.json({ error: "member not found" }, { status: 404 });
  if (target.isAdmin && adminCount <= 1) {
    return NextResponse.json({ error: "There must be at least one admin." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { isAdmin: false } });
  return NextResponse.json({ isAdmin: false });
}

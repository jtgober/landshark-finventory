import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { name?: string; date?: string; location?: string; raceUrl?: string };
  const name = body.name?.trim();
  const date = body.date ? new Date(body.date) : null;

  if (!name || !date || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "name and a valid date are required" }, { status: 400 });
  }

  const race = await prisma.race.create({
    data: {
      name,
      date,
      location: body.location?.trim() || null,
      raceUrl: body.raceUrl?.trim() || null,
      createdByUserId: session.user.id,
    },
  });

  return NextResponse.json({ race });
}

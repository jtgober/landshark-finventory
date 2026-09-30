import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

// Reads isAdmin from the DB on each request rather than the JWT, which is only
// written at sign-in and would leave a stale flag after a promotion/demotion.
export const getSessionUser = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isAdmin: true },
  });
});

export async function requireAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}

export async function requireAdminApi() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) } as const;
  if (!user.isAdmin) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) } as const;
  return { user } as const;
}

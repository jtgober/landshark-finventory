import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { finalizeYear } from "@/lib/yearSummaryDb";

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const { year } = (await req.json()) as { year?: number };
  const currentYear = new Date().getUTCFullYear();
  if (!Number.isInteger(year) || (year as number) < 2000 || (year as number) > currentYear) {
    return NextResponse.json({ error: "year must be a whole year between 2000 and this year" }, { status: 400 });
  }

  const members = await finalizeYear(year as number);
  return NextResponse.json({ year, members });
}

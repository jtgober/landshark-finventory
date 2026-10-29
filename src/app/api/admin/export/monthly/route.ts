import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { buildMonthlyReport } from "@/lib/monthlyReport";
import { buildMonthlyWorkbook } from "@/lib/monthlyWorkbook";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Admin-only Excel workbook of January to December totals for one year. No tokens or Strava IDs are selected. */
export async function GET(req: Request) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const year = Number(new URL(req.url).searchParams.get("year"));
  const latestYear = new Date().getUTCFullYear() + 1;
  if (!Number.isInteger(year) || year < 2000 || year > latestYear) {
    return NextResponse.json({ error: "year must be a valid year" }, { status: 400 });
  }

  try {
    const activities = await prisma.activity.findMany({
      where: { startDateLocal: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
      select: {
        userId: true,
        sportType: true,
        startDateLocal: true,
        distanceMeters: true,
        movingTimeSeconds: true,
        totalElevationGain: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    const report = buildMonthlyReport(
      activities.map(({ user, ...a }) => ({
        ...a,
        memberName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Club Member",
      })),
      year,
    );
    const workbook = await buildMonthlyWorkbook(report, new Date());
    return new Response(new Uint8Array(workbook), {
      headers: {
        "Content-Type": XLSX_TYPE,
        "Content-Disposition": `attachment; filename="landshark-monthly-totals-${year}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Monthly workbook export failed", error);
    return NextResponse.json({ error: "Couldn't build the workbook" }, { status: 500 });
  }
}

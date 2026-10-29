import writeXlsxFile, { type CellObject, type SheetData } from "write-excel-file/node";
import { MONTH_NAMES, type MonthlyReport } from "./monthlyReport";

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;
const miles = (meters: number) => round(meters / METERS_PER_MILE, 2);
const feet = (meters: number) => Math.round(meters * FEET_PER_METER);
const hours = (seconds: number) => round(seconds / 3600, 2);

const MILES = "#,##0.0";
const WHOLE = "#,##0";
const HEADER_FILL = "#FFEDD5";
const TOTAL_FILL = "#FFF7ED";

type Cell = CellObject;

const header = (value: string, align: "left" | "right" = "right"): Cell => ({
  value,
  fontWeight: "bold",
  backgroundColor: HEADER_FILL,
  align,
  wrap: true,
});
const num = (value: number, format: string): Cell => ({ value, type: Number, format });
const formula = (value: string, format: string, extra: Cell = {}): Cell => ({
  value,
  type: "Formula",
  format,
  fontWeight: "bold",
  backgroundColor: TOTAL_FILL,
  ...extra,
});

const columnLetter = (index: number) => String.fromCharCode("A".charCodeAt(0) + index);

/**
 * The monthly totals workbook: club totals by month, each member's distance by month, and a short notes sheet.
 * Totals are real Excel formulas, so they stay right if someone edits a number.
 */
export async function buildMonthlyWorkbook(report: MonthlyReport, generatedAt: Date): Promise<Buffer> {
  // Sheet 1: club totals, January to December, then a Total row.
  const columns = [
    "Month",
    "Activities",
    "Active members",
    "Distance (mi)",
    "Run (mi)",
    "Bike (mi)",
    "Swim (mi)",
    "Other (mi)",
    "Moving time (hrs)",
    "Elevation (ft)",
    "Run elevation (ft)",
    "Bike elevation (ft)",
  ];
  const totals: Cell[][] = [columns.map((c, i) => header(c, i === 0 ? "left" : "right"))];
  for (const m of report.months) {
    const other = Math.max(0, m.distanceMeters - m.runMeters - m.rideMeters - m.swimMeters);
    totals.push([
      { value: MONTH_NAMES[m.month] },
      num(m.activities, WHOLE),
      num(m.activeMembers, WHOLE),
      num(miles(m.distanceMeters), MILES),
      num(miles(m.runMeters), MILES),
      num(miles(m.rideMeters), MILES),
      num(miles(m.swimMeters), MILES),
      num(miles(other), MILES),
      num(hours(m.movingSeconds), MILES),
      num(feet(m.elevationMeters), WHOLE),
      num(feet(m.runElevationMeters), WHOLE),
      num(feet(m.rideElevationMeters), WHOLE),
    ]);
  }
  const first = 2;
  const last = 13;
  const sum = (col: number, format: string) =>
    formula(`=SUM(${columnLetter(col)}${first}:${columnLetter(col)}${last})`, format);
  totals.push([
    { value: `Total ${report.year}`, fontWeight: "bold", backgroundColor: TOTAL_FILL },
    sum(1, WHOLE),
    // The distinct count for the whole year, not a sum of the monthly counts (a member active in every month is one member).
    { value: report.yearActiveMembers, type: Number, format: WHOLE, fontWeight: "bold", backgroundColor: TOTAL_FILL },
    sum(3, MILES),
    sum(4, MILES),
    sum(5, MILES),
    sum(6, MILES),
    sum(7, MILES),
    sum(8, MILES),
    sum(9, WHOLE),
    sum(10, WHOLE),
    sum(11, WHOLE),
  ]);

  // Sheet 2: distance per member per month, with row and column totals.
  const memberHeader: Cell[] = [
    header("Member", "left"),
    ...MONTH_NAMES.map((m) => header(m.slice(0, 3))),
    header("Total (mi)"),
  ];
  const memberRows: Cell[][] = report.members.map((member, i) => {
    const row = i + 2;
    return [
      { value: member.name },
      ...member.meters.map((meters) => num(miles(meters), MILES)),
      formula(`=SUM(B${row}:M${row})`, MILES),
    ];
  });
  const memberLast = report.members.length + 1;
  const memberSheet: Cell[][] = [memberHeader, ...memberRows];
  if (report.members.length > 0) {
    memberSheet.push([
      { value: "Club total", fontWeight: "bold", backgroundColor: TOTAL_FILL },
      ...Array.from({ length: 13 }, (_, i) => {
        const col = columnLetter(i + 1);
        return formula(`=SUM(${col}2:${col}${memberLast})`, MILES);
      }),
    ]);
  }

  // Sheet 3: how to read the numbers.
  const about: Cell[][] = [
    [{ value: `Louisville Landsharks: monthly totals for ${report.year}`, fontWeight: "bold" }],
    [{ value: `Created ${generatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC` }],
    [{ value: "" }],
    [{ value: "Months use the date and time on the member's own Strava activity (their local time)." }],
    [{ value: "Only activity synced since each member connected to the site is counted; there is no backfill." }],
    [{ value: "Activities a member deletes on Strava are removed from the site, so totals can go down later." }],
    [
      {
        value:
          "Distance is every activity. Run, Bike and Swim are those disciplines; Other is everything else (walks, hikes, workouts).",
      },
    ],
    [
      {
        value:
          "Bike includes virtual rides. Moving time is the time Strava counts as moving, not the time on the clock.",
      },
    ],
    [
      {
        value:
          "Active members in the Total row is how many different members were active in the year, not the sum of the months.",
      },
    ],
    [{ value: "Contains member names, so handle accordingly." }],
  ];

  const buffer = await writeXlsxFile([
    {
      data: totals as SheetData,
      sheet: "Monthly totals",
      columns: [{ width: 16 }, ...columns.slice(1).map((c) => ({ width: Math.max(12, c.length + 2) }))],
      stickyRowsCount: 1,
      stickyColumnsCount: 1,
    },
    {
      data: memberSheet as SheetData,
      sheet: "Members by month (mi)",
      columns: [{ width: 28 }, ...Array.from({ length: 12 }, () => ({ width: 9 })), { width: 12 }],
      stickyRowsCount: 1,
      stickyColumnsCount: 1,
    },
    { data: about as SheetData, sheet: "About", columns: [{ width: 110 }] },
  ]).toBuffer();
  return buffer;
}

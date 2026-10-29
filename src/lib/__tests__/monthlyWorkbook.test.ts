import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { buildMonthlyReport, type MonthlyActivity } from "../monthlyReport";
import { buildMonthlyWorkbook } from "../monthlyWorkbook";

const MILE = 1609.344;
const act = (userId: string, name: string, date: string, sportType: string, miles: number): MonthlyActivity => ({
  userId,
  memberName: name,
  sportType,
  startDateLocal: new Date(`${date}Z`),
  distanceMeters: miles * MILE,
  movingTimeSeconds: 7200,
  totalElevationGain: 100,
});

async function open(activities: MonthlyActivity[]) {
  const buffer = await buildMonthlyWorkbook(buildMonthlyReport(activities, 2027), new Date("2027-12-31T12:00:00Z"));
  const files = unzipSync(new Uint8Array(buffer));
  const text = (path: string) => strFromU8(files[path]);
  return { files, text, buffer };
}

describe("buildMonthlyWorkbook", () => {
  const activities = [
    act("a", "Alex P.", "2027-01-05T07:00:00", "Run", 10),
    act("a", "Alex P.", "2027-02-05T07:00:00", "Ride", 40),
    act("b", "=SUM(1+1) Hacker", "2027-02-06T07:00:00", "Swim", 2),
  ];

  it("is a valid xlsx zip with the three sheets in order", async () => {
    const { buffer, text, files } = await open(activities);
    expect(Buffer.from(buffer).subarray(0, 2).toString()).toBe("PK");
    const workbook = text("xl/workbook.xml");
    const names = [...workbook.matchAll(/<sheet [^>]*name="([^"]+)"/g)].map((m) => m[1]);
    expect(names.map((n) => n.replace(/&amp;/g, "&"))).toEqual(["Monthly totals", "Members by month (mi)", "About"]);
    expect(Object.keys(files).some((f) => f.startsWith("xl/worksheets/sheet"))).toBe(true);
  });

  it("has a row per month plus a Total row with SUM formulas", async () => {
    const { text } = await open(activities);
    const sheet = text("xl/worksheets/sheet1.xml");
    // header + 12 months + total
    expect([...sheet.matchAll(/<row /g)]).toHaveLength(14);
    expect(sheet).toContain("=SUM(B2:B13)");
    expect(sheet).toContain("SUM(D2:D13)");
    expect(sheet).toContain("SUM(L2:L13)");
  });

  it("puts every month name and the headers in the file", async () => {
    const { files, text } = await open(activities);
    const strings = Object.keys(files).includes("xl/sharedStrings.xml") ? text("xl/sharedStrings.xml") : "";
    const all = strings + text("xl/worksheets/sheet1.xml");
    for (const month of ["January", "June", "December", "Distance (mi)", "Active members", "Moving time (hrs)"]) {
      expect(all, month).toContain(month);
    }
  });

  it("writes a name that looks like a formula as text, not as a formula", async () => {
    const { files, text } = await open(activities);
    const sheet2 = text("xl/worksheets/sheet2.xml");
    const strings = Object.keys(files).includes("xl/sharedStrings.xml") ? text("xl/sharedStrings.xml") : "";
    expect(sheet2 + strings).toContain("=SUM(1+1) Hacker");
    expect(sheet2).not.toContain("<f>SUM(1+1)");
    expect(sheet2).not.toContain("<f>=SUM(1+1)");
  });

  it("builds a member-by-month sheet with row and column totals", async () => {
    const { text } = await open(activities);
    const sheet2 = text("xl/worksheets/sheet2.xml");
    expect(sheet2).toContain("SUM(B2:M2)");
    expect(sheet2).toContain("SUM(N2:N3)"); // club total of the member totals column
  });

  it("still builds when nobody has any activity", async () => {
    const { buffer, text } = await open([]);
    expect(buffer.length).toBeGreaterThan(1000);
    expect([...text("xl/worksheets/sheet1.xml").matchAll(/<row /g)]).toHaveLength(14);
  });
});

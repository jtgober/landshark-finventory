import { describe, expect, it } from "vitest";
import { buildMonthlyReport, type MonthlyActivity } from "../monthlyReport";

const MILE = 1609.344;
const act = (
  userId: string,
  date: string,
  sportType: string,
  miles: number,
  extra: Partial<MonthlyActivity> = {},
): MonthlyActivity => ({
  userId,
  memberName: `Member ${userId}`,
  sportType,
  startDateLocal: new Date(`${date}Z`),
  distanceMeters: miles * MILE,
  movingTimeSeconds: 3600,
  totalElevationGain: 100,
  ...extra,
});

describe("buildMonthlyReport", () => {
  it("always returns twelve months, January first, with empty months at zero", () => {
    const report = buildMonthlyReport([act("a", "2027-03-05T07:00:00", "Run", 5)], 2027);
    expect(report.months.map((m) => m.month)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(report.months[2].activities).toBe(1);
    expect(report.months[0]).toMatchObject({ activities: 0, activeMembers: 0, distanceMeters: 0, movingSeconds: 0 });
  });

  it("splits distance and climbing by discipline and keeps everything else in the total", () => {
    const report = buildMonthlyReport(
      [
        act("a", "2027-06-01T07:00:00", "Run", 5, { totalElevationGain: 50 }),
        act("a", "2027-06-02T07:00:00", "TrailRun", 3, { totalElevationGain: 150 }),
        act("b", "2027-06-03T07:00:00", "VirtualRide", 20, { totalElevationGain: 300 }),
        act("b", "2027-06-04T07:00:00", "Swim", 1, { totalElevationGain: 0 }),
        act("b", "2027-06-05T07:00:00", "Hike", 4, { totalElevationGain: 500 }),
      ],
      2027,
    );
    const june = report.months[5];
    expect(june.activities).toBe(5);
    expect(june.distanceMeters).toBeCloseTo(33 * MILE);
    expect(june.runMeters).toBeCloseTo(8 * MILE);
    expect(june.rideMeters).toBeCloseTo(20 * MILE);
    expect(june.swimMeters).toBeCloseTo(1 * MILE);
    expect(june.runElevationMeters).toBe(200);
    expect(june.rideElevationMeters).toBe(300);
    expect(june.elevationMeters).toBe(1000); // includes the hike
    expect(june.movingSeconds).toBe(5 * 3600);
  });

  it("uses the athlete's local date for the month and year boundaries", () => {
    const report = buildMonthlyReport(
      [
        act("a", "2026-12-31T23:30:00", "Run", 5), // last minutes of 2026 locally
        act("a", "2027-01-01T00:10:00", "Run", 5),
        act("a", "2027-12-31T23:59:00", "Run", 5),
        act("a", "2028-01-01T00:00:00", "Run", 5),
      ],
      2027,
    );
    expect(report.months[0].activities).toBe(1);
    expect(report.months[11].activities).toBe(1);
    expect(report.months.reduce((n, m) => n + m.activities, 0)).toBe(2);
  });

  it("counts active members per month and distinct members for the year", () => {
    const report = buildMonthlyReport(
      [
        act("a", "2027-01-05T07:00:00", "Run", 1),
        act("a", "2027-01-20T07:00:00", "Run", 1),
        act("b", "2027-01-21T07:00:00", "Run", 1),
        act("a", "2027-02-02T07:00:00", "Run", 1),
        act("c", "2027-03-02T07:00:00", "Run", 1),
      ],
      2027,
    );
    expect(report.months[0].activeMembers).toBe(2);
    expect(report.months[1].activeMembers).toBe(1);
    expect(report.months[2].activeMembers).toBe(1);
    expect(report.yearActiveMembers).toBe(3); // not 2 + 1 + 1
  });

  it("totals each member by month and sorts biggest first, ties by name", () => {
    const report = buildMonthlyReport(
      [
        act("a", "2027-01-05T07:00:00", "Run", 10, { memberName: "Zed" }),
        act("b", "2027-01-06T07:00:00", "Run", 10, { memberName: "Amy" }),
        act("b", "2027-04-06T07:00:00", "Ride", 30, { memberName: "Amy" }),
        act("c", "2027-02-06T07:00:00", "Run", 100, { memberName: "Cal" }),
      ],
      2027,
    );
    expect(report.members.map((m) => m.name)).toEqual(["Cal", "Amy", "Zed"]);
    const amy = report.members[1];
    expect(amy.totalMeters).toBeCloseTo(40 * MILE);
    expect(amy.meters[0]).toBeCloseTo(10 * MILE);
    expect(amy.meters[3]).toBeCloseTo(30 * MILE);
    expect(amy.meters[1]).toBe(0);
  });

  it("handles a year with no activity", () => {
    const report = buildMonthlyReport([], 2027);
    expect(report.months).toHaveLength(12);
    expect(report.members).toEqual([]);
    expect(report.yearActiveMembers).toBe(0);
  });
});

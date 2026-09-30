import { describe, expect, it } from "vitest";
import { rankInClub, summarizeYearActivities } from "../yearSummary";

const act = (iso: string, sportType: string, meters: number, seconds = 600, elevation = 10) => ({
  startDateLocal: new Date(`${iso}Z`),
  sportType,
  distanceMeters: meters,
  movingTimeSeconds: seconds,
  totalElevationGain: elevation,
});

describe("summarizeYearActivities", () => {
  it("ignores activities outside the year, including the Dec 31 / Jan 1 edge", () => {
    const s = summarizeYearActivities(
      [act("2026-12-31T23:59:00", "Run", 5000), act("2027-01-01T00:00:00", "Run", 7000), act("2028-01-01T00:00:00", "Run", 9000)],
      2027,
    );
    expect(s.activityCount).toBe(1);
    expect(s.totalMeters).toBe(7000);
  });

  it("splits by sport and puts distance in the right month", () => {
    const s = summarizeYearActivities(
      [act("2027-01-15T07:00:00", "Run", 1000), act("2027-01-20T07:00:00", "Ride", 4000), act("2027-12-01T07:00:00", "Swim", 500)],
      2027,
    );
    expect(s.runMeters).toBe(1000);
    expect(s.rideMeters).toBe(4000);
    expect(s.swimMeters).toBe(500);
    expect(s.monthlyMeters[0]).toBe(5000);
    expect(s.monthlyMeters[11]).toBe(500);
    expect(s.monthlyMeters.reduce((a, b) => a + b, 0)).toBe(s.totalMeters);
  });

  it("tracks longest effort, elevation, moving time and streaks", () => {
    const s = summarizeYearActivities(
      [act("2027-03-01T07:00:00", "Ride", 40000, 7200, 500), act("2027-03-02T07:00:00", "Run", 8000, 2400, 100), act("2027-03-05T07:00:00", "Run", 5000, 1500, 50)],
      2027,
    );
    expect(s.longestActivityMeters).toBe(40000);
    expect(s.elevationMeters).toBe(650);
    expect(s.movingSeconds).toBe(11100);
    expect(s.bestDayStreak).toBe(2);
  });

  it("returns zeros for an empty year", () => {
    const s = summarizeYearActivities([], 2027);
    expect(s.totalMeters).toBe(0);
    expect(s.monthlyMeters).toHaveLength(12);
    expect(s.bestDayStreak).toBe(0);
  });
});

describe("rankInClub", () => {
  it("ranks by total with ties sharing a rank", () => {
    expect(rankInClub([100, 200, 300], 300)).toEqual({ rank: 1, of: 3, topPercent: 34 });
    expect(rankInClub([100, 200, 300], 100)).toEqual({ rank: 3, of: 3, topPercent: 100 });
    expect(rankInClub([100, 200, 200], 200).rank).toBe(1);
  });

  it("handles an empty club", () => {
    expect(rankInClub([], 0)).toEqual({ rank: 1, of: 0, topPercent: 100 });
  });
});

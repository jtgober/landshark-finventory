import { describe, expect, it } from "vitest";
import { computeAthleteStats } from "../athleteStats";
import { ACHIEVEMENTS, evaluateAchievements, nextUpAchievements } from "../achievements";
import { milesToMeters } from "../units";

const act = (date: string, sportType: string, miles: number) => ({
  startDateLocal: new Date(`${date}T07:00:00Z`),
  sportType,
  distanceMeters: milesToMeters(miles),
});

describe("computeAthleteStats", () => {
  it("buckets sport subtypes and sums miles", () => {
    const stats = computeAthleteStats([
      act("2027-03-01", "TrailRun", 5),
      act("2027-03-02", "VirtualRide", 20),
      act("2027-03-03", "OpenWaterSwim", 1),
      act("2027-03-04", "Yoga", 0),
    ]);
    expect(stats.runMiles).toBeCloseTo(5);
    expect(stats.rideMiles).toBeCloseTo(20);
    expect(stats.swimMiles).toBeCloseTo(1);
    expect(stats.totalMiles).toBeCloseTo(26);
    expect(stats.activityCount).toBe(4);
  });

  it("flags a week with run, ride and swim, but not two sports or other sports", () => {
    const two = computeAthleteStats([act("2027-03-01", "Run", 3), act("2027-03-02", "Ride", 10)]);
    expect(two.completeWeek).toBe(0);
    const withYoga = computeAthleteStats([act("2027-03-01", "Run", 3), act("2027-03-02", "Ride", 10), act("2027-03-03", "Yoga", 0)]);
    expect(withYoga.completeWeek).toBe(0);
    const all = computeAthleteStats([act("2027-03-01", "Run", 3), act("2027-03-03", "Ride", 10), act("2027-03-07", "Swim", 1)]);
    expect(all.completeWeek).toBe(1);
  });

  it("does not stitch a complete week across the Sunday/Monday boundary", () => {
    const split = computeAthleteStats([act("2027-03-06", "Run", 3), act("2027-03-07", "Ride", 10), act("2027-03-08", "Swim", 1)]);
    expect(split.completeWeek).toBe(0);
  });
});

describe("evaluateAchievements", () => {
  it("has unique keys", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.key)).size).toBe(ACHIEVEMENTS.length);
  });

  it("awards a threshold exactly at the boundary and not just below", () => {
    const at = computeAthleteStats([act("2027-03-01", "Run", 100)]);
    expect(evaluateAchievements(at)).toContain("run-miles-100");
    const below = computeAthleteStats([act("2027-03-01", "Run", 99.9)]);
    expect(evaluateAchievements(below)).not.toContain("run-miles-100");
  });

  it("awards all lower tiers along with the highest", () => {
    const keys = evaluateAchievements(computeAthleteStats([act("2027-03-01", "Ride", 1100)]));
    expect(keys).toEqual(expect.arrayContaining(["ride-miles-250", "ride-miles-1000", "total-miles-500", "total-miles-1000"]));
    expect(keys).not.toContain("ride-miles-2500");
  });

  it("awards streak achievements", () => {
    const days = ["01", "02", "03", "04", "05", "06", "07"].map((n) => act(`2027-03-${n}`, "Run", 1));
    const keys = evaluateAchievements(computeAthleteStats(days));
    expect(keys).toEqual(expect.arrayContaining(["day-streak-3", "day-streak-7"]));
    expect(keys).not.toContain("day-streak-14");
  });
});

describe("nextUpAchievements", () => {
  it("returns the lowest unearned goal per metric with progress", () => {
    const stats = computeAthleteStats([act("2027-03-01", "Run", 60)]);
    const earned = new Set(evaluateAchievements(stats));
    const next = nextUpAchievements(stats, earned);
    const run = next.find((n) => n.def.metric === "runMiles");
    expect(run?.def.key).toBe("run-miles-100");
    expect(run?.progress).toBeCloseTo(0.6);
  });
});

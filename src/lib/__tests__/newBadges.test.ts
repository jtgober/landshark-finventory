import { describe, expect, it } from "vitest";
import { computeAthleteStats, type StatActivity } from "../athleteStats";
import { easterDate, HOLIDAYS, holidaysOn } from "../holidays";
import { ACHIEVEMENTS, evaluateAchievements } from "../achievements";
import { formatProgress } from "../badgeProgress";
import { milesToMeters } from "../units";

// start_date_local style: wall-clock digits labelled Z.
const at = (iso: string, sportType = "Run", miles = 3, extra: Partial<StatActivity> = {}): StatActivity => ({
  startDateLocal: new Date(`${iso}Z`),
  sportType,
  distanceMeters: milesToMeters(miles),
  ...extra,
});

describe("elevation and time", () => {
  it("sums elevation in feet and moving time in hours", () => {
    const stats = computeAthleteStats([
      at("2027-03-01T07:00:00", "Ride", 20, { totalElevationGain: 1000, movingTimeSeconds: 3600 }),
      at("2027-03-02T07:00:00", "Run", 5, { totalElevationGain: 500, movingTimeSeconds: 5400 }),
    ]);
    expect(stats.elevationFeet).toBeCloseTo(1500 * 3.28084);
    expect(stats.movingHours).toBeCloseTo(2.5);
  });

  it("treats missing elevation and time as zero", () => {
    const stats = computeAthleteStats([at("2027-03-01T07:00:00")]);
    expect(stats.elevationFeet).toBe(0);
    expect(stats.movingHours).toBe(0);
  });
});

describe("big day", () => {
  it("tracks the single longest effort per sport", () => {
    const stats = computeAthleteStats([
      at("2027-03-01T07:00:00", "Ride", 30),
      at("2027-03-02T07:00:00", "VirtualRide", 62),
      at("2027-03-03T07:00:00", "Run", 13.2),
      at("2027-03-04T07:00:00", "Run", 5),
      at("2027-03-05T07:00:00", "Swim", 1.5),
    ]);
    expect(stats.longestRideMiles).toBeCloseTo(62);
    expect(stats.longestRunMiles).toBeCloseTo(13.2);
    expect(stats.longestSwimMiles).toBeCloseTo(1.5);
    const earned = new Set(evaluateAchievements(stats));
    expect(earned.has("big-ride-50")).toBe(true);
    expect(earned.has("big-ride-75")).toBe(false);
    expect(earned.has("big-run-13.1")).toBe(true);
    expect(earned.has("big-run-26.2")).toBe(false);
    expect(earned.has("big-swim-1")).toBe(true);
  });

  it("does not add up two shorter efforts", () => {
    const stats = computeAthleteStats([at("2027-03-01T07:00:00", "Ride", 30), at("2027-03-01T17:00:00", "Ride", 30)]);
    expect(stats.longestRideMiles).toBeCloseTo(30);
  });
});

describe("early bird and night owl", () => {
  it("counts starts before 6 am and at or after 8 pm", () => {
    const stats = computeAthleteStats([
      at("2027-03-01T05:59:00"),
      at("2027-03-02T06:00:00"),
      at("2027-03-03T19:59:00"),
      at("2027-03-04T20:00:00"),
      at("2027-03-05T23:30:00"),
    ]);
    expect(stats.earlyCount).toBe(1);
    expect(stats.nightCount).toBe(2);
  });
});

describe("brick and triple brick", () => {
  it("needs a ride and a run on the same day", () => {
    const same = computeAthleteStats([at("2027-03-01T07:00:00", "Ride"), at("2027-03-01T18:00:00", "Run")]);
    expect(same.brickDays).toBe(1);
    expect(same.tripleBrickDays).toBe(0);
    const split = computeAthleteStats([at("2027-03-01T07:00:00", "Ride"), at("2027-03-02T07:00:00", "Run")]);
    expect(split.brickDays).toBe(0);
  });

  it("counts a triple brick as a brick too, and not for other sports", () => {
    const triple = computeAthleteStats([
      at("2027-03-01T06:00:00", "Swim"),
      at("2027-03-01T09:00:00", "Ride"),
      at("2027-03-01T12:00:00", "TrailRun"),
    ]);
    expect(triple.brickDays).toBe(1);
    expect(triple.tripleBrickDays).toBe(1);
    const yoga = computeAthleteStats([at("2027-03-01T06:00:00", "Ride"), at("2027-03-01T07:00:00", "Yoga")]);
    expect(yoga.brickDays).toBe(0);
  });

  it("counts a day once however many sessions", () => {
    const stats = computeAthleteStats([
      at("2027-03-01T06:00:00", "Ride"),
      at("2027-03-01T07:00:00", "Ride"),
      at("2027-03-01T08:00:00", "Run"),
      at("2027-03-01T09:00:00", "Run"),
    ]);
    expect(stats.brickDays).toBe(1);
  });
});

describe("weekend warrior", () => {
  it("needs both Saturday and Sunday in the same week", () => {
    // Sat Mar 6 + Sun Mar 7, 2027, then only a Saturday on Mar 13.
    const stats = computeAthleteStats([
      at("2027-03-06T08:00:00"),
      at("2027-03-07T08:00:00"),
      at("2027-03-13T08:00:00"),
    ]);
    expect(stats.weekendStreak).toBe(1);
  });

  it("counts consecutive full weekends and breaks on a missed one", () => {
    const stats = computeAthleteStats([
      at("2027-03-06T08:00:00"),
      at("2027-03-07T08:00:00"),
      at("2027-03-13T08:00:00"),
      at("2027-03-14T08:00:00"),
      at("2027-03-20T08:00:00"),
      at("2027-03-27T08:00:00"),
      at("2027-03-28T08:00:00"),
    ]);
    expect(stats.weekendStreak).toBe(2);
  });
});

describe("four seasons", () => {
  it("counts seasons and months within a single calendar year", () => {
    const stats = computeAthleteStats([
      at("2027-01-10T08:00:00"),
      at("2027-04-10T08:00:00"),
      at("2027-07-10T08:00:00"),
      at("2027-10-10T08:00:00"),
    ]);
    expect(stats.seasonsInYear).toBe(4);
    expect(stats.monthsInYear).toBe(4);
  });

  it("does not stitch seasons across years", () => {
    const stats = computeAthleteStats([
      at("2027-07-10T08:00:00"),
      at("2027-10-10T08:00:00"),
      at("2028-01-10T08:00:00"),
      at("2028-04-10T08:00:00"),
    ]);
    expect(stats.seasonsInYear).toBe(2);
  });

  it("awards every-month only with all twelve months in a year", () => {
    const months = Array.from({ length: 12 }, (_, i) => at(`2027-${String(i + 1).padStart(2, "0")}-15T08:00:00`));
    expect(evaluateAchievements(computeAthleteStats(months))).toContain("four-seasons-12");
    expect(evaluateAchievements(computeAthleteStats(months.slice(1)))).not.toContain("four-seasons-12");
  });
});

describe("comeback", () => {
  it("counts a gap of more than 30 days between active days", () => {
    const stats = computeAthleteStats([at("2027-01-01T08:00:00"), at("2027-02-01T08:00:00")]);
    expect(stats.comebacks).toBe(1);
  });

  it("does not count 30 days or fewer, or the first activity", () => {
    const stats = computeAthleteStats([at("2027-01-01T08:00:00"), at("2027-01-31T08:00:00")]);
    expect(stats.comebacks).toBe(0);
    expect(computeAthleteStats([at("2027-01-01T08:00:00")]).comebacks).toBe(0);
  });

  it("counts each long break", () => {
    const stats = computeAthleteStats([
      at("2027-01-01T08:00:00"),
      at("2027-03-01T08:00:00"),
      at("2027-06-01T08:00:00"),
      at("2027-06-02T08:00:00"),
    ]);
    expect(stats.comebacks).toBe(2);
  });
});

describe("holidays", () => {
  const d = (s: string) => new Date(`${s}T08:00:00Z`);

  it("recognises each fixed-date holiday and not the day before", () => {
    expect(holidaysOn(d("2027-01-01"))).toEqual(["new-years-day"]);
    expect(holidaysOn(d("2027-02-14"))).toEqual(["valentines-day"]);
    expect(holidaysOn(d("2027-02-13"))).toEqual([]);
    expect(holidaysOn(d("2027-03-17"))).toEqual(["st-patricks-day"]);
    expect(holidaysOn(d("2027-07-04"))).toEqual(["independence-day"]);
    expect(holidaysOn(d("2027-10-31"))).toEqual(["halloween"]);
    expect(holidaysOn(d("2027-12-25"))).toEqual(["christmas"]);
    expect(holidaysOn(d("2027-12-24"))).toEqual([]);
    expect(holidaysOn(d("2027-12-31"))).toEqual(["new-years-eve"]);
  });

  it("finds the moving holidays in the right week", () => {
    // 2027: Derby May 1 (Sat), Memorial Day May 31 (Mon), Labor Day Sep 6 (Mon), Thanksgiving Nov 25 (Thu).
    expect(holidaysOn(d("2027-05-01"))).toEqual(["derby-day"]);
    expect(holidaysOn(d("2027-05-08"))).toEqual([]);
    expect(holidaysOn(d("2027-05-31"))).toEqual(["memorial-day"]);
    expect(holidaysOn(d("2027-05-24"))).toEqual([]);
    expect(holidaysOn(d("2027-09-06"))).toEqual(["labor-day"]);
    expect(holidaysOn(d("2027-09-13"))).toEqual([]);
    expect(holidaysOn(d("2027-11-25"))).toEqual(["thanksgiving"]);
    expect(holidaysOn(d("2027-11-18"))).toEqual([]);
    // 2026 Derby is May 2 and Thanksgiving is Nov 26.
    expect(holidaysOn(d("2026-05-02"))).toEqual(["derby-day"]);
    expect(holidaysOn(d("2026-11-26"))).toEqual(["thanksgiving"]);
  });

  it("computes Easter Sunday for known years", () => {
    const known: [number, number, number][] = [
      [2024, 2, 31],
      [2025, 3, 20],
      [2026, 3, 5],
      [2027, 2, 28],
      [2028, 3, 16],
    ];
    for (const [year, month, day] of known) expect(easterDate(year), String(year)).toEqual({ month, day });
    expect(holidaysOn(d("2026-04-05"))).toEqual(["easter"]);
    expect(holidaysOn(d("2026-04-12"))).toEqual([]);
  });

  it("gives each holiday its own badge, icon and colors", () => {
    expect(new Set(HOLIDAYS.map((h) => h.id)).size).toBe(HOLIDAYS.length);
    expect(new Set(HOLIDAYS.map((h) => h.glyph)).size).toBe(HOLIDAYS.length);
    expect(new Set(HOLIDAYS.map((h) => h.palette.face)).size).toBe(HOLIDAYS.length);
    for (const h of HOLIDAYS)
      expect(
        ACHIEVEMENTS.some((a) => a.key === `holiday-${h.id}`),
        h.id,
      ).toBe(true);
  });

  it("awards a holiday on any year and flags it once, however many activities", () => {
    const stats = computeAthleteStats([
      at("2026-12-25T07:00:00"),
      at("2026-12-25T18:00:00"),
      at("2027-12-25T07:00:00"),
      at("2026-04-05T07:00:00"),
    ]);
    expect(stats["holiday:christmas"]).toBe(1);
    expect(stats["holiday:easter"]).toBe(1);
    expect(stats["holiday:halloween"]).toBe(0);
    expect(stats.holidayTypes).toBe(2);
    const earned = evaluateAchievements(stats);
    expect(earned).toContain("holiday-christmas");
    expect(earned).toContain("holiday-easter");
    expect(earned).not.toContain("holiday-halloween");
  });

  it("counts different holidays for the collector badges", () => {
    const three = computeAthleteStats([
      at("2027-01-01T07:00:00"),
      at("2027-07-04T07:00:00"),
      at("2027-12-25T07:00:00"),
    ]);
    expect(three.holidayTypes).toBe(3);
    const earned = evaluateAchievements(three);
    expect(earned).toContain("holiday-collector-3");
    expect(earned).not.toContain("holiday-collector-6");
  });
});

describe("monthly challenge and variety", () => {
  it("finds the best calendar month for miles and activity count", () => {
    const stats = computeAthleteStats([
      at("2027-03-01T08:00:00", "Ride", 60),
      at("2027-03-20T08:00:00", "Ride", 50),
      at("2027-04-01T08:00:00", "Run", 90),
      at("2027-04-02T08:00:00", "Run", 5),
      at("2027-04-03T08:00:00", "Run", 5),
    ]);
    expect(stats.bestMonthMiles).toBeCloseTo(110);
    expect(stats.bestMonthActivities).toBe(3);
    expect(evaluateAchievements(stats)).toContain("monthly-miles-100");
  });

  it("counts distinct sport types", () => {
    const stats = computeAthleteStats([
      at("2027-03-01T08:00:00", "Run"),
      at("2027-03-02T08:00:00", "Run"),
      at("2027-03-03T08:00:00", "Ride"),
      at("2027-03-04T08:00:00", "Yoga"),
    ]);
    expect(stats.sportTypes).toBe(3);
    expect(evaluateAchievements(stats)).toContain("variety-3");
  });

  it("is zero with no activity", () => {
    const stats = computeAthleteStats([]);
    expect(stats.bestMonthMiles).toBe(0);
    expect(stats.bestMonthActivities).toBe(0);
    expect(stats.sportTypes).toBe(0);
  });
});

describe("club badges", () => {
  it("counts race signups from extras", () => {
    const stats = computeAthleteStats([], { raceSignups: 3 });
    expect(stats.raceSignups).toBe(3);
    const earned = evaluateAchievements(stats);
    expect(earned).toContain("race-ready-1");
    expect(earned).toContain("race-ready-3");
    expect(earned).not.toContain("race-ready-10");
  });

  it("counts days as a member and never goes negative", () => {
    const now = new Date("2027-06-01T12:00:00Z");
    expect(computeAthleteStats([], { memberSince: new Date("2027-03-03T12:00:00Z"), now }).memberDays).toBe(90);
    expect(computeAthleteStats([], { memberSince: new Date("2027-07-01T12:00:00Z"), now }).memberDays).toBe(0);
    expect(computeAthleteStats([], { now }).memberDays).toBe(0);
  });

  it("awards club regular at 90 days", () => {
    const now = new Date("2027-06-01T12:00:00Z");
    const joined = (days: number) => new Date(now.getTime() - days * 24 * 3600 * 1000);
    expect(evaluateAchievements(computeAthleteStats([], { memberSince: joined(89), now }))).not.toContain(
      "club-regular-90",
    );
    expect(evaluateAchievements(computeAthleteStats([], { memberSince: joined(90), now }))).toContain(
      "club-regular-90",
    );
  });
});

describe("formatProgress", () => {
  it("rounds whole targets and keeps a decimal for fractional ones", () => {
    expect(formatProgress(194.6, 250)).toBe("195 / 250");
    expect(formatProgress(9.43, 13.1)).toBe("9.4 / 13.1");
    expect(formatProgress(1200, 5000)).toBe("1,200 / 5,000");
  });
});

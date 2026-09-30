import { describe, expect, it } from "vitest";
import { longestDayStreak, longestWeekStreak, weekNumber } from "../streaks";

// Helper: a Strava-style start_date_local (wall-clock digits labelled Z).
const d = (iso: string) => new Date(`${iso}Z`);

describe("longestDayStreak", () => {
  it("is 0 with no activities", () => {
    expect(longestDayStreak([])).toBe(0);
  });

  it("counts multiple activities on one day once", () => {
    expect(longestDayStreak([d("2027-03-01T06:00:00"), d("2027-03-01T18:30:00")])).toBe(1);
  });

  it("finds the longest consecutive run, not the first", () => {
    const dates = ["2027-03-01", "2027-03-02", "2027-03-05", "2027-03-06", "2027-03-07"].map((s) => d(`${s}T07:00:00`));
    expect(longestDayStreak(dates)).toBe(3);
  });

  it("is order independent", () => {
    const dates = ["2027-03-03", "2027-03-01", "2027-03-02"].map((s) => d(`${s}T07:00:00`));
    expect(longestDayStreak(dates)).toBe(3);
  });

  it("continues across a year boundary", () => {
    const dates = [d("2026-12-31T23:30:00"), d("2027-01-01T00:15:00")];
    expect(longestDayStreak(dates)).toBe(2);
  });

  it("continues across month and leap-day boundaries", () => {
    const dates = ["2028-02-28", "2028-02-29", "2028-03-01"].map((s) => d(`${s}T07:00:00`));
    expect(longestDayStreak(dates)).toBe(3);
  });
});

describe("weekNumber / longestWeekStreak", () => {
  it("puts Monday and the following Sunday in the same week", () => {
    // 2027-03-01 is a Monday, 2027-03-07 the Sunday.
    expect(weekNumber(d("2027-03-01T00:00:00"))).toBe(weekNumber(d("2027-03-07T23:59:59")));
  });

  it("puts Sunday and the next Monday in different weeks", () => {
    expect(weekNumber(d("2027-03-08T00:00:00"))).toBe(weekNumber(d("2027-03-07T23:59:59")) + 1);
  });

  it("counts consecutive weeks with any activity", () => {
    const dates = ["2027-03-02", "2027-03-10", "2027-03-19", "2027-04-05"].map((s) => d(`${s}T07:00:00`));
    // weeks of Mar 1, Mar 8, Mar 15 are consecutive; Apr 5 skips a week.
    expect(longestWeekStreak(dates)).toBe(3);
  });

  it("treats two activities in one week as a single week", () => {
    expect(longestWeekStreak([d("2027-03-01T07:00:00"), d("2027-03-07T07:00:00")])).toBe(1);
  });
});

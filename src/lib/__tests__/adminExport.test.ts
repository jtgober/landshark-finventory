import { describe, expect, it } from "vitest";
import { csvCell, neutralizeFormula, toCsv } from "../csv";
import { rankRaces } from "../raceStats";
import { aggregateClubYear } from "../adminMetrics";

describe("csv", () => {
  it("neutralizes spreadsheet formulas in text", () => {
    for (const bad of ["=1+1", "+cmd", "-2+3", "@SUM(A1)", "\t=x", '=HYPERLINK("http://evil","x")']) {
      expect(neutralizeFormula(bad)).toBe(`'${bad}`);
    }
    expect(neutralizeFormula("Morning Run")).toBe("Morning Run");
    expect(neutralizeFormula("Run =fast")).toBe("Run =fast");
  });

  it("does not touch real numbers, including negatives", () => {
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(12.5)).toBe("12.5");
  });

  it("quotes commas, quotes and newlines, and escapes quotes", () => {
    expect(csvCell("Smith, Jo")).toBe('"Smith, Jo"');
    expect(csvCell('5" run')).toBe('"5"" run"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });

  it("handles null, dates and booleans", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(new Date("2027-03-01T07:00:00Z"))).toBe("2027-03-01T07:00:00.000Z");
    expect(csvCell(true)).toBe("true");
  });

  it("quotes after neutralizing when both apply", () => {
    expect(csvCell('=A1,"x"')).toBe(`"'=A1,""x"""`);
  });

  it("emits a BOM, CRLF rows and a trailing newline", () => {
    expect(toCsv([["a", "b"], [1, 2]])).toBe("﻿a,b\r\n1,2\r\n");
  });
});

describe("rankRaces", () => {
  const r = (id: string, signupCount: number, day: number) => ({ id, name: id, signupCount, date: new Date(Date.UTC(2027, 5, day)) });

  it("orders by signups with ties sharing a rank", () => {
    const ranked = rankRaces([r("a", 2, 1), r("b", 5, 2), r("c", 5, 3), r("d", 1, 4)]);
    expect(ranked.map((x) => [x.id, x.rank])).toEqual([["b", 1], ["c", 1], ["a", 3], ["d", 4]]);
  });

  it("breaks ties by earlier date and handles empty input", () => {
    expect(rankRaces([r("late", 3, 20), r("early", 3, 5)])[0].id).toBe("early");
    expect(rankRaces([])).toEqual([]);
  });
});

describe("aggregateClubYear", () => {
  const a = (userId: string, iso: string, sportType: string, distanceMeters: number) => ({
    userId, startDateLocal: new Date(`${iso}Z`), sportType, distanceMeters,
  });

  it("counts only the year, distinct active members and per-month activity", () => {
    const m = aggregateClubYear(
      [
        a("u1", "2027-01-05T07:00:00", "Run", 1000),
        a("u1", "2027-01-06T07:00:00", "Ride", 4000),
        a("u2", "2027-02-01T07:00:00", "Swim", 500),
        a("u2", "2026-12-31T23:00:00", "Run", 9999),
      ],
      2027,
    );
    expect(m.activityCount).toBe(3);
    expect(m.activeMembers).toBe(2);
    expect(m.totalMeters).toBe(5500);
    expect(m.monthlyMeters[0]).toBe(5000);
    expect(m.activeMembersByMonth[0]).toBe(1);
    expect(m.activeMembersByMonth[1]).toBe(1);
    expect(m.sportMeters).toEqual({ run: 1000, ride: 4000, swim: 500 });
  });

  it("sorts leaderboards by distance and keeps non-triathlon sports out of sport boards", () => {
    const m = aggregateClubYear(
      [a("u1", "2027-03-01T07:00:00", "Run", 1000), a("u2", "2027-03-01T07:00:00", "Run", 3000), a("u1", "2027-03-02T07:00:00", "Yoga", 5000)],
      2027,
    );
    expect(m.leaderboards.run.map((x) => x.userId)).toEqual(["u2", "u1"]);
    expect(m.leaderboards.total[0]).toEqual({ userId: "u1", meters: 6000 });
    expect(m.leaderboards.ride).toEqual([]);
  });
});

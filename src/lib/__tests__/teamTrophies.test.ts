import { describe, expect, it } from "vitest";
import {
  TEAM_TROPHIES,
  TEAM_TROPHIES_BY_KEY,
  computeTeamYearStats,
  evaluateTeamTrophies,
  isAwardYear,
  tierForValue,
  trophyProgress,
  type TeamActivity,
  type TeamYearStats,
} from "../teamTrophies";
import { milesToMeters } from "../units";

const act = (userId: string, iso: string, sportType: string, miles = 5, hours = 1, climbMeters = 0): TeamActivity => ({
  userId,
  sportType,
  startDateLocal: new Date(`${iso}Z`),
  distanceMeters: milesToMeters(miles),
  movingTimeSeconds: hours * 3600,
  totalElevationGain: climbMeters,
});

const baseStats: TeamYearStats = {
  year: 2027,
  recipients: 30,
  distanceMiles: 0,
  movingHours: 0,
  elevationFeet: 0,
  swimMiles: 0,
  kudosGiven: 0,
  fullRosterMonths: 0,
  tripleThreatMembers: 0,
  growthPercent: null,
};

const first = (entries: Record<string, string>) =>
  new Map(Object.entries(entries).map(([id, iso]) => [id, new Date(`${iso}Z`)]));

describe("isAwardYear", () => {
  it("starts in 2027", () => {
    expect(isAwardYear(2026)).toBe(false);
    expect(isAwardYear(2027)).toBe(true);
    expect(isAwardYear(2030)).toBe(true);
  });
});

describe("tierForValue", () => {
  it("awards at exactly the threshold and not below", () => {
    expect(tierForValue(99, [100, 200, 300])).toBeNull();
    expect(tierForValue(100, [100, 200, 300])).toBe("BRONZE");
    expect(tierForValue(200, [100, 200, 300])).toBe("SILVER");
    expect(tierForValue(999, [100, 200, 300])).toBe("GOLD");
    expect(tierForValue(null, [100, 200, 300])).toBeNull();
  });
});

describe("the eight trophies", () => {
  it("are defined with ascending thresholds and unique keys", () => {
    expect(TEAM_TROPHIES).toHaveLength(8);
    expect(new Set(TEAM_TROPHIES.map((t) => t.key)).size).toBe(8);
    for (const t of TEAM_TROPHIES) {
      expect(t.thresholds[0]).toBeLessThan(t.thresholds[1]);
      expect(t.thresholds[1]).toBeLessThan(t.thresholds[2]);
    }
  });

  it("Around the World bronze is one trip round the Earth", () => {
    const def = TEAM_TROPHIES_BY_KEY.get("around-the-world")!;
    expect(trophyProgress(def, { ...baseStats, distanceMiles: 24_900 }).tier).toBeNull();
    expect(trophyProgress(def, { ...baseStats, distanceMiles: 24_901 }).tier).toBe("BRONZE");
    expect(trophyProgress(def, { ...baseStats, distanceMiles: 74_703 }).tier).toBe("GOLD");
  });

  it("Everest counts climbs of 29,032 ft", () => {
    const def = TEAM_TROPHIES_BY_KEY.get("everest")!;
    expect(trophyProgress(def, { ...baseStats, elevationFeet: 29_032 * 25 }).tier).toBe("BRONZE");
    expect(trophyProgress(def, { ...baseStats, elevationFeet: 29_032 * 24 }).tier).toBeNull();
  });

  it("reports progress toward the next level and none once gold", () => {
    const def = TEAM_TROPHIES_BY_KEY.get("cheer-squad")!;
    const mid = trophyProgress(def, { ...baseStats, kudosGiven: 300 });
    expect(mid.tier).toBe("BRONZE");
    expect(mid.next).toEqual({ tier: "SILVER", target: 500, progress: 0.6 });
    expect(trophyProgress(def, { ...baseStats, kudosGiven: 1000 }).next).toBeNull();
    expect(trophyProgress(def, baseStats).next?.tier).toBe("BRONZE");
  });

  it("Bigger Than Last Year is unavailable without a fair comparison", () => {
    const def = TEAM_TROPHIES_BY_KEY.get("bigger-than-last-year")!;
    const p = trophyProgress(def, baseStats);
    expect(p.value).toBeNull();
    expect(p.tier).toBeNull();
    expect(p.next).toBeNull();
    expect(trophyProgress(def, { ...baseStats, growthPercent: 0.5 }).tier).toBe("BRONZE");
    expect(trophyProgress(def, { ...baseStats, growthPercent: -3 }).tier).toBeNull();
    expect(trophyProgress(def, { ...baseStats, growthPercent: 25 }).tier).toBe("GOLD");
  });

  it("evaluateTeamTrophies returns one result per trophy", () => {
    expect(evaluateTeamTrophies(baseStats).map((p) => p.def.key)).toEqual(TEAM_TROPHIES.map((t) => t.key));
  });
});

describe("computeTeamYearStats", () => {
  const input = (activities: TeamActivity[], extra: Partial<Parameters<typeof computeTeamYearStats>[0]> = {}) => ({
    year: 2027,
    activities,
    firstActivityByUser: first({}),
    kudosGiven: 0,
    previousYearActivities: [],
    now: new Date("2027-12-31T12:00:00Z"),
    ...extra,
  });

  it("sums distance, hours, elevation and swim miles, and counts recipients", () => {
    const stats = computeTeamYearStats(
      input([
        act("a", "2027-03-01T08:00:00", "Run", 10, 2, 100),
        act("b", "2027-03-02T08:00:00", "Swim", 2, 1, 0),
        act("b", "2027-03-03T08:00:00", "Ride", 20, 1.5, 300),
      ]),
    );
    expect(stats.recipients).toBe(2);
    expect(stats.distanceMiles).toBeCloseTo(32, 5);
    expect(stats.movingHours).toBeCloseTo(4.5, 5);
    expect(stats.elevationFeet).toBeCloseTo(400 * 3.28084, 3);
    expect(stats.swimMiles).toBeCloseTo(2, 5);
  });

  it("ignores activities outside the calendar year (Dec 31 / Jan 1)", () => {
    const stats = computeTeamYearStats(
      input([
        act("a", "2026-12-31T23:59:59", "Run", 10),
        act("a", "2027-01-01T00:00:00", "Run", 3),
        act("a", "2028-01-01T00:00:00", "Run", 9),
      ]),
    );
    expect(stats.distanceMiles).toBeCloseTo(3, 5);
  });

  it("counts a Triple Threat member for a Monday-Sunday week with a swim, a ride and a run", () => {
    const stats = computeTeamYearStats(
      input([
        // Mon 2027-03-01 .. Sun 2027-03-07
        act("a", "2027-03-01T06:00:00", "Swim"),
        act("a", "2027-03-03T06:00:00", "Ride"),
        act("a", "2027-03-07T06:00:00", "Run"),
        // b: run + ride + swim split across two weeks
        act("b", "2027-03-07T06:00:00", "Run"),
        act("b", "2027-03-08T06:00:00", "Ride"),
        act("b", "2027-03-09T06:00:00", "Swim"),
        // c: trail run + virtual ride + swim count as run/bike/swim; a walk does not
        act("c", "2027-03-01T06:00:00", "TrailRun"),
        act("c", "2027-03-02T06:00:00", "VirtualRide"),
        act("c", "2027-03-03T06:00:00", "Swim"),
        act("d", "2027-03-01T06:00:00", "Walk"),
      ]),
    );
    expect(stats.tripleThreatMembers).toBe(2);
  });

  it("counts a Triple Threat member once however many weeks qualify", () => {
    const week = (day: number) => [
      act("a", `2027-03-0${day}T06:00:00`, "Swim"),
      act("a", `2027-03-0${day}T07:00:00`, "Ride"),
      act("a", `2027-03-0${day}T08:00:00`, "Run"),
    ];
    expect(computeTeamYearStats(input([...week(1), ...week(8)])).tripleThreatMembers).toBe(1);
  });

  describe("Full Roster", () => {
    const roster = {
      a: "2026-06-01T00:00:00",
      b: "2026-06-01T00:00:00",
      c: "2026-06-01T00:00:00",
      d: "2026-06-01T00:00:00",
      e: "2026-06-01T00:00:00",
    };
    const everyone = (month: string) => Object.keys(roster).map((u) => act(u, `2027-${month}-10T08:00:00`, "Run"));

    it("counts months where at least 80% of the roster was active", () => {
      const four = ["a", "b", "c", "d"].map((u) => act(u, "2027-02-10T08:00:00", "Run"));
      const three = ["a", "b", "c"].map((u) => act(u, "2027-03-10T08:00:00", "Run"));
      const stats = computeTeamYearStats(
        input([...everyone("01"), ...four, ...three], { firstActivityByUser: first(roster) }),
      );
      expect(stats.fullRosterMonths).toBe(2); // Jan (5/5) and Feb (4/5 = 80%); Mar is 3/5
    });

    it("needs a roster of at least five", () => {
      const small = {
        a: "2026-06-01T00:00:00",
        b: "2026-06-01T00:00:00",
        c: "2026-06-01T00:00:00",
        d: "2026-06-01T00:00:00",
      };
      const acts = Object.keys(small).map((u) => act(u, "2027-01-10T08:00:00", "Run"));
      expect(computeTeamYearStats(input(acts, { firstActivityByUser: first(small) })).fullRosterMonths).toBe(0);
    });

    it("does not hold members who joined later against earlier months", () => {
      const late = { ...roster, f: "2027-05-15T00:00:00", g: "2027-05-16T00:00:00" };
      const acts = [...everyone("04"), act("f", "2027-05-15T08:00:00", "Run")];
      const stats = computeTeamYearStats(input(acts, { firstActivityByUser: first(late) }));
      expect(stats.fullRosterMonths).toBe(1); // April: 5/5. May roster is 7 and only f is active.
    });

    it("skips months that have not started yet", () => {
      const stats = computeTeamYearStats(
        input(everyone("08"), { firstActivityByUser: first(roster), now: new Date("2027-07-15T00:00:00Z") }),
      );
      expect(stats.fullRosterMonths).toBe(0);
    });
  });

  describe("growth", () => {
    const fullYear = (year: number, miles: number) =>
      Array.from({ length: 12 }, (_, m) => ({
        startDateLocal: new Date(Date.UTC(year, m, 10)),
        distanceMeters: milesToMeters(miles),
      }));

    it("compares against a previous year that had activity in every month", () => {
      const stats = computeTeamYearStats(
        input([act("a", "2027-01-10T08:00:00", "Run", 132)], { previousYearActivities: fullYear(2026, 10) }),
      ); // last year 120 mi, this year 132 mi
      expect(stats.growthPercent).toBeCloseTo(10, 5);
    });

    it("is null when the previous year is partial or empty", () => {
      const partial = fullYear(2026, 10).slice(3);
      expect(
        computeTeamYearStats(input([act("a", "2027-01-10T08:00:00", "Run")], { previousYearActivities: partial }))
          .growthPercent,
      ).toBeNull();
      expect(computeTeamYearStats(input([act("a", "2027-01-10T08:00:00", "Run")])).growthPercent).toBeNull();
    });

    it("can be negative", () => {
      const stats = computeTeamYearStats(
        input([act("a", "2027-01-10T08:00:00", "Run", 60)], { previousYearActivities: fullYear(2026, 10) }),
      );
      expect(stats.growthPercent).toBeCloseTo(-50, 5);
    });
  });

  it("passes through kudos", () => {
    expect(computeTeamYearStats(input([], { kudosGiven: 42 })).kudosGiven).toBe(42);
  });
});

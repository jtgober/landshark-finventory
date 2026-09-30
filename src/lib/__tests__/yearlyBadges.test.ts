import { describe, expect, it } from "vitest";
import { computeYearlyTiers, mergeYearlyTier, tierForMeters } from "../yearlyBadges";
import { milesToMeters } from "../units";

const act = (iso: string, sportType: string, miles: number) => ({
  startDateLocal: new Date(`${iso}Z`),
  sportType,
  distanceMeters: milesToMeters(miles),
});

describe("tierForMeters", () => {
  it("awards bronze exactly at 2,500 mi and nothing just below", () => {
    expect(tierForMeters(milesToMeters(2500), "RIDE")).toBe("BRONZE");
    expect(tierForMeters(milesToMeters(2499.9), "RIDE")).toBeNull();
  });

  it("uses the agreed bike, run and swim levels", () => {
    expect(tierForMeters(milesToMeters(5000), "RIDE")).toBe("SILVER");
    expect(tierForMeters(milesToMeters(7500), "RIDE")).toBe("GOLD");
    expect(tierForMeters(milesToMeters(1000), "RUN")).toBe("BRONZE");
    expect(tierForMeters(milesToMeters(1500), "RUN")).toBe("SILVER");
    expect(tierForMeters(milesToMeters(2000), "RUN")).toBe("GOLD");
    expect(tierForMeters(milesToMeters(150), "SWIM")).toBe("BRONZE");
    expect(tierForMeters(milesToMeters(300), "SWIM")).toBe("SILVER");
    expect(tierForMeters(milesToMeters(500), "SWIM")).toBe("GOLD");
  });
});

describe("computeYearlyTiers", () => {
  it("only counts activities inside the calendar year (Dec 31 / Jan 1 boundary)", () => {
    const acts = [act("2026-12-31T23:59:00", "Ride", 2500), act("2027-01-01T00:01:00", "Ride", 100)];
    expect(computeYearlyTiers(acts, 2027).RIDE).toBeNull();
    expect(computeYearlyTiers(acts, 2026).RIDE).toBe("BRONZE");
  });

  it("Complete Athlete needs all three sports and takes the lowest tier", () => {
    const partial = [act("2027-06-01T07:00:00", "Ride", 7500), act("2027-06-02T07:00:00", "Run", 2000)];
    expect(computeYearlyTiers(partial, 2027).COMPLETE).toBeNull();

    const all = [...partial, act("2027-06-03T07:00:00", "Swim", 150)];
    const tiers = computeYearlyTiers(all, 2027);
    expect(tiers.RIDE).toBe("GOLD");
    expect(tiers.RUN).toBe("GOLD");
    expect(tiers.SWIM).toBe("BRONZE");
    expect(tiers.COMPLETE).toBe("BRONZE");
  });

  it("sums many small activities across sport subtypes", () => {
    const acts = Array.from({ length: 100 }, () => act("2027-05-01T07:00:00", "GravelRide", 25));
    expect(computeYearlyTiers(acts, 2027).RIDE).toBe("BRONZE");
  });
});

describe("mergeYearlyTier", () => {
  const now = new Date("2027-07-01T00:00:00Z");
  const earlier = new Date("2027-03-01T00:00:00Z");

  it("creates a new badge with only the earned timestamps", () => {
    expect(mergeYearlyTier(null, "BRONZE", now)).toEqual({ tier: "BRONZE", bronzeAt: now, silverAt: null, goldAt: null });
  });

  it("upgrades while preserving earlier timestamps", () => {
    const existing = { tier: "BRONZE" as const, bronzeAt: earlier, silverAt: null, goldAt: null };
    expect(mergeYearlyTier(existing, "SILVER", now)).toEqual({ tier: "SILVER", bronzeAt: earlier, silverAt: now, goldAt: null });
  });

  it("sets every crossed tier when jumping straight to gold", () => {
    expect(mergeYearlyTier(null, "GOLD", now)).toEqual({ tier: "GOLD", bronzeAt: now, silverAt: now, goldAt: now });
  });

  it("never downgrades or rewrites an unchanged tier", () => {
    const existing = { tier: "SILVER" as const, bronzeAt: earlier, silverAt: earlier, goldAt: null };
    expect(mergeYearlyTier(existing, "BRONZE", now)).toBeNull();
    expect(mergeYearlyTier(existing, "SILVER", now)).toBeNull();
    expect(mergeYearlyTier(existing, null, now)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { formatElevation, formatHours } from "../format";

describe("formatHours", () => {
  it("shows one decimal under 100 hours", () => {
    expect(formatHours(0)).toBe("0.0 hrs");
    expect(formatHours(5400)).toBe("1.5 hrs");
    expect(formatHours(99.94 * 3600)).toBe("99.9 hrs");
  });

  it("rounds to whole hours with a thousands separator from 100 hours", () => {
    expect(formatHours(100 * 3600)).toBe("100 hrs");
    expect(formatHours(1276.4 * 3600)).toBe("1,276 hrs");
    expect(formatHours(12345.6 * 3600)).toBe("12,346 hrs");
  });

  it("never goes negative", () => {
    expect(formatHours(-60)).toBe("0.0 hrs");
  });
});

describe("formatElevation", () => {
  it("converts meters to feet with a thousands separator", () => {
    expect(formatElevation(0)).toBe("0 ft");
    expect(formatElevation(100)).toBe("328 ft");
    expect(formatElevation(39_000)).toBe("127,953 ft");
  });
});

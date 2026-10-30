import { describe, expect, it } from "vitest";
import { detectPlatform, manualInstallSteps } from "../installApp";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";

describe("detectPlatform", () => {
  it("recognises iPhones, iPads (even when they claim to be Macs) and Android", () => {
    expect(detectPlatform(IPHONE)).toBe("ios");
    expect(detectPlatform(IPAD_AS_MAC, 5)).toBe("ios");
    expect(detectPlatform(ANDROID, 5)).toBe("android");
  });

  it("treats real Macs and Windows PCs as desktop", () => {
    expect(detectPlatform(MAC, 0)).toBe("desktop");
    expect(detectPlatform(WINDOWS, 0)).toBe("desktop");
  });
});

describe("manualInstallSteps", () => {
  it("gives iPhone users the Safari Share steps", () => {
    const steps = manualInstallSteps("ios").join(" ");
    expect(steps).toContain("Safari");
    expect(steps).toContain("Add to Home Screen");
  });

  it("gives Android users the Chrome menu steps", () => {
    expect(manualInstallSteps("android").join(" ")).toContain("Install app");
  });

  it("always has at least two steps for every platform", () => {
    for (const p of ["ios", "android", "desktop"] as const)
      expect(manualInstallSteps(p).length).toBeGreaterThanOrEqual(2);
  });
});

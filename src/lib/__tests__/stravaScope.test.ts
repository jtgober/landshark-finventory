import { describe, expect, it } from "vitest";
import { canReadActivities } from "../stravaScope";

describe("canReadActivities", () => {
  it("accepts the scope the app requests", () => {
    expect(canReadActivities("read,activity:read")).toBe(true);
  });

  it("accepts activity:read_all", () => {
    expect(canReadActivities("read,activity:read_all")).toBe(true);
  });

  it("rejects a member who unticked the activity permission", () => {
    expect(canReadActivities("read")).toBe(false);
  });

  it("rejects empty or missing scope", () => {
    expect(canReadActivities("")).toBe(false);
    expect(canReadActivities(null)).toBe(false);
    expect(canReadActivities(undefined)).toBe(false);
  });

  it("does not match a lookalike scope", () => {
    expect(canReadActivities("read,profile:read_all")).toBe(false);
  });

  it("tolerates spaces around separators", () => {
    expect(canReadActivities("read, activity:read")).toBe(true);
  });
});

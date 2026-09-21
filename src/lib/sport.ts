export type SportCategory = "run" | "ride" | "swim" | "other";

export const SPORT_TABS: { key: "total" | SportCategory; label: string }[] = [
  { key: "total", label: "Total" },
  { key: "run", label: "Run" },
  { key: "ride", label: "Bike" },
  { key: "swim", label: "Swim" },
];

/**
 * Strava's sport_type has many subtypes (TrailRun, VirtualRide,
 * GravelRide, OpenWaterSwim, ...). Bucket them into the three
 * triathlon disciplines the club cares about for the leaderboard.
 */
export function categorizeSport(sportType: string): SportCategory {
  const type = sportType.toLowerCase();
  if (type.includes("run")) return "run";
  if (type.includes("ride") || type.includes("bike") || type.includes("cycl")) return "ride";
  if (type.includes("swim")) return "swim";
  return "other";
}

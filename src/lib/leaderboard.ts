import { categorizeSport } from "./sport";

/** One database group: everything a member logged in one Strava sport type over a period. */
export interface GroupRow {
  userId: string;
  sportType: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elevationMeters: number;
  count: number;
}

export interface MemberInfo {
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  image: string | null;
  distanceMeters: number;
  movingTimeSeconds: number;
  elevationMeters: number;
  count: number;
}

export function fullName(m: Pick<MemberInfo, "firstName" | "lastName"> | undefined): string {
  return `${m?.firstName ?? ""} ${m?.lastName ?? ""}`.trim() || "Club Member";
}

/** "Corey A." for public posts: first name plus last initial. */
export function shortName(m: Pick<MemberInfo, "firstName" | "lastName"> | undefined): string {
  const first = m?.firstName?.trim() ?? "";
  const lastInitial = m?.lastName?.trim().charAt(0).toUpperCase() ?? "";
  if (!first && !lastInitial) return "Club Member";
  return lastInitial ? `${first} ${lastInitial}.`.trim() : first;
}

/**
 * Ranks members from per-member, per-sport groups. `sport` is "total" or a sport category;
 * ranking is by distance, or by climbing (distance breaks ties) when `rankByElevation` is set.
 */
export function buildLeaderboard(
  rows: GroupRow[],
  members: Map<string, MemberInfo>,
  sport: string,
  rankByElevation: boolean,
): LeaderboardEntry[] {
  const byUser = new Map<string, LeaderboardEntry>();
  for (const row of rows) {
    if (sport !== "total" && categorizeSport(row.sportType) !== sport) continue;
    const member = members.get(row.userId);
    const entry = byUser.get(row.userId) ?? {
      userId: row.userId,
      name: fullName(member),
      image: member?.profileImageUrl ?? null,
      distanceMeters: 0,
      movingTimeSeconds: 0,
      elevationMeters: 0,
      count: 0,
    };
    entry.distanceMeters += row.distanceMeters;
    entry.movingTimeSeconds += row.movingTimeSeconds;
    entry.elevationMeters += row.elevationMeters;
    entry.count += row.count;
    byUser.set(row.userId, entry);
  }
  return [...byUser.values()].sort((a, b) =>
    rankByElevation
      ? b.elevationMeters - a.elevationMeters || b.distanceMeters - a.distanceMeters
      : b.distanceMeters - a.distanceMeters,
  );
}

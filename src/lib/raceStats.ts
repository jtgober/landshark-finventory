export interface RaceWithSignups {
  id: string;
  name: string;
  date: Date;
  signupCount: number;
}

export type RankedRace<T extends RaceWithSignups> = T & { rank: number };

/** Most signups first (ties share a rank, then earlier date first). */
export function rankRaces<T extends RaceWithSignups>(races: T[]): RankedRace<T>[] {
  const sorted = [...races].sort((a, b) => b.signupCount - a.signupCount || a.date.getTime() - b.date.getTime());
  let rank = 0;
  let prevCount = -1;
  return sorted.map((race, i) => {
    if (race.signupCount !== prevCount) {
      rank = i + 1;
      prevCount = race.signupCount;
    }
    return { ...race, rank };
  });
}

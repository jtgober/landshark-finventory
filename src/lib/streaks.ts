const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Days since the Unix epoch for a Strava `start_date_local` value. That field
 * is the athlete's wall-clock time labelled as UTC, so the UTC getters give
 * the calendar day the athlete actually experienced.
 */
export function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / MS_PER_DAY);
}

/** Monday-based week index (1970-01-01 was a Thursday, so day 4 is the first Monday after the epoch). */
export function weekNumber(d: Date): number {
  return Math.floor((dayNumber(d) + 3) / 7);
}

function longestConsecutiveRun(values: Iterable<number>): number {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const v of sorted) {
    run = prev !== null && v === prev + 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = v;
  }
  return best;
}

export function longestDayStreak(dates: Date[]): number {
  return longestConsecutiveRun(dates.map(dayNumber));
}

export function longestWeekStreak(dates: Date[]): number {
  return longestConsecutiveRun(dates.map(weekNumber));
}

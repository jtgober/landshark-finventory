/**
 * True when the member's granted Strava scopes let us read their activities.
 * Strava's consent screen lets people untick "View data about your activities",
 * in which case login works but every activity fetch fails. `scope` is stored
 * as Strava returns it, comma separated (e.g. "read,activity:read").
 */
export function canReadActivities(scope: string | null | undefined): boolean {
  if (!scope) return false;
  const granted = scope.split(/[,\s]+/).map((s) => s.trim());
  return granted.includes("activity:read") || granted.includes("activity:read_all");
}

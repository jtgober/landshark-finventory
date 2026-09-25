export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatElevation(meters: number): string {
  const feet = Math.round(meters * 3.28084);
  return `${feet} ft`;
}

function formatMinSec(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatPacePerMile(movingTimeSeconds: number, distanceMeters: number): string {
  const miles = distanceMeters / 1609.34;
  if (miles <= 0) return "--";
  return `${formatMinSec(movingTimeSeconds / miles)} /mi`;
}

export function formatPacePer100m(movingTimeSeconds: number, distanceMeters: number): string {
  if (distanceMeters <= 0) return "--";
  return `${formatMinSec((movingTimeSeconds / distanceMeters) * 100)} /100m`;
}

export function formatSpeedMph(averageSpeedMetersPerSecond: number | null): string {
  if (!averageSpeedMetersPerSecond) return "--";
  return `${(averageSpeedMetersPerSecond * 2.23694).toFixed(1)} mph`;
}

export function formatRaceDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

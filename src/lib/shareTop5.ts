import { formatDistance, formatElevation } from "./format";
import { shortName, type LeaderboardEntry, type MemberInfo } from "./leaderboard";

export type ShareSport = "run" | "ride" | "swim";
export const SHARE_SPORTS: ShareSport[] = ["run", "ride", "swim"];

const SPORT_WORD: Record<ShareSport, string> = { run: "run", ride: "bike", swim: "swim" };
const SPORT_TITLE: Record<ShareSport, string> = { run: "Runners", ride: "Cyclists", swim: "Swimmers" };

export const CLOSING_LINE = "Nice work, Landsharks!";

export function isShareSport(value: string | undefined): value is ShareSport {
  return value === "run" || value === "ride" || value === "swim";
}

/** Climbing only applies to the sports that gain elevation. */
export function canShareByElevation(sport: ShareSport): boolean {
  return sport === "run" || sport === "ride";
}

/**
 * How a period reads in a sentence: "this week", "in September 2026", "of all time".
 * `label` is periodLabel()'s text for the same window ("Sep 15 – Sep 21, 2026", "2025", ...).
 */
export function periodPhrase(range: string, offset: number, label: string): string {
  if (range === "week") return offset === 0 ? "this week" : `for the week of ${label}`;
  if (range === "month") return offset === 0 ? "this month" : `in ${label}`;
  if (range === "year") return "this year";
  if (range === "all") return "of all time";
  return `in ${range}`;
}

/** The card's subtitle, e.g. "This week" or "Sep 15 - Sep 21, 2026". */
export function periodTitle(range: string, label: string): string {
  if (range === "all") return "All time";
  return label.replace("–", "-");
}

export function cardTitle(sport: ShareSport, byElevation: boolean): string {
  return byElevation ? `Top 5 ${sport === "run" ? "Run" : "Bike"} Climbers` : `Top 5 ${SPORT_TITLE[sport]}`;
}

function valueText(entry: LeaderboardEntry, byElevation: boolean): string {
  return byElevation ? formatElevation(entry.elevationMeters) : formatDistance(entry.distanceMeters);
}

/** The Facebook caption: an intro line, the five names, a cheer and the link. */
export function buildCaption(opts: {
  sport: ShareSport;
  byElevation: boolean;
  phrase: string;
  entries: LeaderboardEntry[];
  members: Map<string, MemberInfo>;
  siteUrl: string;
}): string {
  const { sport, byElevation, phrase, entries, members, siteUrl } = opts;
  const intro = byElevation
    ? `Landshark ${SPORT_WORD[sport]} climbers ${phrase}!`
    : `Landshark ${SPORT_WORD[sport]} leaders ${phrase}!`;
  const lines = entries
    .slice(0, 5)
    .map((e, i) => `${i + 1}. ${shortName(members.get(e.userId))} - ${valueText(e, byElevation)}`);
  return [intro, "", ...lines, "", CLOSING_LINE, "", `See the full leaderboard: ${siteUrl}`].join("\n");
}

export { valueText as entryValueText };

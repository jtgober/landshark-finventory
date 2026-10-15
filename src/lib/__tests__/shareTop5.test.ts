import { describe, expect, it } from "vitest";
import { buildLeaderboard, shortName, type GroupRow, type MemberInfo } from "../leaderboard";
import {
  buildAllCaption,
  buildCaption,
  cardTitle,
  canShareByElevation,
  isShareSport,
  periodPhrase,
  periodTitle,
} from "../shareTop5";

const MILE = 1609.344;
const member = (firstName: string | null, lastName: string | null): MemberInfo => ({
  firstName,
  lastName,
  profileImageUrl: null,
});
const row = (userId: string, sportType: string, miles: number, elevation = 0, count = 1): GroupRow => ({
  userId,
  sportType,
  distanceMeters: miles * MILE,
  movingTimeSeconds: 600,
  elevationMeters: elevation,
  count,
});

describe("shortName", () => {
  it("is first name plus last initial", () => {
    expect(shortName({ firstName: "Corey", lastName: "Allgeier" })).toBe("Corey A.");
    expect(shortName({ firstName: " jon ", lastName: " gober" })).toBe("jon G.");
  });

  it("falls back gracefully", () => {
    expect(shortName({ firstName: "Corey", lastName: null })).toBe("Corey");
    expect(shortName({ firstName: null, lastName: "Gober" })).toBe("G.");
    expect(shortName({ firstName: null, lastName: null })).toBe("Club Member");
    expect(shortName(undefined)).toBe("Club Member");
  });
});

describe("buildLeaderboard", () => {
  const members = new Map([
    ["a", member("Alice", "Anderson")],
    ["b", member("Bob", "Baker")],
    ["c", member("Cara", "Cole")],
  ]);

  it("ranks by distance within one sport, merging that sport's subtypes", () => {
    const rows = [row("a", "Run", 5), row("a", "TrailRun", 6), row("b", "Run", 10), row("c", "Ride", 99)];
    const board = buildLeaderboard(rows, members, "run", false);
    expect(board.map((e) => e.userId)).toEqual(["a", "b"]);
    expect(board[0].distanceMeters).toBeCloseTo(11 * MILE);
    expect(board[0].count).toBe(2);
  });

  it("ranks by climbing, with distance breaking ties", () => {
    const rows = [row("a", "Ride", 50, 500), row("b", "Ride", 20, 900), row("c", "Ride", 30, 500)];
    expect(buildLeaderboard(rows, members, "ride", true).map((e) => e.userId)).toEqual(["b", "a", "c"]);
  });

  it("includes every sport on the total tab", () => {
    const rows = [row("a", "Run", 5), row("a", "Swim", 1), row("b", "Yoga", 0)];
    const board = buildLeaderboard(rows, members, "total", false);
    expect(board.find((e) => e.userId === "a")!.distanceMeters).toBeCloseTo(6 * MILE);
    expect(board.length).toBe(2);
  });

  it("falls back to Club Member for an unknown user", () => {
    expect(buildLeaderboard([row("zzz", "Run", 1)], members, "run", false)[0].name).toBe("Club Member");
  });
});

describe("period wording", () => {
  it("reads naturally for each range", () => {
    expect(periodPhrase("week", 0, "This Week")).toBe("this week");
    expect(periodPhrase("week", -1, "Sep 15 – Sep 21, 2026")).toBe("for the week of Sep 15 – Sep 21, 2026");
    expect(periodPhrase("month", 0, "This Month")).toBe("this month");
    expect(periodPhrase("month", -2, "August 2026")).toBe("in August 2026");
    expect(periodPhrase("year", 0, "This Year")).toBe("this year");
    expect(periodPhrase("all", 0, "All Time")).toBe("of all time");
    expect(periodPhrase("2025", 0, "2025")).toBe("in 2025");
  });

  it("titles the card", () => {
    expect(periodTitle("week", "This Week")).toBe("This Week");
    expect(periodTitle("week", "Sep 15 – Sep 21, 2026")).toBe("Sep 15 - Sep 21, 2026");
    expect(periodTitle("all", "All Time")).toBe("All time");
    expect(cardTitle("run", false)).toBe("Top 5 Runners");
    expect(cardTitle("ride", false)).toBe("Top 5 Cyclists");
    expect(cardTitle("swim", false)).toBe("Top 5 Swimmers");
    expect(cardTitle("ride", true)).toBe("Top 5 Bike Climbers");
  });
});

describe("share sports", () => {
  it("accepts only run, ride and swim", () => {
    expect(isShareSport("run")).toBe(true);
    expect(isShareSport("ride")).toBe(true);
    expect(isShareSport("swim")).toBe(true);
    expect(isShareSport("total")).toBe(false);
    expect(isShareSport(undefined)).toBe(false);
    expect(canShareByElevation("swim")).toBe(false);
    expect(canShareByElevation("ride")).toBe(true);
  });
});

describe("buildCaption", () => {
  const members = new Map([
    ["a", member("Jon", "Gober")],
    ["b", member("Corey", "Allgeier")],
    ["c", member("Alexandria", "Montgomery-Featherstonehaugh")],
    ["d", member("Sam", "Tran")],
    ["e", member("Pat", "Reed")],
    ["f", member("Extra", "Person")],
  ]);
  const rows = [
    row("a", "Run", 31.24),
    row("b", "Run", 24.8),
    row("c", "Run", 19),
    row("d", "Run", 15.5),
    row("e", "Run", 12.1),
    row("f", "Run", 3),
  ];
  const entries = buildLeaderboard(rows, members, "run", false);

  it("matches the announcement layout with five names, the cheer and the link", () => {
    const caption = buildCaption({
      sport: "run",
      byElevation: false,
      phrase: "this week",
      entries,
      members,
      siteUrl: "https://example.com",
    });
    expect(caption).toBe(
      [
        "Landshark run leaders this week!",
        "",
        "1. Jon G. - 31.2 mi",
        "2. Corey A. - 24.8 mi",
        "3. Alexandria M. - 19.0 mi",
        "4. Sam T. - 15.5 mi",
        "5. Pat R. - 12.1 mi",
        "",
        "Nice work, Landsharks!",
        "",
        "See the full leaderboard: https://example.com",
      ].join("\n"),
    );
    expect(caption).not.toContain("Extra P.");
  });

  it("lists fewer than five when fewer members have activity", () => {
    const caption = buildCaption({
      sport: "ride",
      byElevation: false,
      phrase: "in 2025",
      entries: entries.slice(0, 2),
      members,
      siteUrl: "https://example.com",
    });
    expect(caption).toContain("Landshark bike leaders in 2025!");
    expect(caption).toContain("2. Corey A. -");
    expect(caption).not.toContain("3.");
  });

  it("switches to feet climbed in climbing mode", () => {
    const climbRows = [row("a", "Ride", 10, 1000), row("b", "Ride", 20, 400)];
    const climb = buildLeaderboard(climbRows, members, "ride", true);
    const caption = buildCaption({
      sport: "ride",
      byElevation: true,
      phrase: "this month",
      entries: climb,
      members,
      siteUrl: "https://example.com",
    });
    expect(caption).toContain("Landshark bike climbers this month!");
    expect(caption).toContain("1. Jon G. - 3,281 ft");
    expect(caption).toContain("2. Corey A. - 1,312 ft");
  });
});

describe("buildAllCaption", () => {
  const members = new Map(
    ["a", "b", "c", "d", "e", "f"].map((id, i) => [
      id,
      member(["Jon", "Corey", "Sam", "Pat", "Kay", "Extra"][i], "Person"),
    ]),
  );
  const rowsFor = (type: string, miles: number[]) => miles.map((m, i) => row("abcdef"[i], type, m));
  const leadersFrom = (rows: GroupRow[]) => ({
    run: buildLeaderboard(rows, members, "run", false),
    ride: buildLeaderboard(rows, members, "ride", false),
    swim: buildLeaderboard(rows, members, "swim", false),
  });

  it("lists each discipline's top five under a heading, then the cheer and link", () => {
    const rows = [
      ...rowsFor("Run", [30, 25, 20, 15, 10, 5]),
      ...rowsFor("Ride", [100, 90, 80]),
      ...rowsFor("Swim", [4, 3]),
    ];
    const caption = buildAllCaption({
      phrase: "this week",
      leaders: leadersFrom(rows),
      members,
      siteUrl: "https://example.com",
    });
    expect(caption).toBe(
      [
        "Landshark leaders this week!",
        "",
        "Run",
        "1. Jon P. - 30.0 mi",
        "2. Corey P. - 25.0 mi",
        "3. Sam P. - 20.0 mi",
        "4. Pat P. - 15.0 mi",
        "5. Kay P. - 10.0 mi",
        "",
        "Bike",
        "1. Jon P. - 100.0 mi",
        "2. Corey P. - 90.0 mi",
        "3. Sam P. - 80.0 mi",
        "",
        "Swim",
        "1. Jon P. - 4.0 mi",
        "2. Corey P. - 3.0 mi",
        "",
        "Nice work, Landsharks!",
        "",
        "See the full leaderboard: https://example.com",
      ].join("\n"),
    );
    expect(caption).not.toContain("Extra P.");
  });

  it("leaves out a discipline nobody did", () => {
    const caption = buildAllCaption({
      phrase: "in 2025",
      leaders: leadersFrom(rowsFor("Run", [10, 5])),
      members,
      siteUrl: "https://example.com",
    });
    expect(caption).toContain("Landshark leaders in 2025!");
    expect(caption).toContain("Run\n1. Jon P. - 10.0 mi");
    expect(caption).not.toContain("Bike");
    expect(caption).not.toContain("Swim");
  });
});

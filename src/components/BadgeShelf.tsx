import { ACHIEVEMENTS_BY_KEY, nextUpAchievements } from "@/lib/achievements";
import type { AthleteStats } from "@/lib/athleteStats";
import {
  TIERS,
  tierRank,
  YEARLY_BADGE_LABELS,
  YEARLY_BADGES_START_YEAR,
  YEARLY_THRESHOLD_MILES,
  type BadgeTier,
  type SportBadgeType,
  type YearlyBadgeType,
} from "@/lib/yearlyBadges";

export interface EarnedAchievement {
  key: string;
  awardedAt: Date;
}

export interface EarnedYearlyBadge {
  year: number;
  badge: YearlyBadgeType;
  tier: BadgeTier;
  bronzeAt: Date;
  silverAt: Date | null;
  goldAt: Date | null;
}

const TIER_STYLES: Record<BadgeTier, { chip: string; label: string }> = {
  BRONZE: { chip: "border-orange-700 bg-orange-100 text-orange-900", label: "Bronze" },
  SILVER: { chip: "border-gray-400 bg-gray-100 text-gray-700", label: "Silver" },
  GOLD: { chip: "border-yellow-500 bg-yellow-100 text-yellow-800", label: "Gold" },
};

const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtMiles = (n: number) => Math.round(n).toLocaleString("en-US");
const SPORT_TYPES: SportBadgeType[] = ["RIDE", "RUN", "SWIM"];

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-gray-100">
      <div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

function YearlyBadgeChip({ badge }: { badge: EarnedYearlyBadge }) {
  const style = TIER_STYLES[badge.tier];
  const earnedAt = badge.tier === "GOLD" ? badge.goldAt : badge.tier === "SILVER" ? badge.silverAt : badge.bronzeAt;
  return (
    <li className={`rounded-lg border-2 p-3 ${style.chip}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{style.label}</p>
      <p className="font-semibold">{YEARLY_BADGE_LABELS[badge.badge]}</p>
      {earnedAt && <p className="text-xs opacity-80">{fmtDate(earnedAt)}</p>}
    </li>
  );
}

export default function BadgeShelf({
  stats,
  earned,
  yearlyBadges,
  currentYear,
  currentYearMiles,
}: {
  stats: AthleteStats;
  earned: EarnedAchievement[];
  yearlyBadges: EarnedYearlyBadge[];
  currentYear: number;
  currentYearMiles: Record<SportBadgeType, number>;
}) {
  const earnedKeys = new Set(earned.map((e) => e.key));
  const earnedSorted = [...earned]
    .filter((e) => ACHIEVEMENTS_BY_KEY.has(e.key))
    .sort((a, b) => b.awardedAt.getTime() - a.awardedAt.getTime());
  const nextUp = nextUpAchievements(stats, earnedKeys).sort((a, b) => b.progress - a.progress).slice(0, 4);

  const yearsWithBadges = [...new Set(yearlyBadges.map((b) => b.year))].sort((a, b) => b - a);
  const yearlyActive = currentYear >= YEARLY_BADGES_START_YEAR;

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-lg font-semibold">Achievements</h2>

      <div className="mb-4 rounded-lg border bg-white p-4">
        {earnedSorted.length === 0 ? (
          <p className="text-sm text-gray-500">No achievements yet. Log some activity to start earning them.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {earnedSorted.map((e) => {
              const def = ACHIEVEMENTS_BY_KEY.get(e.key)!;
              return (
                <li key={e.key} title={`${def.description} Earned ${fmtDate(e.awardedAt)}.`} className="rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-sm text-orange-900">
                  {def.name}
                </li>
              );
            })}
          </ul>
        )}

        {nextUp.length > 0 && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next up</p>
            {nextUp.map((n) => (
              <div key={n.def.key}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span className="font-medium">{n.def.name}</span>
                  <span className="shrink-0 text-gray-500">
                    {n.def.metric === "completeWeek" ? "" : `${fmtMiles(n.current)} / ${fmtMiles(n.def.threshold)}`}
                  </span>
                </div>
                <ProgressBar value={n.progress} />
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-gray-500">Counts activity synced since this member connected to the site.</p>
      </div>

      <h3 className="mb-3 text-base font-semibold">Yearly Badges</h3>
      <div className="rounded-lg border bg-white p-4">
        {yearsWithBadges.map((year) => (
          <div key={year} className="mb-4">
            <p className="mb-2 text-sm font-semibold">{year}</p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {yearlyBadges
                .filter((b) => b.year === year)
                .sort((a, b) => tierRank(b.tier) - tierRank(a.tier))
                .map((b) => (
                  <YearlyBadgeChip key={`${b.year}-${b.badge}`} badge={b} />
                ))}
            </ul>
          </div>
        ))}

        {yearlyActive ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">{currentYear} progress</p>
            {SPORT_TYPES.map((type) => {
              const miles = currentYearMiles[type];
              const thresholds = YEARLY_THRESHOLD_MILES[type];
              const nextIdx = thresholds.findIndex((t) => miles < t);
              const target = nextIdx === -1 ? thresholds[2] : thresholds[nextIdx];
              const label = nextIdx === -1 ? "Gold reached" : `Next: ${TIER_STYLES[TIERS[nextIdx]].label}`;
              return (
                <div key={type}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="font-medium">{YEARLY_BADGE_LABELS[type]}</span>
                    <span className="shrink-0 text-gray-500">
                      {fmtMiles(miles)} / {fmtMiles(target)} mi · {label}
                    </span>
                  </div>
                  <ProgressBar value={Math.min(1, miles / target)} />
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <p className="mb-1 text-sm font-medium">Yearly badges start in {YEARLY_BADGES_START_YEAR}</p>
            <p className="mb-3 text-sm text-gray-500">
              Rare, calendar-year awards in bronze, silver and gold. Miles needed within the year:
            </p>
            <ul className="space-y-1 text-sm">
              {SPORT_TYPES.map((type) => (
                <li key={type} className="flex justify-between gap-2">
                  <span className="font-medium">{YEARLY_BADGE_LABELS[type]}</span>
                  <span className="text-gray-600">{YEARLY_THRESHOLD_MILES[type].map(fmtMiles).join(" / ")} mi</span>
                </li>
              ))}
              <li className="flex justify-between gap-2">
                <span className="font-medium">{YEARLY_BADGE_LABELS.COMPLETE}</span>
                <span className="text-gray-600">Same level in all three</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}


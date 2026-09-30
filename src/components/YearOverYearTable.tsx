import { formatDuration } from "@/lib/format";
import { metersToMiles } from "@/lib/units";
import type { MemberYearSummary } from "@/lib/yearSummaryDb";

const miles = (m: number) => `${Math.round(metersToMiles(m)).toLocaleString("en-US")} mi`;

const ROWS: { label: string; value: (s: MemberYearSummary["summary"]) => string }[] = [
  { label: "Total distance", value: (s) => miles(s.totalMeters) },
  { label: "Bike", value: (s) => miles(s.rideMeters) },
  { label: "Run", value: (s) => miles(s.runMeters) },
  { label: "Swim", value: (s) => miles(s.swimMeters) },
  { label: "Activities", value: (s) => String(s.activityCount) },
  { label: "Moving time", value: (s) => formatDuration(s.movingSeconds) },
  { label: "Best day streak", value: (s) => `${s.bestDayStreak} days` },
];

export default function YearOverYearTable({ summaries }: { summaries: MemberYearSummary[] }) {
  const years = [...summaries].sort((a, b) => a.year - b.year);
  if (years.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="sticky left-0 bg-white p-3 font-medium" />
            {years.map((y) => (
              <th key={y.year} className="p-3 text-right font-medium">
                {y.year}
                {!y.finalized && <span className="block text-[10px] font-normal text-gray-400">in progress</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-b last:border-0">
              <th className="sticky left-0 bg-white p-3 font-medium text-gray-700">{row.label}</th>
              {years.map((y) => (
                <td key={y.year} className="whitespace-nowrap p-3 text-right">
                  {row.value(y.summary)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

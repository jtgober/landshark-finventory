const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Single series, so no legend: the heading names it. Thin bars anchored to the
// baseline with rounded data-ends, the peak labelled directly, and a table view
// so the values never depend on hovering or on colour.
export default function MonthlyBars({
  values,
  format,
  label,
}: {
  /** One value per month, index 0 = January. */
  values: number[];
  format: (value: number) => string;
  /** What is being measured, e.g. "Miles", used for the accessible description. */
  label: string;
}) {
  const max = Math.max(...values, 0);
  const peak = max > 0 ? values.indexOf(max) : -1;

  return (
    <div>
      <div
        role="img"
        aria-label={`${label} per month. ${MONTHS.map((m, i) => `${m} ${format(values[i])}`).join(", ")}.`}
        className="flex h-36 items-end gap-1 border-b border-gray-300 pt-6"
      >
        {values.map((m, i) => (
          <div key={MONTHS[i]} className="relative flex h-full flex-1 items-end" title={`${MONTHS[i]}: ${format(m)}`}>
            {i === peak && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-gray-700" style={{ bottom: `calc(${(m / max) * 100}% + 2px)` }}>
                {format(m)}
              </span>
            )}
            <div className="w-full rounded-t-[4px] bg-orange-500" style={{ height: max > 0 ? `${(m / max) * 100}%` : 0, minHeight: m > 0 ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {MONTHS.map((m) => (
          <span key={m} className="flex-1 text-center text-[10px] text-gray-500">
            <span className="sm:hidden">{m[0]}</span>
            <span className="hidden sm:inline">{m}</span>
          </span>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-gray-600">View as table</summary>
        <table className="mt-2 w-full text-left">
          <tbody>
            {MONTHS.map((m, i) => (
              <tr key={m} className="border-t">
                <td className="py-1 text-gray-600">{m}</td>
                <td className="py-1 text-right">{format(values[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

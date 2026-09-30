"use client";

import { useState, useTransition } from "react";

export default function FinalizeYearForm({ years }: { years: number[] }) {
  const [year, setYear] = useState(years[0]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = () => {
    if (!window.confirm(`Freeze every member's ${year} totals? Re-running later overwrites the snapshot.`)) return;
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/year/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const data = (await res.json()) as { members?: number; error?: string };
      setMessage(res.ok ? `Finalized ${year} for ${data.members} members.` : (data.error ?? "Finalize failed."));
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="min-h-11 rounded-lg border px-3 text-base"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          onClick={run}
          disabled={isPending}
          className="min-h-11 rounded-full border border-orange-600 bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Finalizing..." : "Finalize year"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  );
}

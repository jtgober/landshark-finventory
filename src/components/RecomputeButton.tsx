"use client";

import { useState, useTransition } from "react";

export default function RecomputeButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/achievements/recompute", { method: "POST" });
      if (!res.ok) {
        setMessage("Recompute failed.");
        return;
      }
      const d = (await res.json()) as { members: number; achievementsCreated: number; yearlyBadgeWrites: number };
      setMessage(
        `Checked ${d.members} members: ${d.achievementsCreated} new achievements, ${d.yearlyBadgeWrites} yearly badge updates.`,
      );
    });
  };

  return (
    <div>
      <button
        onClick={run}
        disabled={isPending}
        className="min-h-11 rounded-full border border-orange-600 bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Recomputing..." : "Recompute achievements"}
      </button>
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  );
}

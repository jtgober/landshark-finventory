"use client";

import { useState, useTransition } from "react";

export default function RaceSignupButton({
  raceId,
  initialCount,
  initialGiven,
}: {
  raceId: string;
  initialCount: number;
  initialGiven: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [given, setGiven] = useState(initialGiven);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const res = await fetch("/api/race-signups", {
        method: given ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { count: number; given: boolean };
        setCount(data.count);
        setGiven(data.given);
      }
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`flex min-h-11 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-2 text-sm transition-colors ${
        given ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 text-gray-600 hover:border-orange-400"
      } disabled:opacity-50`}
    >
      🏁
      <span className="hidden sm:inline">{given ? "I'm racing this" : "Race this?"}</span>
      <span className={given ? "text-white" : "text-gray-500"}>({count})</span>
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";

export default function KudosButton({
  activityId,
  initialCount,
  initialGiven,
}: {
  activityId: string;
  initialCount: number;
  initialGiven: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [given, setGiven] = useState(initialGiven);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const res = await fetch("/api/kudos", {
        method: given ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId }),
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
      className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors ${
        given ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 text-gray-600 hover:border-orange-400"
      } disabled:opacity-50`}
    >
      <span>👏</span>
      <span>{count}</span>
    </button>
  );
}

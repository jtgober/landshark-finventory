"use client";

import { useState, useTransition } from "react";

export default function AdminToggle({ userId, initialIsAdmin }: { userId: string; initialIsAdmin: boolean }) {
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/admins", {
        method: isAdmin ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json()) as { isAdmin?: boolean; error?: string };
      if (res.ok && typeof data.isAdmin === "boolean") setIsAdmin(data.isAdmin);
      else setError(data.error ?? "Something went wrong.");
    });
  };

  return (
    <div className="shrink-0 text-right">
      <button
        onClick={toggle}
        disabled={isPending}
        className={`min-h-11 whitespace-nowrap rounded-full border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
          isAdmin ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 text-gray-600"
        }`}
      >
        {isAdmin ? "Admin" : "Make admin"}
      </button>
      {error && <p className="mt-1 max-w-[10rem] text-xs text-red-600">{error}</p>}
    </div>
  );
}

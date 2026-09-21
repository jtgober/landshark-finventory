"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface RosterMember {
  id: string;
  name: string;
  image: string | null;
  city: string | null;
  activeThisWeek: boolean;
}

export default function MemberSearch({ members }: { members: RosterMember[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.city ?? "").toLowerCase().includes(q)
    );
  }, [members, query]);

  return (
    <>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search members..."
        className="mb-4 w-full rounded-lg border px-4 py-3 text-base"
      />

      <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border bg-white">
        {filtered.length === 0 && <li className="p-4 text-sm text-gray-500">No members match "{query}".</li>}
        {filtered.map((m) => (
          <li key={m.id}>
            <Link href={`/members/${m.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 sm:p-4">
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.name}</p>
                {m.city && <p className="truncate text-sm text-gray-500">{m.city}</p>}
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                  m.activeThisWeek ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {m.activeThisWeek ? "Active this week" : "Quiet week"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

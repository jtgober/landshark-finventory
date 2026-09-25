"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import NavBar from "@/components/NavBar";

export default function NewRacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [raceUrl, setRaceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/races", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date, location, raceUrl }),
    });

    if (!res.ok) {
      setSubmitting(false);
      setError("Couldn't add that race — check the name and date and try again.");
      return;
    }

    const { race } = (await res.json()) as { race: { id: string } };
    router.push(`/races/${race.id}`);
    router.refresh();
  };

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-lg px-4 py-6 sm:py-10">
        <Link href="/races" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
          &larr; Back to race calendar
        </Link>

        <h1 className="mb-6 text-2xl font-bold">Add a Race</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Race name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ironman Chattanooga 70.3"
              className="w-full rounded-lg border px-4 py-3 text-base"
            />
          </div>

          <div>
            <label htmlFor="date" className="mb-1 block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border px-4 py-3 text-base"
            />
          </div>

          <div>
            <label htmlFor="location" className="mb-1 block text-sm font-medium text-gray-700">
              Location <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Chattanooga, TN"
              className="w-full rounded-lg border px-4 py-3 text-base"
            />
          </div>

          <div>
            <label htmlFor="raceUrl" className="mb-1 block text-sm font-medium text-gray-700">
              Race website <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="raceUrl"
              type="url"
              value={raceUrl}
              onChange={(e) => setRaceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border px-4 py-3 text-base"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-orange-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add Race"}
          </button>
        </form>
      </main>
    </>
  );
}

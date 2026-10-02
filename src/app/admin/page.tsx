import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import NavBar from "@/components/NavBar";
import RecomputeButton from "@/components/RecomputeButton";
import FinalizeYearForm from "@/components/FinalizeYearForm";

export default async function AdminHomePage() {
  await requireAdminPage();
  const thisYear = new Date().getUTCFullYear();
  const finalizeYears = [thisYear, thisYear - 1, thisYear - 2].filter((y) => y >= 2026);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <h1 className="mb-6 text-2xl font-bold">Admin</h1>
        <ul className="space-y-3">
          <li>
            <Link href="/admin/metrics" className="block rounded-lg border bg-white p-4 hover:bg-gray-50">
              <p className="font-medium">Club metrics and exports</p>
              <p className="text-sm text-gray-500">Totals, activity trends, race popularity, year over year, CSV downloads.</p>
            </Link>
          </li>
          <li>
            <Link href="/admin/activity" className="block rounded-lg border bg-white p-4 hover:bg-gray-50">
              <p className="font-medium">Activity log</p>
              <p className="text-sm text-gray-500">Who has joined the app and when.</p>
            </Link>
          </li>
          <li>
            <Link href="/admin/members" className="block rounded-lg border bg-white p-4 hover:bg-gray-50">
              <p className="font-medium">Manage admins</p>
              <p className="text-sm text-gray-500">Promote or demote club members.</p>
            </Link>
          </li>
          <li className="rounded-lg border bg-white p-4">
            <p className="font-medium">Achievements</p>
            <p className="mb-3 text-sm text-gray-500">
              Re-check every member&apos;s stored activity and award anything newly earned. Safe to run any time.
            </p>
            <RecomputeButton />
          </li>
          <li className="rounded-lg border bg-white p-4">
            <p className="font-medium">Finalize a year</p>
            <p className="mb-3 text-sm text-gray-500">
              Freezes every member&apos;s totals for that year so year-over-year results and Year in Review can&apos;t
              change later (Strava deletes remove activities). Run it after the year ends; re-running refreshes it.
            </p>
            <FinalizeYearForm years={finalizeYears} />
          </li>
        </ul>
      </main>
    </>
  );
}

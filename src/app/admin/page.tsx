import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import NavBar from "@/components/NavBar";
import RecomputeButton from "@/components/RecomputeButton";

export default async function AdminHomePage() {
  await requireAdminPage();

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <h1 className="mb-6 text-2xl font-bold">Admin</h1>
        <ul className="space-y-3">
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
        </ul>
      </main>
    </>
  );
}

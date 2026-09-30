import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import NavBar from "@/components/NavBar";
import AdminToggle from "@/components/AdminToggle";

export default async function AdminMembersPage() {
  await requireAdminPage();

  const users = await prisma.user.findMany({
    select: { id: true, firstName: true, lastName: true, profileImageUrl: true, isAdmin: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <Link href="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
          &larr; Back to admin
        </Link>
        <h1 className="mb-4 text-2xl font-bold">Manage admins</h1>
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border bg-white">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 p-3 sm:p-4">
              {u.profileImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.profileImageUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              )}
              <span className="min-w-0 flex-1 truncate font-medium">
                {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Club Member"}
              </span>
              <AdminToggle userId={u.id} initialIsAdmin={u.isAdmin} />
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

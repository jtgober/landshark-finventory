import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NavBar from "@/components/NavBar";
import MemberSearch, { type RosterMember } from "@/components/MemberSearch";

export default async function MembersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    include: {
      activities: { where: { startDate: { gte: sevenDaysAgo } }, select: { id: true }, take: 1 },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  const members: RosterMember[] = users.map((u) => ({
    id: u.id,
    name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Club Member",
    image: u.profileImageUrl,
    city: u.city,
    activeThisWeek: u.activities.length > 0,
  }));

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <h1 className="mb-4 text-2xl font-bold">Club Members</h1>
        <MemberSearch members={members} />
      </main>
    </>
  );
}

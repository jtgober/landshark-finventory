import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import NewRaceForm from "@/components/NewRaceForm";

export default async function NewRacePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-lg px-4 py-6 sm:py-10">
        <Link href="/races" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
          &larr; Back to race calendar
        </Link>
        <h1 className="mb-6 text-2xl font-bold">Add a Race</h1>
        <NewRaceForm />
      </main>
    </>
  );
}

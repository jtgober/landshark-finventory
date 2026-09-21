import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ConnectButton from "@/components/ConnectButton";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-4 text-3xl font-bold">Landshark Triathlon Club</h1>
      <p className="mb-8 text-gray-600">
        Connect your Strava account to show up on the club leaderboard and give kudos to your teammates.
        Only activities you record after connecting will appear — we don&apos;t pull in your history.
      </p>
      <ConnectButton />
    </main>
  );
}

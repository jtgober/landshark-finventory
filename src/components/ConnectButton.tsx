"use client";

import { signIn } from "next-auth/react";

export default function ConnectButton() {
  return (
    <button
      onClick={() => signIn("strava", { callbackUrl: "/dashboard" })}
      className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700"
    >
      Connect with Strava
    </button>
  );
}

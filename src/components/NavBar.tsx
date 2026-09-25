import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:gap-6">
        <Link href="/dashboard" className="font-bold">
          Landshark
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
          Dashboard
        </Link>
        <Link href="/members" className="text-sm text-gray-600 hover:text-gray-900">
          Members
        </Link>
        <Link href="/races" className="text-sm text-gray-600 hover:text-gray-900">
          Races
        </Link>
        <a href="/api/auth/signout" className="text-sm text-gray-600 hover:text-gray-900 sm:ml-auto">
          Sign Out
        </a>
      </div>
    </nav>
  );
}

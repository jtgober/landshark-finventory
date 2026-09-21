import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
        <Link href="/dashboard" className="font-bold">
          Landshark
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
          Dashboard
        </Link>
        <Link href="/members" className="text-sm text-gray-600 hover:text-gray-900">
          Members
        </Link>
      </div>
    </nav>
  );
}

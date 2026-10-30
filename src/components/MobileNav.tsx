"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ShareSiteDialog from "@/components/ShareSiteDialog";
import { useInstallPrompt } from "@/components/useInstallPrompt";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/members", label: "Members" },
  { href: "/team", label: "Team" },
  { href: "/races", label: "Races" },
];

export default function MobileNav({ isAdmin, userId }: { isAdmin: boolean; userId: string | null }) {
  const pathname = usePathname();
  const [openForPath, setOpenForPath] = useState<string | null>(null);
  // The menu is "open" only for the page it was opened on, so any route change closes it.
  const open = openForPath === pathname;
  const [shareOpen, setShareOpen] = useState(false);
  const install = useInstallPrompt();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenForPath(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const baseLinks = userId ? [...LINKS, { href: `/members/${userId}/trophy-case`, label: "Trophy Case" }] : LINKS;
  const links = isAdmin ? [...baseLinks, { href: "/admin", label: "Admin" }] : baseLinks;
  const isActive = (href: string) => {
    // The trophy case lives under /members/<id>, but only the Trophy Case link should light up there.
    if (href === "/members" && pathname.endsWith("/trophy-case")) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const openShare = () => {
    setOpenForPath(null);
    setShareOpen(true);
  };
  const installNow = () => {
    setOpenForPath(null);
    void install.promptInstall();
  };

  const desktopClass = (href: string) =>
    `text-sm hover:text-gray-900 ${
      href === "/admin"
        ? "font-medium text-orange-700 hover:text-orange-900"
        : isActive(href)
          ? "font-medium text-gray-900"
          : "text-gray-600"
    }`;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpenForPath(null)}
          aria-hidden="true"
        />
      )}
      <nav className="relative z-50 border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-2 md:py-3">
          <Link href="/dashboard" className="flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-nav.png"
              alt="Louisville Landsharks Multisport Club"
              width={66}
              height={48}
              className="h-12 w-auto"
            />
          </Link>

          <div className="hidden items-center gap-6 md:flex md:flex-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={desktopClass(l.href)}>
                {l.label}
              </Link>
            ))}
            <button type="button" onClick={openShare} className="text-sm text-gray-600 hover:text-gray-900">
              Share site
            </button>
            {install.canPrompt && (
              <button
                type="button"
                onClick={installNow}
                className="text-sm font-medium text-orange-700 hover:text-orange-900"
              >
                Install app
              </button>
            )}
            <a href="/api/auth/signout" className="ml-auto text-sm text-gray-600 hover:text-gray-900">
              Sign Out
            </a>
          </div>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpenForPath(open ? null : pathname)}
            className="-mr-2 ml-auto flex h-11 w-11 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 md:hidden"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {open && (
          <div className="md:hidden">
            <div id="mobile-menu" className="absolute inset-x-0 top-full border-b bg-white shadow-lg">
              <ul className="mx-auto max-w-4xl px-2 py-2">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpenForPath(null)}
                      className={`flex min-h-12 items-center rounded-md px-3 text-base ${
                        l.href === "/admin"
                          ? "font-medium text-orange-700"
                          : isActive(l.href)
                            ? "bg-orange-50 font-medium text-orange-800"
                            : "text-gray-800"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li className="mt-1 border-t pt-1">
                  <button
                    type="button"
                    onClick={openShare}
                    className="flex min-h-12 w-full items-center rounded-md px-3 text-left text-base text-gray-800"
                  >
                    Share site
                  </button>
                </li>
                {install.canPrompt && (
                  <li>
                    <button
                      type="button"
                      onClick={installNow}
                      className="flex min-h-12 w-full items-center rounded-md px-3 text-left text-base font-medium text-orange-700"
                    >
                      Install app
                    </button>
                  </li>
                )}
                <li className="border-t pt-1">
                  <a
                    href="/api/auth/signout"
                    className="flex min-h-12 items-center rounded-md px-3 text-base text-gray-600"
                  >
                    Sign Out
                  </a>
                </li>
              </ul>
            </div>
          </div>
        )}
      </nav>
      <ShareSiteDialog open={shareOpen} onClose={() => setShareOpen(false)} install={install} />
    </>
  );
}

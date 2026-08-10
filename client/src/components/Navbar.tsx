"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/resume", label: "Resume" },
  { href: "/dsa", label: "DSA Practice" },
  { href: "/company", label: "Company Prep" },
  { href: "/mock-interview", label: "Mock Interview" },
  { href: "/career", label: "Career Guidance" },
  { href: "/profile", label: "Profile" },
];

interface StoredUser {
  name?: string;
}

const readUser = (): StoredUser | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [loggedIn, setLoggedIn] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem("token"));
  });
  const [userName, setUserName] = useState<string | undefined>(
    () => readUser()?.name
  );
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const hasToken = Boolean(localStorage.getItem("token"));
      setLoggedIn(hasToken);
      setUserName(hasToken ? readUser()?.name : undefined);
    };

    sync();
    window.addEventListener("storage", sync);

    return () => window.removeEventListener("storage", sync);
  }, [pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLoggedIn(false);
    setUserName(undefined);
    setMenuOpen(false);
    router.push("/");
  };

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const linkClasses = (href: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive(href)
        ? "bg-blue-50 text-blue-700"
        : "text-slate-700 hover:bg-slate-100 hover:text-blue-600"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="text-xl font-bold text-blue-600"
        >
          AI Career Platform
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClasses(link.href)}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {loggedIn ? (
            <>
              <span className="text-sm font-medium text-slate-600">
                {userName ? `Hi, ${userName.split(" ")[0]}` : "Welcome"}
              </span>
              <button
                onClick={logout}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login">
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                Login
              </button>
            </Link>
          )}
        </div>

        <button
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          className="rounded-lg border border-slate-300 p-2 text-slate-700 lg:hidden"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={linkClasses(link.href)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-slate-200 pt-3">
              {loggedIn ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-600">
                    {userName ? `Hi, ${userName.split(" ")[0]}` : "Welcome"}
                  </span>
                  <button
                    onClick={logout}
                    className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setMenuOpen(false)}>
                  <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                    Login
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

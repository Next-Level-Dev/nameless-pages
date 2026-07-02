'use client'

import Link from "next/link";
import { useState } from "react";

interface NavUser {
  username: string;
  display_name: string | null;
  role: string;
}

export default function NavBar({ user }: { user: NavUser | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isTrustedAuthor = user?.role === 'trusted_author';

  return (
    <nav className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-[var(--background)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight"
          onClick={() => setMenuOpen(false)}
        >
          Nameless Pages
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Browse
          </Link>
          <Link
            href="/tutorials"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Tutorials
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
            >
              @{user.username}
              {isTrustedAuthor && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  ★
                </span>
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span className={`block h-0.5 w-5 bg-current transition-transform duration-200 ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`block h-0.5 w-5 bg-current transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-5 bg-current transition-transform duration-200 ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 flex flex-col gap-3 text-sm bg-[var(--background)]">
          <Link
            href="/"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            onClick={() => setMenuOpen(false)}
          >
            Browse
          </Link>
          <Link
            href="/tutorials"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            onClick={() => setMenuOpen(false)}
          >
            Tutorials
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 w-fit text-xs font-semibold text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              @{user.username}
              {isTrustedAuthor && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  ★
                </span>
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              className="w-full text-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              onClick={() => setMenuOpen(false)}
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

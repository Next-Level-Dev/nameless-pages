import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nameless Pages Fellowship",
  description: "A place to release creative work",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Nameless Pages
            </Link>
            <div className="flex items-center gap-4 text-sm">
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
                <>
                  <Link
                    href="/dashboard"
                    className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Dashboard
                  </Link>
                  <span className="text-xs text-zinc-400">
                    {user.display_name || user.username}
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}

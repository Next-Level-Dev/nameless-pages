import Link from "next/link";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

interface ContentItem {
  id: number;
  title: string;
  excerpt: string;
  content_type: string;
  created_at: string;
  username: string;
  display_name: string | null;
  score: number;
}

export default async function Home() {
  const [db, user] = await Promise.all([
    Promise.resolve(getDb()),
    getSessionUser(),
  ]);

  const items = db
    .prepare(
      `SELECT c.id, c.title, c.excerpt, c.content_type, c.created_at,
              u.username, u.display_name,
              COALESCE(SUM(v.vote), 0) as score
       FROM content c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN votes v ON v.content_id = c.id
       WHERE c.published = 1
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT 50`
    )
    .all() as ContentItem[];

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Hero — compact, no CTAs for logged-in users */}
      <section className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Nameless Pages Fellowship
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            A place to release creative work — writing, art, music, code, and more.
          </p>
          {!user && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Link
                href="/register"
                className="w-full sm:w-auto text-center rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Join the Fellowship
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto text-center rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Scrollable content list */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-center">
              <p className="text-lg">No pages yet.</p>
              {user ? (
                <p className="mt-1 text-sm">
                  <Link href="/dashboard/new" className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100">
                    Create the first one
                  </Link>
                </p>
              ) : (
                <p className="mt-1 text-sm">Be the first to share something!</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/pages/${item.id}`}
                  className="block rounded-lg border border-zinc-200 p-4 sm:p-5 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/50"
                >
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  {item.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {item.excerpt}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span>{item.display_name || item.username}</span>
                    <span>&middot;</span>
                    <span>
                      {new Date(item.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span>&middot;</span>
                    <span className="capitalize">{item.content_type}</span>
                    <span>&middot;</span>
                    <span className={`font-medium tabular-nums ${
                      item.score > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : item.score < 0
                        ? "text-red-500 dark:text-red-400"
                        : "text-zinc-400"
                    }`}>
                      {item.score > 0 ? `+${item.score}` : item.score}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

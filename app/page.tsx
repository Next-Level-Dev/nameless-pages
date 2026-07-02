import Link from "next/link";
import { getDb } from "@/lib/db";

interface ContentItem {
  id: number;
  title: string;
  excerpt: string;
  content_type: string;
  created_at: string;
  username: string;
  display_name: string | null;
}

export default function Home() {
  const db = getDb();
  const items = db
    .prepare(
      `SELECT c.id, c.title, c.excerpt, c.content_type, c.created_at,
              u.username, u.display_name
       FROM content c
       JOIN users u ON u.id = c.user_id
       WHERE c.published = 1
       ORDER BY c.created_at DESC
       LIMIT 50`
    )
    .all() as ContentItem[];

  return (
    /* Full height, flex column: hero on top, scrollable list below */
    <div className="h-full flex flex-col overflow-hidden">

      {/* Hero — fixed height, centered */}
      <section className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Nameless Pages Fellowship
          </h1>
          <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
            A place to release your creative work — writing, art, music, code, and more.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Join the Fellowship
            </Link>
            <Link
              href="/tutorials"
              className="w-full sm:w-auto rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Tutorials
            </Link>
          </div>
        </div>
      </section>

      {/* Scrollable content list */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6">
          {items.length === 0 ? (
            /* Empty state — centered in remaining space */
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-center">
              <p className="text-lg">No content yet.</p>
              <p className="mt-1 text-sm">Be the first to share something!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight">Latest Work</h2>
              {items.map((item) => (
                /* Each card is a link to the full-screen page viewer */
                <Link
                  key={item.id}
                  href={`/pages/${item.id}`}
                  className="block rounded-lg border border-zinc-200 p-5 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/50"
                >
                  <h3 className="text-lg font-semibold">{item.title}</h3>
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

import Link from "next/link";
import { getDb } from "@/lib/db";

interface ContentItem {
  id: number
  title: string
  excerpt: string
  content_type: string
  created_at: string
  username: string
  display_name: string | null
}

export default function Home() {
  const db = getDb()
  const items = db.prepare(`
    SELECT c.id, c.title, c.excerpt, c.content_type, c.created_at,
           u.username, u.display_name
    FROM content c
    JOIN users u ON u.id = c.user_id
    WHERE c.published = 1
    ORDER BY c.created_at DESC
    LIMIT 50
  `).all() as ContentItem[]

  return (
    <div className="flex-1">
      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Nameless Pages Fellowship
          </h1>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            A place to release your creative work — writing, art, music, code, and more.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Join the Fellowship
            </Link>
            <Link
              href="/tutorials"
              className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Tutorials
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {items.length === 0 ? (
          <div className="py-24 text-center text-zinc-500">
            <p>No content yet. Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Latest Work</h2>
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-zinc-200 p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                {item.excerpt && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {item.excerpt}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
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
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

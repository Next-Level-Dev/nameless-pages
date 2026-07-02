import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { computeSecretScore } from "@/lib/db";

interface ContentItem {
  id: number;
  title: string;
  excerpt: string;
  content_type: string;
  created_at: string;
  username: string;
  display_name: string | null;
  role: string;
  upvotes: number;
  downvotes: number;
  favoritesCount: number;
}

// Get paginated and searched content with secret scores
function getContent(page: number, search: string) {
  const db = getDb()
  const perPage = 10
  const offset = (page - 1) * perPage

  // Base query
  let whereClause = 'WHERE c.published = 1'
  const params: (string | number)[] = []

  if (search.trim()) {
    // Search in title, excerpt, or username
    whereClause = `WHERE c.published = 1 AND (
      c.title LIKE ? OR c.excerpt LIKE ? OR u.username LIKE ? OR u.display_name LIKE ?
    )`
    const searchTerm = `%${search.trim()}%`
    params.push(searchTerm, searchTerm, searchTerm, searchTerm)
  }

  // Get total count
  const countQuery = db.prepare(`
    SELECT COUNT(*) as total FROM content c
    JOIN users u ON u.id = c.user_id
    ${whereClause}
  `)
  const total = (countQuery.get(...params) as { total: number }).total

  // Get content with vote counts
  const query = db.prepare(`
    SELECT c.id, c.title, c.excerpt, c.content_type, c.created_at,
           u.username, u.display_name, u.role,
           COALESCE(SUM(CASE WHEN v.vote = 1 THEN 1 ELSE 0 END), 0) as upvotes,
           COALESCE(SUM(CASE WHEN v.vote = -1 THEN 1 ELSE 0 END), 0) as downvotes,
           (SELECT COUNT(*) FROM favorites f WHERE f.content_id = c.id) as favoritesCount
    FROM content c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN votes v ON v.content_id = c.id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `)
  
  const items = query.all(...params, perPage, offset) as ContentItem[]

  // Calculate secret scores with randomization
  const scoredItems = items.map(item => {
    const baseScore = computeSecretScore({
      upvotes: item.upvotes,
      downvotes: item.downvotes,
      favoritesCount: item.favoritesCount,
      createdAt: item.created_at,
      authorRole: item.role,
    })
    // Add randomization: -30% to +30%
    const randomFactor = 0.7 + Math.random() * 0.6 // 0.7 to 1.3
    const finalScore = Math.round(baseScore * randomFactor)
    return { ...item, score: finalScore }
  })

  // Shuffle top items slightly for variety (only for first page without search)
  if (page === 1 && !search.trim()) {
    // Sort by score descending but add some randomness to the order
    scoredItems.sort((a, b) => {
      // Primary: score descending
      if (b.score !== a.score) return b.score - a.score
      // Secondary: random for items with same score
      return Math.random() - 0.5
    })
  } else {
    // For pagination or search, just sort by created_at
    scoredItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  return {
    items: scoredItems,
    total,
    page,
    totalPages: Math.ceil(total / perPage),
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const [db, user, params] = await Promise.all([
    Promise.resolve(getDb()),
    getSessionUser(),
    searchParams,
  ])

  const page = parseInt(params.page || '1')
  const search = params.q || ''

  if (page < 1) redirect('/')

  const { items, total, totalPages } = getContent(page, search)

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Hero with search */}
      <section className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Nameless Pages Fellowship
              </h1>
              <p className="mt-1 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                A place to release any creative work like poems, fanfiction and way more!
              </p>
            </div>
            
            {/* Search bar */}
            <form action="/" method="GET" className="w-full sm:w-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  name="q"
                  defaultValue={search}
                  placeholder="Search..."
                  className="w-full sm:w-48 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

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

      {/* Results info */}
      <div className="shrink-0 mx-auto max-w-5xl w-full px-4 py-3 text-sm text-zinc-500">
        {search ? (
          <span>Found {total} result{total !== 1 ? 's' : ''} for &quot;{search}&quot;</span>
        ) : (
          <span>Showing {items.length} of {total} pages</span>
        )}
      </div>

      {/* Scrollable content list */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 pb-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-center">
              <p className="text-lg">{search ? 'No results found.' : 'No pages yet.'}</p>
              {user ? (
                <p className="mt-1 text-sm">
                  <Link href="/dashboard" className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100">
                    Go to dashboard
                  </Link>
                </p>
              ) : (
                <p className="mt-1 text-sm">{search ? 'Try a different search term.' : 'Be the first to share something!'}</p>
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
                    {item.role === 'trusted_author' && (
                      <>
                        <span>&middot;</span>
                        <span className="text-amber-600 dark:text-amber-400">★</span>
                      </>
                    )}
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
                    {(() => {
                      const votes = item.upvotes - item.downvotes;
                      return (
                        <span className={`font-medium tabular-nums ${
                          votes > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : votes < 0
                            ? "text-red-500 dark:text-red-400"
                            : "text-zinc-400"
                        }`}>
                          {votes > 0 ? `+${votes}` : votes}
                        </span>
                      );
                    })()}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <form action="/" method="GET">
                {search && <input type="hidden" name="q" value={search} />}
                <input type="hidden" name="page" value={String(page - 1)} />
                <button
                  type="submit"
                  disabled={page <= 1}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  ← Previous
                </button>
              </form>
              
              <span className="text-sm text-zinc-500">
                Page {page} of {totalPages}
              </span>

              <form action="/" method="GET">
                {search && <input type="hidden" name="q" value={search} />}
                <input type="hidden" name="page" value={String(page + 1)} />
                <button
                  type="submit"
                  disabled={page >= totalPages}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Next →
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
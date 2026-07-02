import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

interface ContentItem {
  id: number;
  title: string;
  content_type: string;
  excerpt: string;
  published: number;
  created_at: string;
  updated_at: string;
}

export default async function DashboardPage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect("/login");
  }

  const db = getDb();
  const items = db
    .prepare(
      `SELECT id, title, content_type, excerpt, published, created_at, updated_at
       FROM content
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(user.id) as ContentItem[];

  const count = items.length;

  return (
    /* Full height, flex column: fixed header + scrollable body */
    <div className="h-full flex flex-col overflow-hidden">

      {/* Fixed header */}
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Welcome back, {user.display_name || user.username}
              </p>
            </div>
            <Link
              href="/dashboard/new"
              className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              New Post
            </Link>
          </div>
        </div>
      </header>

      {/* Scrollable main content */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6">
          {count === 0 ? (
            /* Empty state — centered */
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="mb-4 text-5xl">&#9997;</div>
              <h2 className="text-xl font-semibold">No content yet</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Create your first piece and share it with the fellowship.
              </p>
              <Link
                href="/dashboard/new"
                className="mt-6 rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Create your first post
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-zinc-500">
                {count} {count === 1 ? "item" : "items"}
              </div>
              <div className="space-y-4">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-zinc-200 p-4 sm:p-5 dark:border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {/* Title row — clicking title opens the page viewer */}
                        <div className="flex flex-wrap items-center gap-2">
                          {item.published ? (
                            <Link
                              href={`/pages/${item.id}`}
                              className="truncate text-lg font-semibold hover:underline underline-offset-2"
                            >
                              {item.title}
                            </Link>
                          ) : (
                            <span className="truncate text-lg font-semibold text-zinc-500">
                              {item.title}
                            </span>
                          )}
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.published
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}
                          >
                            {item.published ? "Published" : "Draft"}
                          </span>
                        </div>
                        {item.excerpt && (
                          <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                            {item.excerpt}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                          <span>
                            {new Date(item.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="capitalize">{item.content_type}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Link
                          href={`/dashboard/${item.id}/edit`}
                          className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

interface PageContent {
  id: number;
  title: string;
  body: string;
  excerpt: string | null;
  content_type: string;
  published: number;
  created_at: string;
  username: string;
  display_name: string | null;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PageViewer({ params }: Props) {
  const { id } = await params;
  const numId = Number(id);

  if (!Number.isInteger(numId) || numId <= 0) {
    notFound();
  }

  const db = getDb();
  const page = db
    .prepare(
      `SELECT c.id, c.title, c.body, c.excerpt, c.content_type, c.published, c.created_at,
              u.username, u.display_name
       FROM content c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ? AND c.published = 1`
    )
    .get(numId) as PageContent | undefined;

  if (!page) {
    notFound();
  }

  return (
    /* Full height, flex column: fixed header + scrollable body */
    <div className="h-full flex flex-col overflow-hidden">

      {/* Fixed top bar with back button and metadata */}
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0"
          >
            ← Browse
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-zinc-400 min-w-0">
            <span className="truncate">{page.display_name || page.username}</span>
            <span>&middot;</span>
            <span>
              {new Date(page.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span>&middot;</span>
            <span className="capitalize">{page.content_type}</span>
          </div>
        </div>
      </header>

      {/* Scrollable content area */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            {page.title}
          </h1>

          {/* Excerpt / subtitle */}
          {page.excerpt && (
            <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {page.excerpt}
            </p>
          )}

          {/* Divider */}
          <hr className="mt-6 mb-8 border-zinc-200 dark:border-zinc-800" />

          {/* Body content */}
          <div className="prose prose-zinc dark:prose-invert max-w-none text-base leading-relaxed whitespace-pre-wrap">
            {page.body}
          </div>

          {/* Footer spacer */}
          <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-400 text-center">
            — {page.display_name || page.username}
          </div>
        </div>
      </main>
    </div>
  );
}

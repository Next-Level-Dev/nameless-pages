import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageRenderer from "@/components/page-renderer";
import VoteButtons from "@/components/vote-buttons";

interface PageContent {
  id: number;
  user_id: number;
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

  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const db = getDb();
  const [page, user] = await Promise.all([
    Promise.resolve(
      db
        .prepare(
          `SELECT c.id, c.user_id, c.title, c.body, c.excerpt, c.content_type, c.published, c.created_at,
                  u.username, u.display_name
           FROM content c
           JOIN users u ON u.id = c.user_id
           WHERE c.id = ? AND c.published = 1`
        )
        .get(numId) as PageContent | undefined
    ),
    getSessionUser(),
  ]);

  if (!page) notFound();

  // Score
  const scoreRow = db
    .prepare(
      "SELECT COALESCE(SUM(vote), 0) as score FROM votes WHERE content_id = ?"
    )
    .get(numId) as { score: number };

  const score = scoreRow.score;

  // Current user's vote and favorite
  const userVote = user
    ? (db
        .prepare("SELECT vote FROM votes WHERE user_id = ? AND content_id = ?")
        .get(user.id, numId) as { vote: 1 | -1 } | undefined)?.vote ?? null
    : null;

  const isFavorited = user
    ? !!db
        .prepare("SELECT id FROM favorites WHERE user_id = ? AND content_id = ?")
        .get(user.id, numId)
    : false;

  const displayName = page.display_name || page.username;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Fixed top bar */}
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0"
          >
            ← Browse
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-zinc-400 min-w-0">
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

      {/* Scrollable content */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">

          {/* Author byline — links to profile */}
          <Link
            href={`/profile/${page.user_id}`}
            className="group mb-6 block w-fit"
          >
            <p className="text-2xl sm:text-3xl font-bold text-blue-500 group-hover:text-blue-400 transition-colors leading-tight">
              {displayName}
            </p>
            <p className="text-sm text-zinc-400 group-hover:text-zinc-500 transition-colors">
              @{page.username}
            </p>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
            {page.title}
          </h1>

          {page.excerpt && (
            <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {page.excerpt}
            </p>
          )}

          {/* Vote / favorite bar */}
          <div className="mt-5 mb-2">
            <VoteButtons
              contentId={page.id}
              initialScore={score}
              initialUserVote={userVote}
              initialFavorited={isFavorited}
              isLoggedIn={!!user}
            />
          </div>

          <hr className="mt-4 mb-8 border-zinc-200 dark:border-zinc-800" />

          <PageRenderer body={page.body} />

          <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-400 text-center">
            — {displayName}
          </div>
        </div>
      </main>
    </div>
  );
}

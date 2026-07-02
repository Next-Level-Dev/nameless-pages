import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import TabSwitcher from "@/components/tab-switcher";

interface ProfileUser {
  id: number;
  username: string;
  display_name: string | null;
  role: string;
  created_at: string;
}

interface ContentItem {
  id: number;
  title: string;
  excerpt: string | null;
  content_type: string;
  created_at: string;
  score: number;
}

interface FavoriteItem {
  id: number;
  title: string;
  excerpt: string | null;
  content_type: string;
  created_at: string;
  username: string;
  display_name: string | null;
  score: number;
}

interface Props {
  params: Promise<{ id: string }>;
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`font-medium tabular-nums ${
      score > 0 ? "text-emerald-600 dark:text-emerald-400"
      : score < 0 ? "text-red-500 dark:text-red-400"
      : "text-zinc-400"
    }`}>
      {score > 0 ? `+${score}` : score}
    </span>
  );
}

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const numId = Number(id);

  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const db = getDb();

  const user = db
    .prepare(`SELECT id, username, display_name, role, created_at FROM users WHERE id = ?`)
    .get(numId) as ProfileUser | undefined;

  if (!user) notFound();

  const isAuthor = user.role === 'author' || user.role === 'trusted_author';
  const isTrustedAuthor = user.role === 'trusted_author';

  const pages = isAuthor
    ? (db.prepare(
        `SELECT c.id, c.title, c.excerpt, c.content_type, c.created_at,
                COALESCE(SUM(v.vote), 0) as score
         FROM content c
         LEFT JOIN votes v ON v.content_id = c.id
         WHERE c.user_id = ? AND c.published = 1
         GROUP BY c.id
         ORDER BY c.created_at DESC`
      ).all(numId) as ContentItem[])
    : [];

  const favorites = db.prepare(
    `SELECT c.id, c.title, c.excerpt, c.content_type, c.created_at,
            u.username, u.display_name,
            COALESCE(SUM(v.vote), 0) as score
     FROM favorites f
     JOIN content c ON c.id = f.content_id
     JOIN users u ON u.id = c.user_id
     LEFT JOIN votes v ON v.content_id = c.id
     WHERE f.user_id = ? AND c.published = 1
     GROUP BY c.id
     ORDER BY f.created_at DESC`
  ).all(numId) as FavoriteItem[];

  const displayName = user.display_name || user.username;
  const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // ── Pages panel ──
  const pagesPanel = (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-center">
          <p>No public pages yet.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500 mb-4">
            {pages.length} public {pages.length === 1 ? "page" : "pages"}
          </p>
          <div className="space-y-3">
            {pages.map((item) => (
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
                  <span>
                    {new Date(item.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </span>
                  <span>&middot;</span>
                  <span className="capitalize">{item.content_type}</span>
                  <span>&middot;</span>
                  <ScoreBadge score={item.score} />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ── Favorites panel ──
  const favoritesPanel = (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-center">
          <p className="text-sm">No favorites yet.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500 mb-4">
            {favorites.length} {favorites.length === 1 ? "page" : "pages"}
          </p>
          <div className="space-y-3">
            {favorites.map((item) => (
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
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </span>
                  <span>&middot;</span>
                  <span className="capitalize">{item.content_type}</span>
                  <span>&middot;</span>
                  <ScoreBadge score={item.score} />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const panels = isAuthor
    ? [
        { key: 'pages', label: 'Pages', content: pagesPanel },
        { key: 'favorites', label: 'Favorites', content: favoritesPanel },
      ]
    : [
        { key: 'favorites', label: 'Favorites', content: favoritesPanel },
      ];

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Profile header */}
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
          <Link
            href="/"
            className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Browse
          </Link>
          <div className="flex items-start gap-3 flex-wrap">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-500 leading-tight">
                {displayName}
              </p>
              <p className="mt-0.5 text-sm text-zinc-400">@{user.username}</p>
              <p className="mt-2 text-xs text-zinc-400">Joined {joinDate}</p>
            </div>
            <div className="mt-1 flex flex-wrap items-start gap-2">
              {isTrustedAuthor && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Trusted Author
                </span>
              )}
              {user.role === 'author' && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Author
                </span>
              )}
              {user.role === 'reader' && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Reader
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex-1 min-h-0">
        <TabSwitcher panels={panels} />
      </div>
    </div>
  );
}

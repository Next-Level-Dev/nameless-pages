import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardActions from "@/components/dashboard-actions";
import DisplayNameEditor from "@/components/display-name-editor";
import TabSwitcher from "@/components/tab-switcher";
import RedeemInvitePanel from "@/components/redeem-invite-panel";
import GenerateInvitePanel from "@/components/generate-invite-panel";
import EmailVerificationPrompt from "@/components/email-verification-prompt";
import { LogoutButton } from "@/components/logout-button";

interface ContentItem {
  id: number;
  title: string;
  content_type: string;
  excerpt: string;
  published: number;
  created_at: string;
  updated_at: string;
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

const CONTENT_CAP = 5;
const COOLDOWN_HOURS = 24;
const COOLDOWN_MS = COOLDOWN_HOURS * 3600 * 1000;

function getCooldownStatus(latestCreatedAt: string | undefined): {
  recentlyCreated: boolean;
  hoursLeft: string;
} {
  if (!latestCreatedAt) return { recentlyCreated: false, hoursLeft: '0' };
  const msSince = Date.now() - new Date(latestCreatedAt).getTime();
  const recentlyCreated = msSince < COOLDOWN_MS;
  const hoursLeft = ((COOLDOWN_MS - msSince) / 3600000).toFixed(1);
  return { recentlyCreated, hoursLeft };
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

export default async function DashboardPage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect("/login");
  }

  // Block unverified users from dashboard
  if (!user.verified) {
    redirect("/verify-email");
  }

  const db = getDb();
  const isAuthor = user.role === 'author' || user.role === 'trusted_author';
  const isTrustedAuthor = user.role === 'trusted_author';

  const items = isAuthor
    ? (db.prepare(
        `SELECT id, title, content_type, excerpt, published, created_at, updated_at
         FROM content WHERE user_id = ? ORDER BY created_at DESC`
      ).all(user.id) as ContentItem[])
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
  ).all(user.id) as FavoriteItem[];

  let remainingToday = 0;
  if (isTrustedAuthor) {
    const todayCount = (db.prepare(
      `SELECT COUNT(*) as count FROM invite_codes WHERE created_by = ? AND date(created_at) = date('now')`
    ).get(user.id) as { count: number }).count;
    remainingToday = Math.max(0, 5 - todayCount);
  }

  const count = items.length;
  const latest = items[0] ?? null;
  const { recentlyCreated, hoursLeft } = getCooldownStatus(latest?.created_at);
  const canCreate = count < CONTENT_CAP && !recentlyCreated;

  let limitReason = '';
  if (count >= CONTENT_CAP) {
    limitReason = `You've reached the maximum of ${CONTENT_CAP} pages.`;
  } else if (recentlyCreated && latest) {
    limitReason = `Cooldown active — next page in ${hoursLeft}h.`;
  }

  // ── Pages panel content ──
  const pagesPanel = (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {isTrustedAuthor && <GenerateInvitePanel remainingToday={remainingToday} />}

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <div className="mb-4 text-5xl">&#9997;</div>
          <p className="text-xl font-semibold">No pages yet</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Create your first page and share it with the fellowship.
          </p>
          {canCreate && (
            <Link
              href="/dashboard/new"
              className="mt-6 rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Create your first page
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            {count} {count === 1 ? "page" : "pages"}
          </p>
          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-zinc-200 p-4 sm:p-5 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.published ? (
                        <Link
                          href={`/pages/${item.id}`}
                          className="truncate text-base font-semibold hover:underline underline-offset-2"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <span className="truncate text-base font-semibold">{item.title}</span>
                      )}
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.published
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}>
                        {item.published ? "Public" : "Draft"}
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
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </span>
                      <span className="capitalize">{item.content_type}</span>
                    </div>
                  </div>
                  <DashboardActions id={item.id} published={item.published === 1} />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ── Favorites panel content ──
  const favoritesPanel = (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-center">
          <p className="text-sm">No favorites yet — star a post to save it here.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500 mb-4">
            {favorites.length} {favorites.length === 1 ? "post" : "posts"}
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

  // ── Upgrade panel content (readers) ──
  const upgradePanel = (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <RedeemInvitePanel />
    </div>
  );

  const panels = isAuthor
    ? [
        { key: 'pages', label: 'Pages', content: pagesPanel },
        { key: 'favorites', label: 'Favorites', content: favoritesPanel },
      ]
    : [
        { key: 'upgrade', label: 'Become an Author', content: upgradePanel },
        { key: 'favorites', label: 'Favorites', content: favoritesPanel },
      ];

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Email verification prompt */}
      <EmailVerificationPrompt verified={Boolean(user.verified)} />

      {/* Fixed header */}
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:py-5">
          <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <DisplayNameEditor
                displayName={user.display_name || user.username}
                username={user.username}
              />
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {isTrustedAuthor && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Trusted Author
                  </span>
                )}
                {user.role === 'author' && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Author
                  </span>
                )}
                {user.role === 'reader' && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    Reader
                  </span>
                )}
                {isAuthor && (
                  <p className="text-xs text-zinc-400">
                    {count}/{CONTENT_CAP} pages
                    {limitReason && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">— {limitReason}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            {isAuthor && (
              <div className="shrink-0 flex items-center gap-3">
                <LogoutButton />
                {canCreate ? (
                  <Link
                    href="/dashboard/new"
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    New Page
                  </Link>
                ) : (
                  <span
                    title={limitReason}
                    className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
                  >
                    New Page
                  </span>
                )}
              </div>
            )}
            {!isAuthor && (
              <div className="shrink-0">
                <LogoutButton />
              </div>
            )}
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

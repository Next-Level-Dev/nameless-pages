import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'nameless-pages.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema(db)
  }
  return db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      bio TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'reader' CHECK(role IN ('reader', 'author', 'trusted_author')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'text',
      excerpt TEXT DEFAULT '',
      published INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      vote INTEGER NOT NULL CHECK(vote IN (-1, 1)),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, content_id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, content_id)
    );

    CREATE TABLE IF NOT EXISTS invite_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Migrate existing users: add role column if missing (SQLite doesn't support
  // ADD COLUMN with CHECK, so we add it without constraint then let the default handle it)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'reader'`)
  } catch {
    // Column already exists — ignore
  }
}

/**
 * Compute the secret score for a single piece of content.
 *
 * Formula:
 *   base = upvotes + favorites - downvotes
 *   × 1.1 if posted within the last 7 days
 *   × 1.2 if the author is a trusted_author
 *
 * This is intentionally computed in JS so it never leaks in a raw SQL response.
 */
export function computeSecretScore(params: {
  upvotes: number
  downvotes: number
  favoritesCount: number
  createdAt: string
  authorRole: string
}): number {
  const { upvotes, downvotes, favoritesCount, createdAt, authorRole } = params
  let score = upvotes + favoritesCount - downvotes
  const ageMs = Date.now() - new Date(createdAt).getTime()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  if (ageMs < sevenDaysMs) score *= 1.1
  if (authorRole === 'trusted_author') score *= 1.2
  return score
}

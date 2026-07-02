import Database from 'better-sqlite3'
import path from 'path'
import bcrypt from 'bcryptjs'

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

// Create default admin account if configured via environment variables
function createDefaultAdmin(db: Database.Database) {
  const username = process.env.DEFAULT_ADMIN_USER?.trim()
  const password = process.env.DEFAULT_ADMIN_PASS

  if (!username || !password || password.length < 6) {
    return
  }

  // Check if already exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) {
    return
  }

  const passwordHash = bcrypt.hashSync(password, 12)
  db.prepare(`
    INSERT INTO users (username, email, password_hash, display_name, role, verified)
    VALUES (?, ?, ?, ?, 'trusted_author', 1)
  `).run(username, `admin@${username}.local`, passwordHash, username)
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
      verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN (0, 1)),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      hour_key TEXT NOT NULL,  -- format: YYYY-MM-DD-HH
      count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(email, hour_key)
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

    -- Rate limiting tables
    CREATE TABLE IF NOT EXISTS rate_limits_60s (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      window_key TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(identifier, window_key)
    );

    CREATE TABLE IF NOT EXISTS rate_limits_300s (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      window_key TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(identifier, window_key)
    );

    CREATE TABLE IF NOT EXISTS rate_limits_3600s (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      window_key TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(identifier, window_key)
    );
  `)

  // Migrate existing users: add role column if missing (SQLite doesn't support
  // ADD COLUMN with CHECK, so we add it without constraint then let the default handle it)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'reader'`)
  } catch {
    // Column already exists — ignore
  }

  // Migrate: add verified column if missing
  try {
    db.exec(`ALTER TABLE users ADD COLUMN verified INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // Column already exists — ignore
  }

  // Create default admin account if configured
  createDefaultAdmin(db)
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

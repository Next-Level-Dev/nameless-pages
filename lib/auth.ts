import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { getDb } from './db'

export type UserRole = 'reader' | 'author' | 'trusted_author'

export interface User {
  id: number
  username: string
  email: string
  display_name: string | null
  bio: string
  role: UserRole
  created_at: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex')
}

export async function createSession(userId: number): Promise<string> {
  const db = getDb()
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, expiresAt)

  return token
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value

    if (!token) return null

    const db = getDb()
    const session = db.prepare(`
      SELECT s.user_id FROM sessions s
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token) as { user_id: number } | undefined

    if (!session) return null

    const user = db.prepare(`
      SELECT id, username, email, display_name, bio, role, created_at FROM users
      WHERE id = ?
    `).get(session.user_id) as User | undefined

    return user || null
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (token) {
    const db = getDb()
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  }
}

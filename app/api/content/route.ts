import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const CONTENT_CAP = 5
const COOLDOWN_HOURS = 24

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const db = getDb()

    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const items = db.prepare(`
      SELECT id, title, body, content_type, excerpt, published, created_at, updated_at
      FROM content
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(user.id, limit, offset)

    const countRow = db.prepare(
      'SELECT COUNT(*) as count FROM content WHERE user_id = ?'
    ).get(user.id) as { count: number }

    const latest = db.prepare(
      `SELECT created_at FROM content WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
    ).get(user.id) as { created_at: string } | undefined

    const count = countRow.count
    const recentlyCrated = latest
      ? Date.now() - new Date(latest.created_at).getTime() < COOLDOWN_HOURS * 3600 * 1000
      : false
    const canCreate = count < CONTENT_CAP && !recentlyCrated

    return NextResponse.json({ items, total: count, canCreate, cap: CONTENT_CAP })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ errors: ['Unauthorized'] }, { status: 401 })
    }
    return NextResponse.json({ errors: ['Internal server error'] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Only authors and trusted_authors can create content
    if (user.role === 'reader') {
      return NextResponse.json(
        { errors: ['You need an author invitation to create content.'] },
        { status: 403 }
      )
    }

    const body = await request.json()

    const title = (body.title ?? '').toString().trim()
    const excerpt = (body.excerpt ?? '').toString().trim()
    const content_type = (body.content_type ?? 'text').toString().trim()

    if (!title) {
      return NextResponse.json({ errors: ['Title is required'] }, { status: 400 })
    }

    const db = getDb()

    // Enforce 5-content cap
    const countRow = db.prepare(
      'SELECT COUNT(*) as count FROM content WHERE user_id = ?'
    ).get(user.id) as { count: number }
    if (countRow.count >= CONTENT_CAP) {
      return NextResponse.json(
        { errors: [`You have reached the maximum of ${CONTENT_CAP} pieces of content.`] },
        { status: 403 }
      )
    }

    // Enforce 24-hour cooldown
    const latest = db.prepare(
      `SELECT created_at FROM content WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
    ).get(user.id) as { created_at: string } | undefined
    if (latest) {
      const msSince = Date.now() - new Date(latest.created_at).getTime()
      if (msSince < COOLDOWN_HOURS * 3600 * 1000) {
        const hoursLeft = ((COOLDOWN_HOURS * 3600 * 1000 - msSince) / 3600000).toFixed(1)
        return NextResponse.json(
          { errors: [`You can only create one piece per ${COOLDOWN_HOURS} hours. Try again in ${hoursLeft}h.`] },
          { status: 429 }
        )
      }
    }

    // Always draft, body always starts empty
    const result = db.prepare(`
      INSERT INTO content (user_id, title, body, content_type, excerpt, published)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(user.id, title, '', content_type, excerpt)

    const item = db.prepare('SELECT * FROM content WHERE id = ?').get(result.lastInsertRowid)

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ errors: ['Unauthorized'] }, { status: 401 })
    }
    return NextResponse.json({ errors: ['Internal server error'] }, { status: 500 })
  }
}

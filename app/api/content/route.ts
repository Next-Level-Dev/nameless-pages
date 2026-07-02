import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

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

    const count = db.prepare('SELECT COUNT(*) as count FROM content WHERE user_id = ?').get(user.id) as { count: number }

    return NextResponse.json({ items, total: count.count })
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
    const body = await request.json()

    if (!body.title || !body.body) {
      return NextResponse.json({ errors: ['Title and body are required'] }, { status: 400 })
    }

    const db = getDb()
    const excerpt = body.excerpt || body.body.slice(0, 200)
    const result = db.prepare(`
      INSERT INTO content (user_id, title, body, content_type, excerpt, published)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, body.title, body.body, body.content_type || 'text', excerpt, body.published !== undefined ? (body.published ? 1 : 0) : 1)

    const item = db.prepare('SELECT * FROM content WHERE id = ?').get(result.lastInsertRowid)

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ errors: ['Unauthorized'] }, { status: 401 })
    }
    return NextResponse.json({ errors: ['Internal server error'] }, { status: 500 })
  }
}

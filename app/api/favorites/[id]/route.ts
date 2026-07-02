import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

interface Props {
  params: Promise<{ id: string }>
}

// POST /api/favorites/[id]
// Toggles favorite on/off. Returns { favorited: boolean }
export async function POST(request: NextRequest, { params }: Props) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!user.verified) {
    return NextResponse.json({ error: 'Please verify your email first' }, { status: 403 })
  }

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const db = getDb()

  // Verify content exists
  const content = db.prepare('SELECT id FROM content WHERE id = ? AND published = 1').get(numId)
  if (!content) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const existing = db.prepare(
    'SELECT id FROM favorites WHERE user_id = ? AND content_id = ?'
  ).get(user.id, numId) as { id: number } | undefined

  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id)
    return NextResponse.json({ favorited: false })
  } else {
    db.prepare(
      'INSERT INTO favorites (user_id, content_id) VALUES (?, ?)'
    ).run(user.id, numId)
    return NextResponse.json({ favorited: true })
  }
}

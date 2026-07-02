import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

interface Props {
  params: Promise<{ id: string }>
}

// POST /api/votes/[id]  body: { vote: 1 | -1 }
// If the user already cast the same vote, it removes it (toggle off).
// If they cast the opposite vote, it updates.
export async function POST(request: NextRequest, { params }: Props) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const body = await request.json()
  const vote = body.vote
  if (vote !== 1 && vote !== -1) {
    return NextResponse.json({ error: 'vote must be 1 or -1' }, { status: 400 })
  }

  const db = getDb()

  // Verify content exists
  const content = db.prepare('SELECT id FROM content WHERE id = ? AND published = 1').get(numId)
  if (!content) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const existing = db.prepare(
    'SELECT id, vote FROM votes WHERE user_id = ? AND content_id = ?'
  ).get(user.id, numId) as { id: number; vote: number } | undefined

  if (existing) {
    if (existing.vote === vote) {
      // Same vote — toggle off (remove)
      db.prepare('DELETE FROM votes WHERE id = ?').run(existing.id)
    } else {
      // Opposite vote — update
      db.prepare('UPDATE votes SET vote = ? WHERE id = ?').run(vote, existing.id)
    }
  } else {
    db.prepare(
      'INSERT INTO votes (user_id, content_id, vote) VALUES (?, ?, ?)'
    ).run(user.id, numId, vote)
  }

  const scoreRow = db.prepare(
    'SELECT COALESCE(SUM(vote), 0) as score FROM votes WHERE content_id = ?'
  ).get(numId) as { score: number }

  const userVoteRow = db.prepare(
    'SELECT vote FROM votes WHERE user_id = ? AND content_id = ?'
  ).get(user.id, numId) as { vote: number } | undefined

  return NextResponse.json({
    score: scoreRow.score,
    userVote: userVoteRow?.vote ?? null,
  })
}

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import crypto from 'crypto'

const MAX_PER_DAY = 5
const EXPIRY_DAYS = 3

export async function POST() {
  try {
    const user = await requireAuth()

    if (user.role !== 'trusted_author') {
      return NextResponse.json(
        { error: 'Only trusted authors can generate invite codes.' },
        { status: 403 }
      )
    }

    const db = getDb()

    // Count codes generated today (UTC day boundary)
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const todayCount = (db.prepare(`
      SELECT COUNT(*) as count FROM invite_codes
      WHERE created_by = ? AND created_at >= ?
    `).get(user.id, todayStart.toISOString()) as { count: number }).count

    if (todayCount >= MAX_PER_DAY) {
      return NextResponse.json(
        { error: `You can only generate ${MAX_PER_DAY} invite codes per day.` },
        { status: 429 }
      )
    }

    const code = crypto.randomBytes(16).toString('hex') // 32-char hex
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

    db.prepare(
      `INSERT INTO invite_codes (code, created_by, expires_at) VALUES (?, ?, ?)`
    ).run(code, user.id, expiresAt)

    return NextResponse.json({
      code,
      expires_at: expiresAt,
      remaining_today: MAX_PER_DAY - todayCount - 1,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

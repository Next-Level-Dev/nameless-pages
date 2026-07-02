import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (user.role !== 'reader') {
      return NextResponse.json(
        { error: 'Only readers can redeem invite codes.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const code = (body.code ?? '').toString().trim()

    if (!code) {
      return NextResponse.json({ error: 'Code is required.' }, { status: 400 })
    }

    const db = getDb()

    const invite = db.prepare(`
      SELECT id, used_by, expires_at FROM invite_codes
      WHERE code = ?
    `).get(code) as { id: number; used_by: number | null; expires_at: string } | undefined

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite code.' }, { status: 404 })
    }

    if (invite.used_by !== null) {
      return NextResponse.json({ error: 'This invite code has already been used.' }, { status: 409 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite code has expired.' }, { status: 410 })
    }

    // Mark code used and upgrade user role in a single transaction
    db.prepare(`
      UPDATE invite_codes SET used_by = ?, used_at = datetime('now') WHERE id = ?
    `).run(user.id, invite.id)

    db.prepare(`
      UPDATE users SET role = 'author', updated_at = datetime('now') WHERE id = ?
    `).run(user.id)

    return NextResponse.json({ success: true, role: 'author' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

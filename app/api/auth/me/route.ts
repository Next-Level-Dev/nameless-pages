import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json(null, { status: 401 })
  }
  return NextResponse.json(user)
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const raw = (body.display_name ?? '').toString().trim()

    if (raw.length < 3 || raw.length > 15) {
      return NextResponse.json(
        { errors: ['Display name must be 3–15 characters'] },
        { status: 400 }
      )
    }

    const db = getDb()
    db.prepare(
      `UPDATE users SET display_name = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(raw, user.id)

    return NextResponse.json({ success: true, display_name: raw })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ errors: ['Unauthorized'] }, { status: 401 })
    }
    return NextResponse.json({ errors: ['Internal server error'] }, { status: 500 })
  }
}

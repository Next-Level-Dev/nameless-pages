import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, requireAuth } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { validateDisplayName } from '@/lib/banned-names'
import { sanitizePlainText } from '@/lib/sanitize'

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
    
    if (!user.verified) {
      return NextResponse.json({ errors: ['Please verify your email first'] }, { status: 403 })
    }
    
    const body = await request.json()
    // First validate the raw input before sanitizing
    const validation = validateDisplayName(body.display_name ?? '')
    if (!validation.valid) {
      return NextResponse.json({ errors: [validation.reason!] }, { status: 400 })
    }

    // Sanitize to strip any HTML/scripts
    const raw = sanitizePlainText(body.display_name ?? '')

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

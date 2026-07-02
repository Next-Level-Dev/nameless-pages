import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ errors: ['Username and password are required'] }, { status: 400 })
    }

    const db = getDb()
    const user = db.prepare(
      'SELECT id, password_hash FROM users WHERE username = ? OR email = ?'
    ).get(username, username) as { id: number; password_hash: string } | undefined

    if (!user) {
      return NextResponse.json({ errors: ['Invalid credentials'] }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ errors: ['Invalid credentials'] }, { status: 401 })
    }

    const token = await createSession(user.id)
    const response = NextResponse.json({ success: true })
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch {
    return NextResponse.json({ errors: ['Internal server error'] }, { status: 500 })
  }
}

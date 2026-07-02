import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'
import { checkRateLimit, RateLimits } from '@/lib/rate-limit'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit login attempts
    const ip = getClientIp(request)
    const rateLimit = checkRateLimit(`login:${ip}`, RateLimits.LOGIN.window, RateLimits.LOGIN.max)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { errors: [`Too many login attempts. Try again in ${rateLimit.resetIn} seconds.`] },
        { status: 429, headers: { 'Retry-After': rateLimit.resetIn.toString() } }
      )
    }

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ errors: ['Username and password are required'] }, { status: 400 })
    }

    const db = getDb()
    const user = db.prepare(
      'SELECT id, password_hash, verified FROM users WHERE username = ? OR email = ?'
    ).get(username, username) as { id: number; password_hash: string; verified: number } | undefined

    if (!user) {
      return NextResponse.json({ errors: ['Invalid credentials'] }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ errors: ['Invalid credentials'] }, { status: 401 })
    }

    const token = await createSession(user.id)
    const response = NextResponse.json({ success: true, verified: Boolean(user.verified) })
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

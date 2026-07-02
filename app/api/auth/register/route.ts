import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hashPassword, createSession } from '@/lib/auth'
import { validateUsername } from '@/lib/banned-names'
import { checkRateLimit, RateLimits } from '@/lib/rate-limit'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

function validate(body: { username?: string; email?: string; password?: string }) {
  const errors: string[] = []

  if (!body.username) {
    errors.push('Username is required')
  } else {
    const usernameCheck = validateUsername(body.username)
    if (!usernameCheck.valid) {
      errors.push(usernameCheck.reason!)
    }
  }

  if (!body.email || !body.email.includes('@')) {
    errors.push('Valid email is required')
  }

  if (!body.password || body.password.length < 6) {
    errors.push('Password must be at least 6 characters')
  }

  return errors
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit registrations
    const ip = getClientIp(request)
    const rateLimit = checkRateLimit(`register:${ip}`, RateLimits.REGISTER.window, RateLimits.REGISTER.max)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { errors: [`Too many accounts created. Try again in ${rateLimit.resetIn} seconds.`] },
        { status: 429, headers: { 'Retry-After': rateLimit.resetIn.toString() } }
      )
    }

    const body = await request.json()
    const errors = validate(body)
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 })
    }

    const db = getDb()
    const existing = db
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .get(body.username, body.email)
    if (existing) {
      return NextResponse.json({ errors: ['Username or email already taken'] }, { status: 409 })
    }

    const passwordHash = await hashPassword(body.password!)
    const result = db
      .prepare(
        `INSERT INTO users (username, email, password_hash, display_name, role)
         VALUES (?, ?, ?, ?, 'reader')`
      )
      .run(body.username, body.email, passwordHash, body.username)

    const token = await createSession(result.lastInsertRowid as number)
    const response = NextResponse.json({ success: true }, { status: 201 })
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
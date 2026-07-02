import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import { checkEmailRateLimit, generateVerificationToken, saveVerificationToken, sendVerificationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    
    if (!user) {
      return NextResponse.json({ errors: ['Unauthorized'] }, { status: 401 })
    }

    const db = getDb()
    const userData = db.prepare('SELECT email, verified FROM users WHERE id = ?').get(user.id) as { email: string; verified: number } | undefined

    if (!userData) {
      return NextResponse.json({ errors: ['User not found'] }, { status: 404 })
    }

    // Allow change only if not verified, or always (user might want to change email after verifying too)
    // Actually, let's allow always - it's reasonable to change your email
    
    const body = await request.json()
    const newEmail = body.email as string

    if (!newEmail || !newEmail.includes('@')) {
      return NextResponse.json({ errors: ['Valid email is required'] }, { status: 400 })
    }

    // Check if email is already taken
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(newEmail, user.id)
    if (existing) {
      return NextResponse.json({ errors: ['Email already in use'] }, { status: 409 })
    }

    // Update email
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(newEmail, user.id)

    // If not verified, also send a new verification email
    if (!userData.verified) {
      // Check rate limit for new email
      const rateLimit = checkEmailRateLimit(newEmail)
      if (!rateLimit.allowed) {
        const minutes = Math.ceil(rateLimit.resetIn / 60)
        return NextResponse.json({ 
          errors: [`Rate limit exceeded for new email. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`] 
        }, { status: 429 })
      }

      // Generate and save token
      const token = generateVerificationToken()
      saveVerificationToken(user.id, token)

      const baseUrl = request.nextUrl.origin
      await sendVerificationEmail(newEmail, user.username, token, baseUrl)
    }

    return NextResponse.json({ success: true, email: newEmail })
  } catch (error) {
    console.error('Change email error:', error)
    return NextResponse.json({ errors: ['Internal server error'] }, { status: 500 })
  }
}
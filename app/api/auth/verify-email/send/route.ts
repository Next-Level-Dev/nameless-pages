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

    if (userData.verified) {
      return NextResponse.json({ errors: ['Email already verified'] }, { status: 400 })
    }

    // Check rate limit
    const rateLimit = checkEmailRateLimit(userData.email)
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(rateLimit.resetIn / 60)
      return NextResponse.json({ 
        errors: [`Rate limit exceeded. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`] 
      }, { status: 429 })
    }

    // Generate and save token
    const token = generateVerificationToken()
    saveVerificationToken(user.id, token)

    // Get base URL from request
    const baseUrl = request.nextUrl.origin

    // Send email
    const result = await sendVerificationEmail(userData.email, user.username, token, baseUrl)
    
    if (!result.success) {
      return NextResponse.json({ errors: [result.message] }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Verification email sent',
      remaining: rateLimit.remaining
    })
  } catch (error) {
    console.error('Send verification error:', error)
    return NextResponse.json({ errors: ['Internal server error'] }, { status: 500 })
  }
}
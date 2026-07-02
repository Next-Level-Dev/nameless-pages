import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { getDb } from './db'

// Create reusable transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Check and increment rate limit for an email
export function checkEmailRateLimit(email: string): { allowed: boolean; remaining: number; resetIn: number } {
  const db = getDb()
  const hourlyLimit = parseInt(process.env.EMAIL_RATE_LIMIT_HOURLY || '3')
  const now = new Date()
  const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getHours()}`

  // Try to get existing record
  const existing = db.prepare(
    'SELECT count FROM email_rate_limits WHERE email = ? AND hour_key = ?'
  ).get(email, hourKey) as { count: number } | undefined

  if (existing) {
    if (existing.count >= hourlyLimit) {
      // Calculate reset time (start of next hour)
      const resetIn = (60 - now.getMinutes()) * 60 + (60 - now.getSeconds())
      return { allowed: false, remaining: 0, resetIn }
    }
    // Increment count
    db.prepare('UPDATE email_rate_limits SET count = count + 1 WHERE email = ? AND hour_key = ?')
      .run(email, hourKey)
    return { allowed: true, remaining: hourlyLimit - existing.count - 1, resetIn: 0 }
  }

  // Insert new record
  db.prepare('INSERT INTO email_rate_limits (email, hour_key, count) VALUES (?, ?, 1)')
    .run(email, hourKey)
  return { allowed: true, remaining: hourlyLimit - 1, resetIn: 0 }
}

// Generate verification token
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Save verification token to database
export function saveVerificationToken(userId: number, token: string): void {
  const db = getDb()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

  // Delete any existing tokens for this user
  db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(userId)

  // Insert new token
  db.prepare('INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
    .run(userId, token, expiresAt)
}

// Verify token and mark user as verified
export function verifyToken(token: string): { success: boolean; message: string } {
  const db = getDb()

  const record = db.prepare(`
    SELECT user_id, expires_at FROM email_verification_tokens
    WHERE token = ?
  `).get(token) as { user_id: number; expires_at: string } | undefined

  if (!record) {
    return { success: false, message: 'Invalid token' }
  }

  if (new Date(record.expires_at) < new Date()) {
    return { success: false, message: 'Token expired' }
  }

  // Mark user as verified
  db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(record.user_id)

  // Delete the used token
  db.prepare('DELETE FROM email_verification_tokens WHERE token = ?').run(token)

  return { success: true, message: 'Email verified successfully' }
}

// Cleanup expired tokens (call periodically)
export function cleanupExpiredTokens(): number {
  const db = getDb()
  const result = db.prepare('DELETE FROM email_verification_tokens WHERE expires_at < datetime("now")').run()
  return result.changes
}

// Send verification email
export async function sendVerificationEmail(
  email: string,
  username: string,
  token: string,
  baseUrl: string
): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createTransporter()
    const verifyUrl = `${baseUrl}/api/auth/verify-email/confirm?token=${token}`

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Verify your email - Nameless Pages',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Welcome to Nameless Pages, ${username}!</h2>
          <p>Click the button below to verify your email address:</p>
          <a href="${verifyUrl}" style="
            display: inline-block;
            background: #4F46E5;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 16px 0;
          ">Verify Email</a>
          <p>Or copy this link: ${verifyUrl}</p>
          <p style="color: #666; font-size: 14px;">
            This link expires in 1 hour.
          </p>
        </div>
      `,
    })

    console.log('Verification email sent:', info.messageId)
    return { success: true, message: 'Verification email sent' }
  } catch (error) {
    console.error('Failed to send verification email:', error)
    return { success: false, message: 'Failed to send verification email' }
  }
}
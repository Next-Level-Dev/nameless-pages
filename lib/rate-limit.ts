// Server-side rate limiting utilities

import { NextResponse } from 'next/server'
import { getDb } from './db'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number // seconds
}

// Get client IP from request
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

// Generic rate limiter using database
// table: rate_limits_1min, rate_limits_5min, rate_limits_1hr
export function checkRateLimit(
  identifier: string,
  windowSeconds: number,
  maxRequests: number
): RateLimitResult {
  const db = getDb()
  const now = Date.now()
  const windowKey = Math.floor(now / (windowSeconds * 1000)).toString()
  const table = `rate_limits_${windowSeconds}s`

  // Get current count
  const existing = db.prepare(
    `SELECT count FROM ${table} WHERE identifier = ? AND window_key = ?`
  ).get(identifier, windowKey) as { count: number } | undefined

  if (existing) {
    if (existing.count >= maxRequests) {
      // Calculate reset time
      const windowEnd = (Math.floor(now / (windowSeconds * 1000)) + 1) * windowSeconds * 1000
      const resetIn = Math.ceil((windowEnd - now) / 1000)
      return { allowed: false, remaining: 0, resetIn }
    }
    // Increment
    db.prepare(`UPDATE ${table} SET count = count + 1 WHERE identifier = ? AND window_key = ?`)
      .run(identifier, windowKey)
    return { allowed: true, remaining: maxRequests - existing.count - 1, resetIn: 0 }
  }

  // Insert new record
  try {
    db.prepare(`INSERT INTO ${table} (identifier, window_key, count) VALUES (?, ?, 1)`)
      .run(identifier, windowKey)
  } catch {
    // Race condition - get current count
    const retry = db.prepare(
      `SELECT count FROM ${table} WHERE identifier = ? AND window_key = ?`
    ).get(identifier, windowKey) as { count: number } | undefined
    if (retry && retry.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetIn: windowSeconds }
    }
  }

  return { allowed: true, remaining: maxRequests - 1, resetIn: 0 }
}

// Apply rate limit and return response if blocked
export function rateLimitMiddleware(
  request: Request,
  windowSeconds: number,
  maxRequests: number,
  action: string
): NextResponse | null {
  const ip = getClientIp(request)
  const result = checkRateLimit(`${ip}:${action}`, windowSeconds, maxRequests)
  
  if (!result.allowed) {
    return new NextResponse('Too many requests', {
      status: 429,
      headers: {
        'Retry-After': result.resetIn.toString(),
        'X-RateLimit-Remaining': '0',
      },
    })
  }
  
  return null
}

// Pre-configured rate limits for common actions
export const RateLimits = {
  // Strict limits for authentication endpoints
  LOGIN: { window: 60, max: 5 },        // 5 login attempts per minute per IP
  REGISTER: { window: 300, max: 3 },    // 3 registrations per 5 min per IP
  VERIFY_EMAIL_SEND: { window: 3600, max: 3 }, // 3 emails per hour (per email)
  CHANGE_EMAIL: { window: 3600, max: 3 }, // 3 email changes per hour
  
  // Moderate limits for content creation
  CREATE_CONTENT: { window: 3600, max: 10 }, // 10 posts per hour
  VOTE: { window: 60, max: 30 },      // 30 votes per minute
  FAVORITE: { window: 60, max: 30 },  // 30 favorites per minute
  
  // Generous limits for reading (essentially unlimited but tracked)
  READ_CONTENT: { window: 60, max: 100 },
  LIST_CONTENT: { window: 60, max: 60 },
} as const

// Cleanup old rate limit records (call periodically)
export function cleanupRateLimits(): number {
  const db = getDb()
  let totalDeleted = 0
  
  // Delete records older than their window + 1 hour
  const windows = [60, 300, 3600]
  for (const w of windows) {
    const cutoff = new Date(Date.now() - (w + 3600) * 1000).toISOString()
    const result = db.prepare(`DELETE FROM rate_limits_${w}s WHERE created_at < ?`).run(cutoff)
    totalDeleted += result.changes
  }
  
  return totalDeleted
}
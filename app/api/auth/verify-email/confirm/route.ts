import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/dashboard?verified=error&message=Missing token', request.url))
    }

    const result = verifyToken(token)

    if (!result.success) {
      return NextResponse.redirect(new URL(`/dashboard?verified=error&message=${encodeURIComponent(result.message)}`, request.url))
    }

    return NextResponse.redirect(new URL('/dashboard?verified=success', request.url))
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.redirect(new URL('/dashboard?verified=error&message=Internal error', request.url))
  }
}
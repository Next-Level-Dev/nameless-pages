import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

export async function POST() {
  await destroySession()
  const response = NextResponse.json({ success: true })
  response.cookies.set('session', '', { httpOnly: true, path: '/', maxAge: 0 })
  return response
}

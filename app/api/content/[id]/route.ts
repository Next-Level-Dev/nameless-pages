import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { sanitizePlainText, sanitizeRichText } from '@/lib/sanitize'

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const user = await requireAuth()
    
    if (!user.verified) {
      return NextResponse.json({ errors: ['Please verify your email first'] }, { status: 403 })
    }
    
    const { id } = await params
    const numId = Number(id)

    if (!Number.isInteger(numId) || numId <= 0) {
      return NextResponse.json({ errors: ['Invalid id'] }, { status: 400 })
    }

    const db = getDb()

    // Verify ownership
    const existing = db.prepare(
      'SELECT id, user_id FROM content WHERE id = ?'
    ).get(numId) as { id: number; user_id: number } | undefined

    if (!existing) {
      return NextResponse.json({ errors: ['Not found'] }, { status: 404 })
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ errors: ['Forbidden'] }, { status: 403 })
    }

    const body = await request.json()
    const fields: string[] = []
    const values: unknown[] = []

    if (body.body !== undefined) {
      // Rich text - allow custom markup but strip HTML/scripts
      fields.push('body = ?')
      values.push(sanitizeRichText(body.body))
    }
    if (body.published !== undefined) {
      fields.push('published = ?')
      values.push(body.published ? 1 : 0)
    }
    if (body.title !== undefined) {
      fields.push('title = ?')
      values.push(sanitizePlainText(body.title))
    }
    if (body.excerpt !== undefined) {
      fields.push('excerpt = ?')
      values.push(sanitizePlainText(body.excerpt))
    }

    if (fields.length === 0) {
      return NextResponse.json({ errors: ['Nothing to update'] }, { status: 400 })
    }

    fields.push("updated_at = datetime('now')")
    values.push(numId)

    db.prepare(
      `UPDATE content SET ${fields.join(', ')} WHERE id = ?`
    ).run(...values)

    const updated = db.prepare('SELECT * FROM content WHERE id = ?').get(numId)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ errors: ['Unauthorized'] }, { status: 401 })
    }
    return NextResponse.json({ errors: ['Internal server error'] }, { status: 500 })
  }
}

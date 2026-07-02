'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RichEditor from '@/components/rich-editor'

interface Props {
  id: number
  title: string
  initialBody: string
  excerpt: string
  contentType: string
  initialPublished: boolean
}

export default function EditPageClient({
  id,
  title,
  initialBody,
  excerpt,
  contentType,
  initialPublished,
}: Props) {
  const router = useRouter()
  const [body, setBody] = useState(initialBody)
  const [published, setPublished] = useState(initialPublished)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    const res = await fetch(`/api/content/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    setSaving(false)
    if (res.ok) {
      setSaveMsg({ type: 'ok', text: 'Saved.' })
      setTimeout(() => setSaveMsg(null), 3000)
    } else {
      const data = await res.json()
      setSaveMsg({ type: 'err', text: data.errors?.[0] ?? 'Save failed.' })
    }
  }

  async function togglePublish() {
    const next = !published
    const confirmed = window.confirm(
      next
        ? 'Make this page public? It will be visible to everyone on the site.'
        : 'Make this page private? It will no longer be visible to others.'
    )
    if (!confirmed) return

    setToggling(true)
    const res = await fetch(`/api/content/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: next }),
    })
    setToggling(false)
    if (res.ok) {
      setPublished(next)
      setSaveMsg({ type: 'ok', text: next ? 'Page is now public.' : 'Page is now private.' })
      setTimeout(() => setSaveMsg(null), 3000)
    } else {
      const data = await res.json()
      setSaveMsg({ type: 'err', text: data.errors?.[0] ?? 'Failed.' })
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Fixed top bar */}
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-4xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold truncate max-w-xs sm:max-w-sm">{title}</h1>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                published
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {published ? 'Public' : 'Draft'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 capitalize">{contentType}{excerpt ? ` — ${excerpt}` : ''}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status message */}
            {saveMsg && (
              <span className={`text-xs ${saveMsg.type === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {saveMsg.text}
              </span>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable editor area */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 flex flex-col gap-6">

          <RichEditor value={body} onChange={setBody} />

          {/* Bottom action bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pb-8">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {saving ? 'Saving…' : 'Save & Submit'}
            </button>

            <button
              onClick={togglePublish}
              disabled={toggling}
              className={`rounded-lg border px-6 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors ${
                published
                  ? 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30'
                  : 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30'
              }`}
            >
              {toggling ? '…' : published ? 'Make Private' : 'Make Public'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

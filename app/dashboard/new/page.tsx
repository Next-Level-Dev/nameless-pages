'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface CanCreateState {
  loading: boolean
  canCreate: boolean
  reason: string
}

export default function NewPostPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [canCreateState, setCanCreateState] = useState<CanCreateState>({
    loading: true,
    canCreate: false,
    reason: '',
  })

  // Check limits on mount
  useEffect(() => {
    fetch('/api/content')
      .then((r) => r.json())
      .then((data) => {
        const total: number = data.total ?? 0
        const cap: number = data.cap ?? 5
        const items: Array<{ created_at: string }> = data.items ?? []
        const latest = items[0]
        const recentlyCreated = latest
          ? Date.now() - new Date(latest.created_at).getTime() < 24 * 3600 * 1000
          : false

        if (total >= cap) {
          setCanCreateState({ loading: false, canCreate: false, reason: `You've reached the maximum of ${cap} pieces of content.` })
        } else if (recentlyCreated) {
          const msSince = Date.now() - new Date(latest.created_at).getTime()
          const hoursLeft = ((24 * 3600 * 1000 - msSince) / 3600000).toFixed(1)
          setCanCreateState({ loading: false, canCreate: false, reason: `You can only create one piece every 24 hours. Try again in ${hoursLeft}h.` })
        } else {
          setCanCreateState({ loading: false, canCreate: true, reason: '' })
        }
      })
      .catch(() => setCanCreateState({ loading: false, canCreate: true, reason: '' }))
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        excerpt: form.get('excerpt'),
        content_type: form.get('content_type') || 'text',
      }),
    })

    setSubmitting(false)
    if (res.ok) {
      const data = await res.json()
      // Go straight to editor
      router.push(`/dashboard/${data.id}/edit`)
    } else {
      const data = await res.json()
      setError(data.errors?.[0] || 'Failed to create post')
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-2xl px-4 py-5 sm:py-8 flex items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Page</h1>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 min-h-0 overflow-y-auto flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-2xl">

          {canCreateState.loading ? (
            <div className="text-center text-zinc-500 py-16">Checking limits…</div>
          ) : !canCreateState.canCreate ? (
            /* Blocked — centered notice */
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="text-4xl">🔒</div>
              <h2 className="text-xl font-semibold">Can&apos;t create right now</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs">
                {canCreateState.reason}
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-2 rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="title" className="block text-sm font-medium">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  autoFocus
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label htmlFor="content_type" className="block text-sm font-medium">
                  Type
                </label>
                <select
                  id="content_type"
                  name="content_type"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="text">Writing</option>
                  <option value="art">Art</option>
                  <option value="music">Music</option>
                  <option value="code">Code</option>
                </select>
              </div>

              <div>
                <label htmlFor="excerpt" className="block text-sm font-medium">
                  Excerpt{' '}
                  <span className="text-zinc-400 font-normal">(short description, optional)</span>
                </label>
                <input
                  id="excerpt"
                  name="excerpt"
                  type="text"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <p className="text-xs text-zinc-500">
                This will be saved as a <strong>draft</strong>. You can write the body and publish it from the editor.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pb-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {submitting ? 'Creating…' : 'Create & Open Editor'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="w-full sm:w-auto rounded-lg border border-zinc-300 px-6 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

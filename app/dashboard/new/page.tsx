'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPostPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        body: form.get('body'),
        excerpt: form.get('excerpt'),
        content_type: form.get('content_type') || 'text',
        published: form.get('published') === 'on',
      }),
    })

    setLoading(false)
    if (res.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.errors?.[0] || 'Failed to create post')
    }
  }

  return (
    <div className="flex-1">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-3xl font-bold tracking-tight">New Post</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="title" className="block text-sm font-medium">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
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
              Excerpt (short description)
            </label>
            <input
              id="excerpt"
              name="excerpt"
              type="text"
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="body" className="block text-sm font-medium">
              Body
            </label>
            <textarea
              id="body"
              name="body"
              required
              rows={12}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked
              className="rounded border-zinc-300 dark:border-zinc-700"
            />
            Publish immediately
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? 'Saving...' : 'Publish'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-lg border border-zinc-300 px-6 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

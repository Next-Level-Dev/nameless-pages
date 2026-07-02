'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  id: number
  published: boolean
}

export default function DashboardActions({ id, published }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function togglePublished() {
    const action = published ? 'make private' : 'make public'
    const confirmed = window.confirm(
      published
        ? 'Make this page private? It will no longer be visible to others.'
        : 'Make this page public? It will be visible to everyone on the site.'
    )
    if (!confirmed) return

    setBusy(true)
    await fetch(`/api/content/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !published }),
    })
    setBusy(false)
    router.refresh()
    void action
  }

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <Link
        href={`/dashboard/${id}/edit`}
        className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Edit
      </Link>
      <button
        onClick={togglePublished}
        disabled={busy}
        className={`rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50 transition-colors ${
          published
            ? 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30'
            : 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30'
        }`}
      >
        {busy ? '…' : published ? 'Make Private' : 'Make Public'}
      </button>
    </div>
  )
}

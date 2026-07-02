'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  remainingToday: number
}

export default function GenerateInvitePanel({ remainingToday: initialRemaining }: Props) {
  const router = useRouter()
  const [remaining, setRemaining] = useState(initialRemaining)

  // Sync with prop when it changes (after page refresh)
  useEffect(() => {
    setRemaining(initialRemaining)
  }, [initialRemaining])
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<{ code: string; expires_at: string } | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    setGenerated(null)
    setCopied(false)

    const res = await fetch('/api/invites/generate', { method: 'POST' })
    const data = await res.json()

    setGenerating(false)

    if (res.ok) {
      setGenerated({ code: data.code, expires_at: data.expires_at })
      setRemaining(data.remaining_today)
      // Refresh to update server-side count
      router.refresh()
    } else {
      setError(data.error || 'Failed to generate code.')
    }
  }

  async function handleCopy() {
    if (!generated) return
    await navigator.clipboard.writeText(generated.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold">Generate Invite Code</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            {remaining} of 5 remaining today · codes expire in 3 days
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || remaining <= 0}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {generating ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      )}

      {generated && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-3">
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-2">
            Share this code — it expires{' '}
            {new Date(generated.expires_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 text-xs font-mono break-all select-all">
              {generated.code}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-md border border-emerald-300 dark:border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

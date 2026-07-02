'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function RedeemInvitePanel() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    const res = await fetch('/api/invites/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    })

    const data = await res.json()

    if (res.ok) {
      setStatus('success')
      setMessage('Welcome to the Fellowship! You are now an author.')
      // Refresh to re-render the server component with the new role
      router.refresh()
    } else {
      setStatus('error')
      setMessage(data.error || 'Something went wrong.')
    }
  }

  return (
    <div className="mx-auto max-w-md py-12 px-4">
      <h2 className="text-xl font-bold mb-2">Become an Author</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Enter an invite code from a trusted author to unlock the ability to publish your own pages.
      </p>

      {status === 'success' ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {status === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              {message}
            </div>
          )}
          <div>
            <label htmlFor="invite-code" className="block text-sm font-medium mb-1">
              Invite Code
            </label>
            <input
              id="invite-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="e.g. a3f8c1d2e4b5..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading' || !code.trim()}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {status === 'loading' ? 'Checking…' : 'Redeem Code'}
          </button>
        </form>
      )}
    </div>
  )
}

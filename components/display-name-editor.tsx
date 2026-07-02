'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  displayName: string
  username: string
}

export default function DisplayNameEditor({ displayName, username }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  async function handleSave() {
    const trimmed = value.trim()
    if (trimmed.length < 3 || trimmed.length > 15) {
      setError('Must be 3–15 characters')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: trimmed }),
    })
    setSaving(false)
    if (res.ok) {
      setEditing(false)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.errors?.[0] ?? 'Update failed')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setEditing(false); setValue(displayName); setError('') }
  }

  return (
    <div>
      {editing ? (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={15}
              className="rounded-md border border-blue-400 px-2 py-1 text-2xl sm:text-3xl font-bold text-blue-500 bg-transparent focus:outline-none w-full max-w-[14rem] sm:max-w-[18rem]"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? '…' : 'Update'}
              </button>
              <button
                onClick={() => { setEditing(false); setValue(displayName); setError('') }}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-xs text-zinc-400">3–15 characters</p>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-blue-500">
            {displayName}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="rounded border border-zinc-300 dark:border-zinc-600 px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Change
          </button>
        </div>
      )}
      <p className="mt-0.5 text-sm text-zinc-400">@{username}</p>
    </div>
  )
}

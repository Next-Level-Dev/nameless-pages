'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
    >
      Logout
    </button>
  )
}

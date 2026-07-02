'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  contentId: number
  initialScore: number
  initialUserVote: 1 | -1 | null
  initialFavorited: boolean
  isLoggedIn: boolean
}

export default function VoteButtons({
  contentId,
  initialScore,
  initialUserVote,
  initialFavorited,
  isLoggedIn,
}: Props) {
  const router = useRouter()
  const [score, setScore] = useState(initialScore)
  const [userVote, setUserVote] = useState<1 | -1 | null>(initialUserVote)
  const [favorited, setFavorited] = useState(initialFavorited)
  const [busy, setBusy] = useState(false)

  async function handleVote(vote: 1 | -1) {
    if (!isLoggedIn || busy) return
    setBusy(true)

    const prev = userVote
    const prevScore = score
    if (userVote === vote) {
      setUserVote(null)
      setScore(score - vote)
    } else {
      const scoreDelta = vote - (userVote ?? 0)
      setUserVote(vote)
      setScore(score + scoreDelta)
    }

    try {
      const res = await fetch(`/api/votes/${contentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      })
      if (res.ok) {
        const data = await res.json()
        setScore(data.score)
        setUserVote(data.userVote)
        router.refresh()
      } else {
        setUserVote(prev)
        setScore(prevScore)
      }
    } catch {
      setUserVote(prev)
      setScore(prevScore)
    } finally {
      setBusy(false)
    }
  }

  async function handleFavorite() {
    if (!isLoggedIn || busy) return
    setBusy(true)

    const prev = favorited
    setFavorited(!favorited)

    try {
      const res = await fetch(`/api/favorites/${contentId}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setFavorited(data.favorited)
        router.refresh()
      } else {
        setFavorited(prev)
      }
    } catch {
      setFavorited(prev)
    } finally {
      setBusy(false)
    }
  }

  const baseBtn = 'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[40px]'
  const disabledClass = !isLoggedIn ? 'opacity-30 cursor-not-allowed grayscale' : ''
  const inactiveBtn = 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      title={!isLoggedIn ? 'Sign in to vote or favorite' : undefined}
    >
      {/* Upvote */}
      <button
        onClick={() => handleVote(1)}
        disabled={!isLoggedIn || busy}
        aria-label="Upvote"
        className={`${baseBtn} ${disabledClass} ${
          isLoggedIn && userVote === 1
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
            : inactiveBtn
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
          <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
        </svg>
        <span>Up</span>
      </button>

      {/* Score */}
      <span className={`min-w-[2rem] text-center text-sm font-semibold tabular-nums ${
        score > 0 ? 'text-emerald-600 dark:text-emerald-400'
        : score < 0 ? 'text-red-500 dark:text-red-400'
        : 'text-zinc-500'
      }`}>
        {score > 0 ? `+${score}` : score}
      </span>

      {/* Downvote */}
      <button
        onClick={() => handleVote(-1)}
        disabled={!isLoggedIn || busy}
        aria-label="Downvote"
        className={`${baseBtn} ${disabledClass} ${
          isLoggedIn && userVote === -1
            ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
            : inactiveBtn
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
          <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
        </svg>
        <span>Down</span>
      </button>

      {/* Divider — hidden when wrapping to avoid orphaned separator */}
      <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700 select-none" aria-hidden>|</span>

      {/* Favorite */}
      <button
        onClick={handleFavorite}
        disabled={!isLoggedIn || busy}
        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        className={`${baseBtn} ${disabledClass} ${
          isLoggedIn && favorited
            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
            : inactiveBtn
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill={isLoggedIn && favorited ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={isLoggedIn && favorited ? 0 : 1.5}
          className="w-4 h-4 shrink-0"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span>{isLoggedIn && favorited ? 'Favorited' : 'Favorite'}</span>
      </button>
    </div>
  )
}

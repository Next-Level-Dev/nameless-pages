'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [changingEmail, setChangingEmail] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current email
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.email) {
          setEmail(data.email)
        }
        if (data.verified) {
          router.push('/dashboard')
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    // Check URL params
    const params = new URLSearchParams(window.location.search)
    if (params.get('verified') === 'success') {
      router.push('/dashboard')
    } else if (params.get('verified') === 'error') {
      setMessage(params.get('message') || 'Verification failed')
    }
  }, [router])

  const handleSendLink = async () => {
    setSending(true)
    setMessage('')
    
    try {
      const res = await fetch('/api/auth/verify-email/send', { method: 'POST' })
      const data = await res.json()
      
      if (res.ok) {
        setMessage(`Verification email sent! ${data.remaining !== undefined ? `${data.remaining} left this hour.` : ''}`)
      } else {
        setMessage(data.errors?.[0] || 'Failed to send email')
      }
    } catch {
      setMessage('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const handleChangeEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSending(true)
    setMessage('')

    const formData = new FormData(e.currentTarget)
    const newEmail = formData.get('email') as string

    try {
      const res = await fetch('/api/auth/verify-email/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })
      const data = await res.json()

      if (res.ok) {
        setEmail(newEmail)
        setChangingEmail(false)
        setMessage('Email updated! Verification email sent to new address.')
        // Auto-send verification to new email
        handleSendLink()
      } else {
        setMessage(data.errors?.[0] || 'Failed to update email')
      }
    } catch {
      setMessage('Failed to update email')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-6 dark:bg-amber-900/20 dark:border-amber-800">
          <h1 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-4">
            Verify your email
          </h1>
          
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
            You need to verify your email to access the dashboard, vote, and favorite.
          </p>

          {message && (
            <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${
              message.includes('sent') || message.includes('updated') || message.includes('success')
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {message}
            </div>
          )}

          {!changingEmail ? (
            <>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                A magic link was sent to: <strong>{email}</strong>
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleSendLink}
                  disabled={sending}
                  className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Resend magic link'}
                </button>
                <button
                  onClick={() => setChangingEmail(true)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
                >
                  Change email
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium text-amber-800 dark:text-amber-200">
                  New email address
                </label>
                <input
                  id="newEmail"
                  name="email"
                  type="email"
                  required
                  defaultValue={email}
                  className="mt-1 block w-full rounded-lg border border-amber-300 px-3 py-2 text-sm dark:border-amber-700 dark:bg-amber-900/30"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {sending ? 'Updating...' : 'Update & send link'}
                </button>
                <button
                  type="button"
                  onClick={() => setChangingEmail(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
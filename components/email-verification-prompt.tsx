'use client'

import { useState, useEffect } from 'react'

interface Props {
  verified: boolean
}

export default function EmailVerificationPrompt({ verified: initialVerified }: Props) {
  const [verified, setVerified] = useState(initialVerified)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check URL for verification result
    const params = new URLSearchParams(window.location.search)
    const verifiedParam = params.get('verified')
    const unverifiedParam = params.get('unverified')
    
    if (verifiedParam === 'success') {
      setVerified(true)
      setMessage('Email verified successfully!')
    } else if (verifiedParam === 'error') {
      setMessage(params.get('message') || 'Verification failed')
    } else if (unverifiedParam === 'true') {
      setMessage('Please verify your email to unlock all features.')
    }
  }, [])

  const handleSendLink = async () => {
    setSending(true)
    setMessage('')
    
    try {
      const res = await fetch('/api/auth/verify-email/send', {
        method: 'POST',
      })
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

  if (verified || dismissed) {
    return null
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-3">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 dark:bg-amber-900/20 dark:border-amber-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 text-xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Verify your email to unlock all features
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                A magic link has been sent to your email. Click it to verify your account.
              </p>
              {message && (
                <p className={`text-sm mt-2 ${message.includes('sent') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {message}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <button
              onClick={handleSendLink}
              disabled={sending}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending...' : 'Send me a magic link'}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
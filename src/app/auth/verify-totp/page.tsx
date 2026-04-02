'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Zap, Loader2 } from 'lucide-react'

function VerifyTotpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tempToken = searchParams.get('token') || ''

  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/verify-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken,
          totpCode,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Verification failed')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="w-full max-w-sm">
        <div className="animate-fade-in-up stagger-1 mb-8 text-center">
          <Link href="/landing" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">EmailFlow AI</span>
          </Link>
          <p className="mt-3 text-sm text-gray-500">Two-factor authentication</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="animate-scale-in stagger-2 space-y-4 rounded-xl border bg-white p-6 shadow-sm"
        >
          <div className="text-sm text-gray-600">
            Enter the 6-digit code from your authenticator app.
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Authenticator Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit code"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !tempToken}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 hover:shadow-md disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Verify
          </button>

          <Link
            href="/auth/signin"
            className="block text-center text-sm text-blue-600 hover:underline"
          >
            Back to login
          </Link>
        </form>
      </div>
    </div>
  )
}

export default function VerifyTotpPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <VerifyTotpContent />
    </Suspense>
  )
}
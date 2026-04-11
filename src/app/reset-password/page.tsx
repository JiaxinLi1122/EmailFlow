'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Zap, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle, CheckSquare, FolderOpen, Clock } from 'lucide-react'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) setError('Reset link is missing or invalid. Please request a new one.')
  }, [token])

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to reset password')
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left: brand panel ── */}
      <div className="relative hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col border-r bg-gray-50 p-12">
        <Link href="/landing" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-gray-900">EmailFlow AI</span>
        </Link>

        <div className="mt-auto">
          <h2 className="text-2xl font-bold leading-snug text-gray-900">
            Your inbox, turned into
            <br />a clear action list
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            AI reads your emails, extracts what needs doing, and keeps everything organised by project.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              { icon: CheckSquare, text: 'Tasks extracted from email threads' },
              { icon: FolderOpen, text: 'Emails grouped by project automatically' },
              { icon: Clock, text: 'Priorities and deadlines surfaced daily' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-gray-600">
                <Icon className="h-4 w-4 shrink-0 text-blue-600" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-12 text-xs text-gray-400">© {new Date().getFullYear()} EmailFlow AI</p>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Link href="/landing" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900">EmailFlow AI</span>
          </Link>
        </div>

        <div className="w-full max-w-[360px]">
          {success ? (
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Password updated</h1>
                <p className="mt-2 text-sm text-gray-500">
                  You can now sign in with your new password.
                </p>
              </div>
              <Link
                href="/auth/signin"
                className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Set a new password</h1>
                <p className="mt-1 text-sm text-gray-500">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">New password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      disabled={!token}
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <button type="button" onClick={() => setShowNew((p) => !p)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showNew ? 'Hide' : 'Show'}>
                      {showNew ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirm new password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      disabled={!token}
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <button type="button" onClick={() => setShowConfirm((p) => !p)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showConfirm ? 'Hide' : 'Show'}>
                      {showConfirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Reset password
                </button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-sm text-gray-500">
            <Link href="/auth/signin" className="text-blue-600 hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}

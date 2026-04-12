'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import { AuthShell } from '@/components/auth-shell'
import { InlineNotice } from '@/components/inline-notice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SignInPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Login failed')
        return
      }

      if (data.requiresTwoFactor) {
        router.push(`/auth/verify-totp?token=${encodeURIComponent(data.tempToken)}`)
        return
      }

      // Set user in cache immediately so DashboardLayout sees isAuthenticated=true
      // before the background refetch completes. Without this, the cache still
      // holds null from the post-logout refetch and the dashboard redirects away.
      queryClient.setQueryData(['auth-user'], data.data)
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your account to continue"
      footer={
        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-blue-600 hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {error && <InlineNotice variant="error">{error}</InlineNotice>}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            className="h-10 px-3"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <Link href="/auth/forgot-password" className="text-xs text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="h-10 px-3 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer select-none items-center gap-2.5">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Remember me for 30 days</span>
        </label>

        <Button type="submit" disabled={loading} className="h-10 w-full gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </AuthShell>
  )
}

'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/use-auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Mail, Shield, Trash2, LogOut, KeyRound, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/stats').then((r) => r.json()),
  })

  const { data: meRes } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => fetch('/api/auth/me').then((r) => r.json()),
  })

  const s = stats?.data?.sync
  const gmailConnected = !!s?.gmailConnected
  const currentUser = meRes?.user || meRes?.data || null
  const connectedGmail = currentUser?.gmailEmail || null

  const syncStartDate = currentUser?.syncStartDate

  let currentDays: number | null = null

  if (syncStartDate) {
    const diff = Date.now() - new Date(syncStartDate).getTime()
    currentDays = Math.round(diff / (1000 * 60 * 60 * 24))
  }

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || 'Disconnect failed')
      }

      return json
    },
    onSuccess: () => {
      toast.success('Gmail disconnected')
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Disconnect failed')
    },
  })

  const syncRangeMutation = useMutation({
    mutationFn: async (days: number) => {
      const res = await fetch('/api/settings/sync-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to update sync range')
      }

      return json
    },
    onSuccess: () => {
      toast.success('Sync range updated')
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['auth-me'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update sync range')
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      <PasswordCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email Connections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Gmail</p>
              <p className="text-xs text-gray-500">
                {gmailConnected
                  ? (connectedGmail || 'Connected Gmail')
                  : 'Not connected'}
              </p>
              <p className="text-xs text-gray-400">
                {s?.lastSyncAt
                  ? `Last synced: ${new Date(s.lastSyncAt).toLocaleString()}`
                  : gmailConnected
                    ? 'Connected'
                    : 'No sync yet'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={gmailConnected ? 'default' : 'outline'}>
                {gmailConnected ? 'Connected' : 'Not Connected'}
              </Badge>

              {gmailConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              ) : (
                <a href="/api/auth/google">
                  <Button size="sm">Connect Gmail</Button>
                </a>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Outlook</p>
              <p className="text-xs text-gray-500">Coming soon</p>
            </div>
            <Badge variant="outline">Not Connected</Badge>
          </div>

          <p className="text-[11px] text-gray-400">
            Connect your email accounts to sync and classify emails. You can connect multiple providers.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Sync Window</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">Choose how far back to sync emails</p>
            <p className="text-xs text-gray-500">
              Default is 15 days. Changing to an earlier date lets you backfill older emails on the next sync.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[7, 15, 30, 90].map((days) => (
              <Button
                key={days}
                type="button"
                variant={currentDays === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => syncRangeMutation.mutate(days)}
                disabled={syncRangeMutation.isPending}
              >
                {days} days
              </Button>
            ))}
          </div>

          <p className="text-[11px] text-gray-400">
            After updating this setting, click Sync to fetch emails from the new range.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Privacy &amp; Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>EmailFlow AI reads your emails with read-only access to create tasks.</p>
          <ul className="list-disc space-y-1 pl-4 text-xs">
            <li>We cannot send, delete, or modify your emails</li>
            <li>Email content is processed by AI (Claude/OpenAI) for classification</li>
            <li>We use zero-data-retention API tiers where available</li>
            <li>You can disconnect and delete all data at any time</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-600">
            <Trash2 className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">
            Disconnecting will revoke email access and stop syncing. Your existing tasks
            will remain until you delete your account.
          </p>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending || !gmailConnected}
          >
            {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect Gmail'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

/* ========== PASSWORD CARD ========== */
function PasswordCard() {
  type Mode = 'idle' | 'change' | 'reset-sent'
  const [mode, setMode] = useState<Mode>('idle')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function resetForm() {
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setShowCurrent(false); setShowNew(false)
    setError('')
    setMode('idle')
  }

  async function handleChangePassword(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw, confirmPassword: confirmPw }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to update password')
      } else {
        toast.success('Password updated')
        resetForm()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendReset() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/request-password-reset', { method: 'POST' })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to send reset email')
      } else {
        setMode('reset-sent')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" />
          Password
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mode === 'idle' && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Update your login password</p>
            <Button variant="outline" size="sm" onClick={() => setMode('change')}>
              Change password
            </Button>
          </div>
        )}

        {mode === 'reset-sent' && (
          <div className="flex items-center gap-3 rounded-lg bg-green-50 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-800">Reset link sent</p>
              <p className="text-xs text-green-600">Check your inbox and click the link to set a new password.</p>
            </div>
            <button onClick={resetForm} className="ml-auto text-xs text-green-600 hover:underline">Dismiss</button>
          </div>
        )}

        {mode === 'change' && (
          <form onSubmit={handleChangePassword} className="space-y-3">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            {/* Current password */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Current password</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  className="w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button type="button" onClick={() => setShowCurrent((p) => !p)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-700">
                  {showCurrent ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">New password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button type="button" onClick={() => setShowNew((p) => !p)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-700">
                  {showNew ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Confirm new password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                placeholder="Re-enter new password"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={resetForm}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </button>
            </div>

            {/* Send reset email instead */}
            <button type="button" onClick={handleSendReset} disabled={loading}
              className="w-full pt-1 text-center text-xs text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50">
              Or send a reset link to my email instead
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/use-auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InlineNotice } from '@/components/inline-notice'
import { PageHeader } from '@/components/page-header'
import {
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  RotateCcw,
  Shield,
  Unplug,
} from 'lucide-react'
import { toast } from 'sonner'

type CurrentUser = {
  email?: string | null
  gmailEmail?: string | null
  name?: string | null
  syncStartDate?: string | null
}

const SYNC_PRESETS = [7, 15, 30, 90]

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

  const currentUser: CurrentUser | null = meRes?.user || meRes?.data || null
  const syncData = stats?.data?.sync
  const gmailConnected = Boolean(syncData?.gmailConnected)
  const connectedGmail = currentUser?.gmailEmail || null

  const syncSummary = (() => {
    if (!currentUser?.syncStartDate) {
      return {
        days: 15,
        exactPreset: 15,
        label: 'Last 15 days',
        helper: 'Default sync window for new accounts.',
      }
    }

    const now = new Date()
    const startDate = new Date(currentUser.syncStartDate)
    const diffMs = Math.max(0, now.getTime() - startDate.getTime())
    const days = Math.max(1, Math.round(diffMs / 86400000))
    const exactPreset = SYNC_PRESETS.includes(days) ? days : null

    return {
      days,
      exactPreset,
      label: exactPreset ? `Last ${exactPreset} days` : `Custom range: ${days} days`,
      helper: `Sync starts from ${startDate.toLocaleDateString()}.`,
    }
  })()

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
      queryClient.invalidateQueries({ queryKey: ['auth-me'] })
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
      toast.success('Sync window updated')
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['auth-me'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update sync range')
    },
  })

  const isBusy = disconnectMutation.isPending || syncRangeMutation.isPending

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Settings"
        description="Manage your account, email connections, and how the pipeline syncs your inbox."
      />

      <Card className="border-white/80 bg-white/95 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900">{user?.name || 'Your account'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">
                Workspace account
              </Badge>
              {gmailConnected ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Gmail connected</Badge>
              ) : (
                <Badge variant="outline">Gmail not connected</Badge>
              )}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => logout()} className="gap-2 self-start sm:self-auto">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      <PasswordCard />

      <Card className="border-white/80 bg-white/95 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-blue-700" />
            Email Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-gray-200/80 bg-gray-50/70 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">Gmail</p>
                  <Badge
                    variant={gmailConnected ? 'default' : 'outline'}
                    className={gmailConnected ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                  >
                    {gmailConnected ? 'Connected' : 'Not connected'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {gmailConnected ? connectedGmail || 'Connected Gmail account' : 'Connect Gmail to start syncing mail.'}
                </p>
                <p className="text-xs text-gray-400">
                  {syncData?.lastSyncAt
                    ? `Last synced ${new Date(syncData.lastSyncAt).toLocaleString()}`
                    : gmailConnected
                      ? 'Connection is ready. Your next sync will use the current window below.'
                      : 'Read-only OAuth connection. We never send, delete, or edit your emails.'}
                </p>
              </div>

              {gmailConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={isBusy}
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Unplug className="h-3.5 w-3.5" />
                  )}
                  Disconnect Gmail
                </Button>
              ) : (
                <a href="/api/auth/google" className="self-start">
                  <Button size="sm" className="gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    Connect Gmail
                  </Button>
                </a>
              )}
            </div>
          </div>

          <InlineNotice variant="info">
            <p className="text-sm">
              Outlook and additional providers can be added later. For now, the settings flow is optimized for one Gmail connection.
            </p>
          </InlineNotice>
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/95 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock3 className="h-4 w-4 text-blue-700" />
            Email Sync Window
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-900">{syncSummary.label}</p>
                <p className="mt-1 text-sm text-blue-800/80">{syncSummary.helper}</p>
              </div>
              {syncSummary.exactPreset ? (
                <Badge className="bg-white text-blue-800 hover:bg-white">Preset active</Badge>
              ) : (
                <Badge variant="outline" className="border-blue-200 bg-white/80 text-blue-800">
                  Custom date in use
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">Choose how far back new syncs should look</p>
            <p className="text-xs text-gray-500">
              Changing this only affects future sync runs. Pick a wider window when you want to backfill older email.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {SYNC_PRESETS.map((days) => {
              const isActive = syncSummary.exactPreset === days

              return (
                <Button
                  key={days}
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => syncRangeMutation.mutate(days)}
                  disabled={isBusy}
                >
                  {syncRangeMutation.isPending && isActive ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {days} days
                </Button>
              )
            })}
          </div>

          <InlineNotice variant="warning">
            <p className="text-sm">
              After you change the sync window, run sync again to pull mail from the new range.
            </p>
          </InlineNotice>
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/95 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-blue-700" />
            Privacy and Data Handling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile
              icon={<Mail className="h-4 w-4 text-blue-700" />}
              title="Read-only access"
              body="EmailFlow AI reads email to classify threads and extract tasks. It cannot send or delete mail."
            />
            <InfoTile
              icon={<Lock className="h-4 w-4 text-blue-700" />}
              title="Processing"
              body="Email content is processed by AI providers for classification and summarization using the safeguards configured by the product."
            />
            <InfoTile
              icon={<RotateCcw className="h-4 w-4 text-blue-700" />}
              title="Disconnect anytime"
              body="Disconnecting Gmail stops future sync runs. Existing tasks and stored records remain until you clear account data."
            />
            <InfoTile
              icon={<Shield className="h-4 w-4 text-blue-700" />}
              title="Low-friction review"
              body="The settings flow is designed to make connection state, sync range, and password recovery easy to audit."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PasswordCard() {
  const [mode, setMode] = useState<'idle' | 'change'>('idle')
  const [resetSent, setResetSent] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [isChanging, setIsChanging] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)

  function resetForm() {
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    setShowCurrent(false)
    setShowNew(false)
    setShowConfirm(false)
    setError('')
    setMode('idle')
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setResetSent(false)

    if (newPw.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }

    if (newPw !== confirmPw) {
      setError('New password and confirmation do not match.')
      return
    }

    setIsChanging(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
          confirmPassword: confirmPw,
        }),
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
      setIsChanging(false)
    }
  }

  async function handleSendReset() {
    setError('')
    setIsSendingReset(true)
    try {
      const res = await fetch('/api/auth/request-password-reset', { method: 'POST' })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to send reset email')
      } else {
        setResetSent(true)
        toast.success('Reset link sent')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSendingReset(false)
    }
  }

  const busy = isChanging || isSendingReset

  return (
    <Card className="border-white/80 bg-white/95 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-blue-700" />
          Password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {resetSent && (
          <InlineNotice variant="success" className="items-center">
            <div className="flex flex-1 items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Reset link sent</p>
                <p className="text-xs">Check your inbox and use the link there if you prefer a full password reset.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setResetSent(false)}>
                Dismiss
              </Button>
            </div>
          </InlineNotice>
        )}

        {error && <InlineNotice variant="error">{error}</InlineNotice>}

        {mode === 'idle' ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-gray-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">Keep your login secure</p>
              <p className="text-sm text-gray-500">
                Change your password here or send yourself a reset link if you want to restart the flow from email.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleSendReset} disabled={busy} className="gap-2">
                {isSendingReset ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                Send reset link
              </Button>
              <Button size="sm" onClick={() => setMode('change')}>
                Change password
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4 rounded-2xl border border-gray-200/80 bg-gray-50/70 p-4">
            <PasswordField
              id="current-password"
              label="Current password"
              value={currentPw}
              onChange={setCurrentPw}
              visible={showCurrent}
              onToggleVisibility={() => setShowCurrent((prev) => !prev)}
            />

            <PasswordField
              id="new-password"
              label="New password"
              value={newPw}
              onChange={setNewPw}
              visible={showNew}
              onToggleVisibility={() => setShowNew((prev) => !prev)}
              placeholder="At least 8 characters"
            />

            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={confirmPw}
              onChange={setConfirmPw}
              visible={showConfirm}
              onToggleVisibility={() => setShowConfirm((prev) => !prev)}
              placeholder="Re-enter your new password"
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="flex-1" onClick={resetForm} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={busy}>
                {isChanging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save password
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSendReset}
              disabled={busy}
              className="w-full"
            >
              {isSendingReset ? 'Sending reset link...' : 'Or send a reset link instead'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggleVisibility,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggleVisibility: () => void
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          placeholder={placeholder}
          className="h-10 bg-white pr-10"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute inset-y-0 right-3 flex items-center text-gray-400 transition-colors hover:text-gray-700"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

function InfoTile({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200/80 bg-gray-50/70 p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
        {icon}
      </div>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-gray-600">{body}</p>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/use-auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { InlineNotice } from '@/components/inline-notice'
import { PageHeader } from '@/components/page-header'
import {
  CalendarIcon,
  Clock3,
  Globe,
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
import { CACHE_TIME } from '@/lib/query-cache'

type CurrentUser = {
  email?: string | null
  gmailEmail?: string | null
  name?: string | null
  syncStartDate?: string | null
  timezone?: string | null
}

const SYNC_PRESETS = [7, 15, 30] as const

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const [syncPickerOpen, setSyncPickerOpen] = useState(false)
  const [pendingDate, setPendingDate] = useState<Date | undefined>()
  const [todayMs] = useState(() => Date.now())
  const [timezoneInput, setTimezoneInput] = useState<string | null>(null)

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/stats').then((r) => r.json()),
    staleTime: CACHE_TIME.stats,
  })

  const { data: meRes } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => fetch('/api/auth/me').then((r) => r.json()),
    staleTime: CACHE_TIME.auth,
  })

  const currentUser: CurrentUser | null = meRes?.user || meRes?.data || null
  const syncData = stats?.data?.sync
  const gmailConnected = Boolean(syncData?.gmailConnected)
  const connectedGmail = currentUser?.gmailEmail || null
  const currentSyncStartDate = currentUser?.syncStartDate ? new Date(currentUser.syncStartDate) : null

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
    const exactPreset = SYNC_PRESETS.includes(days as (typeof SYNC_PRESETS)[number]) ? days : null

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
      toast.error(err.message || 'Failed to disconnect Gmail')
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
      toast.error(err.message || 'Failed to update sync window')
    },
  })

  const timezoneMutation = useMutation({
    mutationFn: async (timezone: string) => {
      const res = await fetch('/api/settings/timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to update timezone')
      return json
    },
    onSuccess: () => {
      toast.success('Timezone updated')
      setTimezoneInput(null)
      queryClient.invalidateQueries({ queryKey: ['auth-me'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update timezone')
    },
  })

  const isBusy = disconnectMutation.isPending || syncRangeMutation.isPending
  const pendingDays = pendingDate
    ? Math.max(1, Math.round((todayMs - pendingDate.getTime()) / 86400000))
    : null

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

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Change sync date</p>
              <p className="text-xs text-gray-500">Quick presets are fastest. Use a custom date when you want a one-off backfill.</p>
            </div>
            <Popover
              open={syncPickerOpen}
              onOpenChange={(open) => {
                setSyncPickerOpen(open)
                if (open) {
                  setPendingDate(currentSyncStartDate || undefined)
                } else {
                  setPendingDate(undefined)
                }
              }}
            >
              <PopoverTrigger className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-600 transition-all hover:border-blue-200 hover:bg-blue-50/70 hover:text-blue-700">
                <CalendarIcon className="h-3.5 w-3.5" />
                Pick date
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto overflow-hidden rounded-2xl border border-gray-200 p-0 shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">Choose a sync start date</p>
                  <p className="mt-1 text-xs text-gray-500">
                    The next sync will start from this date and pull newer email forward from there.
                  </p>
                </div>
                <Calendar
                  mode="single"
                  selected={pendingDate}
                  onSelect={setPendingDate}
                  captionLayout="dropdown"
                  disabled={(date) => date > new Date(todayMs) || date < new Date(todayMs - 365 * 86400000)}
                />
                <div className="border-t border-gray-100 bg-blue-50/40 px-4 py-3">
                  <p className="text-xs font-medium text-blue-900">
                    {pendingDate
                      ? `Selected start date: ${pendingDate.toLocaleDateString()}`
                      : 'Pick a start date to preview the next sync window.'}
                  </p>
                  <p className="mt-1 text-xs text-blue-800/80">
                    {pendingDays
                      ? `This is about the last ${pendingDays} day${pendingDays === 1 ? '' : 's'} of email.`
                      : 'You can choose any date from the last 12 months.'}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSyncPickerOpen(false)
                      setPendingDate(undefined)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={!pendingDate || syncRangeMutation.isPending}
                    onClick={() => {
                      if (!pendingDate) return
                      const days = Math.max(1, Math.round((todayMs - pendingDate.getTime()) / 86400000))
                      syncRangeMutation.mutate(days, {
                        onSettled: () => {
                          setSyncPickerOpen(false)
                          setPendingDate(undefined)
                        },
                      })
                    }}
                  >
                    {syncRangeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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
            <Globe className="h-4 w-4 text-blue-700" />
            Timezone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-gray-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-gray-900">Daily digest timezone</p>
              <p className="text-sm text-gray-500">
                Your digest generates at 20:00 in this timezone. Use an IANA name like{' '}
                <code className="rounded bg-gray-200 px-1 py-0.5 text-xs">Australia/Sydney</code> or{' '}
                <code className="rounded bg-gray-200 px-1 py-0.5 text-xs">Asia/Shanghai</code>.
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <input
                type="text"
                className="h-9 w-48 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                placeholder={currentUser?.timezone || 'UTC'}
                value={timezoneInput ?? ''}
                onChange={(e) => setTimezoneInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && timezoneInput?.trim()) {
                    timezoneMutation.mutate(timezoneInput.trim())
                  }
                }}
              />
              <Button
                size="sm"
                disabled={!timezoneInput?.trim() || timezoneMutation.isPending}
                onClick={() => timezoneInput?.trim() && timezoneMutation.mutate(timezoneInput.trim())}
              >
                {timezoneMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
          {currentUser?.timezone && (
            <p className="text-xs text-gray-400">
              Current timezone: <span className="font-medium text-gray-600">{currentUser.timezone}</span>
            </p>
          )}
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
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleChangePassword() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/request-password-reset', { method: 'POST' })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Failed to send reset email')
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-white/80 bg-white/95 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-blue-700" />
          Password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <InlineNotice variant="error">{error}</InlineNotice>}

        {sent ? (
          <InlineNotice variant="success" className="items-center">
            <div className="flex flex-1 items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Reset link sent</p>
                <p className="text-xs">Check your inbox and click the link to set a new password.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSent(false)}>
                Dismiss
              </Button>
            </div>
          </InlineNotice>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-gray-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-gray-900">Keep your login secure</p>
              <p className="text-sm text-gray-500">
                This flow sends a reset link to your email. Open that link to choose a new password.
              </p>
            </div>
            <Button size="sm" onClick={handleChangePassword} disabled={loading} className="self-end gap-2 sm:self-auto">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              Send reset link
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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

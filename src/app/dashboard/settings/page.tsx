'use client'

import { useAuth } from '@/lib/use-auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Mail, Shield, Trash2, LogOut } from 'lucide-react'
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
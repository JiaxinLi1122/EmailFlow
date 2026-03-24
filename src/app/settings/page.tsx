'use client'

import { useDemoSession } from '@/lib/use-demo-session'
import { signOut } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Mail, Shield, Trash2, LogOut } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { data: session, status } = useDemoSession()
  if (status === 'unauthenticated') redirect('/auth/signin')

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/stats').then((r) => r.json()),
  })

  const s = stats?.data?.sync

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{session?.user?.name}</p>
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gmail connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Gmail Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Status</p>
              <p className="text-xs text-gray-500">
                {s?.lastSyncAt
                  ? `Last synced: ${new Date(s.lastSyncAt).toLocaleString()}`
                  : 'Not yet synced'}
              </p>
            </div>
            <Badge variant={s?.gmailConnected ? 'default' : 'outline'}>
              {s?.gmailConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
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

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-600">
            <Trash2 className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">
            Disconnecting will revoke Gmail access and stop syncing. Your existing tasks
            will remain until you delete your account.
          </p>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => toast.info('Disconnect feature coming soon')}
          >
            Disconnect Gmail
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

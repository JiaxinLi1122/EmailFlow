'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Mail, CheckSquare, AlertTriangle, Clock, TrendingUp, PieChart, BarChart3, Target,
} from 'lucide-react'
import Link from 'next/link'
import { getPriorityBand, getPriorityColor, getPriorityLabel } from '@/types'

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/stats').then((r) => r.json()),
  })

  const { data: confirmedRes } = useQuery({
    queryKey: ['tasks', 'confirmed'],
    queryFn: () => fetch('/api/tasks?status=confirmed&sort=priority&limit=5').then((r) => r.json()),
  })

  const { data: pendingRes } = useQuery({
    queryKey: ['tasks', 'pending'],
    queryFn: () => fetch('/api/tasks?status=pending&sort=priority&limit=5').then((r) => r.json()),
  })

  const { data: allTasksRes } = useQuery({
    queryKey: ['tasks', 'all-for-kpi'],
    queryFn: () => fetch('/api/tasks?limit=50').then((r) => r.json()),
  })

  const { data: emailsRes } = useQuery({
    queryKey: ['emails', 'for-dashboard'],
    queryFn: () => fetch('/api/emails?limit=50').then((r) => r.json()),
  })

  const s = stats?.data
  const confirmedTasks = confirmedRes?.data || []
  const pendingTasks2 = pendingRes?.data || []
  const allTasks = allTasksRes?.data || []
  const allEmails: any[] = emailsRes?.data || []

  const totalTasks = s?.tasks?.total || 0
  const completedTasks = s?.tasks?.completed || 0
  const pendingTaskCount = s?.tasks?.pending || 0
  const confirmedTaskCount = allTasks.filter((t: any) => t.status === 'confirmed').length
  const dismissedTaskCount = allTasks.filter((t: any) => t.status === 'dismissed').length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const emailData = s?.emails || { total: 0, action: 0, awareness: 0, ignore: 0, uncertain: 0 }

  // Emails that need attention: action/uncertain without linked tasks
  const attentionEmails = allEmails.filter((e: any) =>
    (e.classification === 'action' || e.classification === 'uncertain') && !(e.taskLinks?.length > 0)
  ).slice(0, 5)

  const priorityCounts = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const t of allTasks) {
    const band = getPriorityBand(t.priorityScore || 0)
    priorityCounts[band as keyof typeof priorityCounts]++
  }

  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 86400000)
  const upcomingCount = allTasks.filter((t: any) => {
    const dl = t.userSetDeadline || t.explicitDeadline || t.inferredDeadline
    if (!dl) return false
    const d = new Date(dl)
    return d >= now && d <= weekFromNow && (t.status === 'pending' || t.status === 'confirmed')
  }).length

  const actionToTask = emailData.action > 0
    ? Math.round((totalTasks / emailData.action) * 100)
    : 0

  return (
    <div className="animate-in fade-in space-y-6 duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Your email-to-task command center</p>
        </div>

        {s?.sync?.gmailConnected ? (
          <span className="inline-flex items-center rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
            Connected
          </span>
        ) : (
          <a
            href="/api/auth/google"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Connect Gmail
          </a>
        )}
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Emails Processed"
          value={emailData.total}
          icon={<Mail className="h-4 w-4 text-blue-600" />}
          detail={`${emailData.action} action, ${emailData.awareness} FYI`}
        />
        <StatCard
          title="Active Tasks"
          value={confirmedTaskCount + pendingTaskCount}
          icon={<CheckSquare className="h-4 w-4 text-green-600" />}
          detail={`${completedTasks} completed of ${totalTasks}`}
        />
        <StatCard
          title="Due This Week"
          value={upcomingCount}
          icon={<Target className="h-4 w-4 text-orange-500" />}
          detail="Pending deadlines in 7 days"
        />
        <StatCard
          title="Last Synced"
          value={s?.sync?.lastSyncAt ? timeAgo(s.sync.lastSyncAt) : 'Never'}
          icon={<Clock className="h-4 w-4 text-gray-500" />}
          detail={s?.sync?.gmailConnected ? 'Gmail connected' : 'Not connected'}
        />
      </div>

      {/* KPI Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PieChart className="h-4 w-4 text-green-600" />
              Task Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <DonutChart
                value={completionRate}
                size={100}
                color={completionRate >= 70 ? '#22c55e' : completionRate >= 40 ? '#f59e0b' : '#ef4444'}
              />
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-gray-600">Completed: {completedTasks}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-gray-600">Confirmed: {confirmedTaskCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  <span className="text-gray-600">Pending: {pendingTaskCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                  <span className="text-gray-600">Dismissed: {dismissedTaskCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Email Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              <BarRow label="Action" value={emailData.action} max={emailData.total} color="bg-red-400" />
              <BarRow label="Awareness" value={emailData.awareness} max={emailData.total} color="bg-blue-400" />
              <BarRow label="Uncertain" value={emailData.uncertain} max={emailData.total} color="bg-yellow-400" />
              <BarRow label="Ignored" value={emailData.ignore} max={emailData.total} color="bg-gray-300" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              <BarRow label="Critical" value={priorityCounts.critical} max={allTasks.length || 1} color="bg-red-500" />
              <BarRow label="High" value={priorityCounts.high} max={allTasks.length || 1} color="bg-orange-400" />
              <BarRow label="Medium" value={priorityCounts.medium} max={allTasks.length || 1} color="bg-yellow-400" />
              <BarRow label="Low" value={priorityCounts.low} max={allTasks.length || 1} color="bg-gray-300" />
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
              <Target className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs text-blue-700">
                AI extraction rate: <strong>{actionToTask}%</strong> of action emails → tasks
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attention row — tasks needing review + emails needing attention, side by side */}
      {(pendingTasks2.length > 0 || attentionEmails.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Tasks pending review */}
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50/40 to-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100">
                    <CheckSquare className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  Tasks to Review
                  {pendingTasks2.length > 0 && (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">{pendingTasks2.length}</span>
                  )}
                </CardTitle>
                <Link href="/dashboard/tasks" className="text-xs text-purple-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent>
              {pendingTasks2.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">All tasks reviewed</p>
              ) : (
                <div className="space-y-1.5">
                  {pendingTasks2.map((task: any) => {
                    const band = getPriorityBand(task.priorityScore || 0)
                    return (
                      <Link
                        key={task.id}
                        href={`/dashboard/tasks/${task.id}`}
                        className="flex items-center gap-3 rounded-lg border border-purple-100 bg-white/80 px-3 py-2.5 transition-colors hover:bg-purple-50"
                      >
                        <div className={`h-7 w-1 shrink-0 rounded-full ${
                          band === 'critical' ? 'bg-red-500' : band === 'high' ? 'bg-orange-400' : band === 'medium' ? 'bg-yellow-400' : 'bg-gray-300'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
                          <p className="truncate text-xs text-gray-500">{task.summary}</p>
                        </div>
                        <Badge variant="outline" className={`shrink-0 text-[10px] ${getPriorityColor(band)}`}>
                          {getPriorityLabel(band)}
                        </Badge>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emails needing attention */}
          <Card className="border-red-200 bg-gradient-to-br from-red-50/40 to-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                    <Mail className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  Emails Need Attention
                  {attentionEmails.length > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">{attentionEmails.length}</span>
                  )}
                </CardTitle>
                <Link href="/dashboard/emails" className="text-xs text-red-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent>
              {attentionEmails.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">All caught up</p>
              ) : (
                <div className="space-y-1.5">
                  {attentionEmails.map((email: any) => (
                    <Link
                      key={email.id}
                      href={`/dashboard/emails/${email.id}`}
                      className="flex items-center gap-3 rounded-lg border border-red-100 bg-white/80 px-3 py-2.5 transition-colors hover:bg-red-50"
                    >
                      <div className={`h-7 w-1 shrink-0 rounded-full ${
                        email.classification === 'action' ? 'bg-red-500' : 'bg-yellow-400'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{email.subject}</p>
                        <p className="truncate text-xs text-gray-500">{email.sender?.split('<')[0]?.trim()}</p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-[10px] ${
                        email.classification === 'action' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {email.classification === 'action' ? 'Action' : 'Uncertain'}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmed tasks — top priority to work on */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Top Priority Tasks</CardTitle>
            <Link href="/dashboard/tasks" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
        </CardHeader>
        <CardContent>
          {confirmedTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No confirmed tasks yet. Review pending tasks or sync your email to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {confirmedTasks.map((task: any) => {
                const band = getPriorityBand(task.priorityScore || 0)
                return (
                  <Link
                    key={task.id}
                    href={`/dashboard/tasks/${task.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="truncate text-xs text-gray-500">{task.summary}</p>
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      {(task.explicitDeadline || task.inferredDeadline || task.userSetDeadline) && (
                        <span className="text-xs text-gray-400">
                          Due {new Date(task.userSetDeadline || task.explicitDeadline || task.inferredDeadline).toLocaleDateString()}
                        </span>
                      )}
                      <Badge variant="outline" className={getPriorityColor(band)}>
                        {getPriorityLabel(band)}
                      </Badge>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DonutChart({ value, size, color }: { value: number; size: number; color: string }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const filled = (value / 100) * circ
  const half = size / 2
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={half} cy={half} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
      <circle cx={half} cy={half} r={r} fill="none" stroke={color} strokeWidth={10} strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${half} ${half})`} className="transition-all duration-700" />
      <text x={half} y={half} textAnchor="middle" dominantBaseline="central" className="text-lg font-bold" fill="#1f2937">{value}%</text>
    </svg>
  )
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-gray-600">{label}</span>
      <div className="flex-1 h-5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-gray-700">{value}</span>
    </div>
  )
}

function StatCard({ title, value, icon, detail }: { title: string; value: string | number; icon: React.ReactNode; detail: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {icon}
        </div>
        <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        <p className="mt-1 text-xs text-gray-400">{detail}</p>
      </CardContent>
    </Card>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDemoSession } from '@/lib/use-demo-session'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  RefreshCw, Calendar, TrendingUp, CheckCircle2, AlertTriangle,
  Eye, Mail, Clock, ChevronDown, ChevronRight, BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import { useState } from 'react'

type Period = 'daily' | 'weekly'

export default function DigestPage() {
  const { status } = useDemoSession()
  if (status === 'unauthenticated') redirect('/auth/signin')

  const queryClient = useQueryClient()
  const [activePeriod, setActivePeriod] = useState<Period>('daily')

  const { data: res, isLoading } = useQuery({
    queryKey: ['digests'],
    queryFn: () => fetch('/api/digest?limit=20').then((r) => r.json()),
  })

  const generateDigest = useMutation({
    mutationFn: () => fetch('/api/digest', { method: 'POST' }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['digests'] })
        toast.success('Digest generated')
      } else {
        toast.error(data.error?.message || 'Failed to generate digest')
      }
    },
  })

  const allDigests: any[] = res?.data || []
  const digests = allDigests.filter((d: any) => d.period === activePeriod)
  const latestDigest = digests[0]

  return (
    <div className="animate-in fade-in space-y-6 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Digest</h1>
          <p className="text-sm text-gray-500">AI-powered summaries of your email activity</p>
        </div>
        <Button
          onClick={() => generateDigest.mutate()}
          disabled={generateDigest.isPending}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${generateDigest.isPending ? 'animate-spin' : ''}`} />
          Generate Digest
        </Button>
      </div>

      {/* Period tabs */}
      <div className="border-b">
        <div className="flex gap-0">
          {([
            { key: 'daily' as const, label: 'Daily', icon: Calendar },
            { key: 'weekly' as const, label: 'Weekly', icon: BarChart3 },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActivePeriod(key)}
              className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                activePeriod === key
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                activePeriod === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {allDigests.filter((d: any) => d.period === key).length}
              </span>
              {activePeriod === key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg border bg-gray-100" />
            ))}
          </div>
          <div className="h-48 animate-pulse rounded-lg border bg-gray-100" />
        </div>
      ) : digests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-500 mb-1">No {activePeriod} digests yet</p>
            <p className="text-sm text-gray-400">
              Click &quot;Generate Digest&quot; to create your first {activePeriod} summary.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Latest digest highlight */}
          {latestDigest && <DigestHighlight digest={latestDigest} />}

          {/* All digests */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1">
              {activePeriod === 'daily' ? 'Daily' : 'Weekly'} History
            </h2>
            {digests.map((digest: any) => (
              <DigestCard key={digest.id} digest={digest} isLatest={digest.id === latestDigest?.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ========== DIGEST HIGHLIGHT ========== */
function DigestHighlight({ digest }: { digest: any }) {
  const stats = parseStats(digest.stats)

  const cards = [
    {
      label: 'Action Items',
      value: stats.actionCount || 0,
      icon: CheckCircle2,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Awareness',
      value: stats.awarenessCount || 0,
      icon: Eye,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Needs Review',
      value: stats.unresolvedCount || 0,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Total Processed',
      value: (stats.actionCount || 0) + (stats.awarenessCount || 0) + (stats.unresolvedCount || 0) + (stats.ignoredCount || 0),
      icon: Mail,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
    },
  ]

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <TrendingUp className="h-4 w-4 text-blue-600" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Latest — {new Date(digest.periodStart).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">{card.label}</span>
                <div className={`rounded-lg p-1.5 ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Productivity insight */}
      {stats.actionCount > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
          <TrendingUp className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              {stats.actionCount >= 5 ? 'Busy day!' : stats.actionCount >= 3 ? 'Moderate workload' : 'Light day'} — {stats.actionCount} action item{stats.actionCount !== 1 ? 's' : ''} identified
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              {stats.unresolvedCount > 0
                ? `${stats.unresolvedCount} item${stats.unresolvedCount !== 1 ? 's' : ''} need${stats.unresolvedCount === 1 ? 's' : ''} your manual review`
                : 'All emails were confidently classified'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ========== DIGEST CARD ========== */
function DigestCard({ digest, isLatest }: { digest: any; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(isLatest)
  const stats = parseStats(digest.stats)

  const periodLabel = digest.period === 'daily' ? 'Daily' : 'Weekly'
  const dateLabel = new Date(digest.periodStart).toLocaleDateString('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Card className={isLatest ? 'ring-1 ring-blue-200' : ''}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        {expanded
          ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {periodLabel} Digest — {dateLabel}
            </span>
            {isLatest && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                Latest
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-red-400" />
            {stats.actionCount || 0}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3 text-blue-400" />
            {stats.awarenessCount || 0}
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-yellow-400" />
            {stats.unresolvedCount || 0}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(digest.createdAt)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-5 py-4">
          <div className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-h2:text-lg prose-h2:font-bold prose-h2:mt-4 prose-h2:mb-2 prose-h3:text-base prose-h3:font-semibold prose-h3:mt-3 prose-h3:mb-1 prose-strong:text-gray-900 prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1">
            <ReactMarkdown>{digest.content}</ReactMarkdown>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ========== HELPERS ========== */
function parseStats(raw: any): Record<string, number> {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw || {}
  } catch {
    return {}
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

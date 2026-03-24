'use client'

import { useQuery } from '@tanstack/react-query'
import { useDemoSession } from '@/lib/use-demo-session'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Paperclip, Mail, CheckSquare, AlertTriangle, Trash2, Eye,
  ChevronDown, ChevronRight, Search, SlidersHorizontal,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import Link from 'next/link'

const classColors: Record<string, string> = {
  action: 'bg-red-50 text-red-700 border-red-200',
  awareness: 'bg-blue-50 text-blue-700 border-blue-200',
  ignore: 'bg-gray-50 text-gray-500 border-gray-200',
  uncertain: 'bg-yellow-50 text-yellow-700 border-yellow-200',
}

const classIcons: Record<string, typeof Mail> = {
  action: CheckSquare,
  awareness: Eye,
  ignore: Trash2,
  uncertain: AlertTriangle,
}

type Tab = 'actionable' | 'informational' | 'all'

export default function EmailsPage() {
  const { status } = useDemoSession()
  if (status === 'unauthenticated') redirect('/auth/signin')

  const [tab, setTab] = useState<Tab>('actionable')
  const [classification, setClassification] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const { data: res, isLoading } = useQuery({
    queryKey: ['emails', page],
    queryFn: () =>
      fetch(`/api/emails?page=${page}&limit=50`).then((r) => r.json()),
  })

  const emails: any[] = res?.data || []
  const meta = res?.meta

  // Discover unique email accounts
  const accounts = useMemo(() => {
    const set = new Set<string>()
    for (const e of emails) {
      if (e.accountEmail) set.add(e.accountEmail)
    }
    return Array.from(set)
  }, [emails])

  // Client-side filtering: tab → classification → account → search
  const filtered = useMemo(() => {
    let result = emails

    // Tab filter: "actionable" = action + uncertain (task-linked or needing attention), "informational" = awareness + ignore
    if (tab === 'actionable') {
      result = result.filter((e: any) =>
        e.classification === 'action' || e.classification === 'uncertain' || e.taskLinks?.length > 0
      )
    } else if (tab === 'informational') {
      result = result.filter((e: any) =>
        (e.classification === 'awareness' || e.classification === 'ignore') && !(e.taskLinks?.length > 0)
      )
    }

    // Classification sub-filter
    if (classification !== 'all') {
      result = result.filter((e: any) => e.classification === classification)
    }

    // Account filter
    if (accountFilter !== 'all') {
      result = result.filter((e: any) => e.accountEmail === accountFilter)
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((e: any) =>
        e.subject?.toLowerCase().includes(q) ||
        e.sender?.toLowerCase().includes(q) ||
        e.bodyPreview?.toLowerCase().includes(q)
      )
    }

    return result
  }, [emails, tab, classification, accountFilter, searchQuery])

  // Group by task for focused tab
  const { taskGroups, standalone } = useMemo(() => {
    const taskMap: Record<string, { task: any; emails: any[] }> = {}
    const standalone: any[] = []

    for (const email of filtered) {
      const link = email.taskLinks?.[0]
      if (link?.task) {
        const tid = link.task.id
        if (!taskMap[tid]) taskMap[tid] = { task: link.task, emails: [] }
        taskMap[tid].emails.push(email)
      } else {
        standalone.push(email)
      }
    }

    const taskGroups = Object.values(taskMap).sort((a, b) => b.emails.length - a.emails.length)
    return { taskGroups, standalone }
  }, [filtered])

  // Counts for tab badges
  const actionableCount = emails.filter((e: any) =>
    e.classification === 'action' || e.classification === 'uncertain' || e.taskLinks?.length > 0
  ).length
  const infoCount = emails.filter((e: any) =>
    (e.classification === 'awareness' || e.classification === 'ignore') && !(e.taskLinks?.length > 0)
  ).length

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'actionable', label: 'Actionable', count: actionableCount },
    { key: 'informational', label: 'Informational', count: infoCount },
    { key: 'all', label: 'All Mail', count: emails.length },
  ]

  return (
    <div className="animate-in fade-in space-y-0 duration-200">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="text-sm text-gray-500">{meta?.totalCount || 0} emails across {accounts.length || 1} account{accounts.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Outlook-style top tabs */}
      <div className="border-b mb-4">
        <div className="flex items-center gap-0">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setClassification('all') }}
              className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                tab === key
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  tab === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </span>
              {tab === key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-400" />

          {/* Classification filter */}
          <Select value={classification} onValueChange={(v) => { if (v) setClassification(v) }}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="action">Action</SelectItem>
              <SelectItem value="awareness">Awareness</SelectItem>
              <SelectItem value="ignore">Ignored</SelectItem>
              <SelectItem value="uncertain">Uncertain</SelectItem>
            </SelectContent>
          </Select>

          {/* Account filter */}
          {accounts.length > 0 && (
            <Select value={accountFilter} onValueChange={(v) => { if (v) setAccountFilter(v) }}>
              <SelectTrigger className="w-[200px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts ({accounts.length})</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-400">
              {searchQuery ? 'No emails match your search.' : 'No emails in this view.'}
            </p>
          </CardContent>
        </Card>
      ) : tab === 'actionable' ? (
        <FocusedView taskGroups={taskGroups} standalone={standalone} accounts={accounts} />
      ) : tab === 'informational' ? (
        <OtherView emails={filtered} accounts={accounts} />
      ) : (
        <AllView emails={filtered} accounts={accounts} />
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</span>
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

/* ========== FOCUSED VIEW ========== */
function FocusedView({ taskGroups, standalone, accounts }: { taskGroups: { task: any; emails: any[] }[]; standalone: any[]; accounts: string[] }) {
  return (
    <div className="space-y-4">
      {/* Task-linked groups */}
      {taskGroups.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Task Related ({taskGroups.reduce((s, g) => s + g.emails.length, 0)})
            </span>
          </div>
          {taskGroups.map((group) => (
            <TaskEmailGroup key={group.task.id} task={group.task} emails={group.emails} showAccount />
          ))}
        </div>
      )}

      {/* Standalone action/uncertain emails */}
      {standalone.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Needs Attention ({standalone.length})
            </span>
          </div>
          {standalone.map((email: any) => (
            <EmailRow key={email.id} email={email} showAccount />
          ))}
        </div>
      )}

      {taskGroups.length === 0 && standalone.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare className="mx-auto mb-3 h-10 w-10 text-green-300" />
            <p className="text-gray-400">All caught up! No emails need your attention.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ========== OTHER VIEW ========== */
function OtherView({ emails, accounts }: { emails: any[]; accounts: string[] }) {
  // Sub-group: Awareness vs Ignored
  const awareness = emails.filter((e: any) => e.classification === 'awareness')
  const ignored = emails.filter((e: any) => e.classification === 'ignore')

  return (
    <div className="space-y-4">
      {awareness.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Eye className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              FYI / Awareness ({awareness.length})
            </span>
          </div>
          {awareness.map((email: any) => (
            <EmailRow key={email.id} email={email} showAccount />
          ))}
        </div>
      )}

      {ignored.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Trash2 className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Low Priority / Noise ({ignored.length})
            </span>
          </div>
          {ignored.map((email: any) => (
            <EmailRow key={email.id} email={email} showAccount compact />
          ))}
        </div>
      )}
    </div>
  )
}

/* ========== ALL VIEW ========== */
function AllView({ emails, accounts }: { emails: any[]; accounts: string[] }) {
  return (
    <div className="space-y-2">
      {emails.map((email: any) => (
        <EmailRow key={email.id} email={email} showAccount />
      ))}
    </div>
  )
}

/* ========== TASK EMAIL GROUP ========== */
function TaskEmailGroup({ task, emails, showAccount }: { task: any; emails: any[]; showAccount: boolean }) {
  const [expanded, setExpanded] = useState(true)

  const statusColor =
    task.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
    task.status === 'dismissed' ? 'bg-gray-100 text-gray-500 border-gray-200' :
    task.status === 'confirmed' ? 'bg-blue-100 text-blue-700 border-blue-200' :
    'bg-purple-100 text-purple-700 border-purple-200'

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-gray-900">{task.title}</span>
            <Badge variant="outline" className={statusColor}>{task.status}</Badge>
            <span className="text-xs text-gray-400">{emails.length} email{emails.length > 1 ? 's' : ''}</span>
          </div>
        </div>
        <Link
          href={`/tasks/${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
        >
          Open Task
        </Link>
      </button>

      {expanded && (
        <div className="border-t divide-y">
          {emails.map((email: any) => (
            <Link key={email.id} href={`/emails/${email.id}`} className="flex items-center gap-3 px-4 py-2.5 pl-10 hover:bg-blue-50/50 transition-colors">
              <ClassBadge classification={email.classification} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-800">{email.subject}</p>
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs text-gray-500">{email.sender?.split('<')[0]?.trim()}</p>
                  {showAccount && email.accountEmail && (
                    <AccountBadge account={email.accountEmail} />
                  )}
                </div>
              </div>
              {email.hasAttachments && <Paperclip className="h-3 w-3 text-gray-400 shrink-0" />}
              <span className="shrink-0 text-xs text-gray-400">{formatDate(email.receivedAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ========== EMAIL ROW ========== */
function EmailRow({ email, showAccount, compact }: { email: any; showAccount: boolean; compact?: boolean }) {
  const taskLink = email.taskLinks?.[0]?.task

  return (
    <Link
      href={`/emails/${email.id}`}
      className={`flex items-center gap-3 rounded-lg border bg-white px-4 transition-colors hover:bg-blue-50/50 hover:border-blue-200 ${
        compact ? 'py-2 opacity-75' : 'py-3'
      }`}
    >
      <ClassBadge classification={email.classification} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate font-medium text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>{email.subject}</p>
          {email.hasAttachments && <Paperclip className="h-3 w-3 flex-shrink-0 text-gray-400" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="truncate text-xs text-gray-500">{email.sender?.split('<')[0]?.trim()}</p>
          {showAccount && email.accountEmail && (
            <AccountBadge account={email.accountEmail} />
          )}
        </div>
      </div>
      {taskLink && (
        <span className="shrink-0">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
            ↗ {taskLink.title?.slice(0, 20)}{taskLink.title?.length > 20 ? '…' : ''}
          </Badge>
        </span>
      )}
      <span className="flex-shrink-0 text-xs text-gray-400">{formatDate(email.receivedAt)}</span>
    </Link>
  )
}

/* ========== SHARED COMPONENTS ========== */
function ClassBadge({ classification }: { classification: string }) {
  const Icon = classIcons[classification] || Mail
  return (
    <Badge variant="outline" className={`w-[84px] justify-center gap-1 text-[10px] ${classColors[classification || 'uncertain']}`}>
      <Icon className="h-3 w-3" />
      {classification || 'pending'}
    </Badge>
  )
}

function AccountBadge({ account }: { account: string }) {
  // Shorten: "demo@emailflow.ai" → "emailflow.ai", "demo.personal@gmail.com" → "gmail.com"
  const domain = account.split('@')[1] || account
  const isWork = !['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'].includes(domain)

  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium ${
      isWork ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
    }`}>
      <Mail className="h-2.5 w-2.5" />
      {domain}
    </span>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)

  if (days === 0) {
    return d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
  } else if (days === 1) {
    return 'Yesterday'
  } else if (days < 7) {
    return d.toLocaleDateString('en', { weekday: 'short' })
  }
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

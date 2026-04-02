'use client'

import { useQuery } from '@tanstack/react-query'
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
  Search, SlidersHorizontal, LinkIcon, CalendarIcon, X,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, differenceInDays } from 'date-fns'
import type { DateRange } from 'react-day-picker'

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
  const [tab, setTab] = useState<Tab>('actionable')
  const [classification, setClassification] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectingStep, setSelectingStep] = useState<'from' | 'to'>('from')
  const [page, setPage] = useState(1)

  const handleDayClick = (day: Date) => {
    if (selectingStep === 'from') {
      const newTo = dateRange?.to && dateRange.to >= day ? dateRange.to : undefined
      setDateRange({ from: day, to: newTo })
      setSelectingStep('to')
    } else {
      if (!dateRange?.from || day < dateRange.from) {
        setDateRange({ from: day, to: undefined })
        setSelectingStep('to')
      } else {
        setDateRange({ from: dateRange.from, to: day })
        // stay open — user clicks Done
      }
    }
  }

  const handleCalendarOpenChange = (open: boolean) => {
    setCalendarOpen(open)
  }

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

    if (tab === 'actionable') {
      result = result.filter((e: any) =>
        e.classification === 'action' || e.classification === 'uncertain' || e.taskLinks?.length > 0
      )
    } else if (tab === 'informational') {
      result = result.filter((e: any) =>
        (e.classification === 'awareness' || e.classification === 'ignore') && !(e.taskLinks?.length > 0)
      )
    }

    if (classification !== 'all') {
      result = result.filter((e: any) => e.classification === classification)
    }

    if (accountFilter !== 'all') {
      result = result.filter((e: any) => e.accountEmail === accountFilter)
    }

    // Date range filter
    if (dateRange?.from) {
      const from = new Date(dateRange.from)
      from.setHours(0, 0, 0, 0)
      result = result.filter((e: any) => new Date(e.receivedAt) >= from)
    }
    if (dateRange?.to) {
      const to = new Date(dateRange.to)
      to.setHours(23, 59, 59, 999)
      result = result.filter((e: any) => new Date(e.receivedAt) <= to)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((e: any) =>
        e.subject?.toLowerCase().includes(q) ||
        e.sender?.toLowerCase().includes(q) ||
        e.bodyPreview?.toLowerCase().includes(q)
      )
    }

    return result
  }, [emails, tab, classification, accountFilter, searchQuery, dateRange])

  // Split actionable into needs-attention vs has-tasks
  const { needsAttention, hasTaskEmails } = useMemo(() => {
    if (tab !== 'actionable') return { needsAttention: [], hasTaskEmails: [] }
    return {
      needsAttention: filtered.filter((e: any) => !(e.taskLinks?.length > 0)),
      hasTaskEmails: filtered.filter((e: any) => e.taskLinks?.length > 0),
    }
  }, [filtered, tab])

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

      {/* Tabs */}
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

          {/* Date range picker */}
          <div className="inline-flex items-center gap-1">
          <Popover open={calendarOpen} onOpenChange={handleCalendarOpenChange}>
            <PopoverTrigger
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-xs transition-all cursor-pointer ${
                dateRange?.from
                  ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateRange?.from ? (
                <span className="font-medium">
                  {format(dateRange.from, 'MMM d, yyyy')}
                  {dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime()
                    ? ` – ${format(dateRange.to, 'MMM d, yyyy')}`
                    : ''}
                </span>
              ) : (
                <span>Date filter</span>
              )}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectingStep('from')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all cursor-pointer ${
                      selectingStep === 'from'
                        ? 'bg-blue-100 text-blue-700 font-medium ring-1 ring-blue-300'
                        : dateRange?.from ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-[10px] text-gray-400 uppercase">From</span>
                    {dateRange?.from ? format(dateRange.from, 'MMM d') : '—'}
                  </button>
                  <span className="text-gray-300">→</span>
                  <button
                    onClick={() => setSelectingStep('to')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all cursor-pointer ${
                      selectingStep === 'to'
                        ? 'bg-blue-100 text-blue-700 font-medium ring-1 ring-blue-300'
                        : dateRange?.to ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-[10px] text-gray-400 uppercase">To</span>
                    {dateRange?.to ? format(dateRange.to, 'MMM d') : '—'}
                  </button>
                </div>
                {dateRange?.from && (
                  <button
                    onClick={() => { setDateRange(undefined); setSelectingStep('from') }}
                    className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
              <Calendar
                captionLayout="dropdown"
                modifiers={{
                  range_start: dateRange?.from,
                  range_end: dateRange?.to,
                  range_middle:
                    dateRange?.from && dateRange?.to &&
                    dateRange.from.getTime() !== dateRange.to.getTime()
                      ? { after: dateRange.from, before: dateRange.to }
                      : undefined,
                  selected:
                    dateRange?.from && !dateRange?.to
                      ? dateRange.from
                      : undefined,
                }}
                onDayClick={handleDayClick}
                numberOfMonths={2}
                disabled={{ after: new Date() }}
                startMonth={new Date(2024, 0)}
                endMonth={new Date()}
              />
              {dateRange?.from && (
                <div className="border-t px-3 py-2 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime() ? (
                      <span className="text-blue-600 font-medium">
                        {differenceInDays(dateRange.to, dateRange.from) + 1} days selected
                      </span>
                    ) : (
                      <span className="text-blue-600 font-medium">
                        {format(dateRange.from, 'EEEE, MMM d')}
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => setCalendarOpen(false)}
                    className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          {dateRange?.from && (
            <button
              onClick={() => { setDateRange(undefined); setSelectingStep('from') }}
              className="rounded-full p-1 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              title="Clear date filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          </div>

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
        <ActionableView needsAttention={needsAttention} hasTaskEmails={hasTaskEmails} />
      ) : tab === 'informational' ? (
        <InformationalView emails={filtered} />
      ) : (
        <FlatList emails={filtered} />
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

/* ========== ACTIONABLE VIEW — flat list, no task grouping ========== */
function ActionableView({ needsAttention, hasTaskEmails }: {
  needsAttention: any[]
  hasTaskEmails: any[]
}) {
  return (
    <div className="space-y-4">
      {needsAttention.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Needs Attention ({needsAttention.length})
            </span>
          </div>
          {needsAttention.map((email: any) => (
            <EmailRow key={email.id} email={email} />
          ))}
        </div>
      )}

      {hasTaskEmails.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <LinkIcon className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Linked to Tasks ({hasTaskEmails.length})
            </span>
          </div>
          {hasTaskEmails.map((email: any) => (
            <EmailRow key={email.id} email={email} />
          ))}
        </div>
      )}

      {needsAttention.length === 0 && hasTaskEmails.length === 0 && (
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

/* ========== INFORMATIONAL VIEW ========== */
function InformationalView({ emails }: { emails: any[] }) {
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
            <EmailRow key={email.id} email={email} />
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
            <EmailRow key={email.id} email={email} compact />
          ))}
        </div>
      )}
    </div>
  )
}

/* ========== FLAT LIST ========== */
function FlatList({ emails }: { emails: any[] }) {
  return (
    <div className="space-y-2">
      {emails.map((email: any) => (
        <EmailRow key={email.id} email={email} />
      ))}
    </div>
  )
}

/* ========== EMAIL ROW — shows linked tasks as badges ========== */
function EmailRow({ email, compact }: { email: any; compact?: boolean }) {
  const linkedTasks = email.taskLinks?.map((l: any) => l.task).filter(Boolean) || []

  return (
    <div className={`flex items-center gap-3 rounded-lg border bg-white px-4 transition-all hover:bg-blue-50/50 hover:border-blue-200 ${
      compact ? 'py-2 opacity-75' : 'py-3'
    }`}>
      <Link
        href={`/dashboard/emails/${email.id}`}
        className="flex items-center gap-3 min-w-0 flex-1"
      >
        <ClassBadge classification={email.classification} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`truncate font-medium text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>{email.subject}</p>
            {email.hasAttachments && <Paperclip className="h-3 w-3 flex-shrink-0 text-gray-400" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="truncate text-xs text-gray-500">{email.sender?.split('<')[0]?.trim()}</p>
            {email.accountEmail && <AccountBadge account={email.accountEmail} />}
          </div>
        </div>
        <span className="flex-shrink-0 text-xs text-gray-400">{formatDate(email.receivedAt)}</span>
      </Link>

      {/* Linked task badges */}
      {linkedTasks.length > 0 && (
        <div className="flex items-center gap-1.5 shrink-0">
          {linkedTasks.map((task: any) => (
            <Link
              key={task.id}
              href={`/dashboard/tasks/${task.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors max-w-[140px]"
              title={task.title}
            >
              <CheckSquare className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{task.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
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

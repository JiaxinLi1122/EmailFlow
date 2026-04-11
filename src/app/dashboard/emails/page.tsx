'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Paperclip, Mail, CheckSquare, AlertTriangle, Trash2, Eye,
  Search, CalendarIcon, X, ChevronDown, FolderOpen,
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
        // Auto-close once both dates are selected
        setCalendarOpen(false)
        setSelectingStep('from')
      }
    }
  }

  const handleCalendarOpenChange = (open: boolean) => {
    setCalendarOpen(open)
    // Always start in 'from' mode when opening
    if (open) setSelectingStep('from')
  }

  const { data: res, isLoading } = useQuery({
    queryKey: ['emails', page],
    queryFn: () =>
      fetch(`/api/emails?page=${page}&limit=50`).then((r) => r.json()),
  })

  const { data: mattersRes } = useQuery({
    queryKey: ['matters'],
    queryFn: () => fetch('/api/matters').then((r) => r.json()),
  })
  const matters: any[] = mattersRes?.data || []

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

  // (kept for rollback — no longer used directly in render)
  // const { needsAttention, hasTaskEmails } = useMemo(() => { ... }, [filtered, tab])

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
              {/* Header: from → to range display */}
              <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectingStep('from')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectingStep === 'from'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {dateRange?.from ? format(dateRange.from, 'MMM d, yyyy') : 'Start date'}
                  </button>
                  <span className="text-gray-300 text-sm">→</span>
                  <button
                    onClick={() => setSelectingStep('to')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectingStep === 'to'
                        ? 'bg-blue-600 text-white'
                        : dateRange?.to ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {dateRange?.to ? format(dateRange.to, 'MMM d, yyyy') : 'End date'}
                  </button>
                </div>
                {dateRange?.from && (
                  <button
                    onClick={() => { setDateRange(undefined); setSelectingStep('from') }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-3"
                  >
                    Clear
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
              {/* Footer: only shown when from is selected but to is not yet */}
              {dateRange?.from && !dateRange?.to && (
                <div className="border-t px-4 py-2 flex items-center justify-between bg-gray-50/60">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{format(dateRange.from, 'MMM d')}</span>
                    {' '}— now select an end date
                  </p>
                  <button
                    onClick={() => setCalendarOpen(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Cancel
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
          <div className="flex rounded-lg border bg-white p-0.5">
            {[
              { value: 'all', label: 'All' },
              { value: 'action', label: 'Action' },
              { value: 'awareness', label: 'Awareness' },
              { value: 'ignore', label: 'Ignored' },
              { value: 'uncertain', label: 'Uncertain' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setClassification(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  classification === opt.value
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {accounts.length > 1 && (
            <div className="flex rounded-lg border bg-white p-0.5">
              <button
                onClick={() => setAccountFilter('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  accountFilter === 'all' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All
              </button>
              {accounts.map((acc) => (
                <button
                  key={acc}
                  onClick={() => setAccountFilter(acc)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    accountFilter === acc ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {acc.split('@')[1] || acc}
                </button>
              ))}
            </div>
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
      ) : (
        <EmailMatterView emails={filtered} matters={matters} />
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

/* ========== MATTER-GROUPED EMAIL VIEW ========== */
const EMAIL_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  waiting_reply: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
}
const EMAIL_TOPIC_LABELS: Record<string, string> = {
  meeting: 'Meeting', invoice: 'Invoice', project_update: 'Project',
  support: 'Support', application: 'Application', approval: 'Approval',
  deadline: 'Deadline', other: 'Other',
}

function EmailMatterView({ emails, matters }: { emails: any[]; matters: any[] }) {
  // Build threadId → matter map
  const threadToMatter = useMemo(() => {
    const map = new Map<string, any>()
    for (const matter of matters) {
      for (const tid of matter.threadIds) {
        map.set(tid, matter)
      }
    }
    return map
  }, [matters])

  // Group emails by matter
  const { matterGroups, ungrouped } = useMemo(() => {
    const grouped = new Map<string, { matter: any; emails: any[] }>()
    const ungrouped: any[] = []
    for (const email of emails) {
      const matter = email.threadId ? threadToMatter.get(email.threadId) : null
      if (matter) {
        if (!grouped.has(matter.id)) grouped.set(matter.id, { matter, emails: [] })
        grouped.get(matter.id)!.emails.push(email)
      } else {
        ungrouped.push(email)
      }
    }
    const needsAttn = (emailList: any[]) =>
      emailList.filter(
        (e) => (e.classification === 'action' || e.classification === 'uncertain') && !(e.taskLinks?.length > 0)
      ).length

    const groups = Array.from(grouped.values()).sort((a, b) => {
      // Matters with attention emails come first
      const aAttn = needsAttn(a.emails)
      const bAttn = needsAttn(b.emails)
      if (bAttn !== aAttn) return bAttn - aAttn
      // Then by most recent activity
      const at = a.matter.lastMessageAt ? new Date(a.matter.lastMessageAt).getTime() : 0
      const bt = b.matter.lastMessageAt ? new Date(b.matter.lastMessageAt).getTime() : 0
      return bt - at
    })
    return { matterGroups: groups, ungrouped }
  }, [emails, threadToMatter])

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  if (emails.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Mail className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-400">No emails in this view.</p>
        </CardContent>
      </Card>
    )
  }

  const attentionCount = (emailList: any[]) =>
    emailList.filter(
      (e) => (e.classification === 'action' || e.classification === 'uncertain') && !(e.taskLinks?.length > 0)
    ).length

  return (
    <div className="space-y-3">
      {matterGroups.map(({ matter, emails: mEmails }) => {
        const attn = attentionCount(mEmails)
        const isOpen = !collapsed.has(matter.id)
        return (
          <div key={matter.id} className={`rounded-xl border bg-white overflow-hidden shadow-sm ${attn > 0 ? 'border-red-200' : ''}`}>
            <button
              onClick={() => toggle(matter.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-150 ${isOpen ? '' : '-rotate-90'}`} />
              <FolderOpen className={`h-4 w-4 shrink-0 ${attn > 0 ? 'text-red-400' : 'text-blue-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-900">{matter.title}</span>
                  {attn > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      {attn} need{attn === 1 ? 's' : ''} attention
                    </span>
                  )}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${EMAIL_STATUS_COLORS[matter.status] || 'bg-gray-100 text-gray-500'}`}>
                    {matter.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {EMAIL_TOPIC_LABELS[matter.topic] || matter.topic}
                  </span>
                </div>
                {matter.summary && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{matter.summary}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-gray-400 ml-2">
                {mEmails.length} email{mEmails.length !== 1 ? 's' : ''}
              </span>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pt-1 space-y-2 border-t bg-gray-50/40">
                {mEmails.map((email: any) => (
                  <EmailRow key={email.id} email={email} />
                ))}
              </div>
            )}
          </div>
        )
      })}
      {ungrouped.length > 0 && (() => {
        const attn = attentionCount(ungrouped)
        const isOpen = !collapsed.has('__ungrouped__')
        return (
          <div className={`rounded-xl border bg-white overflow-hidden shadow-sm ${attn > 0 ? 'border-red-200' : ''}`}>
            <button
              onClick={() => toggle('__ungrouped__')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-150 ${isOpen ? '' : '-rotate-90'}`} />
              <FolderOpen className="h-4 w-4 shrink-0 text-gray-300" />
              <span className="flex-1 font-semibold text-sm text-gray-500">Uncategorized</span>
              {attn > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  {attn} need{attn === 1 ? 's' : ''} attention
                </span>
              )}
              <span className="shrink-0 text-xs text-gray-400 ml-2">
                {ungrouped.length} email{ungrouped.length !== 1 ? 's' : ''}
              </span>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pt-1 space-y-2 border-t bg-gray-50/40">
                {ungrouped.map((email: any) => (
                  <EmailRow key={email.id} email={email} />
                ))}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}


/* ========== EMAIL ROW — shows linked tasks as badges ========== */
function EmailRow({ email, compact }: { email: any; compact?: boolean }) {
  const linkedTasks = email.taskLinks?.map((l: any) => l.task).filter(Boolean) || []
  const needsAttention =
    (email.classification === 'action' || email.classification === 'uncertain') &&
    linkedTasks.length === 0

  return (
    <div className={`flex items-center gap-3 rounded-lg border bg-white px-4 transition-all hover:bg-blue-50/50 hover:border-blue-200 ${
      compact ? 'py-2 opacity-75' : 'py-3'
    } ${needsAttention ? 'border-l-2 border-l-red-400' : ''}`}>
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

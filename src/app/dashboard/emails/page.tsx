'use client'

import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/page-header'
import { SegmentedControl } from '@/components/segmented-control'
import { StatePanel } from '@/components/state-panel'
import { ContextGroupHeader } from '@/components/context-group-header'
import {
  CheckSquare, Paperclip, Mail,
  Search, CalendarIcon, X,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { getEmailClassConfig } from '@/lib/email-classification'

type Tab = 'actionable' | 'informational' | 'all'
type EmailClassification = 'action' | 'awareness' | 'ignore' | 'uncertain'

type LinkedTask = {
  id: string
  title: string
}

type EmailTaskLink = {
  task?: LinkedTask | null
}

type EmailItem = {
  id: string
  subject?: string | null
  sender?: string | null
  bodyPreview?: string | null
  receivedAt: string
  classification?: EmailClassification | null
  taskLinks?: EmailTaskLink[]
  accountEmail?: string | null
  hasAttachments?: boolean | null
  threadId?: string | null
  project?: { id: string; name: string; identity: { id: string; name: string } | null } | null
  matter?: { id: string; title: string } | null
}

type QueryMeta = {
  totalCount?: number
  totalPages?: number
  page?: number
}

type QueryResponse<T> = {
  data?: T
  meta?: QueryMeta
}

const informationalPriority: Record<string, number> = {
  awareness: 0,
  ignore: 1,
}

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

  const emails = useMemo(() => (res?.data || []) as EmailItem[], [res?.data])
  const meta = (res as QueryResponse<EmailItem[]>)?.meta

  // Discover unique email accounts
  const accounts = useMemo(() => {
    const set = new Set<string>()
    for (const e of emails) {
      if (e.accountEmail) set.add(e.accountEmail)
    }
    return Array.from(set)
  }, [emails])

  // Client-side filtering: tab -> classification -> account -> search
  const filtered = useMemo(() => {
    let result = emails

    if (tab === 'actionable') {
      result = result.filter((e) =>
        e.classification === 'action' || e.classification === 'uncertain' || (e.taskLinks?.length ?? 0) > 0
      )
    } else if (tab === 'informational') {
      result = result.filter((e) =>
        (e.classification === 'awareness' || e.classification === 'ignore') && !((e.taskLinks?.length ?? 0) > 0)
      )
    }

    if (classification !== 'all') {
      result = result.filter((e) => e.classification === classification)
    }

    if (accountFilter !== 'all') {
      result = result.filter((e) => e.accountEmail === accountFilter)
    }

    // Date range filter
    if (dateRange?.from) {
      const from = new Date(dateRange.from)
      from.setHours(0, 0, 0, 0)
      result = result.filter((e) => new Date(e.receivedAt) >= from)
    }
    if (dateRange?.to) {
      const to = new Date(dateRange.to)
      to.setHours(23, 59, 59, 999)
      result = result.filter((e) => new Date(e.receivedAt) <= to)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((e) =>
        e.subject?.toLowerCase().includes(q) ||
        e.sender?.toLowerCase().includes(q) ||
        e.bodyPreview?.toLowerCase().includes(q)
      )
    }

    if (tab === 'informational') {
      result = [...result].sort((a, b) => {
        const rankDiff =
          (informationalPriority[a.classification ?? ''] ?? 99) -
          (informationalPriority[b.classification ?? ''] ?? 99)

        if (rankDiff !== 0) {
          return rankDiff
        }

        return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      })
    }

    return result
  }, [emails, tab, classification, accountFilter, searchQuery, dateRange])

  // Kept for rollback; no longer used directly in render.
  // const { needsAttention, hasTaskEmails } = useMemo(() => { ... }, [filtered, tab])

  // Counts for tab badges
  const actionableCount = emails.filter((e) =>
    e.classification === 'action' || e.classification === 'uncertain' || (e.taskLinks?.length ?? 0) > 0
  ).length
  const infoCount = emails.filter((e) =>
    (e.classification === 'awareness' || e.classification === 'ignore') && !((e.taskLinks?.length ?? 0) > 0)
  ).length

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'actionable', label: 'Actionable', count: actionableCount },
    { key: 'informational', label: 'Informational', count: infoCount },
    { key: 'all', label: 'All Mail', count: emails.length },
  ]

  return (
    <div className="animate-in fade-in space-y-5 duration-200">
      <PageHeader
        title="Inbox"
        description="Review incoming emails, grouped by matter and linked tasks."
        meta={`${meta?.totalCount || 0} emails across ${accounts.length || 1} account${accounts.length !== 1 ? 's' : ''}`}
      />

      {/* Tabs */}
      <div>
        <SegmentedControl
          value={tab}
          onChange={(nextTab) => {
            setTab(nextTab)
            setClassification('all')
          }}
          options={tabs.map(({ key, label, count }) => ({
            value: key,
            label,
            badge: (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                tab === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            ),
          }))}
        />
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-white/70 bg-white/90 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-gray-200 bg-white pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date range picker */}
            <div className="inline-flex items-center gap-1">
              <Popover open={calendarOpen} onOpenChange={handleCalendarOpenChange}>
                <PopoverTrigger
                  className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs transition-all ${
                    dateRange?.from
                      ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50/70 hover:text-blue-700'
                  }`}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateRange?.from ? (
                    <span className="font-medium">
                      {format(dateRange.from, 'MMM d, yyyy')}
                      {dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime()
                        ? ` - ${format(dateRange.to, 'MMM d, yyyy')}`
                        : ''}
                    </span>
                  ) : (
                    <span>Date filter</span>
                  )}
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-auto overflow-hidden rounded-2xl border border-gray-200 p-0 shadow-lg"
                >
                  {/* Header: active date range display */}
                  <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 pb-2 pt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectingStep('from')}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectingStep === 'from'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {dateRange?.from ? format(dateRange.from, 'MMM d, yyyy') : 'Start date'}
                      </button>
                      <span className="text-sm text-gray-300">to</span>
                      <button
                        onClick={() => setSelectingStep('to')}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectingStep === 'to'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : dateRange?.to
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {dateRange?.to ? format(dateRange.to, 'MMM d, yyyy') : 'End date'}
                      </button>
                    </div>
                    {dateRange?.from && (
                      <button
                        onClick={() => {
                          setDateRange(undefined)
                          setSelectingStep('from')
                        }}
                        className="ml-3 text-xs font-medium text-gray-400 transition-colors hover:text-red-500"
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
                    <div className="flex items-center justify-between border-t border-gray-100 bg-blue-50/40 px-4 py-2">
                      <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{format(dateRange.from, 'MMM d')}</span>
                        {' '}selected, now choose an end date
                      </p>
                      <button
                        onClick={() => setCalendarOpen(false)}
                        className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              {dateRange?.from && (
                <button
                  onClick={() => {
                    setDateRange(undefined)
                    setSelectingStep('from')
                  }}
                  className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  title="Clear date filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Classification filter */}
            <SegmentedControl
              value={classification}
              onChange={setClassification}
              options={[
                { value: 'all', label: 'All' },
                { value: 'action', label: 'Action' },
                { value: 'awareness', label: 'Awareness' },
                { value: 'ignore', label: 'Ignored' },
                { value: 'uncertain', label: 'Uncertain' },
              ]}
            />

            {accounts.length > 1 && (
              <SegmentedControl
                value={accountFilter}
                onChange={setAccountFilter}
                options={[
                  { value: 'all', label: 'All' },
                  ...accounts.map((acc) => ({
                    value: acc,
                    label: acc.split('@')[1] || acc,
                  })),
                ]}
              />
            )}

          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <StatePanel
          loading
          title="Loading emails"
          description="Gathering the latest messages and matter groupings."
        />
      ) : filtered.length === 0 ? (
        <StatePanel
          icon={<Mail className="h-5 w-5 text-gray-400" />}
          title={searchQuery ? 'No emails match your search' : 'No emails in this view'}
          description={searchQuery ? 'Try adjusting your keywords or filters.' : 'Change the current filters to see more mail.'}
        />
      ) : (
        <EmailMatterView emails={filtered} />
      )}

      {/* Pagination */}
      {meta && (meta.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (meta.totalPages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

/* ========== IDENTITY → PROJECT GROUPED EMAIL VIEW ========== */

type ProjectGroup = {
  identityKey: string
  identityName: string
  projectKey: string
  projectName: string
  items: EmailItem[]
}

function EmailMatterView({ emails }: { emails: EmailItem[] }) {
  const { projectGroups, ungrouped } = useMemo(() => {
    const ungrouped: EmailItem[] = []
    const projectMap = new Map<string, ProjectGroup>()

    for (const email of emails) {
      if (!email.project) {
        ungrouped.push(email)
        continue
      }

      const identityName = email.project.identity?.name || 'Unassigned Identity'
      const identityKey = email.project.identity?.id || '__identity_unassigned__'
      const projectName = email.project.name
      const projectKey = email.project.id
      const key = `${identityKey}::${projectKey}`

      if (!projectMap.has(key)) {
        projectMap.set(key, { identityKey, identityName, projectKey, projectName, items: [] })
      }
      projectMap.get(key)!.items.push(email)
    }

    const projectGroups = Array.from(projectMap.values()).sort((a, b) =>
      a.identityName !== b.identityName
        ? a.identityName.localeCompare(b.identityName)
        : a.projectName.localeCompare(b.projectName)
    )

    return { projectGroups, ungrouped }
  }, [emails])

  if (emails.length === 0) {
    return (
      <StatePanel
        icon={<Mail className="h-5 w-5 text-gray-400" />}
        title="No emails in this view"
        description="Change the current filters to see more mail."
      />
    )
  }

  const attentionCount = (emailList: EmailItem[]) =>
    emailList.filter(
      (e) => (e.classification === 'action' || e.classification === 'uncertain') && !((e.taskLinks?.length ?? 0) > 0)
    ).length

  return (
    <div className="space-y-3">
      {projectGroups.map((group) => (
        <div key={`${group.identityKey}-${group.projectKey}`} className="space-y-3">
          <ContextGroupHeader
            identityName={group.identityName}
            projectName={group.projectName}
            attentionCount={attentionCount(group.items)}
            detail={`${group.items.length} email${group.items.length !== 1 ? 's' : ''} in this project`}
          />
          <div className="space-y-2">
            {group.items.map((email) => (
              <EmailRow key={email.id} email={email} />
            ))}
          </div>
        </div>
      ))}
      {ungrouped.length > 0 && (
        <div className="space-y-3">
          <ContextGroupHeader
            identityName="Unassigned"
            projectName="Uncategorized"
            attentionCount={attentionCount(ungrouped)}
            detail={`${ungrouped.length} email${ungrouped.length !== 1 ? 's' : ''}`}
          />
          <div className="space-y-2">
            {ungrouped.map((email) => (
              <EmailRow key={email.id} email={email} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


/* ========== EMAIL ROW - shows linked tasks as badges ========== */
function EmailRow({ email, compact }: { email: EmailItem; compact?: boolean }) {
  const matter = email.matter ?? null
  const linkedTasks = email.taskLinks?.map((link) => link.task).filter((t): t is LinkedTask => t != null) || []
  const needsAttention =
    (email.classification === 'action' || email.classification === 'uncertain') &&
    linkedTasks.length === 0

  return (
    <div className={`flex items-center gap-3 rounded-xl border border-gray-200/80 bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm ${
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
            {matter ? (
              <>
                <span className="text-[10px] text-gray-300">•</span>
                <span className="truncate text-[11px] text-gray-400">{matter.title}</span>
              </>
            ) : null}
          </div>
        </div>
        <span className="flex-shrink-0 text-xs text-gray-400">{formatDate(email.receivedAt)}</span>
      </Link>

      {/* Linked task badges */}
      {linkedTasks.length > 0 && (
        <div className="flex items-center gap-1.5 shrink-0">
          {linkedTasks.map((task) => (
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
function ClassBadge({ classification }: { classification?: string | null }) {
  const cfg = getEmailClassConfig(classification)
  const Icon = cfg.icon
  return (
    <Badge variant="outline" className={`w-[84px] justify-center gap-1 text-[10px] ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label.split(' ')[0]}
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

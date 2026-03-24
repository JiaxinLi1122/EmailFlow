'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDemoSession } from '@/lib/use-demo-session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Check, X, Eye, Calendar, List, GanttChart, ChevronLeft, ChevronRight,
  Mail, Clock, ArrowUpRight,
} from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import { GanttTimeline } from '@/components/gantt-timeline'
import { getPriorityBand, getPriorityColor, getPriorityLabel } from '@/types'
import { toast } from 'sonner'

type ViewMode = 'list' | 'timeline' | 'calendar'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'dismissed', label: 'Dismissed' },
]

export default function TasksPage() {
  const { status } = useDemoSession()
  if (status === 'unauthenticated') redirect('/auth/signin')

  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('priority')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const queryClient = useQueryClient()

  // Fetch all tasks (no server-side status filter — we filter client-side for "all")
  const apiStatus = statusFilter === 'all' ? '' : statusFilter
  const { data: res, isLoading } = useQuery({
    queryKey: ['tasks', apiStatus, sortBy],
    queryFn: () =>
      fetch(`/api/tasks?status=${apiStatus}&sort=${sortBy}&limit=50`).then((r) => r.json()),
  })

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const tasks = res?.data || []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500">{res?.meta?.totalCount || 0} tasks</p>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-lg border bg-white p-0.5">
          {([
            { mode: 'list' as const, icon: List, label: 'List' },
            { mode: 'timeline' as const, icon: GanttChart, label: 'Timeline' },
            { mode: 'calendar' as const, icon: Calendar, label: 'Calendar' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar — pill toggles + sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                statusFilter === opt.value
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">By Priority</SelectItem>
            <SelectItem value="date">By Date</SelectItem>
            <SelectItem value="deadline">By Deadline</SelectItem>
            <SelectItem value="title">By Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border bg-gray-100" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">No tasks found with the selected filters.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <TaskListView tasks={tasks} updateTask={updateTask} />
      ) : viewMode === 'timeline' ? (
        <GanttTimeline tasks={tasks} updateTask={updateTask} />
      ) : (
        <TaskCalendarView tasks={tasks} updateTask={updateTask} />
      )}
    </div>
  )
}

/* ========== LIST VIEW ========== */
function TaskListView({ tasks, updateTask }: { tasks: any[]; updateTask: any }) {
  return (
    <div className="space-y-2">
      {tasks.map((task: any) => {
        const band = getPriorityBand(task.priorityScore || 0)
        const deadline = task.userSetDeadline || task.explicitDeadline || task.inferredDeadline
        const isOverdue = deadline && new Date(deadline) < new Date() && task.status === 'pending'
        const senderName = task.emailLinks?.[0]?.email?.sender?.split('<')[0]?.trim()

        return (
          <div
            key={task.id}
            className="group flex items-center gap-3 rounded-lg border bg-white px-4 py-3.5 transition-all hover:shadow-md hover:border-gray-300"
          >
            {/* Priority indicator */}
            <div className={`h-9 w-1 shrink-0 rounded-full ${
              band === 'critical' ? 'bg-red-500' : band === 'high' ? 'bg-orange-400' : band === 'medium' ? 'bg-yellow-400' : 'bg-gray-300'
            }`} />

            {/* Main content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/tasks/${task.id}`}
                  className="truncate text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                >
                  {task.title}
                </Link>
                <Badge variant="outline" className={`shrink-0 text-[10px] ${getPriorityColor(band)}`}>
                  {getPriorityLabel(band)}
                </Badge>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  task.status === 'completed' ? 'bg-green-100 text-green-700' :
                  task.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                  task.status === 'dismissed' ? 'bg-gray-100 text-gray-500' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {task.status}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-500">{task.summary}</p>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-400">
                {deadline && (
                  <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                    <Clock className="h-3 w-3" />
                    {isOverdue ? 'Overdue: ' : 'Due '}
                    {new Date(deadline).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                {senderName && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {senderName}
                  </span>
                )}
                <span>Score: {task.priorityScore}</span>
              </div>
            </div>

            {/* Quick actions — visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {task.status !== 'completed' && (
                <button
                  className="rounded-md p-1.5 text-green-600 hover:bg-green-50 transition-colors"
                  title="Complete"
                  onClick={() => { updateTask.mutate({ id: task.id, data: { status: 'completed' } }); toast.success('Task completed') }}
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
              {task.status !== 'dismissed' && (
                <button
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  title="Dismiss"
                  onClick={() => { updateTask.mutate({ id: task.id, data: { status: 'dismissed' } }); toast('Task dismissed') }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <Link
                href={`/tasks/${task.id}`}
                className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                title="Open"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ========== CALENDAR VIEW ========== */
function TaskCalendarView({ tasks, updateTask }: { tasks: any[]; updateTask: any }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = currentMonth.getDay()

  // Previous month overflow days
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const todayStr = new Date().toDateString()

  // Group ALL tasks by date (not just current month)
  const tasksByDate = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const task of tasks) {
      const raw = task.userSetDeadline || task.explicitDeadline || task.inferredDeadline
      if (!raw) continue
      const d = new Date(raw)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(task)
    }
    return map
  }, [tasks])

  const handleDrop = useCallback((dayDate: Date) => {
    return (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const taskId = e.dataTransfer.getData('text/plain')
      if (taskId) {
        const y = dayDate.getFullYear()
        const m = String(dayDate.getMonth() + 1).padStart(2, '0')
        const d = String(dayDate.getDate()).padStart(2, '0')
        const dateStr = `${y}-${m}-${d}`
        updateTask.mutate(
          { id: taskId, data: { userSetDeadline: dateStr } },
          { onSuccess: () => toast.success('Deadline updated') }
        )
      }
    }
  }, [updateTask])

  const handleClickDate = useCallback((dayDate: Date, taskId: string) => {
    const y = dayDate.getFullYear()
    const m = String(dayDate.getMonth() + 1).padStart(2, '0')
    const d = String(dayDate.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
    updateTask.mutate(
      { id: taskId, data: { userSetDeadline: dateStr } },
      { onSuccess: () => toast.success('Deadline updated') }
    )
  }, [updateTask])

  const monthLabel = currentMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })

  // Build calendar cells with overflow days
  type CellData = { day: number; date: Date; isCurrentMonth: boolean }
  const cells: CellData[] = []

  // Previous month overflow
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    cells.push({ day, date: new Date(year, month - 1, day), isCurrentMonth: false })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: new Date(year, month, d), isCurrentMonth: true })
  }
  // Next month overflow
  while (cells.length % 7 !== 0) {
    const day = cells.length - firstDayOfWeek - daysInMonth + 1
    cells.push({ day, date: new Date(year, month + 1, day), isCurrentMonth: false })
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900">{monthLabel}</h2>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b pb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-500">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`
            const dayTasks = tasksByDate[key] || []
            const isToday = cell.date.toDateString() === todayStr

            return (
              <div
                key={idx}
                className={`min-h-[100px] border-b border-r p-1 transition-colors ${
                  !cell.isCurrentMonth ? 'bg-gray-50/70' :
                  isToday ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                onDrop={handleDrop(cell.date)}
              >
                <div className={`mb-1 text-right text-xs ${
                  !cell.isCurrentMonth ? 'text-gray-300' :
                  isToday ? 'font-bold text-blue-700' : 'text-gray-400'
                }`}>
                  {cell.day}
                </div>
                <div className="space-y-1">
                  {dayTasks.map((task: any) => {
                    const band = getPriorityBand(task.priorityScore || 0)
                    const bgColor = band === 'critical' ? 'bg-red-100 border-red-300 text-red-800'
                      : band === 'high' ? 'bg-orange-100 border-orange-300 text-orange-800'
                      : band === 'medium' ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                      : 'bg-gray-100 border-gray-300 text-gray-700'
                    return (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        className={`block cursor-grab truncate rounded border px-1.5 py-0.5 text-[10px] font-medium leading-tight shadow-sm active:cursor-grabbing ${bgColor} ${
                          !cell.isCurrentMonth ? 'opacity-50' : ''
                        }`}
                        title={`${task.title} — drag to reschedule`}
                      >
                        {task.title}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-[10px] text-gray-400">
          Drag tasks between dates to reschedule. Click a task to open details.
        </p>
      </CardContent>
    </Card>
  )
}

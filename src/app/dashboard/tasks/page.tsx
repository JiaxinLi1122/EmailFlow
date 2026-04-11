'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import {
  Check, X, Calendar, List, GanttChart, ChevronLeft, ChevronRight,
  Mail, Clock, ThumbsUp, Plus, Circle, CheckCircle2, ChevronDown, FolderOpen,
} from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('priority')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskSummary, setTaskSummary] = useState('')
  const [creatingTask, setCreatingTask] = useState(false)
  const queryClient = useQueryClient()

  // Fetch all tasks (no server-side status filter — we filter client-side for "all")
  const apiStatus = statusFilter === 'all' ? '' : statusFilter
  const { data: res, isLoading } = useQuery({
    queryKey: ['tasks', apiStatus, sortBy],
    queryFn: () =>
      fetch(`/api/tasks?status=${apiStatus}&sort=${sortBy}&limit=50`).then((r) => r.json()),
  })

  // Fetch matters for project grouping
  const { data: mattersRes } = useQuery({
    queryKey: ['matters'],
    queryFn: () => fetch('/api/matters').then((r) => r.json()),
  })
  const matters: any[] = mattersRes?.data || []

  const handleModalOpenChange = (open: boolean) => {
    setShowCreateModal(open)
    if (!open) {
      setTaskTitle('')
      setTaskSummary('')
    }
  }

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      toast.error('Task title is required')
      return
    }

    setCreatingTask(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          summary: taskSummary,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        toast.success('Task created')
        setShowCreateModal(false)
        setTaskTitle('')
        setTaskSummary('')
        // Navigate to the new task
        router.push(`/dashboard/tasks/${data.data.id}`)
      } else {
        toast.error('Failed to create task')
      }
    } catch (err) {
      toast.error('Failed to create task')
    } finally {
      setCreatingTask(false)
    }
  }

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

        {/* Create button + View mode toggle */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>
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
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border bg-white p-0.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg border bg-white p-0.5">
          {[{ value: 'priority', label: 'Priority' }, { value: 'deadline', label: 'Deadline' }].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                sortBy === opt.value
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
        <TaskListView tasks={tasks} updateTask={updateTask} matters={matters} />
      ) : viewMode === 'timeline' ? (
        <GanttTimeline tasks={tasks} updateTask={updateTask} sortBy={sortBy} />
      ) : (
        <TaskCalendarView tasks={tasks} updateTask={updateTask} />
      )}

      {/* Create Task Modal */}
      <Dialog open={showCreateModal} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleCreateTask() }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
              <textarea
                value={taskSummary}
                onChange={(e) => setTaskSummary(e.target.value)}
                placeholder="Brief description (optional)"
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <DialogClose
              render={
                <button className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" />
              }
            >
              Cancel
            </DialogClose>
            <button
              onClick={handleCreateTask}
              disabled={creatingTask || !taskTitle.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {creatingTask ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ========== LIST VIEW — matter-grouped ========== */
function TaskListView({ tasks, updateTask, matters }: { tasks: any[]; updateTask: any; matters: any[] }) {
  // Build taskId → matter map
  const taskToMatter = useMemo(() => {
    const map = new Map<string, any>()
    for (const matter of matters) {
      for (const taskId of matter.taskIds) {
        map.set(taskId, matter)
      }
    }
    return map
  }, [matters])

  // Group tasks by matter; unmatched → ungrouped
  const { matterGroups, ungrouped } = useMemo(() => {
    const grouped = new Map<string, { matter: any; tasks: any[] }>()
    const ungrouped: any[] = []
    for (const task of tasks) {
      const matter = taskToMatter.get(task.id)
      if (matter) {
        if (!grouped.has(matter.id)) grouped.set(matter.id, { matter, tasks: [] })
        grouped.get(matter.id)!.tasks.push(task)
      } else {
        ungrouped.push(task)
      }
    }
    // Sort groups by most recent activity
    const groups = Array.from(grouped.values()).sort((a, b) => {
      const at = a.matter.lastMessageAt ? new Date(a.matter.lastMessageAt).getTime() : 0
      const bt = b.matter.lastMessageAt ? new Date(b.matter.lastMessageAt).getTime() : 0
      return bt - at
    })
    return { matterGroups: groups, ungrouped }
  }, [tasks, taskToMatter])

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">No tasks found with the selected filters.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {matterGroups.map(({ matter, tasks: mTasks }) => (
        <MatterSection
          key={matter.id}
          matter={matter}
          tasks={mTasks}
          updateTask={updateTask}
          collapsed={collapsed.has(matter.id)}
          onToggle={() => toggle(matter.id)}
        />
      ))}
      {ungrouped.length > 0 && (
        <MatterSection
          matter={null}
          tasks={ungrouped}
          updateTask={updateTask}
          collapsed={collapsed.has('__ungrouped__')}
          onToggle={() => toggle('__ungrouped__')}
        />
      )}
    </div>
  )
}

const TOPIC_LABELS: Record<string, string> = {
  meeting: 'Meeting', invoice: 'Invoice', project_update: 'Project',
  support: 'Support', application: 'Application', approval: 'Approval',
  deadline: 'Deadline', other: 'Other',
}
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  waiting_reply: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
}

function MatterSection({
  matter, tasks, updateTask, collapsed, onToggle,
}: {
  matter: any | null; tasks: any[]; updateTask: any; collapsed: boolean; onToggle: () => void
}) {
  return (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      {/* Section header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`} />
        <FolderOpen className={`h-4 w-4 shrink-0 ${matter ? 'text-blue-400' : 'text-gray-300'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">
              {matter ? matter.title : 'Uncategorized'}
            </span>
            {matter && (
              <>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[matter.status] || 'bg-gray-100 text-gray-500'}`}>
                  {matter.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-gray-400">
                  {TOPIC_LABELS[matter.topic] || matter.topic}
                </span>
              </>
            )}
          </div>
          {matter?.summary && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{matter.summary}</p>
          )}
        </div>
        <span className="shrink-0 text-xs text-gray-400 ml-2">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Task rows */}
      {!collapsed && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t bg-gray-50/40">
          {tasks.map((task: any) => (
            <TaskRow key={task.id} task={task} updateTask={updateTask} />
          ))}
          {matter?.nextAction && (
            <p className="px-2 pt-1 text-[11px] text-gray-400 italic">
              Next action: {matter.nextAction}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ========== LIST VIEW (flat, kept for rollback) ==========
function TaskListViewFlat({ tasks, updateTask }: { tasks: any[]; updateTask: any }) {
  const pendingTasks = tasks.filter((t: any) => t.status === 'pending')
  const activeTasks = tasks.filter((t: any) => t.status === 'confirmed')
  const completedTasks = tasks.filter((t: any) => t.status === 'completed')
  const dismissedTasks = tasks.filter((t: any) => t.status === 'dismissed')
  return (
    <div className="space-y-4">
      {pendingTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600">Needs Review ({pendingTasks.length})</span>
          </div>
          {pendingTasks.map((task: any) => <TaskRow key={task.id} task={task} updateTask={updateTask} />)}
        </div>
      )}
      {activeTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Active ({activeTasks.length})</span>
          </div>
          {activeTasks.map((task: any) => <TaskRow key={task.id} task={task} updateTask={updateTask} />)}
        </div>
      )}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-600">Completed ({completedTasks.length})</span>
          </div>
          {completedTasks.map((task: any) => <TaskRow key={task.id} task={task} updateTask={updateTask} />)}
        </div>
      )}
      {dismissedTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Dismissed ({dismissedTasks.length})</span>
          </div>
          {dismissedTasks.map((task: any) => <TaskRow key={task.id} task={task} updateTask={updateTask} />)}
        </div>
      )}
    </div>
  )
}
========== END FLAT VIEW ========== */

/* ========== TASK ROW ========== */
function TaskRow({ task, updateTask }: { task: any; updateTask: any }) {
  const band = getPriorityBand(task.priorityScore || 0)
  const deadline = task.userSetDeadline || task.explicitDeadline || task.inferredDeadline
  const isOverdue = deadline && new Date(deadline) < new Date() && (task.status === 'pending' || task.status === 'confirmed')
  const senderName = task.emailLinks?.[0]?.email?.sender?.split('<')[0]?.trim()
  const isPending = task.status === 'pending'
  const isDone = task.status === 'completed' || task.status === 'dismissed'

  const handleComplete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const prevStatus = task.status
    updateTask.mutate({ id: task.id, data: { status: 'completed' } })
    toast.success('Task completed', {
      action: {
        label: 'Undo',
        onClick: () => updateTask.mutate({ id: task.id, data: { status: prevStatus } }),
      },
    })
  }

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border px-3 transition-all ${
        isPending
          ? 'border-purple-200 bg-purple-50/30 hover:border-purple-300 hover:shadow-md py-3.5'
          : isDone
          ? 'border-gray-100 bg-gray-50/50 py-2.5 opacity-60 hover:opacity-80'
          : 'bg-white hover:border-gray-300 hover:shadow-md py-3.5'
      }`}
    >
      {/* Quick-complete checkbox */}
      <button
        onClick={handleComplete}
        disabled={isDone}
        title={isDone ? 'Already done' : 'Mark complete'}
        className="shrink-0 p-1 rounded-full transition-colors hover:bg-green-50 disabled:cursor-default disabled:opacity-40"
      >
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-green-400" />
        ) : (
          <Circle className="h-5 w-5 text-gray-300 group-hover:text-green-400 transition-colors" />
        )}
      </button>

      {/* Priority indicator */}
      <div className={`h-9 w-1 shrink-0 rounded-full ${
        band === 'critical' ? 'bg-red-500' : band === 'high' ? 'bg-orange-400' : band === 'medium' ? 'bg-yellow-400' : 'bg-gray-300'
      }`} />

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/tasks/${task.id}`}
            className={`truncate text-sm font-semibold hover:text-blue-600 transition-colors ${isDone ? 'text-gray-400 line-through' : 'text-gray-900'}`}
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

      {/* Quick actions — context-aware by status */}
      <div className={`flex items-center gap-1 ${isPending ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        {isPending ? (
          <>
            {/* Pending: Confirm or Dismiss */}
            <button
              className="flex items-center justify-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors min-w-[4.5rem]"
              onClick={() => { updateTask.mutate({ id: task.id, data: { status: 'confirmed' } }); toast.success('Task confirmed') }}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Confirm
            </button>
            <button
              className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => { updateTask.mutate({ id: task.id, data: { status: 'dismissed' } }); toast('Task dismissed') }}
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </>
        ) : (
          <>
            {/* Confirmed: Done, Dismiss, Open */}
            {task.status === 'confirmed' && (
              <button
                className="flex items-center justify-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors min-w-[4.5rem]"
                onClick={() => {
                  const prevStatus = task.status
                  updateTask.mutate({ id: task.id, data: { status: 'completed' } })
                  toast.success('Task completed', {
                    action: { label: 'Undo', onClick: () => updateTask.mutate({ id: task.id, data: { status: prevStatus } }) },
                  })
                }}
              >
                <Check className="h-3.5 w-3.5" />
                Done
              </button>
            )}
            {task.status !== 'dismissed' && task.status !== 'completed' && (
              <button
                className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                onClick={() => { updateTask.mutate({ id: task.id, data: { status: 'dismissed' } }); toast('Task dismissed') }}
              >
                <X className="h-3.5 w-3.5" />
                Dismiss
              </button>
            )}
          </>
        )}
      </div>
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
                        href={`/dashboard/tasks/${task.id}`}
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

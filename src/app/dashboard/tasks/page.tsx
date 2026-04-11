'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { InlineNotice } from '@/components/inline-notice'
import { PageHeader } from '@/components/page-header'
import { SegmentedControl } from '@/components/segmented-control'
import { StatePanel } from '@/components/state-panel'
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
type TaskStatus = 'pending' | 'confirmed' | 'completed' | 'dismissed'

type TaskEmailLink = {
  email?: {
    sender?: string | null
  } | null
}

type TaskItem = {
  id: string
  title: string
  summary?: string | null
  status: TaskStatus
  priorityScore?: number | null
  explicitDeadline?: string | null
  inferredDeadline?: string | null
  userSetDeadline?: string | null
  emailLinks?: TaskEmailLink[]
}

type MatterItem = {
  id: string
  title: string
  status: string
  topic: string
  summary?: string | null
  nextAction?: string | null
  lastMessageAt?: string | null
  taskIds: string[]
}

type TaskUpdateData = {
  status?: TaskStatus
  userSetDeadline?: string | null
}

type TaskUpdateVars = {
  id: string
  data: TaskUpdateData
}

type MutationLike = {
  mutate: (vars: TaskUpdateVars, options?: { onSuccess?: () => void }) => void
}

type QueryResponse<T> = {
  data?: T
  meta?: {
    totalCount?: number
  }
}

type CreateTaskResponse = {
  data: {
    id: string
  }
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'dismissed', label: 'Dismissed' },
]

const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
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
  const matters: MatterItem[] = mattersRes?.data || []

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
        const data: CreateTaskResponse = await res.json()
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
    } catch {
      toast.error('Failed to create task')
    } finally {
      setCreatingTask(false)
    }
  }

  const updateTask = useMutation({
    mutationFn: ({ id, data }: TaskUpdateVars) =>
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

  const tasks: TaskItem[] = (res as QueryResponse<TaskItem[]>)?.data || []

  return (
    <div className="space-y-5 [scrollbar-gutter:stable]">
      <PageHeader
        title="Tasks"
        description="Track what needs review, what is active, and what is already done."
        meta={`${res?.meta?.totalCount || 0} tasks`}
        actions={
          <>
            <SegmentedControl
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'list', label: 'List', icon: <List className="h-3.5 w-3.5" /> },
                { value: 'timeline', label: 'Timeline', icon: <GanttChart className="h-3.5 w-3.5" /> },
                { value: 'calendar', label: 'Calendar', icon: <Calendar className="h-3.5 w-3.5" /> },
              ]}
            />
            <Button onClick={() => setShowCreateModal(true)} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </>
        }
      />

      {/* Filter bar */}
      <div className="rounded-2xl border border-white/70 bg-white/90 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedControl
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
          />

          <div className="flex min-h-7 justify-start sm:min-w-[180px] sm:justify-end">
            {viewMode !== 'calendar' ? (
              <SegmentedControl
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'priority', label: 'Priority' },
                  { value: 'deadline', label: 'Deadline' },
                ]}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0">
        {isLoading ? (
          <StatePanel
            loading
            title="Loading tasks"
            description="Pulling together your current work items."
          />
        ) : tasks.length === 0 ? (
          <StatePanel
            icon={<FolderOpen className="h-5 w-5 text-gray-400" />}
            title="No tasks found"
            description="Try a different filter or create a task manually."
          />
        ) : viewMode === 'list' ? (
          <TaskListView tasks={tasks} updateTask={updateTask} matters={matters} />
        ) : viewMode === 'timeline' ? (
          <GanttTimeline tasks={tasks} updateTask={updateTask} sortBy={sortBy} />
        ) : (
          <TaskCalendarView tasks={tasks} updateTask={updateTask} />
        )}
      </div>

      {/* Create Task Modal */}
      <Dialog open={showCreateModal} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a manual task when work starts outside the email pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-1 space-y-4">
            {!taskTitle.trim() && creatingTask ? (
              <InlineNotice variant="warning">A task title is required before you can create it.</InlineNotice>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="manual-task-title">Task Title</Label>
              <Input
                id="manual-task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title"
                className="h-10"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleCreateTask() }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-task-summary">Summary</Label>
              <Textarea
                id="manual-task-summary"
                value={taskSummary}
                onChange={(e) => setTaskSummary(e.target.value)}
                placeholder="Brief description (optional)"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <DialogClose
              render={<Button className="flex-1" variant="outline" />}
            >
              Cancel
            </DialogClose>
            <Button
              onClick={handleCreateTask}
              disabled={creatingTask || !taskTitle.trim()}
              className="flex-1"
            >
              {creatingTask ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ========== LIST VIEW — matter-grouped ========== */
function TaskListView({ tasks, updateTask, matters }: { tasks: TaskItem[]; updateTask: MutationLike; matters: MatterItem[] }) {
  // Build taskId → matter map
  const taskToMatter = useMemo(() => {
    const map = new Map<string, MatterItem>()
    for (const matter of matters) {
      for (const taskId of matter.taskIds) {
        map.set(taskId, matter)
      }
    }
    return map
  }, [matters])

  // Group tasks by matter; unmatched → ungrouped
  const { matterGroups, ungrouped } = useMemo(() => {
    const grouped = new Map<string, { matter: MatterItem; tasks: TaskItem[] }>()
    const ungrouped: TaskItem[] = []
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
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

  if (tasks.length === 0) {
    return (
      <StatePanel
        icon={<FolderOpen className="h-5 w-5 text-gray-400" />}
        title="No tasks found"
        description="Try a different filter or create a task manually."
      />
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
  matter: MatterItem | null; tasks: TaskItem[]; updateTask: MutationLike; collapsed: boolean; onToggle: () => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-sm">
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
        <div className="space-y-2 border-t bg-gray-50/50 px-3 pb-3 pt-1">
          {tasks.map((task) => (
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
function TaskRow({ task, updateTask }: { task: TaskItem; updateTask: MutationLike }) {
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
      className={`group flex items-center gap-3 rounded-xl border px-3 transition-all ${
        isPending
          ? 'border-purple-200 bg-purple-50/30 hover:border-purple-300 hover:shadow-md py-3.5'
          : isDone
          ? 'border-gray-100 bg-gray-50/50 py-2.5 opacity-60 hover:opacity-80'
          : 'border-gray-200/80 bg-white hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm py-3.5'
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
function TaskCalendarView({ tasks, updateTask }: { tasks: TaskItem[]; updateTask: MutationLike }) {
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
  const yearOptions = Array.from({ length: 9 }, (_, index) => year - 4 + index)

  const todayStr = new Date().toDateString()

  // Group ALL tasks by date (not just current month)
  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskItem[]> = {}
    for (const task of tasks) {
      const raw = task.userSetDeadline || task.explicitDeadline || task.inferredDeadline
      if (!raw) continue
      const d = new Date(raw)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(task)
    }

    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
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
          <div className="flex items-center gap-2">
            <select
              aria-label="Select year"
              value={year}
              onChange={(e) => setCurrentMonth(new Date(Number(e.target.value), month, 1))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition-colors hover:border-blue-200 focus:border-blue-400"
            >
              {yearOptions.map((optionYear) => (
                <option key={optionYear} value={optionYear}>
                  {optionYear}
                </option>
              ))}
            </select>
            <select
              aria-label="Select month"
              value={month}
              onChange={(e) => setCurrentMonth(new Date(year, Number(e.target.value), 1))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 outline-none transition-colors hover:border-blue-200 focus:border-blue-400"
            >
              {MONTH_OPTIONS.map((monthName, index) => (
                <option key={monthName} value={index}>
                  {monthName}
                </option>
              ))}
            </select>
          </div>
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
                  {dayTasks.map((task) => {
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

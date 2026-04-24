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
import { MonthYearPanel } from '@/components/month-year-panel'
import { SegmentedControl } from '@/components/segmented-control'
import { StatePanel } from '@/components/state-panel'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Check, X, Calendar, List, GanttChart, ChevronLeft, ChevronRight,
  Mail, Clock, ThumbsUp, Plus, Circle, CheckCircle2, FolderOpen,
  ChevronDown, UserRound,
} from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GanttTimeline } from '@/components/gantt-timeline'
import { ReassignProjectModal } from '@/components/reassign-project-modal'
import { getPriorityBand, getPriorityColor, getPriorityLabel } from '@/types'
import { toast } from 'sonner'
import { showError } from '@/components/error-dialog'
import { CACHE_TIME } from '@/lib/query-cache'

type ViewMode = 'list' | 'timeline' | 'calendar'
type TaskStatus = 'pending' | 'confirmed' | 'completed' | 'dismissed'

type TaskEmailLink = {
  email?: {
    sender?: string | null
    threadId?: string | null
  } | null
}

type TaskProject = {
  id: string
  name: string
  identity: { id: string; name: string } | null
} | null

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
  project?: TaskProject
  matter?: { id: string; title: string } | null
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

export default function TasksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusProjectId = searchParams.get('project') ?? undefined
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('priority')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskSummary, setTaskSummary] = useState('')
  const [creatingTask, setCreatingTask] = useState(false)
  const [reassignTask, setReassignTask] = useState<TaskItem | null>(null)
  const queryClient = useQueryClient()

  // Fetch all tasks (no server-side status filter — we filter client-side for "all")
  const apiStatus = statusFilter === 'all' ? '' : statusFilter
  const { data: res, isLoading } = useQuery({
    queryKey: ['tasks', apiStatus, sortBy],
    queryFn: () =>
      fetch(`/api/tasks?status=${apiStatus}&sort=${sortBy}&limit=50`).then((r) => r.json()),
    staleTime: CACHE_TIME.list,
    placeholderData: (previous) => previous,
  })


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
        showError('Failed to create task')
      }
    } catch {
      showError('Failed to create task')
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

  const tasks = useMemo(() => ((res as QueryResponse<TaskItem[]>)?.data || []) as TaskItem[], [res])

  return (
    <div className="space-y-5">
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
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
            />
          </div>

          <div className="flex min-h-7 justify-start sm:min-w-[180px] sm:justify-end">
            {viewMode === 'list' ? (
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
          <TaskListView tasks={tasks} updateTask={updateTask} focusProjectId={focusProjectId} onReassign={setReassignTask} />
        ) : viewMode === 'timeline' ? (
          <GanttTimeline tasks={tasks} updateTask={updateTask} />
        ) : (
          <TaskCalendarView tasks={tasks} updateTask={updateTask} />
        )}
      </div>

      {/* Reassign Project Modal */}
      <ReassignProjectModal
        open={!!reassignTask}
        onOpenChange={(open) => { if (!open) setReassignTask(null) }}
        threadId={reassignTask?.emailLinks?.[0]?.email?.threadId ?? undefined}
        taskId={!reassignTask?.emailLinks?.[0]?.email?.threadId ? reassignTask?.id : undefined}
        currentProject={reassignTask?.project}
        invalidateKeys={[['tasks']]}
      />

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

/* ========== LIST VIEW - 2-level collapsible: identity -> project ========== */
function TaskListView({ tasks, updateTask, focusProjectId, onReassign }: { tasks: TaskItem[]; updateTask: MutationLike; focusProjectId?: string; onReassign: (task: TaskItem) => void }) {
  type ProjectGroup = { id: string; name: string; items: TaskItem[] }
  type IdentityGroup = { id: string; name: string; projects: ProjectGroup[] }

  const [collapsedIdentities, setCollapsedIdentities] = useState<Set<string>>(new Set())
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())
  const [userHasToggled, setUserHasToggled] = useState(false)

  const toggleIdentity = (id: string) => {
    setUserHasToggled(true)
    setCollapsedIdentities((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleProject = (id: string) => {
    setUserHasToggled(true)
    setCollapsedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sortItemsWithinGroup = useCallback((items: TaskItem[]) => {
    const active = items.filter((task) => task.status !== 'completed' && task.status !== 'dismissed')
    const done = items.filter((task) => task.status === 'completed' || task.status === 'dismissed')
    return [...active, ...done]
  }, [])

  const { identityGroups, ungrouped } = useMemo(() => {
    const ungrouped: TaskItem[] = []
    const identityMap = new Map<string, { name: string; projectMap: Map<string, { name: string; items: TaskItem[] }> }>()

    for (const task of tasks) {
      if (!task.project) { ungrouped.push(task); continue }
      const iId = task.project.identity?.id || '__unassigned__'
      const iName = task.project.identity?.name || 'Unassigned'
      const pId = task.project.id
      const pName = task.project.name
      if (!identityMap.has(iId)) identityMap.set(iId, { name: iName, projectMap: new Map() })
      const identity = identityMap.get(iId)!
      if (!identity.projectMap.has(pId)) identity.projectMap.set(pId, { name: pName, items: [] })
      identity.projectMap.get(pId)!.items.push(task)
    }

    const latestScore = (items: TaskItem[]) =>
      Math.max(...items.map((t) => t.priorityScore ?? 0))

    const identityGroups: IdentityGroup[] = Array.from(identityMap.entries())
      .map(([id, { name, projectMap }]) => {
        const projects = Array.from(projectMap.entries())
          .map(([pid, { name, items }]) => ({ id: pid, name, items: sortItemsWithinGroup(items) }))
          .sort((a, b) => latestScore(b.items) - latestScore(a.items))
        return { id, name, projects }
      })
      .sort((a, b) =>
        latestScore(b.projects.flatMap((p) => p.items)) - latestScore(a.projects.flatMap((p) => p.items))
      )

    return { identityGroups, ungrouped: sortItemsWithinGroup(ungrouped) }
  }, [sortItemsWithinGroup, tasks])

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
    <div className="space-y-2">
      {identityGroups.map((identity) => {
        const isIdentityCollapsed = !userHasToggled && focusProjectId
          ? !identity.projects.some((p) => p.id === focusProjectId)
          : collapsedIdentities.has(identity.id)
        const totalCount = identity.projects.reduce((s, p) => s + p.items.length, 0)
        return (
          <div key={identity.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {/* Identity row */}
            <button
              onClick={() => toggleIdentity(identity.id)}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-slate-50"
            >
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${isIdentityCollapsed ? '-rotate-90' : ''}`} />
              <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">{identity.name}</span>
              <span className="ml-auto text-xs text-slate-400">{totalCount} task{totalCount !== 1 ? 's' : ''} shown</span>
            </button>

            {!isIdentityCollapsed && (
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {identity.projects.map((project) => {
                  const isProjectCollapsed = !userHasToggled && focusProjectId
                    ? project.id !== focusProjectId
                    : collapsedProjects.has(project.id)
                  return (
                    <div key={project.id}>
                      {/* Project row */}
                      <button
                        onClick={() => toggleProject(project.id)}
                        className="flex w-full items-center gap-2.5 px-5 py-2.5 text-left transition-colors hover:bg-slate-50/70"
                      >
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform duration-150 ${isProjectCollapsed ? '-rotate-90' : ''}`} />
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{project.name}</span>
                        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{project.items.length}</span>
                      </button>

                      {!isProjectCollapsed && (
                        <div className="space-y-2 px-4 pb-3 pt-1">
                          {project.items.map((task) => (
                            <TaskRow key={task.id} task={task} updateTask={updateTask} onReassign={onReassign} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {ungrouped.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Uncategorized</span>
            <span className="ml-auto text-xs text-slate-400">{ungrouped.length} task{ungrouped.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2 border-t border-slate-100 px-4 pb-3 pt-2">
            {ungrouped.map((task) => (
              <TaskRow key={task.id} task={task} updateTask={updateTask} onReassign={onReassign} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, updateTask, onReassign }: { task: TaskItem; updateTask: MutationLike; onReassign: (task: TaskItem) => void }) {
  const band = getPriorityBand(task.priorityScore || 0)
  const deadline = task.userSetDeadline || task.explicitDeadline || task.inferredDeadline
  const isOverdue = deadline && new Date(deadline) < new Date() && (task.status === 'pending' || task.status === 'confirmed')
  const senderName = task.emailLinks?.[0]?.email?.sender?.split('<')[0]?.trim()
  const isPending = task.status === 'pending'
  const isDone = task.status === 'completed' || task.status === 'dismissed'
  const matter = task.matter ?? null

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
          {matter ? (
            <span className="truncate text-gray-500">{matter.title}</span>
          ) : null}
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

      {/* Quick actions - context-aware by status */}
      <div className={`flex items-center gap-1 ${isPending ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReassign(task) }}
          title="Change project"
          className="hidden group-hover:flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </button>
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
  const [pickerOpen, setPickerOpen] = useState(false)

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
      map[key].sort((a, b) => {
        const aCompleted = a.status === 'completed'
        const bCompleted = b.status === 'completed'

        if (aCompleted !== bCompleted) {
          return aCompleted ? 1 : -1
        }

        return (b.priorityScore ?? 0) - (a.priorityScore ?? 0)
      })
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
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger className="rounded-lg px-3 py-1.5 text-lg font-semibold text-gray-900 transition-colors hover:bg-blue-50 hover:text-blue-800">
              {currentMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
            </PopoverTrigger>
            <PopoverContent align="center" className="w-auto border-0 bg-transparent p-0 shadow-none">
              <MonthYearPanel
                value={currentMonth}
                onChange={(date) => {
                  setCurrentMonth(date)
                  setPickerOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
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
                    const isCompleted = task.status === 'completed'
                    const bgColor = band === 'critical' ? 'bg-red-200 border-red-400 text-red-950'
                      : band === 'high' ? 'bg-orange-200 border-orange-400 text-orange-950'
                      : band === 'medium' ? 'bg-amber-200 border-amber-400 text-amber-950'
                      : 'bg-slate-200 border-slate-400 text-slate-800'
                    return (
                      <Link
                        key={task.id}
                        href={`/dashboard/tasks/${task.id}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        className={`block cursor-grab truncate rounded-md border px-1.5 py-1 text-[10px] font-semibold leading-tight shadow-sm active:cursor-grabbing ${bgColor} ${
                          isCompleted ? 'opacity-55 line-through saturate-[0.8]' : ''
                        } ${
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

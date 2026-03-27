'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, Mail, Save, Calendar, TrendingUp, ExternalLink,
  CheckCircle2, ListChecks, FileText, Clock, Sparkles, ThumbsUp,
  X, Check, AlertTriangle, Shield, RotateCcw, Square, CheckSquare,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { getPriorityBand, getPriorityColor, getPriorityLabel } from '@/types'
import { toast } from 'sonner'
import Link from 'next/link'

function parseActionItems(raw: any): string[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return raw ? [raw] : []
    }
  }
  return []
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Needs Review', color: 'bg-purple-50 text-purple-700 border-purple-200', bg: 'from-purple-50/50 to-white', icon: AlertTriangle },
  confirmed: { label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border-blue-200', bg: 'from-blue-50/50 to-white', icon: ThumbsUp },
  completed: { label: 'Completed', color: 'bg-green-50 text-green-700 border-green-200', bg: 'from-green-50/50 to-white', icon: CheckCircle2 },
  dismissed: { label: 'Dismissed', color: 'bg-gray-50 text-gray-500 border-gray-200', bg: 'from-gray-50/50 to-white', icon: X },
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const taskId = params.id as string

  const { data: res, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetch(`/api/tasks/${taskId}`).then((r) => r.json()),
  })

  const task = res?.data

  const [editTitle, setEditTitle] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editUrgency, setEditUrgency] = useState(3)
  const [editImpact, setEditImpact] = useState(3)
  const [editNotes, setEditNotes] = useState('')
  const [editStatus, setEditStatus] = useState('pending')
  const [isEditing, setIsEditing] = useState(false)
  const [checkedItems, setCheckedItems] = useState<number[]>([])

  useEffect(() => {
    if (task) {
      setEditTitle(task.title)
      setEditSummary(task.summary)
      setEditDeadline(
        (task.userSetDeadline || task.explicitDeadline || task.inferredDeadline || '')
          .toString()
          .split('T')[0]
      )
      setEditUrgency(task.urgency || 3)
      setEditImpact(task.impact || 3)
      setEditNotes(task.userNotes || '')
      setEditStatus(task.status || 'pending')
      try {
        const parsed = JSON.parse(task.checkedActionItems || '[]')
        setCheckedItems(Array.isArray(parsed) ? parsed : [])
      } catch { setCheckedItems([]) }
    }
  }, [task])

  const updateTask = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const handleSave = () => {
    updateTask.mutate(
      {
        title: editTitle,
        summary: editSummary,
        userSetDeadline: editDeadline || null,
        urgency: editUrgency,
        impact: editImpact,
        userNotes: editNotes,
        status: editStatus,
      },
      {
        onSuccess: () => {
          toast.success('Task saved')
          setIsEditing(false)
        },
      }
    )
  }

  const handleStatusChange = (newStatus: string) => {
    setEditStatus(newStatus)
    updateTask.mutate(
      { status: newStatus },
      {
        onSuccess: () => {
          const label = statusConfig[newStatus]?.label || newStatus
          toast.success(`Status changed to ${label}`)
        },
      }
    )
  }

  const toggleCheckItem = (index: number) => {
    const next = checkedItems.includes(index)
      ? checkedItems.filter((i) => i !== index)
      : [...checkedItems, index]
    setCheckedItems(next)
    updateTask.mutate({ checkedActionItems: JSON.stringify(next) })
  }

  if (isLoading) {
    return (
      <div className="animate-in fade-in mx-auto max-w-4xl space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl border bg-gray-100" />
        <div className="h-40 animate-pulse rounded-xl border bg-gray-100" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/tasks')} className="gap-2 text-gray-500 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <ListChecks className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-400">Task not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const band = getPriorityBand(task.priorityScore || 0)
  const actionItems = parseActionItems(task.actionItems)
  const deadline = task.userSetDeadline || task.explicitDeadline || task.inferredDeadline
  const sts = statusConfig[task.status] || statusConfig.pending
  const StsIcon = sts.icon
  const isDone = task.status === 'completed' || task.status === 'dismissed'

  return (
    <div className="animate-in fade-in mx-auto max-w-4xl space-y-5 duration-200">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/tasks')} className="gap-2 text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </Button>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: Task content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header card */}
          <Card className={`bg-gradient-to-br ${sts.bg} overflow-hidden`}>
            <CardContent className="py-5 space-y-4">
              {/* Title */}
              <h1 className={`text-xl font-bold leading-snug ${isDone ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                {task.title}
              </h1>

              {/* Meta badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`gap-1 ${sts.color}`}>
                  <StsIcon className="h-3 w-3" />
                  {sts.label}
                </Badge>
                <Badge variant="outline" className={`gap-1 ${getPriorityColor(band)}`}>
                  <TrendingUp className="h-3 w-3" />
                  {getPriorityLabel(band)} — {task.priorityScore}
                </Badge>
                {deadline && (
                  <Badge variant="outline" className="gap-1 bg-white/60 text-gray-600 border-gray-200 text-[10px]">
                    <Calendar className="h-3 w-3" />
                    Due {new Date(deadline).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Badge>
                )}
              </div>

              {/* Quick actions for pending */}
              {task.status === 'pending' && (
                <div className="flex items-center gap-2 rounded-xl bg-purple-50/80 backdrop-blur-sm border border-purple-200 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-purple-600 shrink-0" />
                  <span className="text-sm text-purple-700 flex-1">This task needs your review</span>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8" onClick={() => handleStatusChange('confirmed')}>
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Confirm
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-gray-500 hover:text-red-600 hover:border-red-200" onClick={() => handleStatusChange('dismissed')}>
                    <X className="h-3.5 w-3.5" />
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Quick actions for confirmed */}
              {task.status === 'confirmed' && (
                <div className="flex items-center gap-2 rounded-xl bg-blue-50/80 backdrop-blur-sm border border-blue-200 px-4 py-3">
                  <ThumbsUp className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-sm text-blue-700 flex-1">Task confirmed — mark when done</span>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-8" onClick={() => handleStatusChange('completed')}>
                    <Check className="h-3.5 w-3.5" />
                    Complete
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-gray-500 hover:text-red-600 hover:border-red-200" onClick={() => handleStatusChange('dismissed')}>
                    <X className="h-3.5 w-3.5" />
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Quick actions for completed */}
              {task.status === 'completed' && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50/80 backdrop-blur-sm border border-green-200 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm text-green-700 flex-1">Task completed</span>
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-gray-500 hover:text-blue-600 hover:border-blue-200" onClick={() => handleStatusChange('confirmed')}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reopen
                  </Button>
                </div>
              )}

              {/* Quick actions for dismissed */}
              {task.status === 'dismissed' && (
                <div className="flex items-center gap-2 rounded-xl bg-gray-100/80 backdrop-blur-sm border border-gray-200 px-4 py-3">
                  <X className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500 flex-1">Task dismissed</span>
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-gray-500 hover:text-purple-600 hover:border-purple-200" onClick={() => handleStatusChange('pending')}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Re-review
                  </Button>
                </div>
              )}

              {/* Summary */}
              <div className="rounded-xl bg-white/70 backdrop-blur-sm border px-4 py-3">
                <p className="text-sm text-gray-700 leading-relaxed">{task.summary}</p>
                <p className="text-[11px] text-gray-400 mt-2">
                  Created {new Date(task.createdAt).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Edit form — collapsible */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-gray-500" />
                  Edit Details
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} className="text-xs text-gray-500">
                  {isEditing ? 'Collapse' : 'Expand'}
                </Button>
              </div>
            </CardHeader>
            {isEditing && (
              <CardContent className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="title" className="text-xs text-gray-500">Title</Label>
                  <Input id="title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="summary" className="text-xs text-gray-500">Summary</Label>
                  <Textarea id="summary" value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} className="mt-1" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="deadline" className="text-xs text-gray-500">Deadline</Label>
                    <Input id="deadline" type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="urgency" className="text-xs text-gray-500">Urgency (1-5)</Label>
                    <Input id="urgency" type="number" min={1} max={5} value={editUrgency} onChange={(e) => setEditUrgency(Number(e.target.value))} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="impact" className="text-xs text-gray-500">Impact (1-5)</Label>
                    <Input id="impact" type="number" min={1} max={5} value={editImpact} onChange={(e) => setEditImpact(Number(e.target.value))} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes" className="text-xs text-gray-500">Your Notes</Label>
                  <Textarea id="notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} placeholder="Add personal notes..." className="mt-1" />
                </div>

                {/* Status selector */}
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <div className="mt-1.5 flex items-center gap-2">
                    {Object.entries(statusConfig).map(([value, opt]) => (
                      <button
                        key={value}
                        onClick={() => setEditStatus(value)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                          editStatus === value
                            ? `${opt.color} ring-2 ring-offset-1`
                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={updateTask.isPending} className="gap-2">
                    <Save className="h-4 w-4" />
                    {updateTask.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* AI Analysis */}
          {task.priorityReason && (
            <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-yellow-600" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-yellow-800 leading-relaxed">{task.priorityReason}</p>
              </CardContent>
            </Card>
          )}

          {/* Checklist — interactive todo */}
          {actionItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ListChecks className="h-4 w-4 text-blue-500" />
                  Checklist
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                    {checkedItems.length}/{actionItems.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {/* Progress bar */}
                {actionItems.length > 1 && (
                  <div className="mb-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${(checkedItems.length / actionItems.length) * 100}%` }}
                    />
                  </div>
                )}
                <ul className="space-y-1">
                  {actionItems.map((item: string, i: number) => {
                    const isChecked = checkedItems.includes(i)
                    return (
                      <li key={i}>
                        <button
                          onClick={() => toggleCheckItem(i)}
                          className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-all hover:bg-gray-50 group ${
                            isChecked ? 'opacity-60' : ''
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                          ) : (
                            <Square className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 group-hover:text-blue-400 transition-colors" />
                          )}
                          <span className={`text-sm leading-snug transition-all ${
                            isChecked ? 'text-gray-400 line-through' : 'text-gray-700'
                          }`}>
                            {item}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Source Emails */}
          {task.emailLinks?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Source Emails
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{task.emailLinks.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.emailLinks.map((link: any) => {
                  const senderName = link.email.sender?.split('<')[0]?.trim()
                  const senderInitial = (senderName || 'U')[0].toUpperCase()
                  return (
                    <Link
                      key={link.id}
                      href={`/dashboard/emails/${link.email.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:bg-blue-50/50 hover:border-blue-200 hover:shadow-sm group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                        {senderInitial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {link.email.subject}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {senderName} — {new Date(link.email.receivedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" />
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Task metadata */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-gray-400" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Status</dt>
                  <dd className="font-medium text-gray-700">{sts.label}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Priority</dt>
                  <dd className="font-medium text-gray-700">{getPriorityLabel(band)} ({task.priorityScore})</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Urgency</dt>
                  <dd className="font-medium text-gray-700">{task.urgency || '—'} / 5</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Impact</dt>
                  <dd className="font-medium text-gray-700">{task.impact || '—'} / 5</dd>
                </div>
                {deadline && (
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Deadline</dt>
                    <dd className="font-medium text-gray-700">{new Date(deadline).toLocaleDateString()}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-400">Created</dt>
                  <dd className="font-medium text-gray-700">{new Date(task.createdAt).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Source emails</dt>
                  <dd className="font-medium text-gray-700">{task.emailLinks?.length || 0}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

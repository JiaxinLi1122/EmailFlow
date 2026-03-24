'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDemoSession } from '@/lib/use-demo-session'
import { redirect, useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, Mail, Save, Calendar, TrendingUp, ExternalLink,
  CheckCircle2, ListChecks, FileText, Clock,
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

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-purple-100 text-purple-700 ring-purple-300' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-700 ring-blue-300' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700 ring-green-300' },
  { value: 'dismissed', label: 'Dismissed', color: 'bg-gray-100 text-gray-500 ring-gray-300' },
]

export default function TaskDetailPage() {
  const { status } = useDemoSession()
  if (status === 'unauthenticated') redirect('/auth/signin')

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
          router.push('/tasks')
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
          const label = statusOptions.find((s) => s.value === newStatus)?.label || newStatus
          toast.success(`Status changed to ${label}`)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="animate-in fade-in mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-48 animate-pulse rounded-lg border bg-gray-100" />
      </div>
    )
  }
  if (!task) {
    return <p className="text-gray-400">Task not found.</p>
  }

  const band = getPriorityBand(task.priorityScore || 0)
  const actionItems = parseActionItems(task.actionItems)
  const deadline = task.userSetDeadline || task.explicitDeadline || task.inferredDeadline

  return (
    <div className="animate-in fade-in slide-in-from-right-4 mx-auto max-w-3xl space-y-5 duration-300">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/tasks')} className="gap-2 text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </Button>

      {/* Task header card */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-xs ${getPriorityColor(band)}`}>
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {getPriorityLabel(band)} — Score {task.priorityScore}
                </Badge>
                {deadline && (
                  <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                    <Calendar className="h-3 w-3" />
                    Due {new Date(deadline).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Created {new Date(task.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                {task.priorityReason && (
                  <span className="ml-1 text-gray-400"> — AI: {task.priorityReason}</span>
                )}
              </p>
            </div>
          </div>

          {/* Status pills */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 mr-1">Status:</span>
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  editStatus === opt.value
                    ? `${opt.color} ring-2 ring-offset-1`
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column: Edit form */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-gray-500" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={updateTask.isPending} className="gap-2">
                  <Save className="h-4 w-4" />
                  {updateTask.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => router.push('/tasks')}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Action items + Source emails */}
        <div className="space-y-5">
          {/* Action items */}
          {actionItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ListChecks className="h-4 w-4 text-blue-500" />
                  Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {actionItems.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-600">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Source emails — clickable */}
          {task.emailLinks?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-500" />
                  Source Emails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.emailLinks.map((link: any) => (
                  <Link
                    key={link.id}
                    href={`/emails/${link.email.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:bg-gray-50 hover:border-blue-200 hover:shadow-sm group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {link.email.subject}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {link.email.sender?.split('<')[0]?.trim()} — {new Date(link.email.receivedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

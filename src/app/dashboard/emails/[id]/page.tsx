'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/page-header'
import { StatePanel } from '@/components/state-panel'
import {
  ArrowLeft, Mail, Paperclip, Clock, ArrowUpRight,
  CheckSquare, Sparkles, Shield, Plus, Tag, X,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getPriorityBand, getPriorityColor, getPriorityLabel } from '@/types'
import { EMAIL_CLASS_CONFIG, getEmailClassConfig } from '@/lib/email-classification'
import { toast } from 'sonner'

type EmailTaskLink = {
  id: string
  task: {
    id: string
    title: string
    status: string
    priorityScore?: number | null
  }
}

export default function EmailDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const emailId = params.id as string
  const [classifying, setClassifying] = useState(false)
  const [unlinkingTaskId, setUnlinkingTaskId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskSummary, setTaskSummary] = useState('')
  const [linkedEmailIds, setLinkedEmailIds] = useState<string[]>([])
  const [creatingTask, setCreatingTask] = useState(false)

  const { data: res, isLoading } = useQuery({
    queryKey: ['email', emailId],
    queryFn: () => fetch(`/api/emails/${emailId}`).then((r) => r.json()),
  })

  const email = res?.data

  const handleClassify = async (newClass: string) => {
    setClassifying(true)
    try {
      const res = await fetch(`/api/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classification: newClass }),
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['email', emailId] })
        queryClient.invalidateQueries({ queryKey: ['emails'] })
        toast.success(`Marked as ${getEmailClassConfig(newClass).label}`)
      }
    } catch {
      toast.error('Failed to update classification')
    } finally {
      setClassifying(false)
    }
  }

  const unlinkTask = async (taskId: string) => {
    setUnlinkingTaskId(taskId)
    try {
      const res = await fetch(`/api/emails/${emailId}/tasks/${taskId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['email', emailId] })
        toast.success('Task unlinked')
      } else {
        toast.error('Failed to unlink task')
      }
    } catch {
      toast.error('Failed to unlink task')
    } finally {
      setUnlinkingTaskId(null)
    }
  }

  const handleCreateTask = async () => {
    setCreatingTask(true)
    try {
      const res = await fetch('/api/emails/create-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          summary: taskSummary,
          sourceEmailId: emailId,
          linkedEmailIds: linkedEmailIds.length > 0 ? linkedEmailIds : [emailId],
        }),
      })

      if (res.ok) {
        await res.json()
        queryClient.invalidateQueries({ queryKey: ['email', emailId] })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        toast.success('Task created')
        setShowCreateModal(false)
        setTaskTitle('')
        setTaskSummary('')
        setLinkedEmailIds([])
      } else {
        toast.error('Failed to create task')
      }
    } catch {
      toast.error('Failed to create task')
    } finally {
      setCreatingTask(false)
    }
  }

  if (isLoading) {
    return (
      <StatePanel
        loading
        title="Loading email"
        description="Pulling the latest message details, linked tasks, and AI analysis."
      />
    )
  }

  if (!email) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Email unavailable"
          description="We couldn't find this message in the current workspace."
          actions={(
            <Button variant="outline" onClick={() => router.push('/dashboard/emails')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to inbox
            </Button>
          )}
        />
        <StatePanel
          icon={<Mail className="h-5 w-5 text-gray-400" />}
          title="Email not found"
          description="It may have been removed, or the current account no longer has access to it."
        />
      </div>
    )
  }

  const cls = getEmailClassConfig(email.classification)
  const ClsIcon = cls.icon
  const senderName = email.sender?.split('<')[0]?.trim()
  const senderEmail = email.sender?.match(/<(.+?)>/)?.[1] || email.sender
  const senderInitial = (senderName || 'U')[0].toUpperCase()

  return (
    <div className="animate-in fade-in space-y-5 duration-200">
      <PageHeader
        title={email.subject}
        description="Review the message, linked work, and AI classification in one place."
        meta={`From ${senderName || senderEmail} • ${new Date(email.receivedAt).toLocaleString('en', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}`}
        actions={(
          <Button variant="outline" onClick={() => router.push('/dashboard/emails')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to inbox
          </Button>
        )}
      />

      <div className="mx-auto max-w-6xl space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: Email content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header card */}
          <Card className={`animate-fade-in-up stagger-2 overflow-hidden border-white/70 bg-gradient-to-br ${cls.bg} shadow-sm`}>
            <CardContent className="py-5 space-y-4">
              {/* Meta badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`gap-1 ${cls.color}`}>
                  <ClsIcon className="h-3 w-3" />
                  {cls.label}
                </Badge>
                {email.classConfidence && (
                  <Badge variant="outline" className="gap-1 bg-white/60 text-gray-500 border-gray-200 text-[10px]">
                    <Sparkles className="h-3 w-3" />
                    {Math.round(email.classConfidence * 100)}% confidence
                  </Badge>
                )}
                {email.hasAttachments && (
                  <Badge variant="outline" className="gap-1 bg-white/60 text-gray-500 border-gray-200 text-[10px]">
                    <Paperclip className="h-3 w-3" />
                    Attachments
                  </Badge>
                )}
              </div>

              {/* Sender row */}
              <div className="flex items-center gap-3 rounded-xl bg-white/70 backdrop-blur-sm border px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                  {senderInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{senderName}</p>
                  <p className="text-xs text-gray-500">{senderEmail}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {new Date(email.receivedAt).toLocaleString('en', {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit',
                    })}
                  </div>
                  {email.accountEmail && (
                    <p className="text-[10px] text-gray-400 mt-0.5">To: {email.accountEmail}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email body */}
          <Card className="animate-fade-in-up stagger-3 border-white/70 bg-white/95 shadow-sm">
            <CardContent className="py-5">
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {email.bodyFull || email.bodyPreview}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* AI Analysis */}
          {email.classReasoning && (
            <Card className="animate-fade-in-up stagger-4 border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-yellow-600" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-yellow-800 leading-relaxed">{email.classReasoning}</p>
              </CardContent>
            </Card>
          )}

          {/* Linked Tasks */}
          {email.taskLinks?.length > 0 && (
            <Card className="animate-fade-in-up stagger-5 border-white/70 bg-white/95 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  Linked Tasks
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{email.taskLinks.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(email.taskLinks as EmailTaskLink[]).map((link) => {
                  const band = getPriorityBand(link.task.priorityScore || 0)
                  const isDone = link.task.status === 'completed' || link.task.status === 'dismissed'
                  const isUnlinking = unlinkingTaskId === link.task.id
                  return (
                    <div
                      key={link.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm group ${
                        isDone ? 'opacity-50 hover:opacity-70' : 'hover:bg-blue-50/50 hover:border-blue-200'
                      }`}
                    >
                      <Link
                        href={`/dashboard/tasks/${link.task.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className={`h-8 w-1 shrink-0 rounded-full ${
                          band === 'critical' ? 'bg-red-500' : band === 'high' ? 'bg-orange-400' : band === 'medium' ? 'bg-yellow-400' : 'bg-gray-300'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium transition-colors ${isDone ? 'text-gray-400 line-through' : 'text-gray-900 group-hover:text-blue-600'}`}>
                            {link.task.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                              link.task.status === 'completed' ? 'bg-green-100 text-green-700' :
                              link.task.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                              link.task.status === 'dismissed' ? 'bg-gray-100 text-gray-500' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {link.task.status}
                            </span>
                            <Badge variant="outline" className={`text-[9px] ${getPriorityColor(band)}`}>
                              {getPriorityLabel(band)}
                            </Badge>
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm('Remove this task from the email?')) {
                            unlinkTask(link.task.id)
                          }
                        }}
                        disabled={isUnlinking}
                        className="shrink-0 p-1 rounded hover:bg-red-50 transition-colors text-gray-300 hover:text-red-500 disabled:opacity-50"
                        title="Remove task"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Email metadata */}
          <Card className="animate-fade-in-up stagger-6 border-white/70 bg-white/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-gray-400" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Classification</dt>
                  <dd className="font-medium text-gray-700">{cls.label}</dd>
                </div>
                {email.classConfidence && (
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Confidence</dt>
                    <dd className="font-medium text-gray-700">{Math.round(email.classConfidence * 100)}%</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-400">Received</dt>
                  <dd className="font-medium text-gray-700">{new Date(email.receivedAt).toLocaleDateString()}</dd>
                </div>
                {email.accountEmail && (
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Account</dt>
                    <dd className="font-medium text-gray-700">{email.accountEmail}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-400">Tasks linked</dt>
                  <dd className="font-medium text-gray-700">{email.taskLinks?.length || 0}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Reclassify */}
          <Card className="animate-fade-in-up stagger-7 border-white/70 bg-white/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-blue-600" />
                Mark As
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(EMAIL_CLASS_CONFIG).map(([key, config]) => (
                <Button
                  key={key}
                  variant={email.classification === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleClassify(key)}
                  disabled={classifying}
                  className="w-full justify-start gap-2"
                >
                  <config.icon className="h-3.5 w-3.5" />
                  {config.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="animate-fade-in-up stagger-8 border-white/70 bg-white/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Plus className="h-4 w-4 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create Task
              </Button>
            </CardContent>
          </Card>

        </div>
        </div>
      </div>

      {/* Create Task Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Create Task from Email</DialogTitle>
            <DialogDescription>
              Start a task from this message and keep the link back to the source email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="email-task-title">Task Title</Label>
              <Input
                id="email-task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-task-summary">Summary</Label>
              <Textarea
                id="email-task-summary"
                value={taskSummary}
                onChange={(e) => setTaskSummary(e.target.value)}
                placeholder="Add a short task summary"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Linked Emails</Label>
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded border border-blue-200 bg-white">
                    <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="flex-1 truncate text-sm text-gray-700">{email.subject}</span>
                  <span className="text-xs font-medium text-blue-600">Current email</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={creatingTask || !taskTitle.trim()}>
              {creatingTask ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

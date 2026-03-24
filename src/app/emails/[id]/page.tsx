'use client'

import { useQuery } from '@tanstack/react-query'
import { useDemoSession } from '@/lib/use-demo-session'
import { redirect, useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Mail, Paperclip, Clock, User, ArrowUpRight,
  CheckSquare, AlertTriangle, Eye, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { getPriorityBand, getPriorityColor, getPriorityLabel } from '@/types'

const classConfig: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  action: { label: 'Action Required', color: 'bg-red-50 text-red-700 border-red-200', icon: CheckSquare },
  awareness: { label: 'Awareness / FYI', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Eye },
  ignore: { label: 'Low Priority', color: 'bg-gray-50 text-gray-500 border-gray-200', icon: Trash2 },
  uncertain: { label: 'Needs Review', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: AlertTriangle },
}

export default function EmailDetailPage() {
  const { status } = useDemoSession()
  if (status === 'unauthenticated') redirect('/auth/signin')

  const params = useParams()
  const router = useRouter()
  const emailId = params.id as string

  const { data: res, isLoading } = useQuery({
    queryKey: ['email', emailId],
    queryFn: () => fetch(`/api/emails/${emailId}`).then((r) => r.json()),
  })

  const email = res?.data

  if (isLoading) {
    return (
      <div className="animate-in fade-in mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-lg border bg-gray-100" />
      </div>
    )
  }

  if (!email) {
    return (
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => router.push('/emails')} className="gap-2 text-gray-500 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </Button>
        <p className="text-gray-400">Email not found.</p>
      </div>
    )
  }

  const cls = classConfig[email.classification] || classConfig.uncertain
  const ClsIcon = cls.icon
  const senderName = email.sender?.split('<')[0]?.trim()
  const senderEmail = email.sender?.match(/<(.+?)>/)?.[1] || email.sender

  return (
    <div className="animate-in fade-in slide-in-from-right-4 mx-auto max-w-3xl space-y-5 duration-300">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/emails')} className="gap-2 text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back to inbox
      </Button>

      {/* Email header */}
      <Card>
        <CardContent className="py-5 space-y-4">
          {/* Subject */}
          <h1 className="text-xl font-bold text-gray-900">{email.subject}</h1>

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className={`gap-1 ${cls.color}`}>
              <ClsIcon className="h-3 w-3" />
              {cls.label}
            </Badge>
            {email.classConfidence && (
              <span className="text-xs text-gray-400">
                AI Confidence: {Math.round(email.classConfidence * 100)}%
              </span>
            )}
            {email.hasAttachments && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Paperclip className="h-3 w-3" />
                Attachments
              </span>
            )}
          </div>

          {/* Sender info */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{senderName}</p>
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
                <p className="text-[10px] text-gray-400 mt-0.5">
                  To: {email.accountEmail}
                </p>
              )}
            </div>
          </div>

          {/* AI reasoning */}
          {email.classReasoning && (
            <div className="rounded-lg border border-yellow-100 bg-yellow-50/50 px-4 py-2.5">
              <p className="text-xs text-yellow-800">
                <span className="font-semibold">AI reasoning:</span> {email.classReasoning}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email body */}
      <Card>
        <CardContent className="py-5">
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {email.bodyFull || email.bodyPreview}
          </div>
        </CardContent>
      </Card>

      {/* Linked tasks */}
      {email.taskLinks?.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <CheckSquare className="h-4 w-4 text-blue-600" />
              Linked Tasks
            </h3>
            <div className="space-y-2">
              {email.taskLinks.map((link: any) => {
                const band = getPriorityBand(link.task.priorityScore || 0)
                return (
                  <Link
                    key={link.id}
                    href={`/tasks/${link.task.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:bg-gray-50 hover:border-blue-200 hover:shadow-sm group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {link.task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[10px] ${getPriorityColor(band)}`}>
                          {getPriorityLabel(band)}
                        </Badge>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          link.task.status === 'completed' ? 'bg-green-100 text-green-700' :
                          link.task.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                          link.task.status === 'dismissed' ? 'bg-gray-100 text-gray-500' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {link.task.status}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" />
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

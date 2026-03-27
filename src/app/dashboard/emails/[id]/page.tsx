'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Mail, Paperclip, Clock, User, ArrowUpRight,
  CheckSquare, AlertTriangle, Eye, Trash2, Sparkles, Shield,
} from 'lucide-react'
import Link from 'next/link'
import { getPriorityBand, getPriorityColor, getPriorityLabel } from '@/types'

const classConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Mail }> = {
  action: { label: 'Action Required', color: 'bg-red-50 text-red-700 border-red-200', bg: 'from-red-50/50 to-white', icon: CheckSquare },
  awareness: { label: 'Awareness / FYI', color: 'bg-blue-50 text-blue-700 border-blue-200', bg: 'from-blue-50/50 to-white', icon: Eye },
  ignore: { label: 'Low Priority', color: 'bg-gray-50 text-gray-500 border-gray-200', bg: 'from-gray-50/50 to-white', icon: Trash2 },
  uncertain: { label: 'Needs Review', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', bg: 'from-yellow-50/50 to-white', icon: AlertTriangle },
}

export default function EmailDetailPage() {
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
      <div className="animate-in fade-in mx-auto max-w-4xl space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl border bg-gray-100" />
        <div className="h-40 animate-pulse rounded-xl border bg-gray-100" />
      </div>
    )
  }

  if (!email) {
    return (
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/emails')} className="gap-2 text-gray-500 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-gray-400">Email not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const cls = classConfig[email.classification] || classConfig.uncertain
  const ClsIcon = cls.icon
  const senderName = email.sender?.split('<')[0]?.trim()
  const senderEmail = email.sender?.match(/<(.+?)>/)?.[1] || email.sender
  const senderInitial = (senderName || 'U')[0].toUpperCase()

  return (
    <div className="animate-in fade-in mx-auto max-w-4xl space-y-5 duration-200">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/emails')} className="gap-2 text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back to inbox
      </Button>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: Email content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header card */}
          <Card className={`bg-gradient-to-br ${cls.bg} overflow-hidden`}>
            <CardContent className="py-5 space-y-4">
              {/* Subject */}
              <h1 className="text-xl font-bold text-gray-900 leading-snug">{email.subject}</h1>

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
          <Card>
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
            <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-white">
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  Linked Tasks
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{email.taskLinks.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {email.taskLinks.map((link: any) => {
                  const band = getPriorityBand(link.task.priorityScore || 0)
                  const isDone = link.task.status === 'completed' || link.task.status === 'dismissed'
                  return (
                    <Link
                      key={link.id}
                      href={`/dashboard/tasks/${link.task.id}`}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm group ${
                        isDone ? 'opacity-50 hover:opacity-70' : 'hover:bg-blue-50/50 hover:border-blue-200'
                      }`}
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
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Email metadata */}
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
        </div>
      </div>
    </div>
  )
}

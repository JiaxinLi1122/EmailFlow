'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FolderOpen, Sparkles, UserRound } from 'lucide-react'
import { toast } from 'sonner'

import type { BatchClassificationReviewPayload } from '@/services/email-sync-service'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  payload: BatchClassificationReviewPayload | null
  onConfirmed?: () => void
}

type ExistingIdentity = {
  id: string
  name: string
}

type ExistingProject = {
  id: string
  name: string
  identityId?: string | null
}

type EditableIdentity = {
  id: string
  finalName: string
  targetIdentityId: string
}

type EditableProject = {
  id: string
  finalName: string
  identityId: string
  targetProjectId: string
}

type EditableAssignment = {
  matterId: string
  projectId: string
}

const KEEP_NEW = '__keep_new__'

export function BatchClassificationReviewDialog({ open, onOpenChange, payload, onConfirmed }: Props) {
  const [saving, setSaving] = useState(false)
  const [identities, setIdentities] = useState<EditableIdentity[]>([])
  const [projects, setProjects] = useState<EditableProject[]>([])
  const [assignments, setAssignments] = useState<EditableAssignment[]>([])

  const { data: identitiesRes } = useQuery({
    queryKey: ['identities'],
    queryFn: () => fetch('/api/identities').then((r) => r.json()),
    enabled: open,
  })

  const { data: projectsRes } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then((r) => r.json()),
    enabled: open,
  })

  const existingIdentities = useMemo(() => ((identitiesRes?.data || []) as ExistingIdentity[]), [identitiesRes?.data])
  const existingProjects = useMemo(() => ((projectsRes?.data || []) as ExistingProject[]), [projectsRes?.data])

  useEffect(() => {
    if (!payload) {
      setIdentities([])
      setProjects([])
      setAssignments([])
      return
    }

    setIdentities(payload.newIdentities.map((identity) => ({
      id: identity.id,
      finalName: identity.name,
      targetIdentityId: KEEP_NEW,
    })))

    setProjects(payload.newProjects.map((project) => {
      const linkedIdentity = payload.items.find((item) => item.project?.id === project.id)?.identity

      return {
        id: project.id,
        finalName: project.name,
        identityId: linkedIdentity?.id ?? '',
        targetProjectId: KEEP_NEW,
      }
    }))

    setAssignments(
      payload.items
        .filter((item) => item.matterId && item.project?.id)
        .map((item) => ({
          matterId: item.matterId!,
          projectId: item.project!.id,
        }))
    )
  }, [payload])

  const identityOptions = useMemo(() => {
    const map = new Map<string, string>()

    existingIdentities.forEach((identity) => map.set(identity.id, identity.name))
    identities.forEach((identity) => map.set(identity.id, identity.finalName))

    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [existingIdentities, identities])

  const payloadIdentityReasons = useMemo(() => {
    const map = new Map<string, string>()
    if (!payload) return map
    for (const item of payload.newIdentities) {
      if (item.reason) map.set(item.id, item.reason)
    }
    return map
  }, [payload])

  const payloadProjectReasons = useMemo(() => {
    const map = new Map<string, string>()
    if (!payload) return map
    for (const item of payload.newProjects) {
      if (item.reason) map.set(item.id, item.reason)
    }
    return map
  }, [payload])

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>()

    existingProjects.forEach((project) => map.set(project.id, project.name))
    projects.forEach((project) => map.set(project.id, project.finalName))

    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [existingProjects, projects])

  async function handleConfirm() {
    if (!payload) return

    setSaving(true)
    try {
      const res = await fetch('/api/review/classifications/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identities: identities.map((identity) => ({
            id: identity.id,
            finalName: identity.finalName,
            targetIdentityId: identity.targetIdentityId === KEEP_NEW ? null : identity.targetIdentityId,
          })),
          projects: projects.map((project) => ({
            id: project.id,
            finalName: project.finalName,
            identityId: project.identityId || null,
            targetProjectId: project.targetProjectId === KEEP_NEW ? null : project.targetProjectId,
          })),
          assignments,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || 'Failed to confirm classifications')
      }

      toast.success('Project and identity review saved')
      onOpenChange(false)
      onConfirmed?.()
    } catch (err) {
      console.error('Failed to confirm review:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to confirm review')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0" showCloseButton={!saving}>
        <DialogHeader className="border-b border-gray-200/80 px-6 pt-6">
          <DialogTitle>Review new identity and project guesses</DialogTitle>
          <DialogDescription>
            Confirm what should stay new, what should merge into something existing, and where each matter should live.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[72vh] space-y-6 overflow-y-auto px-6 py-5">
          {identities.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <UserRound className="h-4 w-4 text-blue-600" />
                New identities detected
              </div>
              <div className="grid gap-3">
                {identities.map((identity, index) => (
                  <div key={identity.id} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
                      <div>
                        <Label htmlFor={`identity-${identity.id}`}>Identity name</Label>
                        <Input
                          id={`identity-${identity.id}`}
                          className="mt-2 bg-white"
                          value={identity.finalName}
                          onChange={(event) => {
                            const next = [...identities]
                            next[index] = { ...next[index], finalName: event.target.value }
                            setIdentities(next)
                          }}
                        />
                      </div>
                      <div>
                        <Label>Or merge into existing</Label>
                        <Select
                          value={identity.targetIdentityId}
                          onValueChange={(value) => {
                            const next = [...identities]
                            next[index] = { ...next[index], targetIdentityId: value ?? KEEP_NEW }
                            setIdentities(next)
                          }}
                        >
                          <SelectTrigger className="mt-2 w-full bg-white">
                            <SelectValue placeholder="Keep as new identity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={KEEP_NEW}>Keep as new identity</SelectItem>
                            {existingIdentities
                              .filter((option) => option.id !== identity.id)
                              .map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {payloadIdentityReasons.get(identity.id) && (
                      <p className="mt-3 text-xs text-blue-700/80">
                        {payloadIdentityReasons.get(identity.id)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {projects.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <FolderOpen className="h-4 w-4 text-blue-600" />
                New projects detected
              </div>
              <div className="grid gap-3">
                {projects.map((project, index) => (
                  <div key={project.id} className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr]">
                      <div>
                        <Label htmlFor={`project-${project.id}`}>Project name</Label>
                        <Input
                          id={`project-${project.id}`}
                          className="mt-2"
                          value={project.finalName}
                          onChange={(event) => {
                            const next = [...projects]
                            next[index] = { ...next[index], finalName: event.target.value }
                            setProjects(next)
                          }}
                        />
                      </div>
                      <div>
                        <Label>Identity</Label>
                        <Select
                          value={project.identityId || ''}
                          onValueChange={(value) => {
                            const next = [...projects]
                            next[index] = { ...next[index], identityId: value ?? '', finalName: next[index].finalName }
                            setProjects(next)
                          }}
                        >
                          <SelectTrigger className="mt-2 w-full bg-white">
                            <SelectValue placeholder="Choose identity" />
                          </SelectTrigger>
                          <SelectContent>
                            {identityOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Or merge into existing</Label>
                        <Select
                          value={project.targetProjectId}
                          onValueChange={(value) => {
                            const next = [...projects]
                            next[index] = { ...next[index], targetProjectId: value ?? KEEP_NEW, finalName: next[index].finalName, identityId: next[index].identityId }
                            setProjects(next)
                          }}
                        >
                          <SelectTrigger className="mt-2 w-full bg-white">
                            <SelectValue placeholder="Keep as new project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={KEEP_NEW}>Keep as new project</SelectItem>
                            {existingProjects
                              .filter((option) => option.id !== project.id)
                              .map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {payloadProjectReasons.get(project.id) && (
                      <p className="mt-3 text-xs text-gray-500">
                        {payloadProjectReasons.get(project.id)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {payload && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Matter assignments from this sync
              </div>
              <div className="space-y-2">
                {payload.items.map((item) => {
                  const assignment = assignments.find((entry) => entry.matterId === item.matterId)
                  return (
                    <div key={`${item.emailId}-${item.matterId ?? 'matterless'}`} className="rounded-2xl border border-gray-200/80 bg-gray-50/70 p-4">
                      <div className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.matterTitle}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                            {item.project && <span>Suggested project: {item.project.name}</span>}
                            {item.identity && <span>Identity: {item.identity.name}</span>}
                            {item.taskId && <span>Task extracted</span>}
                          </div>
                          {(item.project?.reason || item.identity?.reason) && (
                            <div className="mt-2 space-y-1 text-xs text-gray-500">
                              {item.project?.reason ? <p>Project reason: {item.project.reason}</p> : null}
                              {item.identity?.reason ? <p>Identity reason: {item.identity.reason}</p> : null}
                            </div>
                          )}
                        </div>
                        {item.matterId ? (
                          <div>
                            <Label>Assign to project</Label>
                            <Select
                              value={assignment?.projectId ?? item.project?.id ?? ''}
                              onValueChange={(value) => {
                                const nextProjectId = value ?? ''
                                const matterId = item.matterId
                                if (!matterId || !nextProjectId) return
                                setAssignments((prev) => {
                                  const next = prev.filter((entry) => entry.matterId !== matterId)
                                  next.push({ matterId, projectId: nextProjectId })
                                  return next
                                })
                              }}
                            >
                              <SelectTrigger className="mt-2 w-full bg-white">
                                <SelectValue placeholder="Choose project" />
                              </SelectTrigger>
                              <SelectContent>
                                {projectOptions.map((option) => (
                                  <SelectItem key={option.id} value={option.id}>
                                    {option.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Review later
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !payload}>
            {saving ? 'Saving...' : 'Confirm and save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

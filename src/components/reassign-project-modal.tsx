'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InlineNotice } from '@/components/inline-notice'
import { UserRound, FolderOpen, Plus, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { CACHE_TIME } from '@/lib/query-cache'

type Identity = { id: string; name: string }
type Project = { id: string; name: string; identity: Identity | null }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  threadId: string
  currentProject?: { id: string; name: string; identity: { id: string; name: string } | null } | null
  invalidateKeys?: string[][]
}

export function ReassignProjectModal({
  open,
  onOpenChange,
  threadId,
  currentProject,
  invalidateKeys = [],
}: Props) {
  const queryClient = useQueryClient()

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectIdentityId, setNewProjectIdentityId] = useState<string | ''>('')
  const [showNewIdentity, setShowNewIdentity] = useState(false)
  const [newIdentityName, setNewIdentityName] = useState('')
  const [collapsedIdentities, setCollapsedIdentities] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const { data: projectsRes } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then((r) => r.json()),
    enabled: open,
    staleTime: CACHE_TIME.taxonomy,
  })
  const { data: identitiesRes } = useQuery({
    queryKey: ['identities'],
    queryFn: () => fetch('/api/identities').then((r) => r.json()),
    enabled: open,
    staleTime: CACHE_TIME.taxonomy,
  })

  const projects = useMemo(() => (projectsRes?.data || []) as Project[], [projectsRes?.data])
  const identities = useMemo(() => (identitiesRes?.data || []) as Identity[], [identitiesRes?.data])

  const grouped = useMemo(() => {
    const map = new Map<string, { identity: Identity | null; projects: Project[] }>()
    const noIdentityKey = '__none__'

    for (const project of projects) {
      const key = project.identity?.id || noIdentityKey
      if (!map.has(key)) {
        map.set(key, { identity: project.identity, projects: [] })
      }
      map.get(key)?.projects.push(project)
    }

    return Array.from(map.values()).sort((a, b) =>
      (a.identity?.name || 'zzz').localeCompare(b.identity?.name || 'zzz')
    )
  }, [projects])

  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped

    const query = search.toLowerCase()
    return grouped
      .map((group) => ({
        ...group,
        projects: group.projects.filter(
          (project) =>
            project.name.toLowerCase().includes(query) ||
            group.identity?.name.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.projects.length > 0)
  }, [grouped, search])

  const toggleIdentity = (key: string) =>
    setCollapsedIdentities((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })

  const reset = () => {
    setSelectedProjectId(null)
    setSearch('')
    setShowNewProject(false)
    setNewProjectName('')
    setNewProjectIdentityId('')
    setShowNewIdentity(false)
    setNewIdentityName('')
    setSaving(false)
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      let projectId = selectedProjectId
      let identityId = newProjectIdentityId || null

      if (showNewProject && showNewIdentity && newIdentityName.trim()) {
        const identityRes = await fetch('/api/identities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newIdentityName.trim() }),
        })
        const identityData = await identityRes.json()
        if (!identityData.data?.id) throw new Error('Failed to create identity')
        identityId = identityData.data.id
        queryClient.invalidateQueries({ queryKey: ['identities'] })
      }

      if (showNewProject && newProjectName.trim()) {
        const projectRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newProjectName.trim(), identityId }),
        })
        const projectData = await projectRes.json()
        if (!projectData.data?.id) throw new Error('Failed to create project')
        projectId = projectData.data.id
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      }

      if (!projectId) {
        toast.error('Please select or create a project')
        return
      }

      const res = await fetch('/api/threads/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, projectId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reassign')

      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['emails'] })

      const affectedTasks = data.data.affectedTasks as number
      const affectedEmails = data.data.affectedEmails as number
      toast.success(
        `Reassigned: ${affectedTasks} task${affectedTasks !== 1 ? 's' : ''} and ${affectedEmails} email${affectedEmails !== 1 ? 's' : ''} updated`
      )
      handleClose(false)
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const canSave = showNewProject ? !!newProjectName.trim() : !!selectedProjectId
  const isCurrentProject = (id: string) => id === currentProject?.id

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {currentProject && (
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <span className="font-medium text-slate-400">Current:</span>
              <UserRound className="h-3 w-3" />
              <span>{currentProject.identity?.name || 'Unassigned'}</span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <FolderOpen className="h-3 w-3" />
              <span className="font-medium text-slate-700">{currentProject.name}</span>
            </div>
          )}

          <InlineNotice variant="info">
            All tasks and emails in this email thread will be reassigned together.
          </InlineNotice>

          {!showNewProject ? (
            <>
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />

              <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                {filteredGrouped.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-slate-400">No projects found</p>
                )}
                {filteredGrouped.map((group) => {
                  const key = group.identity?.id || '__none__'
                  const isCollapsed = collapsedIdentities.has(key)

                  return (
                    <div key={key}>
                      <button
                        onClick={() => toggleIdentity(key)}
                        className="flex w-full items-center gap-2 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:bg-slate-100"
                      >
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                        />
                        <UserRound className="h-3 w-3" />
                        {group.identity?.name || 'No Identity'}
                      </button>

                      {!isCollapsed &&
                        group.projects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => setSelectedProjectId(project.id)}
                            disabled={isCurrentProject(project.id)}
                            className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                              isCurrentProject(project.id)
                                ? 'cursor-default text-slate-400'
                                : selectedProjectId === project.id
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1">{project.name}</span>
                            {isCurrentProject(project.id) && (
                              <span className="text-[10px] text-slate-400">current</span>
                            )}
                            {selectedProjectId === project.id && !isCurrentProject(project.id) && (
                              <Check className="h-3.5 w-3.5 text-blue-600" />
                            )}
                          </button>
                        ))}
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => {
                  setShowNewProject(true)
                  setSelectedProjectId(null)
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Create new project
              </button>
            </>
          ) : (
            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
              <p className="text-xs font-semibold text-blue-700">New Project</p>

              <div className="space-y-1.5">
                <Label className="text-xs">Project name</Label>
                <Input
                  placeholder="e.g. Website Redesign"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="h-9"
                  autoFocus
                />
              </div>

              {!showNewIdentity ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Identity (optional)</Label>
                  <select
                    value={newProjectIdentityId}
                    onChange={(e) => setNewProjectIdentityId(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">None</option>
                    {identities.map((identity) => (
                      <option key={identity.id} value={identity.id}>
                        {identity.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowNewIdentity(true)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-3 w-3" />
                    Create new identity instead
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs">New identity name</Label>
                  <Input
                    placeholder="e.g. PM at TechCorp"
                    value={newIdentityName}
                    onChange={(e) => setNewIdentityName(e.target.value)}
                    className="h-9"
                  />
                  <button
                    onClick={() => {
                      setShowNewIdentity(false)
                      setNewIdentityName('')
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Pick existing identity instead
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setShowNewProject(false)
                  setNewProjectName('')
                  setNewProjectIdentityId('')
                  setShowNewIdentity(false)
                  setNewIdentityName('')
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ← Back to existing projects
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

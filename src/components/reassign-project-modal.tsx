'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InlineNotice } from '@/components/inline-notice'
import { UserRound, FolderOpen, Plus, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

type Identity = { id: string; name: string }
type Project = { id: string; name: string; identity: Identity | null }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  threadId: string
  currentProject?: { id: string; name: string; identity: { id: string; name: string } | null } | null
  /** query keys to invalidate on success */
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

  // Create new project form
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectIdentityId, setNewProjectIdentityId] = useState<string | ''>('')
  const [showNewIdentity, setShowNewIdentity] = useState(false)
  const [newIdentityName, setNewIdentityName] = useState('')

  // Collapsed identity sections in the picker
  const [collapsedIdentities, setCollapsedIdentities] = useState<Set<string>>(new Set())

  const [saving, setSaving] = useState(false)
  const [affectedCounts, setAffectedCounts] = useState<{ tasks: number; emails: number } | null>(null)

  const { data: projectsRes } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then((r) => r.json()),
    enabled: open,
  })
  const { data: identitiesRes } = useQuery({
    queryKey: ['identities'],
    queryFn: () => fetch('/api/identities').then((r) => r.json()),
    enabled: open,
  })

  const projects: Project[] = projectsRes?.data || []
  const identities: Identity[] = identitiesRes?.data || []

  // Group projects by identity
  const grouped = useMemo(() => {
    const map = new Map<string, { identity: Identity | null; projects: Project[] }>()
    const noIdentityKey = '__none__'
    for (const p of projects) {
      const key = p.identity?.id || noIdentityKey
      if (!map.has(key)) map.set(key, { identity: p.identity, projects: [] })
      map.get(key)!.projects.push(p)
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.identity?.name || 'zzz').localeCompare(b.identity?.name || 'zzz')
    )
  }, [projects])

  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped
    const q = search.toLowerCase()
    return grouped
      .map((g) => ({
        ...g,
        projects: g.projects.filter(
          (p) => p.name.toLowerCase().includes(q) || g.identity?.name.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.projects.length > 0)
  }, [grouped, search])

  const toggleIdentity = (key: string) =>
    setCollapsedIdentities((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
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
    setAffectedCounts(null)
    setSaving(false)
  }

  const handleClose = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let projectId = selectedProjectId

      // Create new identity if needed
      let identityId = newProjectIdentityId || null
      if (showNewProject && showNewIdentity && newIdentityName.trim()) {
        const res = await fetch('/api/identities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newIdentityName.trim() }),
        })
        const data = await res.json()
        if (!data.data?.id) throw new Error('Failed to create identity')
        identityId = data.data.id
        queryClient.invalidateQueries({ queryKey: ['identities'] })
      }

      // Create new project if needed
      if (showNewProject && newProjectName.trim()) {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newProjectName.trim(), identityId }),
        })
        const data = await res.json()
        if (!data.data?.id) throw new Error('Failed to create project')
        projectId = data.data.id
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      }

      if (!projectId) {
        toast.error('Please select or create a project')
        return
      }

      // Reassign thread
      const res = await fetch('/api/threads/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, projectId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reassign')

      // Invalidate all relevant caches
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['emails'] })

      toast.success(
        `Reassigned — ${data.data.affectedTasks} task${data.data.affectedTasks !== 1 ? 's' : ''} and ${data.data.affectedEmails} email${data.data.affectedEmails !== 1 ? 's' : ''} updated`
      )
      handleClose(false)
    } catch (err) {
      console.error(err)
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
          {/* Current assignment */}
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

          {/* Thread impact notice */}
          <InlineNotice variant="info">
            All tasks and emails in this email thread will be reassigned together.
          </InlineNotice>

          {!showNewProject ? (
            <>
              {/* Search */}
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />

              {/* Project list */}
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {filteredGrouped.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-slate-400">No projects found</p>
                )}
                {filteredGrouped.map((group) => {
                  const key = group.identity?.id || '__none__'
                  const isCollapsed = collapsedIdentities.has(key)
                  return (
                    <div key={key}>
                      {/* Identity row */}
                      <button
                        onClick={() => toggleIdentity(key)}
                        className="flex w-full items-center gap-2 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:bg-slate-100"
                      >
                        <ChevronDown className={`h-3 w-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                        <UserRound className="h-3 w-3" />
                        {group.identity?.name || 'No Identity'}
                      </button>
                      {!isCollapsed && group.projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => setSelectedProjectId(project.id)}
                          disabled={isCurrentProject(project.id)}
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                            isCurrentProject(project.id)
                              ? 'cursor-default text-slate-400'
                              : selectedProjectId === project.id
                              ? 'bg-blue-50 text-blue-700'
                              : 'hover:bg-slate-50 text-slate-700'
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

              {/* Create new project toggle */}
              <button
                onClick={() => { setShowNewProject(true); setSelectedProjectId(null) }}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Create new project
              </button>
            </>
          ) : (
            /* Create new project form */
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
                    {identities.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
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
                    onClick={() => { setShowNewIdentity(false); setNewIdentityName('') }}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Pick existing identity instead
                  </button>
                </div>
              )}

              <button
                onClick={() => { setShowNewProject(false); setNewProjectName(''); setNewProjectIdentityId(''); setShowNewIdentity(false); setNewIdentityName('') }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ← Back to existing projects
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

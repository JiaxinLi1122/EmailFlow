import { NextResponse } from 'next/server'
import { getAuthUser, success, error } from '@/lib/api-helpers'
import * as identityRepo from '@/repositories/identity-repo'
import * as projectContextRepo from '@/repositories/project-context-repo'
import * as matterMemoryRepo from '@/repositories/matter-memory-repo'

type ConfirmPayload = {
  identities?: Array<{
    id: string
    finalName?: string
    targetIdentityId?: string | null
  }>
  projects?: Array<{
    id: string
    finalName?: string
    identityId?: string | null
    targetProjectId?: string | null
  }>
  assignments?: Array<{
    matterId: string
    projectId: string
  }>
}

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  try {
    const body = (await req.json()) as ConfirmPayload
    const identityIdMap = new Map<string, string>()
    const projectIdMap = new Map<string, string>()

    for (const identity of body.identities ?? []) {
      if (identity.targetIdentityId && identity.targetIdentityId !== identity.id) {
        identityIdMap.set(identity.id, identity.targetIdentityId)
        continue
      }

      const confirmed = await identityRepo.confirmIdentity(identity.id, {
        name: identity.finalName,
      })
      identityIdMap.set(identity.id, confirmed.id)
    }

    for (const project of body.projects ?? []) {
      if (project.targetProjectId && project.targetProjectId !== project.id) {
        if (project.identityId) {
          await projectContextRepo.assignIdentity(project.targetProjectId, project.identityId)
        }
        projectIdMap.set(project.id, project.targetProjectId)
        continue
      }

      const resolvedIdentityId =
        project.identityId && identityIdMap.has(project.identityId)
          ? identityIdMap.get(project.identityId)!
          : project.identityId

      const confirmed = await projectContextRepo.confirmProject(project.id, {
        name: project.finalName,
        identityId: resolvedIdentityId,
      })
      projectIdMap.set(project.id, confirmed.id)
    }

    for (const assignment of body.assignments ?? []) {
      const resolvedProjectId = projectIdMap.get(assignment.projectId) ?? assignment.projectId
      await matterMemoryRepo.setProjectContext(assignment.matterId, resolvedProjectId)
    }

    return success({ confirmed: true })
  } catch (err) {
    console.error('[api/review/classifications/confirm POST]', err)
    const message = err instanceof Error ? err.message : 'Failed to confirm classifications'
    return NextResponse.json({ success: false, error: { code: 'REVIEW_CONFIRM_FAILED', message } }, { status: 500 })
  }
}

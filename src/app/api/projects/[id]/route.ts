export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { errorFromException, getAuthUser, success, error } from '@/lib/api-helpers'
import * as projectContextRepo from '@/repositories/project-context-repo'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    const { id } = await params
    const { name } = await req.json()

    if (!name?.trim()) return error('BAD_REQUEST', 'Name is required', 400)

    const existing = await projectContextRepo.findById(id)
    if (!existing || existing.userId !== user.id) return error('NOT_FOUND', 'Project not found', 404)

    const updated = await projectContextRepo.confirmProject(id, { name: name.trim() })
    return success(updated)
  } catch (err) {
    console.error('[api/projects/[id] PATCH]', err)
    return errorFromException(err, 'INTERNAL', 'Failed to rename project', 500)
  }
}

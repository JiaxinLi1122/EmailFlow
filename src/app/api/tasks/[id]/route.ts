export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { getAuthUser, success, error } from '@/lib/api-helpers'
import * as taskRepo from '@/repositories/task-repo'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  const { id } = await params
  const task = await taskRepo.findTaskById(user.id, id)
  if (!task) return error('NOT_FOUND', 'Task not found', 404)
  return success(task)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  const { id } = await params
  const body = await req.json()

  // Verify ownership
  const existing = await taskRepo.findTaskById(user.id, id)
  if (!existing) return error('NOT_FOUND', 'Task not found', 404)

  // Build update data from allowed fields
  const allowed = [
    'title', 'summary', 'status', 'urgency', 'impact',
    'startDate', 'userSetDeadline', 'userNotes', 'checkedActionItems',
  ]
  const dateFields = ['startDate', 'userSetDeadline']
  const data: any = { isUserEdited: true, updatedAt: new Date() }

  for (const field of allowed) {
    if (body[field] !== undefined) {
      if (dateFields.includes(field) && body[field]) {
        data[field] = new Date(body[field])
      } else if (dateFields.includes(field) && !body[field]) {
        data[field] = null
      } else {
        data[field] = body[field]
      }
    }
  }

  // Recalculate priority score if urgency or impact changed
  if (data.urgency || data.impact) {
    const u = data.urgency || existing.urgency || 1
    const i = data.impact || existing.impact || 1
    data.priorityScore = u * i
  }

  // Handle status transitions
  if (body.status === 'confirmed') {
    data.confirmedAt = new Date()
    data.dismissedAt = null
    data.completedAt = null
  } else if (body.status === 'dismissed') {
    data.dismissedAt = new Date()
    data.completedAt = null
  } else if (body.status === 'completed') {
    data.completedAt = new Date()
    data.dismissedAt = null
  } else if (body.status === 'pending') {
    data.confirmedAt = null
    data.dismissedAt = null
    data.completedAt = null
  }

  const updated = await taskRepo.updateTask(id, data)
  return success(updated)
}

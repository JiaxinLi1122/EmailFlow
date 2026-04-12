export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { getAuthUser, success, error } from '@/lib/api-helpers'
import * as taskRepo from '@/repositories/task-repo'

type AllowedTaskField =
  | 'title'
  | 'summary'
  | 'status'
  | 'urgency'
  | 'impact'
  | 'startDate'
  | 'userSetDeadline'
  | 'userNotes'
  | 'checkedActionItems'
  | 'actionItems'

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
  const allowed: AllowedTaskField[] = [
    'title', 'summary', 'status', 'urgency', 'impact',
    'startDate', 'userSetDeadline', 'userNotes', 'checkedActionItems', 'actionItems',
  ]
  const dateFields = new Set<AllowedTaskField>(['startDate', 'userSetDeadline'])
  const data: Prisma.TaskUpdateInput = { isUserEdited: true, updatedAt: new Date() }

  for (const field of allowed) {
    if (body[field] !== undefined) {
      const value = body[field]

      if (dateFields.has(field)) {
        if (field === 'startDate') {
          data.startDate = value ? new Date(value) : null
        } else {
          data.userSetDeadline = value ? new Date(value) : null
        }
        continue
      }

      switch (field) {
        case 'title':
          data.title = value
          break
        case 'summary':
          data.summary = value
          break
        case 'status':
          data.status = value
          break
        case 'urgency':
          data.urgency = value
          break
        case 'impact':
          data.impact = value
          break
        case 'userNotes':
          data.userNotes = value
          break
        case 'checkedActionItems':
          data.checkedActionItems = value
          break
        case 'actionItems':
          data.actionItems = value
          break
      }
    }
  }

  // Recalculate priority score if urgency or impact changed
  const nextUrgency =
    typeof body.urgency === 'number' ? body.urgency : (existing.urgency ?? 1)
  const nextImpact =
    typeof body.impact === 'number' ? body.impact : (existing.impact ?? 1)

  if (body.urgency !== undefined || body.impact !== undefined) {
    const u = nextUrgency
    const i = nextImpact
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

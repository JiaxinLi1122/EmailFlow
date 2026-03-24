export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, success, error } from '@/lib/api-helpers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  const { id } = await params
  const task = await prisma.task.findFirst({
    where: { id, userId: user.id },
    include: {
      emailLinks: {
        include: {
          email: {
            select: {
              id: true,
              subject: true,
              sender: true,
              bodyPreview: true,
              receivedAt: true,
              classification: true,
            },
          },
        },
      },
    },
  })

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
  const existing = await prisma.task.findFirst({ where: { id, userId: user.id } })
  if (!existing) return error('NOT_FOUND', 'Task not found', 404)

  // Build update data from allowed fields
  const allowed = [
    'title', 'summary', 'status', 'urgency', 'impact',
    'startDate', 'userSetDeadline', 'userNotes',
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

  // Handle status transitions — allow reverting
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

  const updated = await prisma.task.update({ where: { id }, data })
  return success(updated)
}

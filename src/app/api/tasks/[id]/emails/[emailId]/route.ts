export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { getAuthUser, success, error } from '@/lib/api-helpers'
import * as taskRepo from '@/repositories/task-repo'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; emailId: string }> }
) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  const { id: taskId, emailId } = await params

  // Verify task ownership
  const task = await taskRepo.findTaskById(user.id, taskId)
  if (!task) return error('NOT_FOUND', 'Task not found', 404)

  // Delete the link
  try {
    await prisma.taskEmail.deleteMany({
      where: {
        taskId,
        emailId,
      },
    })
    return success({ message: 'Email unlinked from task' })
  } catch (err) {
    console.error('[api/tasks/[id]/emails/[emailId]]', err)
    return error('INTERNAL_ERROR', 'Failed to unlink email', 500)
  }
}

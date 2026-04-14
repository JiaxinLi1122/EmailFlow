export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { errorFromException, getAuthUser, success, error } from '@/lib/api-helpers'
import * as emailRepo from '@/repositories/email-repo'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const user = await getAuthUser()
    const { id: emailId, taskId } = await params

    const email = await emailRepo.findEmailById(user.id, emailId)
    if (!email) return error('NOT_FOUND', 'Email not found', 404)

    await prisma.taskEmail.deleteMany({
      where: {
        emailId,
        taskId,
      },
    })
    return success({ message: 'Task unlinked from email' })
  } catch (err) {
    console.error('[api/emails/[id]/tasks/[taskId]]', err)
    return errorFromException(err, 'INTERNAL_ERROR', 'Failed to unlink task', 500)
  }
}

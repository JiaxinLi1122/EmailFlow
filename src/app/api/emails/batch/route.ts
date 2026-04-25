export const dynamic = 'force-dynamic'
import { errorFromException, getAuthUser, success, error } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()
    const { ids, action, projectId }: { ids: string[]; action: 'reassign'; projectId?: string } = await req.json()

    if (!ids || ids.length === 0) return error('BAD_REQUEST', 'ids is required', 400)
    if (!action) return error('BAD_REQUEST', 'action is required', 400)

    if (action === 'reassign') {
      if (!projectId) return error('BAD_REQUEST', 'projectId is required for reassign', 400)

      const project = await prisma.projectContext.findFirst({
        where: { id: projectId, userId: user.id },
      })
      if (!project) return error('NOT_FOUND', 'Project not found', 404)

      let matter = await prisma.matterMemory.findFirst({
        where: { userId: user.id, projectContextId: projectId },
      })
      if (!matter) {
        matter = await prisma.matterMemory.create({
          data: {
            userId: user.id,
            projectContextId: projectId,
            title: project.name,
            summary: 'Manually assigned to this project',
            status: 'open',
            topic: 'other',
          },
        })
      }

      const emails = await prisma.email.findMany({
        where: { id: { in: ids }, userId: user.id },
        select: { threadId: true },
      })
      const threadIds = [...new Set(emails.map((e) => e.threadId).filter((t): t is string => !!t))]

      await Promise.all(
        threadIds.map((threadId) =>
          prisma.threadMemory.upsert({
            where: { userId_threadId: { userId: user.id, threadId } },
            update: { matterId: matter!.id },
            create: {
              userId: user.id,
              threadId,
              matterId: matter!.id,
              title: project.name,
              summary: 'Manually assigned',
            },
          })
        )
      )

      return success({ affected: threadIds.length })
    }

    return error('BAD_REQUEST', `Unknown action: ${action}`, 400)
  } catch (err) {
    console.error('[api/emails/batch]', err)
    return errorFromException(err, 'INTERNAL', 'Batch operation failed', 500)
  }
}

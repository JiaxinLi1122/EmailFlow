import { errorFromException, getAuthUser, success, error } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()

    const { threadId, projectId } = await req.json()
    if (!threadId || !projectId) return error('BAD_REQUEST', 'threadId and projectId are required', 400)

    // Verify project belongs to user
    const project = await prisma.projectContext.findFirst({
      where: { id: projectId, userId: user.id },
    })
    if (!project) return error('NOT_FOUND', 'Project not found', 404)

    // Find or create a MatterMemory for this project
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

    // Update or create ThreadMemory
    await prisma.threadMemory.upsert({
      where: { userId_threadId: { userId: user.id, threadId } },
      update: { matterId: matter.id },
      create: { userId: user.id, threadId, matterId: matter.id, title: project.name, summary: 'Manually assigned' },
    })

    // Count affected items for confirmation display
    const [affectedEmails, affectedTasks] = await Promise.all([
      prisma.email.count({ where: { userId: user.id, threadId } }),
      prisma.task.count({
        where: { userId: user.id, emailLinks: { some: { email: { threadId } } } },
      }),
    ])

    return success({ affectedEmails, affectedTasks })
  } catch (err) {
    console.error('[api/threads/reassign]', err)
    return errorFromException(err, 'INTERNAL', 'Failed to reassign thread', 500)
  }
}

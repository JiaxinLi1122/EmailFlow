import { errorFromException, getAuthUser, success, error } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    const { id: taskId } = await params
    const { projectId } = await req.json()

    if (!projectId) return error('BAD_REQUEST', 'projectId is required', 400)

    const [task, project] = await Promise.all([
      prisma.task.findFirst({ where: { id: taskId, userId: user.id } }),
      prisma.projectContext.findFirst({ where: { id: projectId, userId: user.id } }),
    ])
    if (!task) return error('NOT_FOUND', 'Task not found', 404)
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

    await prisma.task.update({ where: { id: taskId }, data: { matterId: matter.id } })

    return success({ taskId, matterId: matter.id })
  } catch (err) {
    console.error('[api/tasks/reassign]', err)
    return errorFromException(err, 'INTERNAL', 'Failed to reassign task', 500)
  }
}

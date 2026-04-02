export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { getAuthUser, success, error } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  const { title, summary, sourceEmailId, linkedEmailIds } = await req.json()

  if (!title || !sourceEmailId) {
    return error('BAD_REQUEST', 'Title and sourceEmailId are required', 400)
  }

  try {
    // Create task
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title,
        summary: summary || '',
        status: 'pending',
        urgency: 3,
        impact: 3,
        priorityScore: 9,
      },
    })

    // Link emails
    const emailIds = linkedEmailIds && linkedEmailIds.length > 0
      ? linkedEmailIds
      : [sourceEmailId]

    await Promise.all(
      emailIds.map((emailId: string) =>
        prisma.taskEmail.create({
          data: {
            taskId: task.id,
            emailId,
            relationship: 'source',
          },
        }).catch(() => {
          // Ignore if email doesn't exist or already linked
        })
      )
    )

    return success(task)
  } catch (err) {
    console.error('[api/emails/create-task]', err)
    return error('INTERNAL_ERROR', 'Failed to create task', 500)
  }
}

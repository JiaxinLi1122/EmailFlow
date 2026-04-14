export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { errorFromException, getAuthUser, success, error } from '@/lib/api-helpers'
import * as taskRepo from '@/repositories/task-repo'
import { invalidateStatsCache } from '@/repositories/stats-repo'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()

    const url = req.nextUrl
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const status = url.searchParams.get('status') || undefined
    const sort = (url.searchParams.get('sort') || 'priority') as 'priority' | 'date' | 'deadline' | 'title'

    const { tasks, total } = await taskRepo.findTasksPaginated(user.id, {
      page,
      limit,
      status,
      sort,
    })

    return success(tasks, {
      page,
      totalPages: Math.ceil(total / limit),
      totalCount: total,
    })
  } catch (err) {
    console.error('[api/tasks GET]', err)
    return errorFromException(err, 'INTERNAL_ERROR', 'Failed to load tasks', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()

    const { title, summary } = await req.json()

    if (!title) {
      return error('BAD_REQUEST', 'Title is required', 400)
    }

    // Create task with default values
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

    invalidateStatsCache(user.id)
    return success(task)
  } catch (err) {
    console.error('[api/tasks POST]', err)
    return errorFromException(err, 'INTERNAL_ERROR', 'Failed to create task', 500)
  }
}

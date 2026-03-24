export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, success, error } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  const url = req.nextUrl
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const status = url.searchParams.get('status')
  const sort = url.searchParams.get('sort') || 'priority' // priority | date | deadline

  const where: any = { userId: user.id }
  if (status) where.status = status

  const orderBy: any =
    sort === 'priority'
      ? { priorityScore: 'desc' }
      : sort === 'deadline'
        ? { inferredDeadline: 'asc' }
        : sort === 'title'
          ? { title: 'asc' }
          : { createdAt: 'desc' }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        emailLinks: {
          include: {
            email: {
              select: { id: true, subject: true, sender: true, receivedAt: true },
            },
          },
        },
      },
    }),
    prisma.task.count({ where }),
  ])

  return success(tasks, {
    page,
    totalPages: Math.ceil(total / limit),
    totalCount: total,
  })
}

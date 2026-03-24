export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, success, error } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  const url = req.nextUrl
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const classification = url.searchParams.get('classification')

  const where: any = { userId: user.id }
  if (classification) where.classification = classification

  const [emails, total] = await Promise.all([
    prisma.email.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        taskLinks: {
          include: { task: { select: { id: true, title: true, status: true } } },
        },
      },
    }),
    prisma.email.count({ where }),
  ])

  return success(emails, {
    page,
    totalPages: Math.ceil(total / limit),
    totalCount: total,
  })
}

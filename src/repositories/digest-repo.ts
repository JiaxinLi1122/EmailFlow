import { prisma } from '@/lib/prisma'

// ============================================================
// Digest Repository — all digest database operations
// ============================================================

export interface CreateDigestData {
  userId: string
  period: string
  periodStart: Date
  periodEnd: Date
  content: string
  stats: Record<string, number>
  isPreview?: boolean
}

export async function createDigest(data: CreateDigestData) {
  const isPreview = data.isPreview ?? false
  const existing = await prisma.digest.findFirst({
    where: { userId: data.userId, period: data.period, periodStart: data.periodStart },
  })

  if (existing) {
    return prisma.digest.update({
      where: { id: existing.id },
      data: {
        content: data.content,
        stats: JSON.stringify(data.stats),
        periodEnd: data.periodEnd,
        isPreview,
      },
    })
  }

  return prisma.digest.create({
    data: {
      userId: data.userId,
      period: data.period,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      content: data.content,
      stats: JSON.stringify(data.stats),
      isPreview,
    },
  })
}

export async function findDigestsPaginated(
  userId: string,
  options: { page: number; limit: number }
) {
  const [digests, total] = await Promise.all([
    prisma.digest.findMany({
      where: { userId },
      orderBy: { periodStart: 'desc' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    }),
    prisma.digest.count({ where: { userId } }),
  ])

  return { digests, total }
}

export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, success, error } from '@/lib/api-helpers'
import { createDailyDigest } from '@/services/digest-service'

// GET /api/digest — get latest digest
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  const url = req.nextUrl
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '10')

  const [digests, total] = await Promise.all([
    prisma.digest.findMany({
      where: { userId: user.id },
      orderBy: { periodStart: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.digest.count({ where: { userId: user.id } }),
  ])

  return success(digests, {
    page,
    totalPages: Math.ceil(total / limit),
    totalCount: total,
  })
}

// POST /api/digest — generate a new digest
export async function POST() {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  try {
    const digest = await createDailyDigest(user.id)
    return success(digest)
  } catch (err: any) {
    console.error('Digest generation failed:', err)
    return error('DIGEST_FAILED', err.message || 'Failed to generate digest', 500)
  }
}

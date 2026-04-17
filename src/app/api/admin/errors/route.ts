export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { getAuthUser, error, success } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)
  if (!user.isAdmin) return error('FORBIDDEN', 'Admin access required', 403)

  const logs = await prisma.errorLog.findMany({
    select: { id: true, userId: true, action: true, error: true, stack: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return success(logs)
}

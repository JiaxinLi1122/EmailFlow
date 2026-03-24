export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, success, error } from '@/lib/api-helpers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  const { id } = await params

  const email = await prisma.email.findFirst({
    where: { id, userId: user.id },
    include: {
      taskLinks: {
        include: { task: { select: { id: true, title: true, status: true, priorityScore: true } } },
      },
    },
  })

  if (!email) return error('NOT_FOUND', 'Email not found', 404)
  return success(email)
}

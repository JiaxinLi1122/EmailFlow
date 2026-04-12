import { getAuthUser, success, error } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  try {
    const body = await req.json()
    const { timezone } = body

    if (!timezone || typeof timezone !== 'string') {
      return error('INVALID_INPUT', 'Missing timezone', 400)
    }

    // Validate that it's a real IANA timezone string
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone })
    } catch {
      return error('INVALID_TIMEZONE', `Unknown timezone: ${timezone}`, 400)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { timezone },
    })

    return success({ timezone })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update timezone'
    return error('UPDATE_FAILED', message, 500)
  }
}

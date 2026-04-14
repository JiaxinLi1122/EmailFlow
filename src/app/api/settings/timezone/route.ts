import { errorFromException, getAuthUser, success, error } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()
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
    return errorFromException(err, 'UPDATE_FAILED', 'Failed to update timezone', 500)
  }
}

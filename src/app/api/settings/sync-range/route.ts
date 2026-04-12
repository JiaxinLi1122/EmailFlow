import { getAuthUser, success, error } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  try {
    const body = await req.json()
    const { days, customDate } = body

    let startDate: Date

    if (customDate) {
      startDate = new Date(customDate)
    } else if (days) {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
    } else {
      return error('INVALID_INPUT', 'Missing days or customDate', 400)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { syncStartDate: startDate },
    })

    return success({ syncStartDate: startDate })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update sync range'
    return error('UPDATE_FAILED', message, 500)
  }
}

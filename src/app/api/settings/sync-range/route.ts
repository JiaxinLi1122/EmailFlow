import { errorFromException, getAuthUser, success, error } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()
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
    return errorFromException(err, 'UPDATE_FAILED', 'Failed to update sync range', 500)
  }
}

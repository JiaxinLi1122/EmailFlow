export const dynamic = "force-dynamic"
import { prisma } from '@/lib/prisma'
import { getAuthUser, success, error } from '@/lib/api-helpers'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  const [
    totalEmails,
    actionEmails,
    awarenessEmails,
    ignoreEmails,
    uncertainEmails,
    totalTasks,
    pendingTasks,
    completedTasks,
    dismissedTasks,
    userInfo,
  ] = await Promise.all([
    prisma.email.count({ where: { userId: user.id } }),
    prisma.email.count({ where: { userId: user.id, classification: 'action' } }),
    prisma.email.count({ where: { userId: user.id, classification: 'awareness' } }),
    prisma.email.count({ where: { userId: user.id, classification: 'ignore' } }),
    prisma.email.count({ where: { userId: user.id, classification: 'uncertain' } }),
    prisma.task.count({ where: { userId: user.id } }),
    prisma.task.count({ where: { userId: user.id, status: 'pending' } }),
    prisma.task.count({ where: { userId: user.id, status: 'completed' } }),
    prisma.task.count({ where: { userId: user.id, status: 'dismissed' } }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { lastSyncAt: true, gmailConnected: true, syncEnabled: true },
    }),
  ])

  return success({
    emails: { total: totalEmails, action: actionEmails, awareness: awarenessEmails, ignore: ignoreEmails, uncertain: uncertainEmails },
    tasks: { total: totalTasks, pending: pendingTasks, completed: completedTasks, dismissed: dismissedTasks },
    sync: { lastSyncAt: userInfo?.lastSyncAt, gmailConnected: userInfo?.gmailConnected, syncEnabled: userInfo?.syncEnabled },
  })
}

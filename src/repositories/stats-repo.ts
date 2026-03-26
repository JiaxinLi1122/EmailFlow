import { prisma } from '@/lib/prisma'

// ============================================================
// Stats Repository — aggregated counts for dashboard
// ============================================================

export async function getDashboardStats(userId: string) {
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
    prisma.email.count({ where: { userId } }),
    prisma.email.count({ where: { userId, classification: 'action' } }),
    prisma.email.count({ where: { userId, classification: 'awareness' } }),
    prisma.email.count({ where: { userId, classification: 'ignore' } }),
    prisma.email.count({ where: { userId, classification: 'uncertain' } }),
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: 'pending' } }),
    prisma.task.count({ where: { userId, status: 'completed' } }),
    prisma.task.count({ where: { userId, status: 'dismissed' } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { lastSyncAt: true, gmailConnected: true, syncEnabled: true },
    }),
  ])

  return {
    emails: { total: totalEmails, action: actionEmails, awareness: awarenessEmails, ignore: ignoreEmails, uncertain: uncertainEmails },
    tasks: { total: totalTasks, pending: pendingTasks, completed: completedTasks, dismissed: dismissedTasks },
    sync: { lastSyncAt: userInfo?.lastSyncAt, gmailConnected: userInfo?.gmailConnected, syncEnabled: userInfo?.syncEnabled },
  }
}

import { prisma } from '@/lib/prisma'
import { getPriorityBand } from '@/types/task'

type PriorityCounts = {
  critical: number
  high: number
  medium: number
  low: number
}

type DashboardStats = {
  emails: { total: number; action: number; awareness: number; ignore: number; uncertain: number; linkedAction: number }
  tasks: { total: number; pending: number; confirmed: number; completed: number; dismissed: number }
  sync: {
    lastSyncAt: Date | null | undefined
    gmailConnected: boolean | undefined
    syncEnabled: boolean | undefined
    providerReauthRequired: boolean | undefined
    providerReauthReason: string | null | undefined
    providerReauthAt: Date | null | undefined
    providerReauthProvider: string | null | undefined
  }
}

export async function getDashboardSummary(userId: string) {
  const [emailGroups, linkedActionEmails, taskGroups, userInfo, tasks, attentionEmails, activeMatters] = await Promise.all([
    prisma.email.groupBy({
      by: ['classification'],
      where: { userId },
      _count: { id: true },
    }),
    prisma.email.count({
      where: {
        userId,
        classification: 'action',
        taskLinks: { some: {} },
      },
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: { userId },
      _count: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastSyncAt: true,
        gmailConnected: true,
        syncEnabled: true,
        emailProviderReauthRequired: true,
        emailProviderReauthReason: true,
        emailProviderReauthAt: true,
        emailProviderReauthProvider: true,
      },
    }),
    prisma.task.findMany({
      where: { userId },
      orderBy: { priorityScore: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        summary: true,
        status: true,
        priorityScore: true,
        explicitDeadline: true,
        inferredDeadline: true,
        userSetDeadline: true,
      },
    }),
    prisma.email.findMany({
      where: {
        userId,
        OR: [{ classification: 'action' }, { classification: 'uncertain' }],
        taskLinks: { none: {} },
      },
      orderBy: { receivedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        subject: true,
        sender: true,
        classification: true,
      },
    }),
    prisma.matterMemory.findMany({
      where: {
        userId,
        status: { not: 'completed' },
        projectContextId: { not: null },
      },
      orderBy: { lastMessageAt: 'desc' },
      select: {
        lastMessageAt: true,
        projectContext: {
          select: {
            id: true,
            name: true,
            identity: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ])

  const stats = buildStats(emailGroups, linkedActionEmails, taskGroups, userInfo)
  const taskSummary = buildTaskSummary(tasks, stats.tasks)
  const { activeIdentities, activeProjects } = buildActiveContexts(activeMatters)

  return {
    stats,
    tasks: taskSummary,
    attentionEmails,
    activeIdentities,
    activeProjects,
  }
}

function buildStats(
  emailGroups: Array<{ classification: string | null; _count: { id: number } }>,
  linkedActionEmails: number,
  taskGroups: Array<{ status: string; _count: { id: number } }>,
  userInfo: {
    lastSyncAt: Date | null
    gmailConnected: boolean
    syncEnabled: boolean
    emailProviderReauthRequired: boolean
    emailProviderReauthReason: string | null
    emailProviderReauthAt: Date | null
    emailProviderReauthProvider: string | null
  } | null
): DashboardStats {
  const emailCount = (classification: string | null) =>
    emailGroups.find((group) => group.classification === classification)?._count.id ?? 0

  const taskCount = (status: string) =>
    taskGroups.find((group) => group.status === status)?._count.id ?? 0

  const emailTotal = emailGroups.reduce((sum, group) => sum + group._count.id, 0)
  const taskTotal = taskGroups.reduce((sum, group) => sum + group._count.id, 0)
  const pending = taskCount('pending')
  const completed = taskCount('completed')
  const dismissed = taskCount('dismissed')

  return {
    emails: {
      total: emailTotal,
      action: emailCount('action'),
      awareness: emailCount('awareness'),
      ignore: emailCount('ignore'),
      uncertain: emailCount('uncertain'),
      linkedAction: linkedActionEmails,
    },
    tasks: {
      total: taskTotal,
      pending,
      confirmed: Math.max(0, taskTotal - pending - completed - dismissed),
      completed,
      dismissed,
    },
    sync: {
      lastSyncAt: userInfo?.lastSyncAt,
      gmailConnected: userInfo?.gmailConnected,
      syncEnabled: userInfo?.syncEnabled,
      providerReauthRequired: userInfo?.emailProviderReauthRequired,
      providerReauthReason: userInfo?.emailProviderReauthReason,
      providerReauthAt: userInfo?.emailProviderReauthAt,
      providerReauthProvider: userInfo?.emailProviderReauthProvider,
    },
  }
}

function buildTaskSummary(
  tasks: Array<{
    id: string
    title: string
    summary: string
    status: string
    priorityScore: number | null
    explicitDeadline: Date | null
    inferredDeadline: Date | null
    userSetDeadline: Date | null
  }>,
  taskStats: DashboardStats['tasks']
) {
  const priorityCounts: PriorityCounts = { critical: 0, high: 0, medium: 0, low: 0 }
  const now = Date.now()
  const weekFromNow = now + 7 * 86400000
  let upcomingCount = 0

  for (const task of tasks) {
    const band = getPriorityBand(task.priorityScore || 0)
    priorityCounts[band] += 1

    const deadline = task.userSetDeadline || task.explicitDeadline || task.inferredDeadline
    if (!deadline) continue

    const deadlineTime = deadline.getTime()
    const isActive = task.status === 'pending' || task.status === 'confirmed'
    if (isActive && deadlineTime >= now && deadlineTime <= weekFromNow) {
      upcomingCount += 1
    }
  }

  return {
    confirmedPreview: tasks.filter((task) => task.status === 'confirmed').slice(0, 5),
    pendingPreview: tasks.filter((task) => task.status === 'pending').slice(0, 5),
    confirmedCount: taskStats.confirmed,
    pendingCount: taskStats.pending,
    dismissedCount: taskStats.dismissed,
    priorityCounts,
    upcomingCount,
  }
}

function buildActiveContexts(
  matters: Array<{
    lastMessageAt: Date | null
    projectContext: {
      id: string
      name: string
      identity: { id: string; name: string } | null
    } | null
  }>
) {
  const identityCounts = new Map<string, { id: string; name: string; count: number }>()
  const projectCounts = new Map<string, { id: string; name: string; count: number; lastActivity: number }>()

  for (const matter of matters) {
    const project = matter.projectContext
    if (!project) continue

    const projectCount = projectCounts.get(project.id) ?? {
      id: project.id,
      name: project.name,
      count: 0,
      lastActivity: 0,
    }
    projectCount.count += 1
    projectCount.lastActivity = Math.max(
      projectCount.lastActivity,
      matter.lastMessageAt ? matter.lastMessageAt.getTime() : 0
    )
    projectCounts.set(project.id, projectCount)

    const identity = project.identity
    if (!identity) continue

    const identityCount = identityCounts.get(identity.id) ?? {
      id: identity.id,
      name: identity.name,
      count: 0,
    }
    identityCount.count += 1
    identityCounts.set(identity.id, identityCount)
  }

  return {
    activeIdentities: Array.from(identityCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4),
    activeProjects: Array.from(projectCounts.values())
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(0, 5),
  }
}

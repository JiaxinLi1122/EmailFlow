import { prisma } from '@/lib/prisma'
import type { TaskExtractionResult, PriorityResult } from '@/ai'

// ============================================================
// Task Repository — all task database operations
// ============================================================

export interface CreateTaskData {
  userId: string
  emailId: string
  extraction: TaskExtractionResult
  priority: PriorityResult
}

export async function createTask(data: CreateTaskData) {
  const task = await prisma.task.create({
    data: {
      userId: data.userId,
      title: data.extraction.title,
      summary: data.extraction.summary,
      actionItems: JSON.stringify(data.extraction.actionItems),
      status: 'pending',
      source: 'ai_auto',

      urgency: data.priority.urgency,
      impact: data.priority.impact,
      priorityScore: data.priority.combinedScore,
      priorityReason: data.priority.reasoning,

      explicitDeadline: data.extraction.explicitDeadline
        ? new Date(data.extraction.explicitDeadline)
        : null,
      inferredDeadline: data.extraction.inferredDeadline
        ? new Date(data.extraction.inferredDeadline)
        : null,
      deadlineConfidence: data.extraction.deadlineConfidence,
    },
  })

  // Link task to source email
  await prisma.taskEmail.create({
    data: {
      taskId: task.id,
      emailId: data.emailId,
      relationship: 'source',
    },
  })

  return task
}

export async function findTasksPaginated(
  userId: string,
  options: {
    page: number
    limit: number
    status?: string
    sort?: 'priority' | 'date' | 'deadline' | 'title'
  }
) {
  const where: any = { userId }
  if (options.status) where.status = options.status

  const orderBy: any =
    options.sort === 'priority'
      ? { priorityScore: 'desc' }
      : options.sort === 'deadline'
        ? { inferredDeadline: 'asc' }
        : options.sort === 'title'
          ? { title: 'asc' }
          : { createdAt: 'desc' }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy,
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      include: {
        emailLinks: {
          include: {
            email: {
              select: { id: true, subject: true, sender: true, receivedAt: true },
            },
          },
        },
      },
    }),
    prisma.task.count({ where }),
  ])

  return { tasks, total }
}

export async function findTaskById(userId: string, taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, userId },
    include: {
      emailLinks: {
        include: {
          email: {
            select: {
              id: true,
              subject: true,
              sender: true,
              bodyPreview: true,
              receivedAt: true,
              classification: true,
            },
          },
        },
      },
    },
  })
}

export async function updateTask(taskId: string, data: Record<string, any>) {
  return prisma.task.update({ where: { id: taskId }, data })
}

export async function findTasksByDateRange(
  userId: string,
  dateRange: { start: Date; end: Date }
) {
  return prisma.task.findMany({
    where: {
      userId,
      createdAt: { gte: dateRange.start, lt: dateRange.end },
    },
    orderBy: { priorityScore: 'desc' },
  })
}

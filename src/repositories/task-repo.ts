import { Prisma } from '@prisma/client'
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

export type ProjectContext = {
  id: string
  name: string
  identity: { id: string; name: string } | null
} | null

export type MatterTag = {
  id: string
  title: string
} | null

export async function findTasksPaginated(
  userId: string,
  options: {
    page: number
    limit: number
    status?: string
    sort?: 'priority' | 'date' | 'deadline' | 'title'
  }
) {
  const where: Prisma.TaskWhereInput = { userId }
  if (options.status) where.status = options.status

  const orderBy: Prisma.TaskOrderByWithRelationInput =
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
              select: { id: true, subject: true, sender: true, receivedAt: true, threadId: true },
            },
          },
        },
      },
    }),
    prisma.task.count({ where }),
  ])

  // Enrich each task with project + matter from ThreadMemory (best-effort)
  try {
    const threadIds = tasks.flatMap((t) =>
      t.emailLinks.map((l) => l.email?.threadId).filter((id): id is string => !!id)
    )
    const ctxMap = await buildThreadContextMap(userId, threadIds)

    const enriched = tasks.map((task) => {
      const threadId = task.emailLinks[0]?.email?.threadId ?? null
      const ctx = threadId ? ctxMap.get(threadId) : null
      return { ...task, project: ctx?.project ?? null, matter: ctx?.matter ?? null }
    })

    return { tasks: enriched, total }
  } catch (err) {
    console.error('[task-repo] enrichment failed, returning tasks without project context:', err)
    return { tasks, total }
  }
}

async function buildThreadContextMap(userId: string, threadIds: string[]) {
  if (!threadIds.length) return new Map<string, { project: ProjectContext; matter: MatterTag }>()

  const threads = await prisma.threadMemory.findMany({
    where: { userId, threadId: { in: threadIds } },
    include: {
      matter: {
        include: {
          projectContext: { include: { identity: true } },
        },
      },
    },
  })

  return new Map(
    threads.map((t) => [
      t.threadId,
      {
        matter: t.matter ? { id: t.matter.id, title: t.matter.title } : null,
        project: t.matter?.projectContext
          ? {
              id: t.matter.projectContext.id,
              name: t.matter.projectContext.name,
              identity: t.matter.projectContext.identity
                ? { id: t.matter.projectContext.identity.id, name: t.matter.projectContext.identity.name }
                : null,
            }
          : null,
      },
    ])
  )
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

export async function updateTask(taskId: string, data: Prisma.TaskUpdateInput) {
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

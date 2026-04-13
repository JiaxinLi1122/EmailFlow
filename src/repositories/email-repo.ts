import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { EmailMessage } from '@/integrations'

// ============================================================
// Email Repository — all email database operations
// ============================================================

export interface StoreEmailData {
  userId: string
  message: EmailMessage
}

export async function storeEmail(data: StoreEmailData) {
  const fields = {
    userId: data.userId,
    gmailMessageId: data.message.providerMessageId,
    threadId: data.message.threadId,
    subject: data.message.subject,
    sender: data.message.sender,
    recipients: JSON.stringify(data.message.recipients),
    bodyPreview: data.message.bodyPreview,
    bodyFull: data.message.bodyFull,
    receivedAt: data.message.receivedAt,
    labels: JSON.stringify(data.message.labels),
    hasAttachments: data.message.hasAttachments,
  }
  return prisma.email.upsert({
    where: { gmailMessageId: data.message.providerMessageId },
    create: fields,
    update: {},
  })
}

export async function storeEmails(userId: string, messages: EmailMessage[]) {
  return Promise.all(messages.map((message) => storeEmail({ userId, message })))
}

export async function updateClassification(
  emailId: string,
  classification: {
    category: string
    confidence: number
    reasoning: string
    isWorkRelated: boolean
  }
) {
  return prisma.email.update({
    where: { id: emailId },
    data: {
      classification: classification.category,
      classConfidence: classification.confidence,
      classReasoning: classification.reasoning,
      isWorkRelated: classification.isWorkRelated,
      processedAt: new Date(),
    },
  })
}

export async function markClassificationFailed(emailId: string) {
  return prisma.email.update({
    where: { id: emailId },
    data: {
      classification: 'uncertain',
      classConfidence: 0,
      classReasoning: 'Classification failed - needs manual review',
      processedAt: new Date(),
    },
  })
}

export async function findEmailsByClassification(
  userId: string,
  classification: string,
  dateRange: { start: Date; end: Date }
) {
  return prisma.email.findMany({
    where: {
      userId,
      classification,
      receivedAt: { gte: dateRange.start, lt: dateRange.end },
    },
    select: { subject: true, sender: true },
  })
}

export async function findEmailsPaginated(
  userId: string,
  options: { page: number; limit: number; classification?: string }
) {
  const where: Prisma.EmailWhereInput = { userId }
  if (options.classification) where.classification = options.classification

  const [emails, total] = await Promise.all([
    prisma.email.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      include: {
        taskLinks: {
          include: { task: { select: { id: true, title: true, status: true } } },
        },
      },
    }),
    prisma.email.count({ where }),
  ])

  // Enrich with project + matter from ThreadMemory (best-effort)
  try {
    const threadIds = emails.map((e) => e.threadId).filter((id): id is string => !!id)
    const ctxMap = threadIds.length
      ? await buildThreadContextMap(userId, threadIds)
      : new Map<string, { project: ProjectContext; matter: MatterTag }>()

    const enriched = emails.map((email) => {
      const ctx = email.threadId ? ctxMap.get(email.threadId) : null
      return { ...email, project: ctx?.project ?? null, matter: ctx?.matter ?? null }
    })

    return { emails: enriched, total }
  } catch (err) {
    console.error('[email-repo] enrichment failed, returning emails without project context:', err)
    return { emails, total }
  }
}

type ProjectContext = {
  id: string
  name: string
  identity: { id: string; name: string } | null
} | null

type MatterTag = { id: string; title: string } | null

async function buildThreadContextMap(userId: string, threadIds: string[]) {
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

export async function findEmailById(userId: string, emailId: string) {
  const email = await prisma.email.findFirst({
    where: { id: emailId, userId },
    include: {
      taskLinks: {
        include: { task: { select: { id: true, title: true, status: true, priorityScore: true } } },
      },
    },
  })

  if (!email?.threadId) return email

  try {
    const ctxMap = await buildThreadContextMap(userId, [email.threadId])
    const ctx = ctxMap.get(email.threadId)
    return { ...email, project: ctx?.project ?? null, matter: ctx?.matter ?? null }
  } catch (err) {
    console.error('[email-repo] detail enrichment failed:', err)
    return email
  }
}


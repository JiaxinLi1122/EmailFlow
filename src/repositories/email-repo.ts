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
  return prisma.email.create({
    data: {
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
    },
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

  return { emails, total }
}

export async function findEmailById(userId: string, emailId: string) {
  return prisma.email.findFirst({
    where: { id: emailId, userId },
    include: {
      taskLinks: {
        include: { task: { select: { id: true, title: true, status: true, priorityScore: true } } },
      },
    },
  })
}


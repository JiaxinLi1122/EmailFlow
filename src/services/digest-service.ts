import { prisma } from '@/lib/prisma'
import { generateDigest } from '@/adapters/llm-adapter'

// ============================================================
// Digest Service — generates daily summaries
// ============================================================

export async function createDailyDigest(userId: string) {
  const now = new Date()
  const periodStart = new Date(now)
  periodStart.setHours(0, 0, 0, 0)
  periodStart.setDate(periodStart.getDate() - 1) // yesterday start

  const periodEnd = new Date(periodStart)
  periodEnd.setDate(periodEnd.getDate() + 1) // yesterday end

  // Gather tasks created in the period
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      createdAt: { gte: periodStart, lt: periodEnd },
    },
    orderBy: { priorityScore: 'desc' },
  })

  // Gather awareness emails
  const awarenessEmails = await prisma.email.findMany({
    where: {
      userId,
      classification: 'awareness',
      receivedAt: { gte: periodStart, lt: periodEnd },
    },
    select: { subject: true, sender: true },
  })

  // Gather uncertain emails
  const uncertainEmails = await prisma.email.findMany({
    where: {
      userId,
      classification: 'uncertain',
      receivedAt: { gte: periodStart, lt: periodEnd },
    },
    select: { subject: true, sender: true },
  })

  const digestResult = await generateDigest(
    tasks.map((t) => ({
      title: t.title,
      summary: t.summary,
      priorityScore: t.priorityScore || 0,
      status: t.status,
      deadline: (t.userSetDeadline || t.explicitDeadline || t.inferredDeadline)
        ?.toISOString()
        .split('T')[0] || null,
    })),
    awarenessEmails,
    uncertainEmails,
    periodStart.toISOString().split('T')[0]
  )

  const digest = await prisma.digest.create({
    data: {
      userId,
      period: 'daily',
      periodStart,
      periodEnd,
      content: digestResult.content,
      stats: typeof digestResult.stats === 'string' ? digestResult.stats : JSON.stringify(digestResult.stats),
    },
  })

  return digest
}

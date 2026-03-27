import { generateDigest } from '@/ai'
import * as taskRepo from '@/repositories/task-repo'
import * as emailRepo from '@/repositories/email-repo'
import * as digestRepo from '@/repositories/digest-repo'

// ============================================================
// Digest Pipeline — gathers data and generates a daily summary
//
// Steps: gather tasks + emails → call AI → save digest
// ============================================================

export async function createDailyDigest(userId: string) {
  // Calculate period: yesterday 00:00 to today 00:00
  const now = new Date()
  const periodStart = new Date(now)
  periodStart.setHours(0, 0, 0, 0)
  periodStart.setDate(periodStart.getDate() - 1)

  const periodEnd = new Date(periodStart)
  periodEnd.setDate(periodEnd.getDate() + 1)

  const dateRange = { start: periodStart, end: periodEnd }

  // Step 1: Gather data
  const [tasks, awarenessEmails, uncertainEmails] = await Promise.all([
    taskRepo.findTasksByDateRange(userId, dateRange),
    emailRepo.findEmailsByClassification(userId, 'awareness', dateRange),
    emailRepo.findEmailsByClassification(userId, 'uncertain', dateRange),
  ])

  // Step 2: Generate digest with AI
  const digestResult = await generateDigest({
    tasks: tasks.map((t) => ({
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
    date: periodStart.toISOString().split('T')[0],
  })

  // Step 3: Save to database
  const digest = await digestRepo.createDigest({
    userId,
    period: 'daily',
    periodStart,
    periodEnd,
    content: digestResult.content,
    stats: digestResult.stats,
  })

  return digest
}

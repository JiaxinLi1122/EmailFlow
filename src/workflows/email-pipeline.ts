import { classifyEmail, extractTask, scorePriority } from '@/ai'
import { preFilterEmail, prepareForClassification, prepareForExtraction } from '@/ai/utils'
import * as emailRepo from '@/repositories/email-repo'
import * as taskRepo from '@/repositories/task-repo'
import { prisma } from '@/lib/prisma'

// ============================================================
// Email Pipeline — processes a single email through the full AI pipeline
//
// Minimal memory version:
//   - No DB changes yet
//   - No AI skill signature changes yet
//   - Inject lightweight memory directly into the text sent to the model
// ============================================================

export interface PipelineResult {
  emailId: string
  classification: string
  confidence: number
  taskCreated: boolean
  taskId?: string
  skippedByRule: boolean
}

/**
 * Step 0: Rule-based pre-filter — skip AI for obvious cases
 */
function stepPreFilter(email: {
  sender: string
  subject: string
  labels: string
}) {
  let labelArray: string[] = []
  try {
    labelArray = JSON.parse(email.labels || '[]')
  } catch {
    labelArray = []
  }

  const categoryMap: Record<string, 'spam' | 'promotions' | 'social' | 'updates'> = {
    SPAM: 'spam',
    CATEGORY_PROMOTIONS: 'promotions',
    CATEGORY_SOCIAL: 'social',
    CATEGORY_UPDATES: 'updates',
    CATEGORY_FORUMS: 'social',
  }

  const providerCategories = labelArray
    .map((l) => categoryMap[l])
    .filter((c): c is 'spam' | 'promotions' | 'social' | 'updates' => !!c)

  return preFilterEmail({
    sender: email.sender,
    subject: email.subject,
    providerCategories,
  })
}

/**
 * Minimal hardcoded memory
 * Later you can replace this with DB lookup by userId.
 */
async function getLightweightMemory(
  userId: string,
  sender: string
) {
  const lowerSender = sender.toLowerCase()

  const globalMemory = [
    'Prefer short actionable summaries.',
    'Emails about deadlines, meetings, interviews, university, work, bills, payments, verification, approvals, and submissions should be treated as more important.',
    'Promotional, newsletter, discount, sale, and generic marketing emails are usually low value unless they contain a clear required action.',
  ]

  const senderMemory = await prisma.senderMemory.findUnique({
    where: {
      userId_sender: {
        userId,
        sender,
      },
    },
  })

  const learnedMemory: string[] = []

  if (senderMemory) {
    const total =
      senderMemory.actionCount +
      senderMemory.awarenessCount +
      senderMemory.ignoreCount

    if (total >= 3) {
      if (senderMemory.ignoreCount / total > 0.7) {
        learnedMemory.push('User usually ignores emails from this sender.')
      }

      if (senderMemory.actionCount / total > 0.6) {
        learnedMemory.push('User usually treats emails from this sender as requiring action.')
      }
    }
  }

  const senderSpecificMemory: string[] = []

  if (lowerSender.includes('anu.edu.au')) {
    senderSpecificMemory.push('Emails from anu.edu.au are usually important and often action-related.')
  }

  return [...globalMemory, ...senderSpecificMemory, ...learnedMemory]
}

/**
 * Build a small memory block to prepend to model input
 */
async function buildMemoryPrefix(userId: string, sender: string) {
  const memoryLines = await getLightweightMemory(userId, sender)

  return [
    'User preferences and learned handling rules:',
    ...memoryLines.map((line) => `- ${line}`),
    '',
    'Use these preferences as soft guidance, but base the final decision on the actual email content.',
    '',
  ].join('\n')
}

/**
 * Step 1: Classify an email using AI (with cleaned body + lightweight memory)
 */
async function stepClassify(userId: string,email: {
  id: string
  subject: string
  sender: string
  receivedAt: Date
  bodyPreview: string
  bodyFull: string | null
}) {
  const rawBody = email.bodyFull || email.bodyPreview
  const cleanedBody = prepareForClassification(rawBody)

  const memoryPrefix = buildMemoryPrefix(email.sender)
  const bodyWithMemory = `${memoryPrefix}${cleanedBody}`

  const result = await classifyEmail({
    subject: email.subject,
    sender: email.sender,
    date: email.receivedAt.toISOString(),
    bodyPreview: cleanedBody,
    memory: await buildMemoryPrefix(userId, email.sender),
  })

  await emailRepo.updateClassification(email.id, result)
  return result
}

/**
 * Step 2: Extract a task from an action email (with full cleaned body + lightweight memory)
 */
async function stepExtractTask(userId: string, email: {
  subject: string
  sender: string
  receivedAt: Date
  bodyPreview: string
  bodyFull: string | null
}) {
  const rawBody = email.bodyFull || email.bodyPreview
  const cleanedBody = prepareForExtraction(rawBody)

  const memoryPrefix = buildMemoryPrefix(email.sender)
  const bodyWithMemory = `${memoryPrefix}${cleanedBody}`

  return extractTask({
    subject: email.subject,
    sender: email.sender,
    date: email.receivedAt.toISOString(),
    bodyPreview: email.bodyPreview,
    body: cleanedBody,
    memory: await buildMemoryPrefix(userId, email.sender),
  })
}

/**
 * Step 3: Score priority for an extracted task
 */
async function stepScorePriority(
  extraction: { title: string; summary: string; actionItems: string[] },
  sender: string
  userId: string
) {
  return scorePriority({
    title: extraction.title,
    summary: extraction.summary,
    actionItems: extraction.actionItems,
    sender,
    currentDate: new Date().toISOString().split('T')[0],
    memory: await buildMemoryPrefix(userId, sender),
  })
}

/**
 * Full pipeline: pre-filter → classify → extract → score → save
 */
export async function processEmail(
  userId: string,
  email: {
    id: string
    subject: string
    sender: string
    receivedAt: Date
    bodyPreview: string
    bodyFull: string | null
    labels: string
  }
): Promise<PipelineResult> {
  const preFilter = stepPreFilter(email)

  if (preFilter.skipped) {
    await emailRepo.updateClassification(email.id, {
      category: preFilter.category!,
      confidence: preFilter.confidence!,
      reasoning: preFilter.reasoning!,
      isWorkRelated: preFilter.isWorkRelated!,
    })

    return {
      emailId: email.id,
      classification: preFilter.category!,
      confidence: preFilter.confidence!,
      taskCreated: false,
      skippedByRule: true,
    }
  }

  const classification = await stepClassify(userId, email)
  await updateSenderMemory(userId, email.sender, classification.category)

  if (classification.category !== 'action') {
    return {
      emailId: email.id,
      classification: classification.category,
      confidence: classification.confidence,
      taskCreated: false,
      skippedByRule: false,
    }
  }

  const extraction = await stepExtractTask(userId, email)
  const priority = await stepScorePriority(
    extraction,
    email.sender,
    userId
  )

  const task = await taskRepo.createTask({
    userId,
    emailId: email.id,
    extraction,
    priority,
  })

  return {
    emailId: email.id,
    classification: classification.category,
    confidence: classification.confidence,
    taskCreated: true,
    taskId: task.id,
    skippedByRule: false,
  }
}

async function updateSenderMemory(
  userId: string,
  sender: string,
  category: string
) {
  const existing = await prisma.senderMemory.findUnique({
    where: {
      userId_sender: {
        userId,
        sender,
      },
    },
  })

  if (!existing) {
    await prisma.senderMemory.create({
      data: {
        userId,
        sender,
        actionCount: category === 'action' ? 1 : 0,
        awarenessCount: category === 'awareness' ? 1 : 0,
        ignoreCount: category === 'ignore' ? 1 : 0,
      },
    })
    return
  }

  await prisma.senderMemory.update({
    where: {
      userId_sender: {
        userId,
        sender,
      },
    },
    data: {
      actionCount: existing.actionCount + (category === 'action' ? 1 : 0),
      awarenessCount: existing.awarenessCount + (category === 'awareness' ? 1 : 0),
      ignoreCount: existing.ignoreCount + (category === 'ignore' ? 1 : 0),
    },
  })
}
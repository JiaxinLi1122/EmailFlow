import { classifyEmail, extractTask, scorePriority } from '@/ai'
import { preFilterEmail, prepareForClassification, prepareForExtraction } from '@/ai/utils'
import * as emailRepo from '@/repositories/email-repo'
import * as taskRepo from '@/repositories/task-repo'

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
function getLightweightMemory(sender: string) {
  const lowerSender = sender.toLowerCase()

  const globalMemory = [
    'Prefer short actionable summaries.',
    'Emails about deadlines, meetings, interviews, university, work, bills, and verification should be treated as more important.',
    'Promotional, newsletter, discount, sale, and generic marketing emails are usually low value unless they contain a clear required action.',
  ]

  const senderSpecificMemory: string[] = []

  if (lowerSender.includes('anu.edu.au')) {
    senderSpecificMemory.push('Emails from anu.edu.au are usually important and often action-related.')
  }

  if (
    lowerSender.includes('noreply') ||
    lowerSender.includes('no-reply') ||
    lowerSender.includes('newsletter')
  ) {
    senderSpecificMemory.push('No-reply or newsletter-style senders are often awareness or ignore unless there is a specific required action.')
  }

  return [...globalMemory, ...senderSpecificMemory]
}

/**
 * Build a small memory block to prepend to model input
 */
function buildMemoryPrefix(sender: string) {
  const memoryLines = getLightweightMemory(sender)

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
async function stepClassify(email: {
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
    memory: buildMemoryPrefix(email.sender),
  })

  await emailRepo.updateClassification(email.id, result)
  return result
}

/**
 * Step 2: Extract a task from an action email (with full cleaned body + lightweight memory)
 */
async function stepExtractTask(email: {
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
    memory: buildMemoryPrefix(email.sender),
  })
}

/**
 * Step 3: Score priority for an extracted task
 */
async function stepScorePriority(
  extraction: { title: string; summary: string; actionItems: string[] },
  sender: string
) {
  return scorePriority({
    title: extraction.title,
    summary: extraction.summary,
    actionItems: extraction.actionItems,
    sender,
    currentDate: new Date().toISOString().split('T')[0],
    memory: buildMemoryPrefix(sender),
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

  const classification = await stepClassify(email)

  if (classification.category !== 'action') {
    return {
      emailId: email.id,
      classification: classification.category,
      confidence: classification.confidence,
      taskCreated: false,
      skippedByRule: false,
    }
  }

  const extraction = await stepExtractTask(email)
  const priority = await stepScorePriority(extraction, email.sender)

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
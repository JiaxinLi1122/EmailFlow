import { classifyEmail, extractTask, scorePriority } from '@/ai'
import { preFilterEmail, prepareForClassification, prepareForExtraction } from '@/ai/utils'
import * as emailRepo from '@/repositories/email-repo'
import * as taskRepo from '@/repositories/task-repo'

// ============================================================
// Email Pipeline — processes a single email through the full AI pipeline
//
// Steps:
//   0. Pre-filter (rules, no AI) → skip obvious spam/promotions
//   1. Classify (AI, short body) → action / awareness / ignore / uncertain
//   2. Extract task (AI, full cleaned body) → only for action/uncertain
//   3. Score priority (AI) → urgency × impact
//   4. Save to database
//
// Token optimization:
//   - Pre-filter skips 30-40% of emails entirely (no AI call)
//   - Body cleaning removes signatures, disclaimers, quoted replies
//   - Classification uses short body (500 chars) — enough to judge intent
//   - Extraction uses full cleaned body — preserves all action items
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
  // providerCategories is stored alongside labels in the DB
  // For now, we derive it from the stored labels (JSON string)
  // In the future, this could be stored as a separate column
  let labelArray: string[] = []
  try {
    labelArray = JSON.parse(email.labels || '[]')
  } catch {
    labelArray = []
  }

  // Map known provider labels to normalized categories
  const categoryMap: Record<string, 'spam' | 'promotions' | 'social' | 'updates'> = {
    'SPAM': 'spam',
    'CATEGORY_PROMOTIONS': 'promotions',
    'CATEGORY_SOCIAL': 'social',
    'CATEGORY_UPDATES': 'updates',
    'CATEGORY_FORUMS': 'social',
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
 * Step 1: Classify an email using AI (with cleaned body)
 */
async function stepClassify(email: {
  id: string
  subject: string
  sender: string
  receivedAt: Date
  bodyPreview: string
  bodyFull: string | null
}) {
  // Use full body when available, fallback to preview
  const rawBody = email.bodyFull || email.bodyPreview
  const cleanedBody = prepareForClassification(rawBody)

  const result = await classifyEmail({
    subject: email.subject,
    sender: email.sender,
    date: email.receivedAt.toISOString(),
    bodyPreview: cleanedBody,
  })

  await emailRepo.updateClassification(email.id, result)
  return result
}

/**
 * Step 2: Extract a task from an action/uncertain email (with full cleaned body)
 */
async function stepExtractTask(email: {
  subject: string
  sender: string
  receivedAt: Date
  bodyPreview: string
  bodyFull: string | null
}) {
  // Use full cleaned body for extraction — need all action items and deadlines
  const rawBody = email.bodyFull || email.bodyPreview
  const cleanedBody = prepareForExtraction(rawBody)

  return extractTask({
    subject: email.subject,
    sender: email.sender,
    date: email.receivedAt.toISOString(),
    bodyPreview: email.bodyPreview,
    body: cleanedBody,
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
  // Step 0: Pre-filter — skip AI for obvious spam/promotions/auto-replies
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

  // Step 1: Classify with AI
  const classification = await stepClassify(email)

  // Only extract tasks for clear action emails
  if (classification.category !== 'action') {
    return {
      emailId: email.id,
      classification: classification.category,
      confidence: classification.confidence,
      taskCreated: false,
      skippedByRule: false,
    }
  }

  // Step 2: Extract task
  const extraction = await stepExtractTask(email)

  // Step 3: Score priority
  const priority = await stepScorePriority(extraction, email.sender)

  // Step 4: Save to database
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

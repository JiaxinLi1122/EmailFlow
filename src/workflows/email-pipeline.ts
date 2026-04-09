import { classifyEmail, extractTask, scorePriority, updateThreadMemory } from '@/ai'
import { preFilterEmail, prepareForClassification, prepareForExtraction } from '@/ai/utils'
import * as emailRepo from '@/repositories/email-repo'
import * as taskRepo from '@/repositories/task-repo'
import * as threadMemoryRepo from '@/repositories/thread-memory-repo'
import type { ThreadMemory } from '@/repositories/thread-memory-repo'
import { prisma } from '@/lib/prisma'

// ============================================================
// Email Pipeline — processes a single email through the full AI pipeline
//
// Thread memory layer (v1):
//   - Each Gmail threadId maps to one ThreadMemory record
//   - New emails first update thread memory, then decide if full
//     analysis is needed
//   - If a thread already has a linked task, new action emails
//     attach to the existing task instead of creating a duplicate
// ============================================================

export interface PipelineResult {
  emailId: string
  classification: string
  confidence: number
  taskCreated: boolean
  taskId?: string
  skippedByRule: boolean
}

// ── Step 0: Rule-based pre-filter ────────────────────────────

function stepPreFilter(email: { sender: string; subject: string; labels: string }) {
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

// ── Memory context builder ────────────────────────────────────

/**
 * Builds the memory prefix injected into AI prompts.
 * Combines: global rules + domain rules + learned sender behavior + thread context.
 */
async function buildMemoryContext(
  userId: string,
  sender: string,
  threadMemory: ThreadMemory | null
): Promise<string> {
  const lines: string[] = [
    'User preferences and learned handling rules:',
    '- Prefer short actionable summaries.',
    '- Emails about deadlines, meetings, interviews, university, work, bills, payments, verification, approvals, and submissions should be treated as more important.',
    '- Promotional, newsletter, discount, sale, and generic marketing emails are usually low value unless they contain a clear required action.',
  ]

  // Domain-specific rules
  const lowerSender = sender.toLowerCase()
  if (lowerSender.includes('anu.edu.au')) {
    lines.push('- Emails from anu.edu.au are usually important and often action-related.')
  }

  // Learned sender behavior
  const senderMemory = await prisma.senderMemory.findUnique({
    where: { userId_sender: { userId, sender } },
  })

  if (senderMemory) {
    const total = senderMemory.actionCount + senderMemory.awarenessCount + senderMemory.ignoreCount
    if (total >= 3) {
      if (senderMemory.ignoreCount / total > 0.7) {
        lines.push('- User usually ignores emails from this sender.')
      }
      if (senderMemory.actionCount / total > 0.6) {
        lines.push('- User usually treats emails from this sender as requiring action.')
      }
    }
  }

  // Thread-level context
  if (threadMemory) {
    lines.push('')
    lines.push('Thread context (prior emails in this conversation):')
    lines.push(`- Matter: ${threadMemory.title}`)
    lines.push(`- Topic: ${threadMemory.topic}`)
    lines.push(`- Current summary: ${threadMemory.summary}`)
    lines.push(`- Status: ${threadMemory.status}`)
    if (threadMemory.nextAction) {
      lines.push(`- Previously identified next action: ${threadMemory.nextAction}`)
    }
    if (threadMemory.emailCount > 1) {
      lines.push(`- This thread has ${threadMemory.emailCount} prior email(s).`)
    }
  }

  lines.push('')
  lines.push('Use these as soft guidance — base the final decision on the actual email content.')
  lines.push('')

  return lines.join('\n')
}

// ── Step 1: Classify ─────────────────────────────────────────

async function stepClassify(
  email: {
    id: string
    subject: string
    sender: string
    receivedAt: Date
    bodyPreview: string
    bodyFull: string | null
  },
  memoryContext: string
) {
  const rawBody = email.bodyFull || email.bodyPreview
  const cleanedBody = prepareForClassification(rawBody)

  const result = await classifyEmail({
    subject: email.subject,
    sender: email.sender,
    date: email.receivedAt.toISOString(),
    bodyPreview: cleanedBody,
    memory: memoryContext,
  })

  await emailRepo.updateClassification(email.id, result)
  return result
}

// ── Step 2: Update thread memory ─────────────────────────────

/**
 * Calls the AI to refresh the thread memory summary, then persists it.
 * Returns the updated (or newly created) thread memory record.
 */
async function stepUpdateThreadMemory(
  userId: string,
  email: {
    id: string
    subject: string
    sender: string
    receivedAt: Date
    bodyPreview: string
  },
  threadId: string,
  existingMemory: ThreadMemory | null,
  classification: string
): Promise<ThreadMemory> {
  const updated = await updateThreadMemory({
    subject: email.subject,
    sender: email.sender,
    date: email.receivedAt.toISOString(),
    bodyPreview: email.bodyPreview,
    classification,
    existingMemory: existingMemory
      ? {
          title: existingMemory.title,
          topic: existingMemory.topic,
          summary: existingMemory.summary,
          status: existingMemory.status,
          nextAction: existingMemory.nextAction,
        }
      : null,
  })

  return threadMemoryRepo.upsert(userId, threadId, {
    title: updated.title,
    topic: updated.topic,
    summary: updated.summary,
    status: updated.status,
    nextAction: updated.nextAction,
    lastEmailId: email.id,
    lastMessageAt: email.receivedAt,
    lastClassification: classification,
    sender: email.sender,
    needsFullAnalysis: updated.needsFullAnalysis,
  })
}

// ── Step 3: Extract task ─────────────────────────────────────

async function stepExtractTask(
  email: {
    subject: string
    sender: string
    receivedAt: Date
    bodyPreview: string
    bodyFull: string | null
  },
  memoryContext: string,
  threadMemory: ThreadMemory | null
) {
  const rawBody = email.bodyFull || email.bodyPreview
  const cleanedBody = prepareForExtraction(rawBody)

  // Pass thread memory fields as thread context instead of raw email bodies
  const threadContext =
    threadMemory && threadMemory.emailCount > 1
      ? [
          {
            sender: `[thread summary: ${threadMemory.summary}]`,
            date: threadMemory.lastMessageAt?.toISOString() ?? email.receivedAt.toISOString(),
            bodyPreview: `Status: ${threadMemory.status}${threadMemory.nextAction ? ` | Previously identified action: ${threadMemory.nextAction}` : ''}`,
          },
        ]
      : undefined

  return extractTask({
    subject: email.subject,
    sender: email.sender,
    date: email.receivedAt.toISOString(),
    bodyPreview: email.bodyPreview,
    body: cleanedBody,
    memory: memoryContext,
    threadContext,
  })
}

// ── Step 4: Score priority ────────────────────────────────────

async function stepScorePriority(
  extraction: { title: string; summary: string; actionItems: string[] },
  sender: string,
  memoryContext: string
) {
  return scorePriority({
    title: extraction.title,
    summary: extraction.summary,
    actionItems: extraction.actionItems,
    sender,
    currentDate: new Date().toISOString().split('T')[0],
    memory: memoryContext,
  })
}

// ── Sender memory update ──────────────────────────────────────

async function updateSenderMemory(userId: string, sender: string, category: string) {
  const existing = await prisma.senderMemory.findUnique({
    where: { userId_sender: { userId, sender } },
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
    where: { userId_sender: { userId, sender } },
    data: {
      actionCount: existing.actionCount + (category === 'action' ? 1 : 0),
      awarenessCount: existing.awarenessCount + (category === 'awareness' ? 1 : 0),
      ignoreCount: existing.ignoreCount + (category === 'ignore' ? 1 : 0),
    },
  })
}

// ── Main pipeline ─────────────────────────────────────────────

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
    threadId?: string | null
  }
): Promise<PipelineResult> {
  // ── 0. Pre-filter (rule-based, no AI) ─────────────────────
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

  // ── 1. Load thread memory ──────────────────────────────────
  const threadId = email.threadId ?? null
  const existingThreadMemory = threadId
    ? await threadMemoryRepo.findByThread(userId, threadId)
    : null

  // ── 2. Build memory context (sender + thread) ──────────────
  const memoryContext = await buildMemoryContext(userId, email.sender, existingThreadMemory)

  // ── 3. Classify ────────────────────────────────────────────
  const classification = await stepClassify(email, memoryContext)
  await updateSenderMemory(userId, email.sender, classification.category)

  // ── 4. Update thread memory ────────────────────────────────
  //    Always update so the thread summary stays current,
  //    even for awareness / ignore emails.
  let currentThreadMemory: ThreadMemory | null = existingThreadMemory

  if (threadId) {
    currentThreadMemory = await stepUpdateThreadMemory(
      userId,
      email,
      threadId,
      existingThreadMemory,
      classification.category
    )
  }

  // ── 5. Non-action emails: done ─────────────────────────────
  if (classification.category !== 'action') {
    return {
      emailId: email.id,
      classification: classification.category,
      confidence: classification.confidence,
      taskCreated: false,
      skippedByRule: false,
    }
  }

  // ── 6. Dedup: thread already has a linked task ─────────────
  //    Attach this email to the existing task instead of
  //    creating a duplicate.
  if (currentThreadMemory?.linkedTaskId) {
    const existingTaskId = currentThreadMemory.linkedTaskId

    try {
      await prisma.taskEmail.create({
        data: {
          taskId: existingTaskId,
          emailId: email.id,
          relationship: 'follow_up',
        },
      })
    } catch {
      // unique constraint — email already linked, that's fine
    }

    return {
      emailId: email.id,
      classification: classification.category,
      confidence: classification.confidence,
      taskCreated: false,
      taskId: existingTaskId,
      skippedByRule: false,
    }
  }

  // ── 7. Extract task ────────────────────────────────────────
  const extraction = await stepExtractTask(email, memoryContext, currentThreadMemory)

  // ── 8. Score priority ──────────────────────────────────────
  const priority = await stepScorePriority(extraction, email.sender, memoryContext)

  // ── 9. Create task ─────────────────────────────────────────
  const task = await taskRepo.createTask({
    userId,
    emailId: email.id,
    extraction,
    priority,
  })

  // ── 10. Link task to thread memory ────────────────────────
  if (threadId && currentThreadMemory) {
    await threadMemoryRepo.linkTask(userId, threadId, task.id)
  }

  return {
    emailId: email.id,
    classification: classification.category,
    confidence: classification.confidence,
    taskCreated: true,
    taskId: task.id,
    skippedByRule: false,
  }
}

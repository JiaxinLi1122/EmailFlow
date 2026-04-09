import { classifyEmail, extractTask, scorePriority, updateThreadMemory, matchMatter } from '@/ai'
import { preFilterEmail, prepareForClassification, prepareForExtraction } from '@/ai/utils'
import * as emailRepo from '@/repositories/email-repo'
import * as taskRepo from '@/repositories/task-repo'
import * as threadMemoryRepo from '@/repositories/thread-memory-repo'
import * as matterMemoryRepo from '@/repositories/matter-memory-repo'
import type { ThreadMemory } from '@/repositories/thread-memory-repo'
import type { MatterMemory } from '@/repositories/matter-memory-repo'
import { prisma } from '@/lib/prisma'

// ============================================================
// Email Pipeline — processes a single email through the full AI pipeline
//
// Memory layers (v2):
//   Thread layer  — one record per Gmail threadId
//   Matter layer  — one record per underlying situation/project,
//                   may span multiple threads
//
// Processing order for each new email:
//   Pre-filter → Classify → Update thread memory →
//   Match/create matter → Task dedup (matter > thread) →
//   Extract → Score → Create task → Link to thread + matter
// ============================================================

// Confidence threshold for accepting an AI matter match.
// Below this value we always create a new matter.
const MATTER_MATCH_THRESHOLD = 0.85

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
 * Priority: matter context > thread context > sender behavior > global rules.
 */
async function buildMemoryContext(
  userId: string,
  sender: string,
  threadMemory: ThreadMemory | null,
  matterMemory: MatterMemory | null
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

  // Matter-level context (highest value — spans multiple threads)
  if (matterMemory) {
    lines.push('')
    lines.push('Matter context (the broader situation this email belongs to):')
    lines.push(`- Matter: ${matterMemory.title}`)
    lines.push(`- Topic: ${matterMemory.topic}`)
    lines.push(`- Overall summary: ${matterMemory.summary}`)
    lines.push(`- Status: ${matterMemory.status}`)
    if (matterMemory.nextAction) {
      lines.push(`- Matter-level next action: ${matterMemory.nextAction}`)
    }
    if (matterMemory.threadCount > 1) {
      lines.push(`- This matter spans ${matterMemory.threadCount} email thread(s).`)
    }
  } else if (threadMemory) {
    // Fall back to thread context when matter not yet known
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

// ── Step 3: Match or create matter ───────────────────────────

/**
 * Conservative matter matching:
 *   1. Rule-based candidate filter (topic + participants, recent window)
 *   2. AI judgment only if candidates exist (fast model)
 *   3. Accept only if AI confidence >= MATTER_MATCH_THRESHOLD
 *   4. Otherwise create new matter
 *
 * Always returns a MatterMemory — either existing or newly created.
 */
async function stepMatchOrCreateMatter(
  userId: string,
  threadMemory: ThreadMemory,
  threadId: string
): Promise<MatterMemory> {
  // Thread is already linked to a matter — just update matter stats
  if (threadMemory.matterId) {
    const matter = await matterMemoryRepo.findById(threadMemory.matterId)
    if (matter) {
      return matterMemoryRepo.updateFromThread(matter.id, threadMemory)
    }
    // matter was deleted — fall through to create a new one
  }

  // Find rule-based candidates
  const candidates = await matterMemoryRepo.findCandidates(userId, {
    topic: threadMemory.topic,
    participants: threadMemory.participants,
  })

  let matchedMatterId: string | null = null

  if (candidates.length > 0) {
    // Ask AI to decide (conservative — prefers null)
    const decision = await matchMatter({
      threadTitle: threadMemory.title,
      threadTopic: threadMemory.topic,
      threadSummary: threadMemory.summary,
      candidates: candidates.map((m) => ({
        id: m.id,
        title: m.title,
        topic: m.topic,
        summary: m.summary,
        status: m.status,
        lastMessageAt: m.lastMessageAt?.toISOString() ?? '',
      })),
    })

    if (decision.matterId && decision.confidence >= MATTER_MATCH_THRESHOLD) {
      matchedMatterId = decision.matterId
    }
  }

  if (matchedMatterId) {
    // Merge this thread into the existing matter
    const matter = await matterMemoryRepo.mergeThread(matchedMatterId, threadMemory)
    await threadMemoryRepo.setMatter(userId, threadId, matter.id)
    return matter
  }

  // No confident match — create a new matter seeded from this thread
  const newMatter = await matterMemoryRepo.createFromThread(userId, threadMemory)
  await threadMemoryRepo.setMatter(userId, threadId, newMatter.id)
  return newMatter
}

// ── Step 4: Extract task ─────────────────────────────────────

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

  // Pass thread memory as lightweight thread context (avoids re-sending full bodies)
  const threadContext =
    threadMemory && threadMemory.emailCount > 1
      ? [
          {
            sender: `[thread summary: ${threadMemory.summary}]`,
            date: threadMemory.lastMessageAt?.toISOString() ?? email.receivedAt.toISOString(),
            bodyPreview: `Status: ${threadMemory.status}${threadMemory.nextAction ? ` | Next action: ${threadMemory.nextAction}` : ''}`,
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

// ── Step 5: Score priority ────────────────────────────────────

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

  const threadId = email.threadId ?? null

  // ── 1. Load existing thread memory ────────────────────────
  const existingThreadMemory = threadId
    ? await threadMemoryRepo.findByThread(userId, threadId)
    : null

  // At this point we may already know the matter from an existing thread.
  // Load it for use in memory context during classification.
  const existingMatterMemory =
    existingThreadMemory?.matterId
      ? await matterMemoryRepo.findById(existingThreadMemory.matterId)
      : null

  // ── 2. Build memory context (global + sender + matter/thread) ──
  const memoryContext = await buildMemoryContext(
    userId,
    email.sender,
    existingThreadMemory,
    existingMatterMemory
  )

  // ── 3. Classify ────────────────────────────────────────────
  const classification = await stepClassify(email, memoryContext)
  await updateSenderMemory(userId, email.sender, classification.category)

  // ── 4. Update thread memory ────────────────────────────────
  //    Run for every non-prefiltered email, regardless of category.
  let currentThreadMemory: ThreadMemory | null = existingThreadMemory
  let currentMatterMemory: MatterMemory | null = existingMatterMemory

  if (threadId) {
    currentThreadMemory = await stepUpdateThreadMemory(
      userId,
      email,
      threadId,
      existingThreadMemory,
      classification.category
    )

    // ── 5. Match or create matter ────────────────────────────
    currentMatterMemory = await stepMatchOrCreateMatter(userId, currentThreadMemory, threadId)
  }

  // ── 6. Non-action emails: done ─────────────────────────────
  if (classification.category !== 'action') {
    return {
      emailId: email.id,
      classification: classification.category,
      confidence: classification.confidence,
      taskCreated: false,
      skippedByRule: false,
    }
  }

  // ── 7. Task dedup — matter level (broadest check) ─────────
  //    If this matter already has a primary task, link the
  //    email as a follow-up instead of creating a duplicate.
  if (currentMatterMemory?.linkedPrimaryTaskId) {
    const existingTaskId = currentMatterMemory.linkedPrimaryTaskId

    try {
      await prisma.taskEmail.create({
        data: {
          taskId: existingTaskId,
          emailId: email.id,
          relationship: 'follow_up',
        },
      })
    } catch {
      // unique constraint — already linked, fine
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

  // ── 8. Task dedup — thread level (fallback for no-threadId emails) ──
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
      // unique constraint — already linked, fine
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

  // ── 9. Extract task ────────────────────────────────────────
  const extraction = await stepExtractTask(email, memoryContext, currentThreadMemory)

  // ── 10. Score priority ─────────────────────────────────────
  const priority = await stepScorePriority(extraction, email.sender, memoryContext)

  // ── 11. Create task ────────────────────────────────────────
  const task = await taskRepo.createTask({
    userId,
    emailId: email.id,
    extraction,
    priority,
  })

  // ── 12. Link task to thread + matter ──────────────────────
  if (threadId && currentThreadMemory) {
    await threadMemoryRepo.linkTask(userId, threadId, task.id)
  }

  if (currentMatterMemory && !currentMatterMemory.linkedPrimaryTaskId) {
    await matterMemoryRepo.linkPrimaryTask(currentMatterMemory.id, task.id)
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

import { gmailProvider } from '@/integrations'
import { processEmail } from '@/workflows'
import type { PipelineReviewCandidate } from '@/workflows'
import * as emailRepo from '@/repositories/email-repo'
import * as userRepo from '@/repositories/user-repo'
import * as failedRepo from '@/repositories/failed-email-sync-repo'

export interface BatchClassificationReviewPayload {
  syncRunId: string
  newProjects: Array<{
    id: string
    name: string
    confidence: number
    linkedIdentityName?: string
    reason?: string
  }>
  newIdentities: Array<{
    id: string
    name: string
    confidence: number
    reason?: string
  }>
  items: PipelineReviewCandidate[]
}

function buildBatchReviewPayload(items: PipelineReviewCandidate[]): BatchClassificationReviewPayload | null {
  if (items.length === 0) return null

  const newProjects = new Map<string, { id: string; name: string; confidence: number; linkedIdentityName?: string; reason?: string }>()
  const newIdentities = new Map<string, { id: string; name: string; confidence: number; reason?: string }>()

  for (const item of items) {
    if (item.project?.isNew) {
      newProjects.set(item.project.id, {
        id: item.project.id,
        name: item.project.name,
        confidence: item.project.confidence,
        linkedIdentityName: item.identity?.name,
        reason: item.project.reason,
      })
    }

    if (item.identity?.isNew) {
      newIdentities.set(item.identity.id, {
        id: item.identity.id,
        name: item.identity.name,
        confidence: item.identity.confidence,
        reason: item.identity.reason,
      })
    }
  }

  return {
    syncRunId: `sync-${Date.now()}`,
    newProjects: [...newProjects.values()],
    newIdentities: [...newIdentities.values()],
    items,
  }
}

// ============================================================
// Email Sync Service
// Fetch emails → store → run pipeline on each → update sync time
// Then retry any previously failed emails from prior runs.
// ============================================================

export interface SyncResult {
  success: true
  data: {
    totalFetched: number
    syncedCount: number
    skippedCount: number
    failedCount: number
    retriedSuccessCount: number
    retriedFailedCount: number
    pendingFailedCount: number
    tasks: number
    review: BatchClassificationReviewPayload | null
  }
}

export async function syncEmails(userId: string, sinceDays: number = 7): Promise<SyncResult> {
  try {
    const syncInfo = await userRepo.getUserSyncInfo(userId)

    if (!syncInfo) {
      throw new Error('User not found')
    }

    if (!syncInfo.gmailConnected) {
      throw new Error('Gmail not connected')
    }

    if (!syncInfo.syncEnabled) {
      throw new Error('Email sync is disabled')
    }

    // 1) Fetch new emails from Gmail
    const messages = await gmailProvider.fetchNewEmails(userId, sinceDays)

    // 2) Store emails one-by-one so a single failure cannot prevent
    //    updateLastSync from running.  Promise.all would reject on the
    //    first error (connection-pool exhaustion, payload issue, etc.)
    //    while earlier upserts had already committed — leaving emails
    //    in the DB but lastSyncAt still null.
    const storedEmails: Awaited<ReturnType<typeof emailRepo.storeEmail>>['email'][] = []
    let syncedCount = 0
    let skippedCount = 0
    let failedCount = 0

    for (const message of messages) {
      try {
        const { email, wasCreated } = await emailRepo.storeEmail({ userId, message })
        storedEmails.push(email)
        if (wasCreated) {
          syncedCount++
        } else {
          skippedCount++
        }
      } catch (err) {
        failedCount++
        const reason = err instanceof Error ? err.message : String(err)
        console.error(`Failed to store email gmailMessageId=${message.providerMessageId}: ${reason}`)
        // Persist for later retry — upsert so repeated failures don't create duplicates
        try {
          await failedRepo.recordFailedEmail(userId, message, reason)
        } catch (recordErr) {
          console.error(`Failed to record failed email gmailMessageId=${message.providerMessageId}:`, recordErr)
        }
      }
    }

    // 3) Mark sync time now — before AI pipeline so it's persisted even if
    //    downstream processing is slow or the request times out
    await userRepo.updateLastSync(userId)

    // 4) Run email processing pipeline on each stored email
    let tasksCreated = 0
    const reviewItems: PipelineReviewCandidate[] = []

    for (const email of storedEmails) {
      try {
        const result = await processEmail(userId, {
          id: email.id,
          subject: email.subject,
          sender: email.sender,
          receivedAt: email.receivedAt,
          bodyPreview: email.bodyPreview,
          bodyFull: email.bodyFull,
          labels: email.labels,
          threadId: email.threadId,
        })

        if (result?.taskCreated) {
          tasksCreated += 1
        }

        if (result?.reviewCandidate) {
          reviewItems.push(result.reviewCandidate)
        }
      } catch (err) {
        console.error(`Failed to process email ${email.id}:`, err)
      }
    }

    // 5) Retry previously failed emails.
    //    Runs after the main flow so normal sync always takes priority.
    //    loadPendingFailures excludes resolved and permanent_failed records.
    const { retriedSuccessCount, retriedFailedCount } = await retryFailedEmails(userId)

    // 6) Count remaining pending failures for the response
    const pendingFailedCount = await failedRepo.countPendingFailures(userId)

    return {
      success: true,
      data: {
        totalFetched: messages.length,
        syncedCount,
        skippedCount,
        failedCount,
        retriedSuccessCount,
        retriedFailedCount,
        pendingFailedCount,
        tasks: tasksCreated,
        review: buildBatchReviewPayload(reviewItems),
      },
    }
  } catch (err) {
    console.error('syncEmails failed:', err)
    throw err
  }
}

// ============================================================
// Retry loop — runs at the end of each successful sync run.
// Loads pending/retrying records, tries to store them again.
// If storeEmail returns wasCreated=false the email already
// exists (stored by another path) — treat that as resolved.
// ============================================================

async function retryFailedEmails(userId: string): Promise<{ retriedSuccessCount: number; retriedFailedCount: number }> {
  let retriedSuccessCount = 0
  let retriedFailedCount = 0

  let pendingRecords: Awaited<ReturnType<typeof failedRepo.loadPendingFailures>>
  try {
    pendingRecords = await failedRepo.loadPendingFailures(userId)
  } catch (err) {
    console.error('Failed to load pending retry records:', err)
    return { retriedSuccessCount, retriedFailedCount }
  }

  for (const record of pendingRecords) {
    try {
      // Reconstruct the minimal EmailMessage shape needed by storeEmail.
      // Fields that weren't captured are omitted; storeEmail handles nulls.
      const { wasCreated } = await emailRepo.storeEmail({
        userId,
        message: {
          providerMessageId: record.gmailMessageId,
          threadId: record.threadId ?? null,
          receivedAt: record.receivedAt ?? new Date(),
          subject: record.subject ?? '(no subject)',
          sender: record.sender ?? '',
          // Fields not available from the retry record — use safe defaults
          recipients: [],
          bodyPreview: '',
          bodyFull: '',
          labels: [],
          hasAttachments: false,
          providerCategories: [],
        },
      })

      // wasCreated=false means the email was already stored (e.g. by the
      // main flow above or a prior sync) — still counts as resolved.
      retriedSuccessCount++
      await failedRepo.resolveFailedEmail(userId, record.gmailMessageId)
      console.log(`Retry resolved gmailMessageId=${record.gmailMessageId} wasCreated=${wasCreated}`)
    } catch (err) {
      retriedFailedCount++
      const reason = err instanceof Error ? err.message : String(err)
      console.error(`Retry failed gmailMessageId=${record.gmailMessageId}: ${reason}`)
      try {
        await failedRepo.recordRetryFailure(userId, record.gmailMessageId, reason)
      } catch (updateErr) {
        console.error(`Failed to update retry record gmailMessageId=${record.gmailMessageId}:`, updateErr)
      }
    }
  }

  return { retriedSuccessCount, retriedFailedCount }
}

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

// Maximum number of previously-failed emails to retry per sync run.
// Caps retry overhead on syncs that have a large backlog.
const RETRY_BATCH_SIZE = 10

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
  const t0 = Date.now()
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
    const tFetch = Date.now()
    const messages = await gmailProvider.fetchNewEmails(userId, sinceDays)
    console.log(`[sync] fetchNewEmails: ${Date.now() - tFetch}ms, count=${messages.length}`)

    // Early return when there is nothing new to process.
    // updateLastSync still runs so the UI reflects the check time.
    // Retry and AI pipeline are skipped — they only add latency when the inbox is quiet.
    if (messages.length === 0) {
      const tUpdateSync = Date.now()
      await userRepo.updateLastSync(userId)
      console.log(`[sync] updateLastSync: ${Date.now() - tUpdateSync}ms`)

      const tCount = Date.now()
      const pendingFailedCount = await failedRepo.countPendingFailures(userId)
      console.log(`[sync] countPendingFailures: ${Date.now() - tCount}ms, pending=${pendingFailedCount}`)

      console.log(`[sync] total (no new emails): ${Date.now() - t0}ms`)
      return {
        success: true,
        data: {
          totalFetched: 0,
          syncedCount: 0,
          skippedCount: 0,
          failedCount: 0,
          retriedSuccessCount: 0,
          retriedFailedCount: 0,
          pendingFailedCount,
          tasks: 0,
          review: null,
        },
      }
    }

    // 2) Store emails one-by-one so a single failure cannot prevent
    //    updateLastSync from running.  Promise.all would reject on the
    //    first error (connection-pool exhaustion, payload issue, etc.)
    //    while earlier upserts had already committed — leaving emails
    //    in the DB but lastSyncAt still null.
    const tStore = Date.now()
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
    console.log(`[sync] storeEmails: ${Date.now() - tStore}ms, synced=${syncedCount}, skipped=${skippedCount}, failed=${failedCount}`)

    // 3) Mark sync time now — before AI pipeline so it's persisted even if
    //    downstream processing is slow or the request times out
    const tUpdateSync = Date.now()
    await userRepo.updateLastSync(userId)
    console.log(`[sync] updateLastSync: ${Date.now() - tUpdateSync}ms`)

    // 4) Run email processing pipeline on each stored email
    const tAI = Date.now()
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
    console.log(`[sync] aiPipeline: ${Date.now() - tAI}ms, processed=${storedEmails.length}, tasks=${tasksCreated}`)

    // 5) Retry previously failed emails (capped at RETRY_BATCH_SIZE per run).
    //    Runs after the main flow so normal sync always takes priority.
    //    loadPendingFailures excludes resolved and permanent_failed records.
    const tRetry = Date.now()
    const { retriedSuccessCount, retriedFailedCount, pendingFailedCount } = await retryFailedEmails(userId)
    console.log(`[sync] retryFailedEmails: ${Date.now() - tRetry}ms, success=${retriedSuccessCount}, failed=${retriedFailedCount}, remaining=${pendingFailedCount}`)

    console.log(`[sync] total: ${Date.now() - t0}ms`)
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

async function retryFailedEmails(userId: string): Promise<{ retriedSuccessCount: number; retriedFailedCount: number; pendingFailedCount: number }> {
  let retriedSuccessCount = 0
  let retriedFailedCount = 0

  let allPendingRecords: Awaited<ReturnType<typeof failedRepo.loadPendingFailures>>
  try {
    allPendingRecords = await failedRepo.loadPendingFailures(userId)
  } catch (err) {
    console.error('Failed to load pending retry records:', err)
    return { retriedSuccessCount, retriedFailedCount, pendingFailedCount: 0 }
  }

  // Process only a bounded batch per run — keeps retry overhead predictable
  // even when the backlog is large.
  const pendingRecords = allPendingRecords.slice(0, RETRY_BATCH_SIZE)

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

  // Remaining count: total pending minus the ones we just resolved in this batch.
  // This avoids an extra DB query — it's an estimate based on what we loaded, which
  // is accurate enough for the sync response display.
  const pendingFailedCount = Math.max(0, allPendingRecords.length - retriedSuccessCount)

  return { retriedSuccessCount, retriedFailedCount, pendingFailedCount }
}

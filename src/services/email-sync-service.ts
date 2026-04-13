import { gmailProvider } from '@/integrations'
import { processEmail } from '@/workflows'
import type { PipelineReviewCandidate } from '@/workflows'
import * as emailRepo from '@/repositories/email-repo'
import * as userRepo from '@/repositories/user-repo'

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
// ============================================================

export async function syncEmails(userId: string, sinceDays: number = 7) {
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

    if (messages.length === 0) {
      await userRepo.updateLastSync(userId)
      return { synced: 0, tasks: 0, review: null }
    }

    // 2) Store emails one-by-one so a single failure cannot prevent
    //    updateLastSync from running.  Promise.all would reject on the
    //    first error (connection-pool exhaustion, payload issue, etc.)
    //    while earlier upserts had already committed — leaving emails
    //    in the DB but lastSyncAt still null.
    const storedEmails: Awaited<ReturnType<typeof emailRepo.storeEmail>>[] = []
    for (const message of messages) {
      try {
        const stored = await emailRepo.storeEmail({ userId, message })
        storedEmails.push(stored)
      } catch (err) {
        console.error(`Failed to store email ${message.providerMessageId}:`, err)
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

    return {
      synced: storedEmails.length,
      tasks: tasksCreated,
      review: buildBatchReviewPayload(reviewItems),
    }
  } catch (err) {
    console.error('syncEmails failed:', err)
    throw err
  }
}

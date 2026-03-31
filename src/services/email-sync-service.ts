import { gmailProvider } from '@/integrations'
import { processEmail } from '@/workflows'
import * as emailRepo from '@/repositories/email-repo'
import * as userRepo from '@/repositories/user-repo'

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
      return { synced: 0, tasks: 0 }
    }

    // 2) Store emails first
    const storedEmails = await Promise.all(
      messages.map((message) => emailRepo.storeEmail({ userId, message }))
    )

    // 3) Run email processing pipeline on each stored email
    let tasksCreated = 0

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
        })

        if (result?.taskCreated) {
          tasksCreated += 1
        }
      } catch (err) {
        console.error(`Failed to process email ${email.id}:`, err)
      }
    }

    // 4) Update last sync time
    await userRepo.updateLastSync(userId)

    return {
      synced: storedEmails.length,
      tasks: tasksCreated,
    }
  } catch (err) {
    console.error('syncEmails failed:', err)
    throw err
  }
}
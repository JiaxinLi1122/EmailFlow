import { gmailProvider } from '@/integrations'
import { processEmail } from '@/workflows'
import * as emailRepo from '@/repositories/email-repo'
import * as userRepo from '@/repositories/user-repo'

// ============================================================
// Email Sync Service
// Thin orchestrator: fetch emails → store → run pipeline on each
// All AI logic lives in workflows/email-pipeline.ts
// All DB logic lives in repositories/
// ============================================================

export async function syncEmails(userId: string, sinceDays: number = 7) {
  // Step 1: Fetch new emails from provider
  const newEmails = await gmailProvider.fetchNewEmails(userId, sinceDays)
  if (newEmails.length === 0) {
    await userRepo.updateLastSync(userId)
    return { synced: 0, tasks: 0 }
  }

  // Step 2: Store emails in DB
  const stored = await emailRepo.storeEmails(userId, newEmails)

  // Step 3: Run AI pipeline on each email
  let tasksCreated = 0

  for (const email of stored) {
    try {
      const result = await processEmail(userId, email)
      if (result.taskCreated) tasksCreated++
    } catch (error) {
      console.error(`Pipeline failed for email ${email.id}:`, error)
      await emailRepo.markClassificationFailed(email.id)
    }
  }

  // Step 4: Update last sync time
  await userRepo.updateLastSync(userId)

  return { synced: stored.length, tasks: tasksCreated }
}

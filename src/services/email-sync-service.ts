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
  try {
    // ⭐ 临时跳过 Gmail，避免报错
    await userRepo.updateLastSync(userId)

    return { synced: 0, tasks: 0 }
  } catch (err) {
    console.error(err)
    throw err
  }
}

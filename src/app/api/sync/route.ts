export const dynamic = "force-dynamic"
import { after } from 'next/server'
import { getAuthUser, success, error } from '@/lib/api-helpers'
import { syncEmailsPhase1, syncEmailsPhase2 } from '@/services/email-sync-service'

export async function POST() {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  try {
    // Phase 1: Gmail fetch + email storage + updateLastSync.
    // Returns in seconds (Gmail API + DB writes, no AI).
    const phase1 = await syncEmailsPhase1(user.id)

    // Phase 2: AI classification, task extraction, retry work.
    // Scheduled to run after the HTTP response is sent so the user is
    // never blocked waiting for AI. Tasks will appear once phase 2 completes.
    after(() =>
      syncEmailsPhase2(user.id, phase1.storedEmails).catch((err) => {
        console.error('[sync] phase2 background task failed:', err)
      })
    )

    return success({
      totalFetched: phase1.totalFetched,
      syncedCount: phase1.syncedCount,
      skippedCount: phase1.skippedCount,
      failedCount: phase1.failedCount,
      pendingFailedCount: phase1.pendingFailedCount,
      // true when new emails were stored and AI will classify them in the background
      processing: phase1.storedEmails.length > 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Email sync failed'
    console.error('Sync failed:', err)
    return error('SYNC_FAILED', message, 500)
  }
}

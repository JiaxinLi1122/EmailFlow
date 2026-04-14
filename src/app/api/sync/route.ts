export const dynamic = "force-dynamic"
import { getAuthUser, success, error } from '@/lib/api-helpers'
import { syncEmails } from '@/services/email-sync-service'

export async function POST() {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Not authenticated', 401)

  try {
    const result = await syncEmails(user.id)
    return success(result.data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Email sync failed'
    console.error('Sync failed:', err)
    return error('SYNC_FAILED', message, 500)
  }
}

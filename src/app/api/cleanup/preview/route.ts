/**
 * GET /api/cleanup/preview
 *
 * Returns a dry-run summary of what the next retention pass would do for
 * the authenticated user. Read-only — no emails are modified.
 */

import { getAuthUser, success, errorFromException } from '@/lib/api-helpers'
import { previewRetention } from '@/services/retention-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getAuthUser()
    const preview = await previewRetention(user.id)
    return success(preview)
  } catch (err) {
    return errorFromException(err, 'PREVIEW_FAILED', 'Failed to compute cleanup preview', 500)
  }
}

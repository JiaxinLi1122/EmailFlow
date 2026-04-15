/**
 * DELETE /api/settings/retention-whitelist/[id]  — remove a protection rule
 */

import { getAuthUser, success, error, errorFromException } from '@/lib/api-helpers'
import * as retentionRepo from '@/repositories/retention-repo'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    const { id } = await params
    const result = await retentionRepo.removeProtectionRule(user.id, id)
    if (result.count === 0) {
      return error('NOT_FOUND', 'Rule not found', 404)
    }
    return success({ deleted: true })
  } catch (err) {
    return errorFromException(err, 'DELETE_FAILED', 'Failed to delete whitelist rule', 500)
  }
}

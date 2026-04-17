export const dynamic = "force-dynamic"
import { getAuthUser, error, success } from '@/lib/api-helpers'
import * as emailRepo from '@/repositories/email-repo'

// POST /api/admin/fix-stuck-emails
// Resolves all emails stuck in 'pending' for > 2 minutes across all users.
// Requires admin role.
export async function POST() {
  const user = await getAuthUser()
  if (!user) return error('UNAUTHORIZED', 'Authentication required', 401)
  if (!user.isAdmin) return error('FORBIDDEN', 'Admin access required', 403)

  const fixed = await emailRepo.fixStuckEmails(null)
  return success({ fixed })
}

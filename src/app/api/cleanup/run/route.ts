/**
 * POST /api/cleanup/run
 *
 * Executes a manual retention pass for the authenticated user.
 * Requires a valid step-up token for action 'run_cleanup'.
 *
 * Body: { stepUpToken: string }
 */

import { getAuthUser, success, error, errorFromException } from '@/lib/api-helpers'
import { consumeStepUpToken } from '@/lib/step-up-auth'
import { executeRetention } from '@/services/retention-service'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()
    const body = await req.json()
    const { stepUpToken } = body

    if (!stepUpToken || typeof stepUpToken !== 'string') {
      return error('STEP_UP_REQUIRED', 'stepUpToken is required', 400)
    }

    await consumeStepUpToken(user.id, stepUpToken, 'run_cleanup')

    const result = await executeRetention(user.id, 'manual')
    return success(result)
  } catch (err) {
    return errorFromException(err, 'CLEANUP_FAILED', 'Failed to run cleanup', 500)
  }
}

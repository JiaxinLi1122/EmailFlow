export const dynamic = "force-dynamic"
import { NextRequest } from 'next/server'
import { errorFromException, getAuthUser, success } from '@/lib/api-helpers'
import { findBatchStatus } from '@/repositories/email-repo'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const user = await getAuthUser()
    const { batchId } = await params
    const status = await findBatchStatus(user.id, batchId)
    return success(status)
  } catch (err) {
    console.error('[api/sync/batch] GET failed:', err)
    return errorFromException(err, 'BATCH_STATUS_FAILED', 'Failed to get batch status', 500)
  }
}

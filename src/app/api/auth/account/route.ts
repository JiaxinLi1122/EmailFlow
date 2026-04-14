import { NextResponse } from 'next/server'
import { requireCurrentSessionContext } from '@/lib/auth-session'
import { errorFromException } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { consumeStepUpToken } from '@/lib/step-up-auth'
import { clearSessionCookie } from '@/lib/auth-token'

/**
 * DELETE /api/auth/account
 * Body: { stepUpToken: string }
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * Requires a step-up token with action='delete_account'.
 *
 * Cascade deletes are configured on the User model in the Prisma schema,
 * so all related records (sessions, emails, tasks, etc.) are removed automatically.
 */
export async function DELETE(req: Request) {
  try {
    const context = await requireCurrentSessionContext()

    const { userId } = context.session
    const body = await req.json()
    const { stepUpToken } = body as { stepUpToken?: string }

    if (!stepUpToken) {
      return NextResponse.json({ success: false, error: 'stepUpToken is required' }, { status: 400 })
    }

    await consumeStepUpToken(userId, stepUpToken, 'delete_account')

    // Delete the user — cascade will remove sessions, emails, tasks, digests, etc.
    await prisma.user.delete({ where: { id: userId } })

    // Clear the session cookie so the browser doesn't hold a dangling token
    await clearSessionCookie()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/auth/account]', err)
    return errorFromException(err, 'SYNC_FAILED', 'Failed to delete account', 500)
  }
}

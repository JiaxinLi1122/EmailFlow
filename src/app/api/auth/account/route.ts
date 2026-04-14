import { NextResponse } from 'next/server'
import { getCurrentSessionContext } from '@/lib/auth-session'
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
    const context = await getCurrentSessionContext()
    if (!context) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { userId } = context.session
    const body = await req.json()
    const { stepUpToken } = body as { stepUpToken?: string }

    if (!stepUpToken) {
      return NextResponse.json({ success: false, error: 'stepUpToken is required' }, { status: 400 })
    }

    const stepUpValid = await consumeStepUpToken(userId, stepUpToken, 'delete_account')
    if (!stepUpValid) {
      return NextResponse.json(
        { success: false, error: 'Step-up verification expired or invalid. Please re-verify.' },
        { status: 403 },
      )
    }

    // Delete the user — cascade will remove sessions, emails, tasks, digests, etc.
    await prisma.user.delete({ where: { id: userId } })

    // Clear the session cookie so the browser doesn't hold a dangling token
    await clearSessionCookie()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/auth/account]', err)
    return NextResponse.json({ success: false, error: 'Failed to delete account' }, { status: 500 })
  }
}

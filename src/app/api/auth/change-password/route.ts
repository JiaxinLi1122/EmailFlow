import { NextResponse } from 'next/server'
import { getCurrentSessionContext } from '@/lib/auth-session'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth-password'
import { consumeStepUpToken } from '@/lib/step-up-auth'
import { revokeOtherSessions } from '@/lib/auth-sessions'

/**
 * POST /api/auth/change-password
 * Body: { currentPassword: string, newPassword: string, stepUpToken: string }
 *
 * Requirements:
 *  - Authenticated session
 *  - Valid step-up token (obtained via /api/auth/step-up/verify with action='change_password')
 *  - currentPassword must match the stored hash
 *  - newPassword must be >= 8 characters and different from the current password
 *
 * On success: updates the password and revokes all OTHER active sessions
 * (the current session stays active so the user is not immediately logged out).
 */
export async function POST(req: Request) {
  try {
    const context = await getCurrentSessionContext()
    if (!context) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { userId } = context.session
    const body = await req.json()
    const { currentPassword, newPassword, stepUpToken } = body as {
      currentPassword?: string
      newPassword?: string
      stepUpToken?: string
    }

    if (!currentPassword || !newPassword || !stepUpToken) {
      return NextResponse.json(
        { success: false, error: 'currentPassword, newPassword, and stepUpToken are required' },
        { status: 400 },
      )
    }

    // Validate step-up token first
    const stepUpValid = await consumeStepUpToken(userId, stepUpToken, 'change_password')
    if (!stepUpValid) {
      return NextResponse.json(
        { success: false, error: 'Step-up verification expired or invalid. Please re-verify.' },
        { status: 403 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    })

    if (!user?.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'This account does not use a password' },
        { status: 400 },
      )
    }

    const currentValid = await verifyPassword(currentPassword, user.passwordHash)
    if (!currentValid) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 401 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters' },
        { status: 400 },
      )
    }

    const sameAsOld = await verifyPassword(newPassword, user.passwordHash)
    if (sameAsOld) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from the current password' },
        { status: 400 },
      )
    }

    const newHash = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    })

    // Revoke all other sessions so stolen sessions are invalidated after a password change
    await revokeOtherSessions(userId, context.session.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/auth/change-password]', err)
    return NextResponse.json({ success: false, error: 'Failed to change password' }, { status: 500 })
  }
}

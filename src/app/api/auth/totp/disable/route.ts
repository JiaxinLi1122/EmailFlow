import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-session'
import { prisma } from '@/lib/prisma'
import { consumeStepUpToken } from '@/lib/step-up-auth'

/**
 * POST /api/auth/totp/disable
 * Body: { stepUpToken: string }
 *
 * Disables TOTP / 2FA on the user's account.
 * Requires a step-up token with action='disable_totp'.
 *
 * Note: because the user already has TOTP enabled, the step-up challenge
 * will ask for a TOTP code — this confirms the user still has access to
 * their authenticator app before removing it.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { stepUpToken } = body as { stepUpToken?: string }

    if (!stepUpToken) {
      return NextResponse.json({ success: false, error: 'stepUpToken is required' }, { status: 400 })
    }

    const stepUpValid = await consumeStepUpToken(user.id, stepUpToken, 'disable_totp')
    if (!stepUpValid) {
      return NextResponse.json(
        { success: false, error: 'Step-up verification expired or invalid. Please re-verify.' },
        { status: 403 },
      )
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpEnabled: true },
    })

    if (!dbUser?.totpEnabled) {
      return NextResponse.json({ success: false, error: '2FA is not currently enabled' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: false, totpSecret: null },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/auth/totp/disable]', err)
    return NextResponse.json({ success: false, error: 'Failed to disable 2FA' }, { status: 500 })
  }
}

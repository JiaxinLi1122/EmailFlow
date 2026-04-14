import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-session'
import { verifyStepUp, type StepUpAction } from '@/lib/step-up-auth'

const VALID_ACTIONS: StepUpAction[] = ['change_password', 'disable_totp', 'delete_account']

/**
 * POST /api/auth/step-up/verify
 * Body: { action: StepUpAction, code: string }
 *
 * Verifies the TOTP code or email OTP and returns a short-lived step-up token.
 * The client must include this token in the subsequent sensitive operation request.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { action, code } = body as { action: StepUpAction; code: string }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Verification code is required' }, { status: 400 })
    }

    let stepUpToken: string
    try {
      stepUpToken = await verifyStepUp(user.id, code.trim(), action)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid code'
      return NextResponse.json({ success: false, error: message }, { status: 401 })
    }

    return NextResponse.json({ success: true, data: { stepUpToken } })
  } catch (err) {
    console.error('[api/auth/step-up/verify]', err)
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 })
  }
}

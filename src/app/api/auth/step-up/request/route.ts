import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-session'
import { requestStepUp, type StepUpAction } from '@/lib/step-up-auth'

const VALID_ACTIONS: StepUpAction[] = ['change_password', 'disable_totp', 'delete_account']

/**
 * POST /api/auth/step-up/request
 * Body: { action: StepUpAction }
 *
 * Returns { method: 'totp' | 'email' }.
 * For 'email', an OTP is sent to the user's address.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const action = body?.action as StepUpAction

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    const { method } = await requestStepUp(user.id, action)

    return NextResponse.json({ success: true, data: { method } })
  } catch (err) {
    console.error('[api/auth/step-up/request]', err)
    return NextResponse.json({ success: false, error: 'Failed to initiate verification' }, { status: 500 })
  }
}

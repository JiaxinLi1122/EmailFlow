import { NextResponse } from 'next/server'

import { getCurrentSessionContext } from '@/lib/auth-session'
import { revokeOtherSessions } from '@/lib/auth-sessions'

export async function POST() {
  try {
    const context = await getCurrentSessionContext()
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const count = await revokeOtherSessions(context.user.id, context.session.id)

    return NextResponse.json({
      success: true,
      data: { revokedCount: count },
    })
  } catch (err) {
    console.error('[api/auth/sessions/revoke-others]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to revoke sessions' },
      { status: 500 }
    )
  }
}

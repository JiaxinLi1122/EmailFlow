import { NextResponse } from 'next/server'

import { getCurrentSessionContext } from '@/lib/auth-session'
import { listActiveSessions } from '@/lib/auth-sessions'

export async function GET() {
  try {
    const context = await getCurrentSessionContext()
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const sessions = await listActiveSessions(context.user.id)

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessions.map((session) => ({
          ...session,
          isCurrent: session.id === context.session.id,
        })),
      },
    })
  } catch (err) {
    console.error('[api/auth/sessions]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to load sessions' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'

import { getCurrentSessionContext } from '@/lib/auth-session'
import { revokeSessionById } from '@/lib/auth-sessions'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getCurrentSessionContext()
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params
    const revoked = await revokeSessionById(id, context.user.id)

    if (!revoked) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/auth/sessions/[id]/revoke]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to revoke session' },
      { status: 500 }
    )
  }
}

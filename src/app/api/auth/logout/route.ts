import { NextResponse } from 'next/server'
import { clearSessionCookie, getSessionToken } from '@/lib/auth-token'
import { revokeSessionByToken } from '@/lib/auth-sessions'

export async function POST() {
  try {
    const token = await getSessionToken()
    await revokeSessionByToken(token)
    await clearSessionCookie()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/auth/logout]', err)
    return NextResponse.json({ success: true })
  }
}

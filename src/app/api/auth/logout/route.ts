import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth-token'

export async function POST() {
  try {
    await clearSessionCookie()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/auth/logout]', err)
    return NextResponse.json({ success: true })
  }
}

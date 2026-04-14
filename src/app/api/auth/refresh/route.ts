import { NextResponse } from 'next/server'

import { getSessionToken, setSessionCookie, COOKIE_NAME } from '@/lib/auth-token'
import { rotateSessionToken, validateSessionToken } from '@/lib/auth-sessions'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/refresh
 *
 * Rotates the current session token:
 *  - Reads the session cookie
 *  - Validates it
 *  - Generates a new token, stores oldHash in `previousTokenHash`
 *  - Sets the new token as the session cookie
 *
 * The old token remains valid for ROTATION_GRACE_PERIOD_MS (30 s) so that
 * in-flight concurrent requests don't get logged out during rotation.
 *
 * If the old token is replayed after the grace window, auth-sessions.ts treats
 * it as a possible session hijack: revokes all sessions and sends an alert email.
 */
export async function POST() {
  try {
    const oldToken = await getSessionToken()

    if (!oldToken) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Verify the session is still valid before rotating
    const context = await validateSessionToken(oldToken)
    if (!context) {
      return NextResponse.json({ success: false, error: 'Session expired or invalid' }, { status: 401 })
    }

    const result = await rotateSessionToken(oldToken)

    if (!result) {
      // Either already rotated concurrently (ok) or session became invalid mid-flight
      // Return 200 so the client doesn't retry aggressively
      return NextResponse.json({ success: true, rotated: false })
    }

    // Read the remember flag from the current cookie's maxAge to preserve it
    const cookieStore = await cookies()
    const cookieEntry = cookieStore.get(COOKIE_NAME)
    // If the cookie had a maxAge set it was a "remember me" cookie — re-set the same way
    // We can't read maxAge from the incoming cookie, so we derive it from the session expiry
    const expiresInMs = context.session.expiresAt.getTime() - Date.now()
    const isRemember = expiresInMs > 25 * 60 * 60 * 1000 // > 25 h means it was a 30-day session

    await setSessionCookie(result.newRawToken, isRemember)

    return NextResponse.json({ success: true, rotated: true })
  } catch (err) {
    console.error('[api/auth/refresh]', err)
    return NextResponse.json({ success: false, error: 'Refresh failed' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getSessionToken, verifyToken } from '@/lib/auth-token'

export async function GET() {
  try {
    const token = await getSessionToken()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not logged in' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: payload.userId,
        email: payload.email,
      },
    })
  } catch (err) {
    console.error('[api/auth/me]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to get current user' },
      { status: 500 }
    )
  }
}
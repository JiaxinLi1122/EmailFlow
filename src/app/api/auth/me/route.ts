import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        gmailEmail: true,
        syncStartDate: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        gmailEmail: user.gmailEmail,
        syncStartDate: user.syncStartDate,
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
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentSessionContext } from '@/lib/auth-session'

export async function GET() {
  try {
    const context = await getCurrentSessionContext()
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Not logged in' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: context.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        gmailEmail: true,
        syncStartDate: true,
        timezone: true,
        totpEnabled: true,
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
        timezone: user.timezone,
        totpEnabled: user.totpEnabled,
        currentSessionId: context.session.id,
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

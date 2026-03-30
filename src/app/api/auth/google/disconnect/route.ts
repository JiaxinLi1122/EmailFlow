import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-session'

export async function POST() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        gmailEmail: null,
        gmailAccessToken: null,
        gmailRefreshToken: null,
        gmailTokenExpiry: null,
        gmailConnected: false,
        lastSyncAt: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[google disconnect]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect Gmail' },
      { status: 500 }
    )
  }
}
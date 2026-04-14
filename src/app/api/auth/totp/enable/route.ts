import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-session'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { secret } = await req.json()

    if (!secret) {
      return NextResponse.json({ success: false, error: 'Missing secret' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: true,
        totpSecret: secret,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/auth/totp/enable]', err)
    return NextResponse.json(
      { success: false, error: 'Failed to enable 2FA' },
      { status: 500 }
    )
  }
}
